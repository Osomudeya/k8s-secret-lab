# Deploy this lab — Local path (kind / MicroK8s)

This guide is **local only**: kind or MicroK8s. No EKS, no CI/CD. For the EKS path see [DEPLOY-EKS.md](DEPLOY-EKS.md).

**Quick start:** `bash spinup.sh` (auto-detects kind or MicroK8s). Then `kubectl port-forward svc/myapp 3000:80 -n default` and open http://localhost:3000.

Below is the manual flow if you want to run each step yourself.

---

## Prerequisites

| Tool | Version | Check |
|------|---------|--------|
| kubectl | v1.25+ | `kubectl version --client` |
| Terraform | ~1.7 | `terraform version` |
| Helm | v3.10+ | `helm version --short` |
| Docker | latest | `docker version` |
| AWS CLI | v2 | `aws sts get-caller-identity` |
| Node (optional) | v18+ | `node --version` (for lab UI) |

- **AWS:** Credentials that can create secrets in **AWS Secrets Manager**. Free tier is enough; cost is negligible with default refresh interval.
- **Docker Hub:** Use the repo owner’s image in the Deployment (replace `YOUR_DOCKERHUB_USERNAME` in `k8s/aws/deployment.yaml`). No build required for learners.

---

## Step 1: Create your local cluster

### Kind

```bash
kind create cluster --name secrets-lab
kubectl cluster-info --context kind-secrets-lab
```

### MicroK8s

```bash
microk8s status --wait-ready
microk8s enable dns
microk8s enable storage
microk8s config > ~/.kube/config-microk8s
export KUBECONFIG=~/.kube/config-microk8s
kubectl cluster-info
```

For Terraform on MicroK8s you must pass the kubeconfig path:  
`terraform apply -var="kubeconfig_path=$HOME/.kube/config-microk8s" -var="cluster_context=microk8s"`  
(or set these in a `.tfvars` file).

---

## Step 2: Run Terraform

Terraform creates the secret in AWS Secrets Manager and installs ESO in your cluster. On local clusters it creates a **ClusterSecretStore** that uses IRSA — **that store will not work on kind/MicroK8s**. You will use a **SecretStore** with static credentials in Step 3.

```bash
cd terraform/aws
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

(MicroK8s: add `-var="kubeconfig_path=$HOME/.kube/config-microk8s"` and `-var="cluster_context=microk8s"` to plan/apply.)

---

## Step 3: Auth for ESO (static credentials)

On local clusters, ESO cannot use IRSA. Create a K8s Secret with AWS credentials and a SecretStore.

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

---

## Step 4: Set the app image

In `k8s/aws/deployment.yaml`, replace `YOUR_DOCKERHUB_USERNAME` with the repo owner’s Docker Hub username (or your own if you’ve built and pushed the image).

---

## Step 5: Deploy the app

```bash
kubectl apply -f k8s/aws/external-secret.yaml
kubectl apply -f k8s/aws/deployment.yaml
kubectl rollout status deployment/myapp -n default
```

---

## Step 6: Verify

- `kubectl get externalsecret app-db-secret -n default` → status `SecretSynced`
- `kubectl exec deploy/myapp -n default -- env | grep DB_`
- **App in browser:** `kubectl port-forward svc/myapp 3000:80 -n default` then open http://localhost:3000

---

## Optional: Reloader (rotation with env vars)

So that when the secret rotates, pods restart and pick up new env vars:

```bash
helm repo add stakater https://stakater.github.io/stakater-charts
helm repo update
helm install reloader stakater/reloader -n default --create-namespace
```

Then run `bash rotation/test-rotation.sh` and watch pods roll.

---

## Teardown

1. Delete K8s resources:  
   `kubectl delete -f k8s/aws/deployment.yaml`  
   `kubectl delete -f k8s/aws/external-secret.yaml`  
   `kubectl delete -f k8s/aws/secret-store-static.yaml` (if applied)  
   `kubectl delete secret aws-eso-credentials -n default`  
   `helm uninstall reloader -n default` (if installed)

2. **Terraform:**  
   `cd terraform/aws && terraform destroy -auto-approve`

3. **Cluster:** Kind: `kind delete cluster --name secrets-lab`. MicroK8s: `microk8s stop` or uninstall.

**AWS:** Secret is in a 7-day recovery window. To recreate immediately:  
`aws secretsmanager restore-secret --secret-id prod/myapp/database`

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| **ESO not syncing** | Use the static SecretStore and `aws-eso-credentials` Secret. Ensure `external-secret.yaml` has `secretStoreRef.name: aws-secrets-manager-static` and `kind: SecretStore`. Check ESO logs: `kubectl logs -n external-secrets -l app.kubernetes.io/name=external-secrets`. |
| **ImagePullBackOff** | Replace `YOUR_DOCKERHUB_USERNAME` in `k8s/aws/deployment.yaml` with a valid Docker Hub username. |
| **Terraform (Helm/kubectl)** | Ensure `kubectl get nodes` works. MicroK8s: pass `-var="kubeconfig_path=$HOME/.kube/config-microk8s"` and correct `cluster_context`. |
| **Rotation, pods don’t restart** | Install Reloader (see above) or rely on volume mount and an app that re-reads the file. |

---

## Quick reference

| Step | Action |
|------|--------|
| 1 | Create cluster (Kind or MicroK8s). MicroK8s: `enable dns` and `enable storage`. |
| 2 | `terraform init` → `plan` → `apply` in `terraform/aws` (MicroK8s: pass `kubeconfig_path` and `cluster_context`). |
| 3 | Create `aws-eso-credentials` Secret; apply `secret-store-static.yaml`; edit and apply `external-secret.yaml` to use SecretStore. |
| 4 | Set Docker Hub username in `k8s/aws/deployment.yaml`. |
| 5 | Apply external-secret and deployment; verify with port-forward. |
