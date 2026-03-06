# EKS + CSI driver — end-to-end steps

Use this when you want to: run the lab on EKS, try the CSI driver on EKS (where it works with IRSA), then teardown, document, and publish (e.g. article on Medium).

---

## Phase 1: Prerequisites

1. **AWS CLI** configured: `aws sts get-caller-identity` works.
2. **GitHub OIDC role** for CI (optional but recommended so Teardown workflow can run):
   - Create via `terraform/github-oidc` (see [DEPLOY-EKS.md](DEPLOY-EKS.md) Repository secrets).
   - Note the role ARN; you will set `GITHUB_ACTIONS_ROLE_ARN` and repo secret `AWS_ROLE_ARN` to this.
3. **Region**: e.g. `us-east-1`. Set `AWS_REGION` if different.

---

## Phase 2: Spin up EKS and ESO app

1. **Clone and run spinup (EKS):**
   ```bash
   cd /path/to/k8s-secret-lab   # or your repo path
   export GITHUB_ACTIONS_ROLE_ARN=arn:aws:iam::YOUR_ACCOUNT:role/YOUR_GITHUB_OIDC_ROLE   # optional, for CI/Teardown
   export AWS_REGION=us-east-1
   bash spinup.sh --cluster eks
   ```
   - When prompted, choose EKS cluster name (default: `secrets-lab`).
   - Wait for Terraform (cluster + node group + ESO + manifests). First run can take ~15–20 min.

2. **Get kubeconfig and ALB URL:**
   ```bash
   aws eks update-kubeconfig --name secrets-lab --region "$AWS_REGION"
   kubectl get svc myapp -n default
   ```
   - Note the `EXTERNAL-IP` or hostname (ALB). Open it in a browser to confirm the ESO app (myapp) is running and shows DB_* and Match ✓.

3. **Optional — set GitHub repo secrets** (for CI and Teardown workflow):
   ```bash
   gh secret set TF_BACKEND_BUCKET --body "k8s-secrets-lab-tfstate-$(aws sts get-caller-identity --query Account --output text)-$AWS_REGION"
   gh secret set TF_BACKEND_REGION --body "$AWS_REGION"
   gh secret set TF_BACKEND_DYNAMO --body "k8s-secrets-lab-tflock"
   gh secret set EKS_CLUSTER_NAME --body "secrets-lab"
   gh secret set AWS_REGION --body "$AWS_REGION"
   gh secret set AWS_ROLE_ARN --body "$GITHUB_ACTIONS_ROLE_ARN"
   ```

---

## Phase 3: Install and test the CSI driver on EKS

The AWS CSI provider on EKS uses **IRSA**: the pod that mounts the volume must have a ServiceAccount with an IAM role annotation. The secret `prod/myapp/database` already exists (created by spinup).

### 3.1 Install CSI driver and AWS provider

```bash
export KUBECONFIG=~/.kube/config   # or wherever your EKS context is
kubectl config use-context arn:aws:eks:REGION:ACCOUNT:cluster/CLUSTER_NAME   # if you have multiple

helm repo add secrets-store-csi-driver https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts
helm repo add aws-secrets-manager https://aws.github.io/secrets-store-csi-driver-provider-aws
helm repo update

helm install csi-secrets-store secrets-store-csi-driver/secrets-store-csi-driver -n kube-system \
  --set syncSecret.enabled=true --set enableSecretRotation=true

helm install csi-secrets-store-provider-aws aws-secrets-manager/secrets-store-csi-driver-provider-aws -n kube-system \
  --set secrets-store-csi-driver.install=false
```

Wait for pods:

```bash
kubectl get pods -n kube-system -l app=secrets-store-csi-driver
kubectl get pods -n kube-system -l app=csi-secrets-store-provider-aws
```

### 3.2 Create IAM role for the CSI app (IRSA)

The ESO role is scoped to the ESO ServiceAccount only. Create a **separate** IAM role that the `default/myapp-csi` ServiceAccount can assume.

1. **Get OIDC issuer and account** (use your cluster name if not `secrets-lab`):
   ```bash
   CLUSTER_NAME=secrets-lab
   OIDC_ISSUER=$(aws eks describe-cluster --name "$CLUSTER_NAME" --query 'cluster.identity.oidc.issuer' --output text)
   OIDC_HOST=$(echo "$OIDC_ISSUER" | sed 's|https://||')
   OIDC_ID=$(echo "$OIDC_ISSUER" | sed 's|.*/id/||')
   ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
   REGION=${AWS_REGION:-us-east-1}
   echo "OIDC_HOST=$OIDC_HOST  ACCOUNT_ID=$ACCOUNT_ID"
   ```

2. **Create trust policy file** (e.g. `/tmp/csi-trust.json`). The condition key is the OIDC host (no `https://`) plus `:sub`:
   ```bash
   # Example: OIDC_HOST = oidc.eks.us-east-1.amazonaws.com/id/XXXXXXXX
   cat > /tmp/csi-trust.json << EOF
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": { "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/${OIDC_HOST}" },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringEquals": {
             "${OIDC_HOST}:sub": "system:serviceaccount:default:myapp-csi",
             "${OIDC_HOST}:aud": "sts.amazonaws.com"
           }
         }
       }
     ]
   }
   EOF
   ```
   Run this **after** setting `OIDC_HOST` and `ACCOUNT_ID` in your shell (see step 1).

3. **Create role and policy (AWS CLI):**
   ```bash
   # Trust policy — replace OIDC_HOST and ACCOUNT_ID in the file, then:
   aws iam create-role --role-name myapp-csi-secrets-reader \
     --assume-role-policy-document file:///tmp/csi-trust.json

   # Inline policy: read prod/myapp/database
   aws iam put-role-policy --role-name myapp-csi-secrets-reader --policy-name GetSecret \
     --policy-document '{
       "Version": "2012-10-17",
       "Statement": [{
         "Effect": "Allow",
         "Action": ["secretsmanager:GetSecretValue"],
         "Resource": "arn:aws:secretsmanager:'"$REGION"':'"$ACCOUNT_ID"':secret:prod/myapp/database*"
       }]
     }'

   CSI_ROLE_ARN=$(aws iam get-role --role-name myapp-csi-secrets-reader --query 'Role.Arn' --output text)
   echo "CSI role ARN: $CSI_ROLE_ARN"
   ```

4. **Ensure OIDC provider exists for the cluster** (usually created with EKS):
   ```bash
   aws iam list-open-id-connect-providers --query "OpenIDConnectProviderList[?contains(Arn, 'oidc.eks')].Arn" --output text
   ```
   If your cluster’s OIDC provider is missing, add it (see AWS docs: “Create OIDC provider for your cluster”).

### 3.3 Create ServiceAccount and deploy CSI app

```bash
kubectl create serviceaccount myapp-csi -n default
kubectl annotate serviceaccount myapp-csi -n default eks.amazonaws.com/role-arn="$CSI_ROLE_ARN"

kubectl apply -f k8s/aws/csi/secret-provider-class.yaml
# Base deployment (no overlay); set serviceAccountName in the deployment
kubectl apply -f k8s/aws/csi/deployment.yaml
# Patch the deployment to use the ServiceAccount (base file has it commented)
kubectl patch deployment myapp-csi -n default -p '{"spec":{"template":{"spec":{"serviceAccountName":"myapp-csi"}}}}'

kubectl rollout status deployment/myapp-csi -n default
```

### 3.4 Expose and test the CSI app

- **Option A — port-forward:**
  ```bash
  kubectl port-forward svc/myapp-csi 3002:80 -n default
  ```
  Open http://localhost:3002 and http://localhost:3002/secrets/compare.

- **Option B — LoadBalancer** (optional): change the Service type to `LoadBalancer` and get an external URL:
  ```bash
  kubectl patch svc myapp-csi -n default -p '{"spec":{"type":"LoadBalancer"}}'
  kubectl get svc myapp-csi -n default
  ```

Confirm DB_* and Match ✓ (same AWS secret as the ESO app, different sync path).

### 3.5 Rotation with CSI

Secrets rotate in **AWS** (same as ESO). The CSI driver does **not** use ESO; with `enableSecretRotation=true` (step 3.1) the driver periodically re-fetches from AWS and updates the mounted files (and the synced K8s Secret if `syncSecret` is enabled). So:

- Rotate in AWS (e.g. `bash rotation/test-rotation.sh` or AWS console).
- Wait for the driver’s rotation interval (e.g. 2 minutes) or restart the `myapp-csi` pod to force a remount.
- Hit the CSI app’s `/secrets/compare`: volume can show the new value; env from the synced Secret only updates after pod restart (or use Reloader).

See [ROTATION.md](ROTATION.md) for the full flow and [CSI-DRIVER-AWS.md](CSI-DRIVER-AWS.md) § Rotation.

---

## Phase 4: Teardown

1. **Remove CSI resources first** (teardown.sh does not delete them):
   ```bash
   kubectl delete deployment myapp-csi -n default --ignore-not-found
   kubectl delete service myapp-csi -n default --ignore-not-found
   kubectl delete secretproviderclass aws-sm-lab -n default --ignore-not-found
   helm uninstall csi-secrets-store-provider-aws -n kube-system
   helm uninstall csi-secrets-store -n kube-system
   ```

2. **Remove the CSI IAM role** (optional, or leave for next run):
   ```bash
   aws iam delete-role-policy --role-name myapp-csi-secrets-reader --policy-name GetSecret
   aws iam delete-role --role-name myapp-csi-secrets-reader
   ```

3. **Run teardown:**
   ```bash
   bash teardown.sh --yes
   ```
   Or run the **Teardown** workflow from the Actions tab (type `destroy` when prompted). Teardown deletes ESO app, Terraform state resources (ESO Helm, AWS secret, ESO IAM role), and optionally S3/DynamoDB. It does **not** delete the EKS cluster itself.

---

## Phase 5: Document and publish

1. **Update article.md** with:
   - EKS + ESO flow and ALB URL.
   - CSI on EKS (IRSA, SecretProviderClass, same secret).
   - That on MicroK8s the AWS CSI provider requires IRSA so you use ESO there; CSI is tried on EKS.
2. **Publish to Medium** (export or paste from `article.md`; add images from `assets/` if needed).
3. **Repo polish:** Replace any `[your Medium article link]` in README/lab UI with your real Medium URL.

---

## Quick reference

| Phase | Action |
|-------|--------|
| 1 | AWS + optional GitHub OIDC role, region |
| 2 | `bash spinup.sh --cluster eks` → ALB URL → verify myapp (ESO) |
| 3 | Install CSI driver + provider; create IRSA role for `myapp-csi`; apply SecretProviderClass + deployment with `serviceAccountName: myapp-csi`; test myapp-csi (port-forward or LB) |
| 4 | Delete CSI resources + optional CSI IAM role; `bash teardown.sh --yes` or Teardown workflow |
| 5 | Edit article.md, publish on Medium, update repo links |
