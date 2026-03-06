# Deploy this lab — Local path (kind / MicroK8s)

This guide is **local only**: kind or MicroK8s. No EKS, no CI/CD. For the EKS path see [DEPLOY-EKS.md](DEPLOY-EKS.md).

**Quick start:** `bash spinup.sh` (auto-detects kind or MicroK8s). Then see [Accessing the UIs](#accessing-the-uis) below to open the in-pod app and (optionally) the lab UI.

**CSI driver on MicroK8s:** The AWS Secrets Store CSI provider **requires IRSA** (EKS). It does not support static credentials on MicroK8s; you will see *"An IAM role must be associated with service account"*. Use **ESO** (this guide) for the lab on MicroK8s. To try the CSI driver, use **EKS**; see [CSI-DRIVER-AWS.md](CSI-DRIVER-AWS.md).

---

## Quick path: spinup (recommended)

**~15 min · Free** (+ AWS SM negligible).

1. **Configure AWS:** `aws configure` and `aws sts get-caller-identity`.
2. **Clone and spinup:**
   ```bash
   git clone https://github.com/Osomudeya/k8s-secret-lab
   cd k8s-secret-lab
   bash spinup.sh
   ```
   Choose **2 (MicroK8s)**. Spinup: checks deps, MicroK8s kubeconfig/addons (dns, storage), Terraform state + apply (AWS SM secret, IAM, static ESO creds), installs ESO, applies SecretStore + ExternalSecret + Deployment, verifies chain.
3. **Lab UI (optional):** `cd lab-ui && npm install && npm run dev` → http://localhost:5173
4. **In-pod app:** `kubectl port-forward svc/myapp 3000:80 -n default` → http://localhost:3000
5. **Rotation test:** `bash rotation/test-rotation.sh` → [ROTATION.md](ROTATION.md)
6. **When done:** `bash teardown.sh`

→ [Full troubleshooting guide](TROUBLESHOOTING.md)

---

## Manual flow (optional)

Below is the manual flow if you want to run each step yourself.

### Prerequisites

| Tool | Version | Check |
|------|---------|--------|
| kubectl | v1.25+ | `kubectl version --client` |
| Terraform | ~1.7 | `terraform version` |
| Helm | v3.10+ | `helm version --short` |
| Docker | latest | `docker version` |
| AWS CLI | v2 | `aws sts get-caller-identity` |
| Node (optional) | v18+ | `node --version` (for lab UI) |

- **AWS:** Credentials that can create secrets in **AWS Secrets Manager**. Free tier is enough.
- **Docker Hub:** Use the repo owner's image in the Deployment (replace `YOUR_DOCKERHUB_USERNAME` in `k8s/aws/deployment.yaml`).

### Step 1: Create your local cluster

**Kind:**
```bash
kind create cluster --name secrets-lab
kubectl cluster-info --context kind-secrets-lab
```

**MicroK8s:**
```bash
microk8s status --wait-ready
microk8s enable dns
microk8s enable storage
microk8s config > ~/.kube/config-microk8s
export KUBECONFIG=~/.kube/config-microk8s
kubectl cluster-info
```

For Terraform on MicroK8s: `-var="kubeconfig_path=$HOME/.kube/config-microk8s" -var="cluster_context=microk8s"`.

### Step 2: Run Terraform

Terraform creates the secret in AWS and installs ESO. On local clusters you will use a **SecretStore** with static credentials in Step 3 (not the ClusterSecretStore).

```bash
cd terraform/aws
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

(MicroK8s: add the kubeconfig and context vars to plan/apply.)

### Step 3: Auth for ESO (static credentials)

Create a K8s Secret with AWS credentials and a SecretStore:

```bash
kubectl create secret generic aws-eso-credentials -n default \
  --from-literal=accessKeyID=AKIA... \
  --from-literal=secretAccessKey=...

kubectl apply -f k8s/aws/secret-store-static.yaml
```

Edit `k8s/aws/external-secret.yaml`: set `secretStoreRef.name` to `aws-secrets-manager-static` and `secretStoreRef.kind` to `SecretStore`. Then:

```bash
kubectl apply -f k8s/aws/external-secret.yaml
```

### Step 4: Set the app image

In `k8s/aws/deployment.yaml`, replace `YOUR_DOCKERHUB_USERNAME` with the repo owner's Docker Hub username (or your own if you've built and pushed the image).

### Step 5: Deploy the app

```bash
kubectl apply -f k8s/aws/external-secret.yaml
kubectl apply -f k8s/aws/deployment.yaml
kubectl rollout status deployment/myapp -n default
```

---

## Accessing the UIs

| UI | What it is | How to access |
|----|------------|----------------|
| **In-pod app** | The sample app in the cluster. Shows DB_* secrets (env + volume) and `/secrets/compare`. | `kubectl port-forward svc/myapp 3000:80 -n default` → **http://localhost:3000** |
| **Lab UI** | The interactive tutorial (React/Vite). Runs on your machine. | `cd lab-ui && npm install && npm run dev` → **http://localhost:5173** |

---

## Optional: Reloader (rotation with env vars)

When the secret rotates, Reloader triggers a rolling restart so pods get new env vars:

```bash
helm repo add stakater https://stakater.github.io/stakater-charts
helm repo update
helm install reloader stakater/reloader -n default --create-namespace
```

Then run `bash rotation/test-rotation.sh`. Without Reloader, run `kubectl rollout restart deployment/myapp -n default` after rotation so env and volume match again.

---

## Teardown

- **Script:** `bash teardown.sh` (reads `.lab-state` from spinup). Use `--yes` for non-interactive.
- **Manual:** Delete K8s resources (ExternalSecret, deployment, secret-store-static, aws-eso-credentials), then `cd terraform/aws && terraform destroy -auto-approve`. Kind: `kind delete cluster --name secrets-lab`. MicroK8s: `microk8s stop` or uninstall.
- **AWS secret:** If in 7-day recovery, `aws secretsmanager restore-secret --secret-id prod/myapp/database` to recreate.

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| **ExternalSecret not syncing** | Ensure `aws-eso-credentials` exists; ExternalSecret `secretStoreRef` → `aws-secrets-manager-static` (SecretStore). `kubectl logs -n external-secrets -l app.kubernetes.io/name=external-secrets`. |
| **Pod Pending** | `microk8s enable storage` |
| **ESO DNS errors** | `microk8s enable dns` |
| **ImagePullBackOff** | Replace `YOUR_DOCKERHUB_USERNAME` in `k8s/aws/deployment.yaml`. |
| **Terraform cluster unreachable** | MicroK8s: pass `-var="kubeconfig_path=$HOME/.kube/config-microk8s"` and `-var="cluster_context=microk8s"`. |

→ [Full troubleshooting guide](TROUBLESHOOTING.md)

---

→ [README →](../README.md) · [HOW-IT-WORKS →](HOW-IT-WORKS.md) · [EKS setup →](DEPLOY-EKS.md) · [Troubleshooting →](TROUBLESHOOTING.md)
