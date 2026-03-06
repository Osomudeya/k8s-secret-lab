# Secrets Store CSI Driver — AWS (try it yourself)

This guide explains the **Secrets Store CSI Driver** with the **AWS provider**, how it differs from **ESO**, and how to try it on **MicroK8s** or **EKS**. The main lab uses ESO; this doc is for learners who want to see the CSI pattern and be interview-ready.

**Already have a MicroK8s cluster running?** (e.g. you ran the main lab with spinup and ESO.) You can try the CSI driver on the **same cluster**: install the driver + AWS provider, create the `SecretProviderClass`, and deploy the CSI app (`myapp-csi`) alongside your existing ESO app. No need to tear down anything — follow the steps below.

---

## What is the CSI driver?

The [Secrets Store CSI Driver](https://secrets-store-csi-driver.sigs.k8s.io/) is a Kubernetes SIG project. It mounts secrets from external stores (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager, Vault) **directly as files** into pods via a **CSI volume**. Optionally it can **sync** those values into a Kubernetes `Secret` so you can use `envFrom` / `secretRef` as well.

- **Driver**: runs as a DaemonSet, implements the CSI interface.
- **Provider**: per-cloud plugin (e.g. [secrets-store-csi-driver-provider-aws](https://github.com/aws/secrets-store-csi-driver-provider-aws)) that talks to AWS Secrets Manager / Parameter Store.

**Does it work with MicroK8s?** The driver and provider **install** on MicroK8s, but the **AWS** provider only accepts credentials via **IRSA** (pod service account IAM role). It does **not** use `nodePublishSecretRef` or static credentials on non-EKS clusters. You will see: *"An IAM role must be associated with service account default (namespace: default)"*. **On MicroK8s, use ESO for this lab** (the main path); the CSI driver path is supported on **EKS with IRSA** only.

---

## ESO vs CSI — why this lab uses ESO

| | **External Secrets Operator (ESO)** | **Secrets Store CSI Driver** |
|---|--------------------------------------|-------------------------------|
| **Model** | Syncs cloud secret → **K8s Secret**; pod uses `secretRef` + volume | Mounts cloud secret as **files** (and can sync to K8s Secret) |
| **CRDs** | `ExternalSecret`, `ClusterSecretStore` | `SecretProviderClass` |
| **Cloud** | One operator, many backends (AWS, Azure, GCP, Vault) | One driver + one provider per cloud |
| **Where we use it** | AWS path (EKS + MicroK8s) in this repo | Azure path in this repo; AWS optional (this doc) |

We use **ESO** on the AWS path for: (1) one pattern across the lab, (2) real K8s Secrets so the app can use `envFrom` and volume the same way, (3) broad production use. **CSI** is equally valid; interviewers often ask “ESO vs CSI?” — know both exist.

---

## Prerequisites

- A Kubernetes cluster: **MicroK8s** (local) or **EKS**.
- The secret `prod/myapp/database` must exist in **AWS Secrets Manager** (create it with Terraform or the main lab spinup first).
- **kubectl** and **Helm 3** configured for your cluster.
- **AWS credentials** available to the cluster:
  - **EKS**: use **IRSA** (IAM Role for Service Account) so the pod’s ServiceAccount gets temporary AWS credentials — no keys in the cluster.
  - **MicroK8s**: use static credentials (e.g. env vars or a K8s Secret) for the CSI provider; see “Auth on MicroK8s” below.

---

## 1. Install the CSI driver and AWS provider

Run from your machine (cluster already up).

### 1.1 Add Helm repos and install the driver

```bash
helm repo add secrets-store-csi-driver https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts
helm repo update

helm install csi-secrets-store secrets-store-csi-driver/secrets-store-csi-driver \
  --namespace kube-system \
  --set syncSecret.enabled=true \
  --set enableSecretRotation=true
```

- `syncSecret.enabled=true` — syncs mounted secrets into a K8s Secret (so you can use `envFrom`).
- `enableSecretRotation=true` — driver can rotate mounted file content (provider-dependent).

### 1.2 Install the AWS provider

```bash
helm repo add aws-secrets-manager https://aws.github.io/secrets-store-csi-driver-provider-aws
helm repo update

helm install csi-secrets-store-provider-aws aws-secrets-manager/secrets-store-csi-driver-provider-aws \
  --namespace kube-system \
  --set secrets-store-csi-driver.install=false
```

The provider needs AWS credentials to call Secrets Manager. Use **MicroK8s (static credentials)** or **EKS (IRSA)** below.

---

## Auth on MicroK8s (static credentials)

On MicroK8s (or kind, or any non-EKS cluster) there is no IRSA. The **AWS provider runs as a DaemonSet** in `kube-system`. You give it credentials by creating a K8s Secret and injecting those env vars into the provider pods.

### Step 1: Create a K8s Secret with AWS credentials

Use an IAM user (or temporary keys) that has `secretsmanager:GetSecretValue` on `prod/myapp/database`. The AWS SDK expects env vars `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`. Create the Secret in **two** places:

- **`kube-system`**: for the provider DaemonSet patch (Step 2), so provider pods can use it via `envFrom`.
- **`default`** (or your app’s namespace): for the app deployment’s CSI volume **`nodePublishSecretRef`**. The driver passes this secret to the provider when mounting; without it, the provider may error that an IAM role must be associated with the pod’s service account (IRSA is EKS-only).

```bash
kubectl create secret generic aws-csi-provider-credentials -n kube-system \
  --from-literal=AWS_ACCESS_KEY_ID='AKIA...' \
  --from-literal=AWS_SECRET_ACCESS_KEY='...'
kubectl create secret generic aws-csi-provider-credentials -n default \
  --from-literal=AWS_ACCESS_KEY_ID='AKIA...' \
  --from-literal=AWS_SECRET_ACCESS_KEY='...'
```

Replace with your real access key and secret key.

### Step 2: Patch the AWS provider DaemonSet to use the Secret

The provider’s Helm chart does not expose a built-in “credentials from Secret” option. Patch the DaemonSet to add `envFrom` so the provider container gets those env vars. **Helm may create a long DaemonSet name** (e.g. `csi-secrets-store-provider-aws-secrets-store-csi-driver-provider-aws`); discover it and patch:

```bash
# Find the AWS provider DaemonSet (name can be long and release-dependent)
kubectl get daemonsets -n kube-system | grep -i csi
DS_NAME=$(kubectl get daemonsets -n kube-system --no-headers -o custom-columns=:metadata.name | grep -E 'provider-aws' | head -1)
kubectl patch daemonset "$DS_NAME" -n kube-system --type='json' -p='[
  {"op":"add","path":"/spec/template/spec/containers/0/envFrom","value":[{"secretRef":{"name":"aws-csi-provider-credentials"}}]}
]'
kubectl rollout status daemonset/"$DS_NAME" -n kube-system --timeout=120s
```

If the patch fails (e.g. path exists), the chart may already define `envFrom`; run `kubectl get daemonset "$DS_NAME" -n kube-system -o yaml` and add the `secretRef` to the existing `envFrom` list. After the patch, provider pods will restart and use the credentials. Redeploy your app so the CSI volume mount is re-triggered.

**Security:** Static keys in the cluster are only for local/lab use. In production, use EKS + IRSA or a different auth mechanism.

---

## Auth on EKS (IRSA)

On EKS, the **pod** that mounts the CSI volume gets credentials via **IRSA**: the pod’s ServiceAccount is annotated with an IAM role ARN, and the kubelet passes a projected token to the CSI driver. The driver uses that token to assume the role and fetch the secret. No static keys in the cluster.

### Step 1: Create an IAM role that the pod can assume

The role must have a trust policy that allows your EKS cluster’s OIDC provider to assume it when the subject is the pod’s ServiceAccount. Example trust policy (replace `ACCOUNT_ID`, `CLUSTER_REGION`, `OIDC_ID`, `NAMESPACE`, `SA_NAME`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/oidc.eks.CLUSTER_REGION.amazonaws.com/id/OIDC_ID"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.eks.CLUSTER_REGION.amazonaws.com/id/OIDC_ID:sub": "system:serviceaccount:NAMESPACE:SA_NAME",
          "oidc.eks.CLUSTER_REGION.amazonaws.com/id/OIDC_ID:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
```

- **OIDC_ID**: run `aws eks describe-cluster --name CLUSTER_NAME --query 'cluster.identity.oidc.issuer' --output text`; the URL looks like `https://oidc.eks.REGION.amazonaws.com/id/XXXXXXXX` — use the last segment (`XXXXXXXX`) as `OIDC_ID`.
- **NAMESPACE** / **SA_NAME**: e.g. `default` and `myapp-csi` if that’s the ServiceAccount you create for the CSI app.

Attach an IAM policy that allows reading the secret, e.g.:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:REGION:ACCOUNT_ID:secret:prod/myapp/database*"
    }
  ]
}
```

You can create this role and policy in the AWS console, with Terraform, or with the AWS CLI.

**Reusing the ESO IAM role:** This repo’s Terraform (ESO path) already creates an IAM role for External Secrets with `secretsmanager:GetSecretValue` on the lab secret. You can reuse that role for the CSI app: look up its ARN (e.g. `terraform output` in `terraform/aws` or in the AWS console), and use that ARN in the ServiceAccount annotation in Step 2. The trust policy must allow the **CSI app’s** ServiceAccount (e.g. `default/myapp-csi`), not just ESO’s. If the ESO role trust policy is scoped only to the ESO SA, create a separate role for the CSI app with the same permissions and a trust policy for `system:serviceaccount:default:myapp-csi`.

### Step 2: Create a ServiceAccount and annotate it with the role ARN

```bash
# Create ServiceAccount with the IAM role ARN (replace with your role ARN)
kubectl create serviceaccount myapp-csi -n default

kubectl annotate serviceaccount myapp-csi -n default \
  eks.amazonaws.com/role-arn=arn:aws:iam::ACCOUNT_ID:role/YOUR_IRSA_ROLE_NAME
```

### Step 3: Use this ServiceAccount in the deployment

In `k8s/aws/csi/deployment.yaml`, set `spec.template.spec.serviceAccountName: myapp-csi` (and ensure the ServiceAccount exists in the same namespace). Then apply the deployment; the pod will receive temporary AWS credentials via IRSA when it mounts the CSI volume.

---

## 2. Create the SecretProviderClass

The `SecretProviderClass` tells the driver **which** secret to fetch and **how** to map it to files (and optionally to a K8s Secret).

We ship an example in the repo: **`k8s/aws/csi/secret-provider-class.yaml`**. It references the same secret name as the main lab: `prod/myapp/database`. **Provider v2+:** `jmesPath` lives under `parameters.objects` with `objectAlias` per JSON key; `secretObjects.data` then uses `objectName` (the alias) and `key`. Older providers used `jmesPath` inside `secretObjects.data` — that format is no longer valid. See the [AWS provider docs](https://github.com/aws/secrets-store-csi-driver-provider-aws) for the latest schema.

- **EKS (IRSA)**: use the same namespace as your deployment; the pod’s ServiceAccount must have the IAM role annotation.
- **MicroK8s**: same file; ensure the provider can reach AWS (credentials on the node or via a Secret — see AWS provider docs for static auth).

Apply it:

```bash
kubectl apply -f k8s/aws/csi/secret-provider-class.yaml
```

---

## 3. Deploy the app with a CSI volume

Use the example deployment that mounts the CSI volume (and optionally uses the synced K8s Secret for env vars): **`k8s/aws/csi/deployment.yaml`**.

- The pod spec has a **volume** with `csi.driver: secrets-store.csi.k8s.io` and `volumeAttributes.secretProviderClass: aws-sm-lab`.
- The container **volumeMount** points at a directory; the driver will mount the secret there (e.g. as files or a JSON file).
- If you enabled `syncSecret`, the provider can also create a K8s Secret; the example deployment uses the same secret name as the ESO path (`myapp-database-creds`) so the app works the same.
- **One manifest for both:** The repo has a single base deployment (`k8s/aws/csi/deployment.yaml`) with no `nodePublishSecretRef` (EKS uses IRSA). For **MicroK8s**, apply the Kustomize overlay so the pod gets AWS credentials via `nodePublishSecretRef`: `kubectl apply -k k8s/aws/csi/overlays/microk8s`. For **EKS**, apply the base and set the ServiceAccount (see below).

**EKS (IRSA):** Create a ServiceAccount, annotate it with the IAM role ARN, and set `spec.serviceAccountName` in the deployment. Example:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-csi
  namespace: default
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT:role/your-irsa-role
---
# In Deployment spec:
spec:
  template:
    spec:
      serviceAccountName: myapp-csi
```

Then:

```bash
kubectl apply -f k8s/aws/csi/deployment.yaml
kubectl rollout status deployment/myapp-csi -n default
```

**MicroK8s:** Apply the overlay (adds `nodePublishSecretRef`; create `aws-csi-provider-credentials` in `default` first): `kubectl apply -k k8s/aws/csi/overlays/microk8s` then `kubectl rollout status deployment/myapp-csi -n default`.

---

## 4. Verify

- Check the CSI driver and AWS provider pods in `kube-system`:
  ```bash
  kubectl get pods -n kube-system -l app=secrets-store-csi-driver
  kubectl get pods -n kube-system -l app=csi-secrets-store-provider-aws
  ```
- Check that the `SecretProviderClass` is used and the pod is running:
  ```bash
  kubectl get secretproviderclass
  kubectl get pods -l app=myapp-csi
  ```
- If the deployment uses the synced K8s Secret for env vars:
  ```bash
  kubectl exec deploy/myapp-csi -n default -- env | grep DB_
  ```
- Open the app (port-forward or LoadBalancer) and hit `/secrets/compare` to see env vs volume; both should match after sync.

---

## 5. Rotation

- With `enableSecretRotation=true`, the driver can refresh mounted file content on an interval (e.g. 2 minutes). The synced K8s Secret may also be updated.
- Env vars from that Secret still only update on pod restart unless you use something like Reloader. So rotation behavior is similar to ESO: volume can update in place; env vars need a restart or a reloader.

---

## 6. Cleanup

To remove the CSI-based app and the driver (leave ESO and the rest of the lab as-is):

```bash
kubectl delete -k k8s/aws/csi/overlays/microk8s --ignore-not-found   # or delete -f base + secret-provider-class
kubectl delete -f k8s/aws/csi/secret-provider-class.yaml --ignore-not-found
helm uninstall csi-secrets-store-provider-aws -n kube-system
helm uninstall csi-secrets-store -n kube-system
```

---

## Troubleshooting: "An IAM role must be associated with service account"

- **Ensure you applied the MicroK8s overlay** so the pod has `nodePublishSecretRef`. Check with:  
  `kubectl get deployment myapp-csi -n default -o yaml | grep -A2 nodePublishSecretRef`  
  If that is empty, you applied the base deployment; run `kubectl apply -k k8s/aws/csi/overlays/microk8s` and recreate the pod (e.g. delete the deployment and re-apply the overlay).
- **Ensure the secret exists in the pod’s namespace:**  
  `kubectl get secret aws-csi-provider-credentials -n default`
- If the error persists, the AWS provider may not accept credentials from `nodePublishSecretRef` and may require IRSA (EKS). On MicroK8s, use **ESO** for the lab; CSI is most reliable on EKS with IRSA.

---

## Summary

- **CSI driver** + **AWS provider** work on **MicroK8s** and **EKS**.
- **SecretProviderClass** defines which AWS secret to mount (and optional K8s Secret sync).
- **Deployment** uses a CSI volume + optional `envFrom` from the synced Secret.
- This doc and the `k8s/aws/csi/` manifests let you **try the CSI path** alongside the main ESO path and document both for interviews.

For the main lab flow (one pattern, ESO everywhere on AWS), keep using [DEPLOY-LOCAL.md](DEPLOY-LOCAL.md) and [DEPLOY-EKS.md](DEPLOY-EKS.md). Use this guide when you want to compare ESO vs CSI hands-on.
