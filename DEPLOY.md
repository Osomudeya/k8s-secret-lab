# Step-by-step: Deploy this lab (manual first, then CI/CD)

This guide has two phases:

1. **Manual flow** — Do everything by hand: create cluster, run Terraform (with state), build and push the app image, deploy manifests. Do this first so you understand each step.
2. **CI/CD later** — Once the manual flow works, use the GitHub Actions workflows (`terraform.yml` and `deploy.yml`) to run Terraform and build/push/deploy on push to `main`.

All steps below are for the **AWS path** on a **local** cluster (Kind or MicroK8s). For EKS you’d set `use_eks = true` and use the default ClusterSecretStore (IRSA).

---

## Prerequisites

Install and verify:

| Tool | Version | Check |
|------|---------|--------|
| kubectl | v1.25+ | `kubectl version --client` |
| Terraform | v1.5+ | `terraform version` |
| Helm | v3.10+ | `helm version --short` |
| Docker | latest | `docker version` |
| AWS CLI | v2 | `aws sts get-caller-identity` |
| Node (optional) | v18+ | `node --version` (for lab UI only) |

- **AWS:** Run `aws configure` and ensure your credentials can create secrets in **AWS Secrets Manager** and (if you use EKS) manage the cluster. **Cost note:** AWS Secrets Manager is not free — about $0.40/secret/month and $0.05 per 10k API calls. With `refreshInterval: 1h` the lab cost is negligible, but if you set a very short refresh (e.g. 1m) and leave it running, API calls can add up. Keep an eye on the console if you experiment with short intervals.
- **Docker Hub:** Create an account and (for push) an access token: Docker Hub → Account → Security → New Access Token (Read, Write, Delete). Images you push are **public by default** unless you use a private repo; learners who fork and run CI will push to their own Docker Hub — consider cleaning up old tags or repos if you don’t need them.

---

# Manual flow (do this first)

Follow these steps in order. Only after everything works manually should you rely on `terraform.yml` and `deploy.yml`.

---

> **Important — local clusters (Kind / MicroK8s):** Terraform will create a **ClusterSecretStore** that uses **IRSA** (IAM Roles for Service Accounts). IRSA only works on **EKS** (it needs the cluster’s OIDC issuer). On Kind or MicroK8s, **that store will never work** — ESO will not be able to sync from AWS. You **must** use the **static auth** path: create a K8s Secret with AWS credentials and a **SecretStore** (see **Step 3**). Do not skip Step 3; otherwise the ExternalSecret will stay pending and you will not see the K8s Secret. The warning is here so you expect it before running Terraform.

---

## Step 1: Create your local cluster

Terraform and `kubectl` need a cluster and the correct **KUBECONFIG**.

### Option A: Kind

```bash
# Create cluster
kind create cluster --name secrets-lab

# Ensure kubectl talks to it
kubectl cluster-info --context kind-secrets-lab

# Optional: set for this shell so Terraform uses it
export KUBECONFIG=~/.kube/config
```

### Option B: MicroK8s

```bash
# Install if needed (e.g. Ubuntu: snap install microk8s --classic)
microk8s status --wait-ready

# Required: ESO and the app need DNS to reach AWS/registry. Without this, sync fails with "no such host".
microk8s enable dns

# Required: the deployment uses volume mounts; MicroK8s needs a default StorageClass.
microk8s enable storage

# Get kubeconfig (MicroK8s does not use ~/.kube/config by default)
microk8s config > ~/.kube/config-microk8s
export KUBECONFIG=~/.kube/config-microk8s

kubectl cluster-info
```

**Important for Terraform:** MicroK8s uses a different kubeconfig path. You must pass it explicitly so Terraform doesn’t use your default config (which may be another cluster). When you run Terraform, use:  
`terraform apply -var="kubeconfig_path=$HOME/.kube/config-microk8s"`  
(or set `kubeconfig_path` in a `.tfvars` file). Run `terraform init` and `terraform apply` in the **same shell** where `KUBECONFIG` is set (or always pass `kubeconfig_path`), so Terraform targets this cluster.

No addon is required for ESO; you will install it with Terraform (Helm) in the next step.

---

## Step 2: Run Terraform (with state)

Terraform will create the secret in AWS Secrets Manager and install ESO in your cluster. State is stored **locally** by default.

### 2.1 Ensure Terraform talks to your cluster

Terraform’s Helm and kubectl providers use, when `use_eks = false`, the **kubeconfig path** (`kubeconfig_path`, default `~/.kube/config`) and the **context** (`cluster_context`, default `kind-secrets-lab`). That way Terraform targets the right cluster even if you have several (kind, minikube, docker-desktop).

- **Kind:** Defaults are usually fine. Ensure `kubectl config current-context` shows e.g. `kind-secrets-lab`.
- **MicroK8s:** Terraform does **not** read `KUBECONFIG` from the environment by default; it uses the path in the variable. Set the path explicitly so Terraform doesn’t connect to the wrong cluster:
  ```bash
  terraform apply -var="kubeconfig_path=$HOME/.kube/config-microk8s" -var="cluster_context=microk8s"
  ```
  (Use the context name that appears in `kubectl config current-context` after you export `KUBECONFIG`.) Run `terraform init` and `terraform apply` in the **same shell** where you have set `KUBECONFIG` (or always pass `kubeconfig_path` on every run).

```bash
# Should show your Kind or MicroK8s context
kubectl config current-context
```

If your Kind context has a different name, override:  
`terraform apply -var="cluster_context=your-context-name"`  
(or set variables in a `.tfvars` file).

### 2.2 Initialize Terraform (download providers, create local state)

```bash
cd terraform/aws
terraform init
```

- This downloads the AWS, Helm, and kubectl providers.
- **State:** With no `backend` block, state is stored in `terraform/aws/terraform.tfstate` (local file). Do not commit this file if it contains sensitive data. For a shared or production setup you’d add a remote backend (e.g. S3 + DynamoDB for locking).

### 2.3 Review variables (optional)

Defaults are in `variables.tf`. For local clusters keep:

- `use_eks = false` (default)
- `cluster_name` is only used when `use_eks = true`

Override if needed, e.g.:

```bash
terraform plan -var="aws_region=us-east-1" -var="secret_name=prod/myapp/database"
```

### 2.4 Plan and apply

```bash
# See what Terraform will create/change
terraform plan -out=tfplan

# Apply (creates AWS secret + installs ESO in cluster)
terraform apply tfplan
```

Or in one step:

```bash
terraform apply -auto-approve
```

### 2.5 What Terraform created

- **AWS:** A secret in Secrets Manager (e.g. `prod/myapp/database`) with keys like `username`, `password`, `host`, `port`.
- **Cluster:** Namespace `external-secrets`, ESO Helm release, and a **ClusterSecretStore** named `aws-secrets-manager` that uses **IRSA** (works only on EKS).

After this, **do not** run `terraform.yml` in CI until you’re ready (see “CI/CD later” section). For local clusters you still need to configure ESO auth (Step 3).

---

## Step 3: Auth for ESO on a local cluster (Kind / MicroK8s)

The Terraform-created ClusterSecretStore uses IRSA (JWT). That only works on EKS. On Kind or MicroK8s you must use static AWS credentials.

### 3.1 Create a K8s Secret with AWS credentials

Use an IAM user with minimal rights (e.g. only `secretsmanager:GetSecretValue` on the lab secret). Create the Secret in the **default** namespace:

```bash
kubectl create secret generic aws-eso-credentials \
  -n default \
  --from-literal=accessKeyID=AKIA... \
  --from-literal=secretAccessKey=...
```

### 3.2 Apply the SecretStore that uses this secret

```bash
# From repo root
kubectl apply -f k8s/aws/secret-store-static.yaml
```

### 3.3 Point the ExternalSecret at the SecretStore

Edit `k8s/aws/external-secret.yaml`: set `secretStoreRef.name` to `aws-secrets-manager-static` and `secretStoreRef.kind` to `SecretStore`. Then apply:

```bash
kubectl apply -f k8s/aws/external-secret.yaml
```

ESO will now sync from AWS into the cluster using the static credentials.

---

## Step 4: Set the app image and deploy

The sample app image is **pre-built and published on Docker Hub** by the repo owner (or you can build and push your own). **Learners do not need to build or push anything.**

1. **Replace the image placeholder** in the Deployment manifest. Open `k8s/aws/deployment.yaml` and replace `YOUR_DOCKERHUB_USERNAME` with the repo owner’s Docker Hub username (or your own if you’ve built and pushed the image). The image line should look like:
   ```yaml
   image: <username>/k8s-secrets-lab-app:latest
   ```
   The manifest already has `imagePullPolicy: Always` so the cluster pulls the latest image from Docker Hub.

2. If you are the **repo owner** and maintain the image via CI: the `deploy.yml` workflow builds and pushes the image when `app/` or `k8s/` changes. Set `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` in GitHub Actions secrets. Learners using your repo then use your username in the manifest.

---

## Step 5: Deploy the app and ExternalSecret

### 5.1 Apply the ExternalSecret (and SecretStore if not already applied)

```bash
kubectl apply -f k8s/aws/secret-store-static.yaml   # if using static auth (local)
kubectl apply -f k8s/aws/external-secret.yaml
```

### 5.2 Wait for the K8s Secret to be created by ESO

```bash
kubectl get externalsecret -n default
kubectl get secret myapp-database-creds -n default
```

When the ExternalSecret is ready, `myapp-database-creds` should exist.

### 5.3 Apply the Deployment and Service

```bash
kubectl apply -f k8s/aws/deployment.yaml
kubectl rollout status deployment/myapp -n default
```

---

## Step 6: Verify

- **ESO:**  
  `kubectl get externalsecret app-db-secret -n default`  
  Status should show `SecretSynced` / `Ready`.

- **App sees the secret:**  
  `kubectl exec deploy/myapp -n default -- env | grep DB_`

- **Optional — port-forward and test in browser:**  
  `kubectl port-forward svc/myapp 3000:80 -n default`  
  Then open `http://localhost:3000` and try `/secrets/env` and `/secrets/volume`.

---

## Optional: Install Reloader (for secret rotation with env vars)

The Deployment has an annotation `secret.reloader.stakater.com/reload: "myapp-database-creds"`. **Stakater Reloader** is a controller that watches that Secret and triggers a rolling restart of the Deployment when the Secret changes. That way, after ESO syncs a new value from AWS, pods restart and pick up new env vars. Without Reloader, env vars only change on a manual rollout or new deploy.

If you want to test rotation and see pods restart automatically when the secret changes:

```bash
helm repo add stakater https://stakater.github.io/stakater-charts
helm repo update
helm install reloader stakater/reloader -n default --create-namespace
```

Then run the rotation script (`./rotation/test-rotation.sh`) and watch pods roll. If you only use volume mounts and your app reads the file on each request, you don’t need Reloader for rotation.

---

## Teardown / cleanup

When you’re done, remove resources in reverse order to avoid orphaned dependencies.

1. **Delete K8s resources** (ExternalSecret, Deployment, SecretStore, Reloader if installed):
   ```bash
   kubectl delete -f k8s/aws/deployment.yaml
   kubectl delete -f k8s/aws/external-secret.yaml
   kubectl delete -f k8s/aws/secret-store-static.yaml   # if you applied it
   kubectl delete secret aws-eso-credentials -n default
   helm uninstall reloader -n default   # if you installed Reloader
   ```

2. **Destroy Terraform** (removes ESO from cluster and the AWS secret; state stays until you delete the file):
   ```bash
   cd terraform/aws
   terraform destroy -auto-approve
   ```
   **Important:** AWS Secrets Manager uses a 7-day recovery window by default. After destroy, the secret name (e.g. `prod/myapp/database`) cannot be recreated until the window expires. If you want to run the lab again immediately, either wait 7 days or restore and then delete again: `aws secretsmanager restore-secret --secret-id prod/myapp/database` then `aws secretsmanager delete-secret --secret-id prod/myapp/database --force-delete-without-recovery`.

3. **Delete the cluster:**
   - **Kind:** `kind delete cluster --name secrets-lab`
   - **MicroK8s:** `microk8s stop` or uninstall as per your setup.

4. **Optional:** Remove the app image from Docker Hub (Docker Hub → Repositories → your repo → delete tags or repository).

5. **Optional:** If you used local Terraform state, you can delete `terraform/aws/terraform.tfstate` and `terraform.tfstate.backup` after destroy (only if you’re sure you won’t need to run Terraform again against that state).

---

## Azure path: filling the placeholders

The Azure manifests (`k8s/azure/secret-provider-class.yaml` and `k8s/azure/deployment.yaml`) contain placeholders you must replace with values from your Terraform outputs and Azure account.

**1. Get the values** (after running Terraform for Azure, e.g. `terraform apply` in `terraform/azure/`):

```bash
cd terraform/azure
terraform output managed_identity_client_id   # → MANAGED_IDENTITY_CLIENT_ID
terraform output key_vault_name                # → KEY_VAULT_NAME (if you have this output)
az account show --query tenantId -o tsv         # → AZURE_TENANT_ID
```

If Terraform doesn’t output `key_vault_name`, use the Key Vault name you created (e.g. from the Azure portal or your Terraform config).

**2. Substitute in the manifests.**

- **SecretProviderClass** (`k8s/azure/secret-provider-class.yaml`): replace `MANAGED_IDENTITY_CLIENT_ID`, `KEY_VAULT_NAME`, and `AZURE_TENANT_ID` in the `parameters` and `clientID` fields.
- **ServiceAccount** (in `k8s/azure/deployment.yaml`): replace `MANAGED_IDENTITY_CLIENT_ID` in the annotation `azure.workload.identity/client-id`.
- **Deployment image:** replace `YOUR_DOCKERHUB_USERNAME` in the container image with the repo owner’s or your Docker Hub username.

Example with `sed` (replace the values with your actual outputs):

```bash
CLIENT_ID=$(cd terraform/azure && terraform output -raw managed_identity_client_id)
KV_NAME="your-keyvault-name"
TENANT_ID=$(az account show --query tenantId -o tsv)

sed -i.bak "s/MANAGED_IDENTITY_CLIENT_ID/$CLIENT_ID/g" k8s/azure/secret-provider-class.yaml
sed -i.bak "s/KEY_VAULT_NAME/$KV_NAME/g" k8s/azure/secret-provider-class.yaml
sed -i.bak "s/AZURE_TENANT_ID/$TENANT_ID/g" k8s/azure/secret-provider-class.yaml
sed -i.bak "s/MANAGED_IDENTITY_CLIENT_ID/$CLIENT_ID/g" k8s/azure/deployment.yaml
```

Then apply: `kubectl apply -f k8s/azure/secret-provider-class.yaml` and `kubectl apply -f k8s/azure/deployment.yaml`.

---

## Troubleshooting

| Issue | What to check |
|------|----------------|
| **ESO not syncing / ExternalSecret stuck** | First steps: `kubectl describe externalsecret app-db-secret -n default` (see status/events) and `kubectl logs -n external-secrets -l app.kubernetes.io/name=external-secrets`. On local clusters you must use the static SecretStore and the K8s Secret `aws-eso-credentials`. If AWS credentials (static auth) expire or are rotated, ESO goes into `SecretSyncedError` — update the K8s Secret `aws-eso-credentials` with new keys and ESO will retry. Ensure `external-secret.yaml` uses `secretStoreRef.name: aws-secrets-manager-static` (and `kind: SecretStore`) for local. |
| **ImagePullBackOff / ErrImagePull** | Ensure you replaced `YOUR_DOCKERHUB_USERNAME` in the Deployment with a real Docker Hub username (repo owner’s or your own). The image must be pullable from the cluster. For private images, add an imagePullSecret. |
| **Terraform apply fails (Helm / kubectl)** | Ensure `kubectl get nodes` works. Terraform uses `kubeconfig_path` and `cluster_context` (Kind: defaults are usually fine; MicroK8s: pass `-var="kubeconfig_path=$HOME/.kube/config-microk8s"`). Run `terraform init` and `apply` in the same shell where you set `KUBECONFIG` if you rely on it. |
| **Terraform state locked** | If you use a remote backend (e.g. S3) and a run was interrupted, you may need to force-unlock: `terraform force-unlock <LOCK_ID>` (use only if you’re sure no other process is running). |
| **Rotation: secret updates but pods don’t restart** | The Deployment uses both env and volume. Env vars only update on pod restart. Install Reloader (see “Optional: Install Reloader” above) so that when ESO updates the K8s Secret, Reloader triggers a rolling restart. Or rely on volume mount and an app that re-reads the file. |
| **Reloader not restarting pods** | Confirm Reloader is installed and the Deployment has the annotation `secret.reloader.stakater.com/reload: "myapp-database-creds"`. Check Reloader logs: `kubectl logs -n default -l app.kubernetes.io/name=reloader`. |

---

## Quick reference: manual order of operations

| Step | Action |
|------|--------|
| 1 | Create cluster (Kind or MicroK8s). MicroK8s: `enable dns` and `enable storage`; set `kubeconfig_path` for Terraform. |
| 2 | In `terraform/aws`: `terraform init` → `terraform plan -out=tfplan` → `terraform apply tfplan` (MicroK8s: pass `-var="kubeconfig_path=..."`). |
| 3 | For local: create K8s Secret with AWS credentials; apply `secret-store-static.yaml`; edit and apply `external-secret.yaml` to use the SecretStore. |
| 4 | Replace `YOUR_DOCKERHUB_USERNAME` in `k8s/aws/deployment.yaml` with the repo owner’s (or your) Docker Hub username. No build required. |
| 5 | Apply `external-secret.yaml` (and SecretStore if needed), then `deployment.yaml`; wait for rollout. |
| 6 | Verify with `kubectl get externalsecret`, `kubectl get secret`, and app env/port-forward. |

---

# CI/CD later (after manual flow works)

Once the manual steps work, you can use the GitHub Actions workflows so that pushes to `main` run Terraform and build/push/deploy for you.

## What the workflows do

| Workflow | File | Trigger | What it does |
|----------|------|---------|----------------|
| Terraform CI | `terraform.yml` | Push/PR when `terraform/**` changes | On PR: `terraform init`, `fmt`, `validate`, `plan` (plan posted as comment). On push to `main`: `terraform apply` (AWS and optionally Azure). |
| Deploy | `deploy.yml` | Push to `main` when `k8s/**` or `app/**` changes | Builds the app image, pushes to **Docker Hub** (`<DOCKERHUB_USERNAME>/k8s-secrets-lab-app:<sha>` and `:latest`), then runs deploy-aws (and optionally deploy-azure): applies manifests and sets deployment image to the built image. |

## What you need to set up for CI/CD

1. **GitHub repo secrets** (Settings → Secrets and variables → Actions):

   | Secret | Used by | Description |
   |--------|---------|-------------|
   | `DOCKERHUB_USERNAME` | `deploy.yml` | Your Docker Hub username. |
   | `DOCKERHUB_TOKEN` | `deploy.yml` | Docker Hub access token (Read, Write, Delete). |
   | `AWS_ROLE_ARN` | `terraform.yml` (AWS), `deploy.yml` (deploy-aws) | IAM role ARN for OIDC (GitHub as IdP). Required for Terraform and deploy on AWS. |
   | `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` | `terraform.yml` (Azure), `deploy.yml` (deploy-azure) | Only if you use the Azure path. |

   **How to get these secrets (in case you lose them):**

   - **DOCKERHUB_USERNAME** — Your Docker Hub login username. Same as when you `docker login`. Find it on [hub.docker.com](https://hub.docker.com) (top-right profile or Account Settings → General).
   - **DOCKERHUB_TOKEN** — Docker Hub does not show existing tokens; create a new one: Docker Hub → Account Settings → Security → **New Access Token**. Name it (e.g. `github-actions`), set permissions to **Read, Write, Delete** for repositories. Copy the token once; you can’t see it again. Add it in GitHub as `DOCKERHUB_TOKEN`. If you lose it, create another token and update the secret.
   - **AWS_ROLE_ARN** — IAM role used for OIDC (GitHub as IdP). Create in AWS IAM: create a role with **Web identity** trust; identity provider `token.actions.githubusercontent.com`, audience `sts.amazonaws.com`, and restrict to your repo/org in the condition. Attach a policy that allows the actions Terraform and deploy need (e.g. Secrets Manager, EKS, Helm). Copy the role **ARN** (e.g. `arn:aws:iam::123456789012:role/github-actions-role`) and set it as `AWS_ROLE_ARN`. If the role was created by Terraform or another doc, find it in IAM → Roles → your role → copy ARN.
   - **AZURE_CLIENT_ID** — Azure AD app (service principal) used for OIDC. Azure Portal → Microsoft Entra ID (Azure AD) → App registrations → your app (or create one) → **Application (client) ID**. Set as `AZURE_CLIENT_ID`.
   - **AZURE_TENANT_ID** — Same app registration → **Directory (tenant) ID**. Or Azure Portal → Microsoft Entra ID → Overview → Tenant ID. Set as `AZURE_TENANT_ID`.
   - **AZURE_SUBSCRIPTION_ID** — Azure Portal → Subscriptions → your subscription → **Subscription ID**. Set as `AZURE_SUBSCRIPTION_ID`. Optional for deploy: **AZURE_AKS_RG** and **AZURE_AKS_NAME** are the resource group and AKS cluster name if different from defaults.

2. **Terraform state in CI — important:**  
   The workflows run `terraform init` and `apply` **without a remote backend**. State is **ephemeral** (lost when the job ends). So:
   - **Run 1:** Terraform creates the secret, IAM role, ESO, etc. Workflow may succeed.
   - **Run 2:** Terraform has no state; it tries to create the same resources again. You get "resource already exists" or duplicate-resource errors.
   **This workflow is for demonstration only.** For real use you must add a remote backend (e.g. S3 + DynamoDB for AWS) and configure the workflow (backend config or env vars). Until then, do not rely on CI for Terraform apply on a shared environment.

3. **When workflows run:**  
   - **terraform.yml:** On push/PR that change files under `terraform/`.  
   - **deploy.yml:** On push to `main` that change files under `k8s/` or `app/`.

Do the **manual flow** first so you understand build, push, Terraform state, and deploy; then add these secrets and (optionally) remote state, and rely on `terraform.yml` and `deploy.yml` for CI/CD.

---

## Summary: how it works

- **Manual:** You create the cluster, run Terraform (local state), replace the image placeholder in the Deployment with the repo owner’s Docker Hub image, then apply manifests. ESO syncs from AWS into a K8s Secret; the app uses that Secret via env and volume. No Docker build required for learners.
- **CI/CD (repo owner):** `terraform.yml` runs Terraform on infra changes; `deploy.yml` builds and pushes the app to Docker Hub and deploys it. Set `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` so the workflow can push. Learners only need to put that username in the manifest.

For the lab UI and full flow recap, run `npm run dev` from the repo root and open the app in the browser.
