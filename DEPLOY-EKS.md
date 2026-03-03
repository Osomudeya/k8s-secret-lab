# Deploy this lab — EKS path (production-like)

This guide is **EKS only**: full CI/CD, OIDC, ALB. For the local path (kind/MicroK8s) see [DEPLOY-LOCAL.md](DEPLOY-LOCAL.md).

**Quick start:** `bash spinup.sh --cluster eks`. Spinup prints the ALB URL. Push to `main` and CI/CD takes over. Open `https://<alb-url>`. When done, run the **Teardown** workflow (Actions tab) or `bash teardown.sh`.

---

## Prerequisites

- **EKS cluster** (create one or use existing). Default name: `secrets-lab`; override with `EKS_CLUSTER_NAME`.
- **AWS:** Credentials with access to EKS, Secrets Manager, and (for spinup) S3/DynamoDB for Terraform state.
- **Optional but recommended:** `gh` CLI installed and `gh auth login` so spinup can set GitHub Actions secrets (`TF_BACKEND_*`, `EKS_CLUSTER_NAME`, `AWS_REGION`). Otherwise set them manually in repo Settings → Secrets.

---

## Step 1: Spin up with EKS

```bash
git clone https://github.com/Osomudeya/k8s-secrets-lab.git
cd k8s-secrets-lab
bash spinup.sh --cluster eks
```

**What this does:**

- Creates S3 bucket and DynamoDB table for Terraform state (or uses existing).
- Runs `terraform init` with backend config, then `terraform apply` (ESO, ClusterSecretStore with IRSA, AWS secret).
- Applies K8s manifests (ExternalSecret, Deployment, LoadBalancer Service).
- If `gh` is authenticated: sets repo secrets `TF_BACKEND_BUCKET`, `TF_BACKEND_REGION`, `TF_BACKEND_DYNAMO`, `EKS_CLUSTER_NAME`, `AWS_REGION` so CI workflows can use the same state and cluster.

At the end, spinup prints the **ALB URL** (or you get it from `kubectl get svc myapp -n default`). Open that URL to see the app.

---

## Step 2: Push to main — CI/CD owns it

After the first spinup, **git push** to `main` drives everything:

- **terraform.yml** — On push/PR that change `terraform/**`: plan on PR (comment), apply on merge to main. Uses `TF_BACKEND_*` secrets for state.
- **deploy.yml** — On push to main that change `k8s/**` or `app/**`: build and push the app image, deploy to EKS, write ALB URL to the run summary.

No manual Terraform or kubectl after the first bootstrap. Configure **Repository secrets** (GitHub → Settings → Secrets and variables → Actions → New repository secret). Spinup sets the backend and EKS ones for you if `gh` is installed and authenticated; otherwise add them manually.

### Repository secrets

| Secret | Purpose | Where to get it |
|--------|---------|-----------------|
| **AWS_ROLE_ARN** | OIDC role for Terraform and Deploy workflows (no long-lived keys). | Create via [terraform/github-oidc](terraform/github-oidc/README.md), then `cd terraform/github-oidc && terraform output role_arn`. If provider already exists: `terraform apply -var="github_repo=OWNER/REPO" -var="use_existing_oidc_provider=true"` then copy the output ARN. |
| **AWS_REGION** | AWS region for EKS and Terraform. | e.g. `us-east-1`. |
| **TF_BACKEND_BUCKET** | S3 bucket for Terraform state. | From spinup output or AWS S3: `k8s-secrets-lab-tfstate-<ACCOUNT_ID>-<REGION>` (e.g. `k8s-secrets-lab-tfstate-334091769766-us-east-1`). |
| **TF_BACKEND_REGION** | Region of the state bucket. | Same as **AWS_REGION**, e.g. `us-east-1`. |
| **TF_BACKEND_DYNAMO** | DynamoDB table for state locking. | `k8s-secrets-lab-tflock`. |
| **EKS_CLUSTER_NAME** | EKS cluster name for deploy and teardown. | From spinup (default `secrets-lab`). |
| **DOCKERHUB_USERNAME** | Docker Hub username for the app image. | Your Docker Hub login. |
| **DOCKERHUB_TOKEN** | Docker Hub token (or password) for push. | Docker Hub → Account Settings → Security → New Access Token. |

**Optional:** `ALB_URL` — If set, the Deploy workflow uses it for the verify step instead of resolving the LoadBalancer from the cluster.

---

## Step 3: App URL and verify

- **App:** Open the ALB URL from spinup or from the **Deploy** workflow run summary (job “Write deploy summary”).
- **Verify:** The app exposes `/secrets/compare`. The Deploy workflow uses it when an ALB is available. You can set `ALB_URL` in repo secrets to pin the verify step to your URL.

---

## Step 4: Rotation test in CI (optional)

The **Rotation test (E2E)** workflow (Actions → workflow_dispatch) runs an end-to-end rotation: update secret in AWS SM → ESO syncs → `/secrets/compare` shows `rotation_detected: true` → restart deployment → `/secrets/compare` shows `all_match: true`. Requires the app to be reachable (ALB or set `ALB_URL`).

---

## Teardown

- **Option A — Actions:** Run the **Teardown** workflow. Type `destroy` in the confirmation input. It deletes K8s resources (ExternalSecret, deployment, service), then runs `terraform destroy`. Use the `use_eks` input if you used a local cluster by mistake.
- **Option B — Script:** `bash teardown.sh` (reads `.lab-state` from spinup). Use `--yes` for non-interactive.

Teardown does **not** delete the EKS cluster; it only removes Terraform-managed resources (ESO, secret, IAM role, etc.).

---

## Branch protection (pre-publish checklist)

So that “plan on PR, apply on merge” is enforced: Repo → Settings → Branches → Add rule for branch `main`: ✓ Require a pull request before merging (e.g. 1 approval); ✓ Require status checks to pass (e.g. job `terraform-aws` from terraform.yml); ✓ Do not allow bypassing the above settings. Then Terraform apply runs only when a PR is merged, not on direct push.

**Before publishing:** Replace any `[your Medium article link]` or similar placeholders in the README and lab UI footer so the repo doesn’t look unfinished.

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| **TF_BACKEND_BUCKET not set** | Run spinup with `gh auth login` so it can set secrets, or add `TF_BACKEND_BUCKET`, `TF_BACKEND_REGION`, `TF_BACKEND_DYNAMO` manually (bucket name from spinup output: `k8s-secrets-lab-tfstate-<account>-<region>`). |
| **Deploy workflow can’t reach cluster** | Ensure `EKS_CLUSTER_NAME` and `AWS_REGION` match your cluster. |
| **ALB pending** | On EKS, the Service gets a LoadBalancer; it can take 1–2 minutes for the hostname to appear. Check `kubectl get svc myapp -n default`. |
| **Requested AMI for this version 1.28 is not supported** | EKS 1.28 AMIs are deprecated. The repo uses 1.30 and AL2023; pull latest and re-run. If you changed the version, set `ami_type = "AL2023_x86_64_STANDARD"` and use a supported version (e.g. 1.30). |
| **Secret prod/myapp/database already exists** | A previous run created the secret but Terraform state doesn't have it. Either **import** it: `cd terraform/aws && terraform import aws_secretsmanager_secret.app_db prod/myapp/database` then apply again; or **delete** it in AWS (if in 7-day recovery: `aws secretsmanager restore-secret --secret-id prod/myapp/database` then `aws secretsmanager delete-secret --secret-id prod/myapp/database --force-delete-without-recovery`) and apply again. |
| **Helm release created but has a failed status / context deadline exceeded** | Usually because the node group failed (e.g. unsupported AMI) so ESO pods never become ready. Fix the node group (see AMI row above), then run `helm uninstall external-secrets -n external-secrets` and `terraform apply` again so Terraform recreates the release. |
| **ESO not syncing on EKS** | ClusterSecretStore uses IRSA. Ensure the ESO ServiceAccount is annotated with the role ARN from Terraform output and that the IAM role trust policy allows your cluster’s OIDC provider. |
