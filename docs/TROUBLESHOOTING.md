# Troubleshooting

Single place for all fixes we encountered. Use the tables to find symptom → fix.

---

## EKS: How to fix “node stuck” and IGW/route issues (so they don’t recur)

These problems came from **Terraform config** (now fixed) and **interrupted or partial applies** (state drift). They are not caused by `spinup.sh` itself; the script only runs Terraform and kubectl.

| Issue | Root cause | What we fixed |
|------|------------|----------------|
| **Node group stuck, nodes never join** | (1) Node IAM role missing `ec2:DescribeInstances` (and related) for AL2023 nodeadm. (2) Subnets not tagged `owned` for EKS. (3) Cluster missing `endpoint_private_access = true`. (4) No 0.0.0.0/0 route (IGW/route table never created or not in state). | **terraform/aws/eks.tf:** Added IAM policy for node describe + `eks:DescribeCluster`, subnet tag `"owned"`, `endpoint_private_access = true`, and `depends_on = [aws_internet_gateway.main[0], aws_route_table_association.public]` on the cluster so networking exists before the cluster. |
| **IGW / route table “already exists” or “missing”** | A previous run was interrupted (e.g. Ctrl+C) so Terraform state and AWS diverged: VPC/subnets in state, IGW or route table missing or created manually. | **Order:** Cluster now `depends_on` IGW and route table associations, so a full (or targeted) apply creates networking first. **Recovery:** See table below (import IGW, run apply again, or delete node group and re-run). |
| **Route table association “conflicts with existing”** | Subnets already associated with another route table (e.g. default); Terraform tried to create a new association. | Same as above: ensure one full apply runs to completion so Terraform owns all networking. If you hit this, see “Node group CREATING” row for recovery (often: import or fix state, then replace node group). |
| **ClusterSecretStore / ExternalSecret “wrong API version”** | ESO 0.14 uses `v1beta1`; manifests had `v1`. | **terraform/aws/eso.tf** and **k8s/aws/external-secret.yaml** use `apiVersion: external-secrets.io/v1beta1`. |

**To avoid repeats:** Run `spinup.sh` (or `terraform apply`) to completion without interrupting. If you must re-run after an interrupt, run `terraform apply` again so networking and IAM are applied; use the table below and [fix-eks-node-group.sh](../scripts/fix-eks-node-group.sh) if the node group is stuck.

---

## EKS & Terraform apply

| Symptom | Cause | Fix |
|---------|-------|-----|
| **Requested AMI for this version 1.28 is not supported** | EKS 1.28 AMIs deprecated. | Repo uses 1.29 (or 1.30). Pull latest; ensure `ami_type = "AL2023_x86_64_STANDARD"` in `terraform/aws/eks.tf`. |
| **Unsupported Kubernetes minor version update from 1.28 to 1.30** | AWS allows only one minor version jump per update. | Set cluster `version = "1.29"` in `eks.tf`, apply. Then set `version = "1.30"` and apply again. |
| **ResourceExistsException: secret prod/myapp/database already exists** | Secret exists in AWS but not in Terraform state (e.g. state lost, new backend, re-run after partial apply). | **spinup.sh** auto-imports: re-run spinup. Or manually: `cd terraform/aws && terraform import aws_secretsmanager_secret.app_db prod/myapp/database` then apply again. |
| **InvalidRequestException: No Lambda rotation function ARN is associated with this secret** | `aws_secretsmanager_secret_rotation` requires a Lambda; this repo has none. | Rotation resource is disabled (`count = 0` in `terraform/aws/secret.tf`). Use `rotation/test-rotation.sh` for manual rotation. To enable AWS rotation, add a Lambda and set `rotation_lambda_arn`, then set `count = var.use_eks ? 1 : 0`. |
| **Helm release created but has a failed status** / **context deadline exceeded** | Often EKS node group failed (wrong AMI/version) or ESO pods can't schedule. | Fix EKS version/AMI (see above). If Helm is stuck: `helm uninstall external-secrets -n external-secrets` then re-run Terraform apply. |
| **Node group CREATING 15+ min, `kubectl get nodes` empty** | EKS keeps the node group in CREATING until at least one node registers. If instances are running but never show up in `kubectl get nodes`, the node group never becomes ACTIVE. Common causes: (1) **No internet route** — VPC has no 0.0.0.0/0 → IGW, so nodes can't reach EC2 API; nodeadm retries DescribeInstances (timeout, not 403). (2) **AL2023 nodeadm** needs `ec2:DescribeInstances` (and related) + `eks:DescribeCluster` on the node IAM role. (3) Missing private endpoint or wrong subnet tag. | **Check routes first:** `aws ec2 describe-route-tables --filters Name=vpc-id,Values=<vpc-id>` — subnets must have a route to 0.0.0.0/0 via an Internet Gateway. If missing, run **terraform apply** (or spinup) so Terraform creates `aws_internet_gateway.main`, `aws_route_table.public`, and `aws_route_table_association.public` (state may have lacked them from a partial apply). Then replace the node group so new instances get internet. **Console log:** `aws ec2 get-console-output --instance-id <id>` — "retrying EC2/DescribeInstances" with no 0.0.0.0/0 route = timeout; with route = check IAM policy on node role. **Recovery:** Apply Terraform, delete node group (`scripts/fix-eks-node-group.sh`), run spinup again. |
| **Secret already exists (pending deletion)** | Teardown or delete within 7-day recovery. | `aws secretsmanager restore-secret --secret-id prod/myapp/database` then re-apply. spinup.sh restores automatically if it detects pending deletion. |
| **Network vpc-xxx already has an internet gateway attached** | IGW was created manually (or by a previous run) but Terraform state doesn't have it. | Import the existing IGW: `IGW_ID=$(aws ec2 describe-internet-gateways --filters Name=attachment.vpc-id,Values=<VPC_ID> --query 'InternetGateways[0].InternetGatewayId' --output text)` then `cd terraform/aws && terraform import 'aws_internet_gateway.main[0]' $IGW_ID`. Unlock state first if needed: `terraform force-unlock <LOCK_ID>`. |
| **ClusterSecretStore isn't valid for cluster** / **check the APIVersion and Kind** | ESO 0.14 uses `external-secrets.io/v1beta1` for ClusterSecretStore, not `v1`. | In `terraform/aws/eso.tf`, set `apiVersion: external-secrets.io/v1beta1` for the ClusterSecretStore manifest. |

---

## MicroK8s / Kind (local clusters)

| Symptom | Cause | Fix |
|---------|-------|-----|
| ExternalSecret not syncing | ESO can't reach AWS SM | `aws-eso-credentials` must exist; apply `secret-store-static.yaml`; set ExternalSecret `secretStoreRef.name` → `aws-secrets-manager-static`, `kind` → `SecretStore`. `kubectl logs -n external-secrets -l app.kubernetes.io/name=external-secrets` |
| Pod Pending | No StorageClass | `microk8s enable storage` |
| ESO DNS errors | DNS addon off | `microk8s enable dns` |
| Terraform cluster unreachable | Wrong kubeconfig/context | `export KUBECONFIG=~/.kube/config-microk8s`; Terraform: `-var="kubeconfig_path=$HOME/.kube/config-microk8s" -var="cluster_context=microk8s"` |
| ESO CrashLoopBackOff (local) | IRSA not available on kind/MicroK8s | Use static auth: create `aws-eso-credentials` Secret, apply SecretStore, point ExternalSecret to it (not ClusterSecretStore). |

---

## ESO (External Secrets Operator)

| Symptom | Cause | Fix |
|---------|-------|-----|
| ExternalSecret not SecretSynced | IAM, store, or path | EKS: ServiceAccount annotation `eks.amazonaws.com/role-arn`; IAM GetSecretValue on secret. Local: SecretStore + aws-eso-credentials. `remoteRef.key` = AWS secret name. `kubectl describe externalsecret app-db-secret -n default` |
| ESO CrashLoopBackOff | CRD, OOM, auth | `kubectl logs -n external-secrets -l app.kubernetes.io/name=external-secrets`. Local: use SecretStore + static creds, not ClusterSecretStore. |
| No kind ClusterSecretStore | CRDs not registered yet after Helm install | Terraform uses `time_sleep` after ESO Helm; if applying manually, wait ~15–30s after Helm then apply ClusterSecretStore. |

---

## Terraform (general)

| Symptom | Cause | Fix |
|---------|-------|-----|
| Secret pending deletion | 7-day recovery window | `aws secretsmanager restore-secret --secret-id prod/myapp/database` then re-apply. |
| Backend/state lock errors | Bucket/region/DynamoDB mismatch | TF_BACKEND_* must match what spinup used; same in CI. |
| **terraform output role_arn: No outputs found** | Wrong directory or wrong module | ESO role: run from `terraform/aws` (outputs there). GitHub OIDC role: run from `terraform/github-oidc` and use that module’s `role_arn` output. |
| **terraform fmt -check** fails in CI | HCL not formatted | Run `terraform fmt -recursive` in `terraform/` and commit. |

---

## CI/CD (GitHub Actions)

| Symptom | Cause | Fix |
|---------|-------|-----|
| **OIDC / workflow YAML error (for beginners)** | The workflow uses `aws-actions/configure-aws-credentials` with `role-to-assume: ${{ secrets.AWS_ROLE_ARN }}`. If you see "Could not assume role" or "Access Denied", the trust policy doesn’t allow this run. **Cause:** The IAM role was created with a different repo name or branch (e.g. `repo:Other/repo:ref:refs/heads/main`). The token GitHub sends has a `sub` claim like `repo:OWNER/REPO:ref:refs/heads/main`. **Fix:** Run `terraform/github-oidc` with the correct `github_repo` and `github_branch` (and `github_environment` if you use Environments). Then `terraform output role_arn` and set that as repo secret `AWS_ROLE_ARN`. If the provider already existed, use `-var="use_existing_oidc_provider=true"` and same repo/branch. No access keys needed — only the role ARN. |
| Secrets not in workflow | Env vs repo secrets | If using `environment: production`, set secrets under Settings → Environments → production. |
| Deploy can't reach cluster | Wrong name/region | EKS_CLUSTER_NAME, AWS_REGION in same env as AWS_ROLE_ARN. |
| Teardown credentials/forbidden | EKS access entry missing | Set GITHUB_ACTIONS_ROLE_ARN (same as AWS_ROLE_ARN) before spinup so Terraform creates the EKS access entry. |
| Terraform apply runs after a failed plan | No guard on apply step | Repo workflow now runs apply only when `steps.plan.outcome == 'success'`. |
| PR comment has no plan output | Plan stdout not captured | `terraform_wrapper: true` in `hashicorp/setup-terraform` so plan output is available for the comment script. |
| Second CI run loses state | No remote backend | Set TF_BACKEND_BUCKET, TF_BACKEND_REGION, TF_BACKEND_DYNAMO; spinup configures backend. Without them, state is ephemeral and apply will recreate or conflict. |

---

## App & Lab UI

| Symptom | Cause | Fix |
|---------|-------|-----|
| **npm error ENOENT ... package.json** at repo root | No root package.json | Repo has a root `package.json`; run `npm install && npm run dev` from repo root. If missing, re-pull. |
| **App.jsx parse error** (e.g. unexpected token near `.$`) | Unescaped `${{ }}` in JS template literal (e.g. GitHub Actions syntax) | Escape the `$`: use `\${{ secrets.AWS_ROLE_ARN }}` in code examples so the parser doesn’t treat it as JS. |
| **ImagePullBackOff** for app pod | Wrong image name or no pull secret | Replace `YOUR_DOCKERHUB_USERNAME` in Deployment with your Docker Hub username (or the repo owner’s). For kind: `kind load docker-image <image>` after building locally. |

---

## Common AWS

| Symptom | Cause | Fix |
|---------|-------|-----|
| AccessDenied GetSecretValue | IAM/IRSA | ESO role needs GetSecretValue, DescribeSecret, ListSecretVersionIds on the secret ARN. |
| Secret already exists (pending) | Deleted &lt;7d ago | `restore-secret` then run spinup or delete + create. |
| Throttling | Too many syncs | Increase refreshInterval; fewer ExternalSecrets or one secret with multiple keys. |

---

## Repo hygiene

| Symptom | Cause | Fix |
|---------|-------|-----|
| **.DS_Store** in git | Was committed before .gitignore | `.DS_Store` is in .gitignore. Remove from index: `git rm --cached .DS_Store` (and e.g. `k8s/.DS_Store` if present). |
| **test-rotation.sh** exits before checks | `set -e` and a failing `kubectl exec` | Script was updated: pre-check for APP_POD; `set -e` only around critical `aws` calls; exec failures don’t exit the script so full output is shown. |

---

## Still stuck?

[Open an issue](https://github.com/Osomudeya/k8s-secret-lab/issues). Useful commands:

- ESO logs: `kubectl logs -n external-secrets -l app.kubernetes.io/name=external-secrets`
- App logs: `kubectl logs -l app=myapp -n default`
- ExternalSecret status: `kubectl describe externalsecret app-db-secret -n default`

→ [README →](../README.md) · [HOW-IT-WORKS →](HOW-IT-WORKS.md)
