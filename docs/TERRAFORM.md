# Terraform files explained

What each file in `terraform/aws/` does. K8s manifests are in `k8s/aws/` and applied by spinup.sh or you. Full flow: [HOW-IT-WORKS.md](HOW-IT-WORKS.md).

## What Terraform manages

AWS: secret in Secrets Manager, IAM role for ESO (IRSA), optional EKS+VPC. When using EKS it also installs ESO via Helm and applies ClusterSecretStore.

## File by file

### main.tf

| Item | Purpose |
|------|---------|
| required_providers | aws, helm, kubectl, tls, time, random — versioned |
| locals | Cluster endpoint, CA, token from new EKS, existing EKS (data), or empty for local |
| Three paths | create_eks=true → resource outputs; use_eks true + create_eks false → data sources; use_eks=false → kubeconfig_path/context for Helm/kubectl |

### variables.tf

| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| aws_region | string | us-east-1 | AWS region |
| create_eks | bool | false | Create EKS+VPC |
| use_eks | bool | false | Use EKS (new or existing) |
| cluster_name | string | secrets-lab | EKS name |
| kubeconfig_path | string | ~/.kube/config | Local cluster |
| cluster_context | string | "" | Local context |
| app_namespace | string | default | App namespace |
| secret_name | string | prod/myapp/database | AWS SM path |
| github_actions_role_arn | string | "" | CI access to EKS when create_eks |

### secret.tf

`aws_secretsmanager_secret`: path prod/myapp/database, recovery_window_in_days=7. `aws_secretsmanager_secret_version`: initial JSON (username, password, host, port, dbname). `random_password`: initial DB password (no hardcoding).

### iam.tf

OIDC from eks.tf (create) or data (existing). Trust: only ESO ServiceAccount can assume role. Policy: GetSecretValue, DescribeSecret, ListSecretVersionIds on this secret ARN. Local: role exists; ESO uses static creds (see `k8s/aws/secret-store-static.yaml`).

### eso.tf

`helm_release`: ESO chart when local.install_eso (use_eks or create_eks); MicroK8s: spinup installs ESO. installCRDs: true. ServiceAccount annotation: role ARN for IRSA. time_sleep 30s before ClusterSecretStore (CRDs must register). kubectl_manifest: ClusterSecretStore, jwt auth; local uses secret-store-static.yaml.

### eks.tf (create_eks=true only)

| Resource | What |
|----------|------|
| VPC + subnets | 10.0.0.0/16, 2 AZs |
| IAM | Cluster role, node role (worker, CNI, ECR) |
| EKS cluster | 1.29, public endpoint, access_config for EKS Access Entries |
| Node group | 2× t3.small, AL2023 |
| OIDC provider | For IRSA |
| EKS access entry | github_actions_role_arn → CI can run Helm/kubectl |

Cost: ~$0.16/hr (control plane + nodes + ALB).

### outputs.tf

| Output | Used by |
|--------|---------|
| secret_arn | IAM policy |
| secret_name | ExternalSecret remoteRef.key |
| eso_role_arn / role_arn | ESO ServiceAccount annotation |
| eks_cluster_name, eks_cluster_endpoint | spinup, CI, Helm/kubectl |
| random_password_value | Optional debug |

## Variable matrix

| Scenario | create_eks | use_eks | Result |
|----------|------------|---------|--------|
| MicroK8s | false | false | AWS only; spinup installs ESO, static SecretStore |
| Existing EKS | false | true | AWS + ESO Helm + ClusterSecretStore |
| New EKS | true | true | VPC+EKS+node group + above |

---

## Terraform state: S3 and DynamoDB (plain English)

When you run Terraform it keeps a **state file** that records what it created (IDs of the secret, the cluster, the IAM role, etc.). So on the next run it can update or destroy the right resources.

- **S3:** The state file is stored in an S3 bucket (e.g. `k8s-secrets-lab-tfstate-ACCOUNT-REGION`). That way your laptop and GitHub Actions both use the same state. Without a remote backend, state would live only on your machine and CI would start from scratch (or conflict).
- **DynamoDB:** A table (e.g. `k8s-secrets-lab-tflock`) is used for **locking**. When Terraform runs, it writes a lock entry so two runs (e.g. you and CI at the same time) cannot apply at once. That prevents state corruption. If a run crashes, the lock can be released with `terraform force-unlock LOCK_ID`.

Spinup creates the bucket and table if they don’t exist and configures the backend. The same bucket and table names are set as GitHub secrets (`TF_BACKEND_BUCKET`, `TF_BACKEND_DYNAMO`) so CI uses the same state.

---

## Resources and dependencies (plain English)

- **VPC, subnets, IGW, route table:** The network the EKS cluster and nodes live in. The cluster depends on the IGW and route table so nodes have internet (needed to join the cluster).
- **EKS cluster:** The Kubernetes control plane. Depends on the cluster IAM role and (in this repo) on networking so it’s created after the route table.
- **Node group:** The worker nodes. Depends on the cluster and the node IAM role; nodes need permissions (e.g. `ec2:DescribeInstances`) to bootstrap.
- **AWS secret + secret version:** The secret in Secrets Manager and its first version (username, password, etc.). Nothing in Terraform depends on these for creation order; ESO reads them later.
- **ESO IAM role + OIDC:** The role ESO’s pod assumes (IRSA). Trust policy: only the EKS OIDC provider and the ESO ServiceAccount. Policy: read the secret. The ClusterSecretStore and ESO Helm release depend on this role.
- **ESO Helm release:** Installs ESO in the cluster. Depends on kubeconfig pointing at the cluster (spinup updates it). A short sleep after Helm lets CRDs register.
- **ClusterSecretStore:** Tells ESO how to talk to AWS (JWT from IRSA). Depends on the ESO Helm release (CRDs) and the ESO role.
- **ExternalSecret / Deployment / Service:** Applied by spinup (or you) from `k8s/aws/`. They depend on the ClusterSecretStore (and the secret in AWS) existing; spinup waits for CRDs and the store before applying.

→ [README →](../README.md) · [HOW-IT-WORKS →](HOW-IT-WORKS.md) · [Troubleshooting →](TROUBLESHOOTING.md)
