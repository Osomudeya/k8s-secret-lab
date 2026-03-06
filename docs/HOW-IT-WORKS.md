# How secrets flow in this lab

Full flow before you run any command. See [ROTATION.md](ROTATION.md) for rotation steps and [ESO-VS-CSI.md](ESO-VS-CSI.md) for the CSI alternative.

## The problem this solves

Hardcoded secrets are a security risk; plain K8s Secrets are only base64 in etcd and still need a source. This lab uses AWS Secrets Manager as the source, ESO to sync into a K8s Secret, and pods consume it via env or volume — no credentials in Git or cluster.

## The full flow

```
Developer → AWS Secrets Manager (prod/myapp/database)
    → External Secrets Operator (polls refreshInterval, auth via IRSA)
    → K8s Secret (myapp-database-creds, owned by ESO)
    → Env vars (set at pod start; stale after rotation until restart)
    → Volume mount (/etc/secrets; updates ~60s after Secret changes)
```

## What each component does

### AWS Secrets Manager

JSON with `username`, `password`, `host`, `port`. Only the ESO IAM role can read it. You update the value here; ESO picks it up on next poll or force-sync.

### External Secrets Operator (ESO)

Operator in `external-secrets` namespace. Reads `ExternalSecret` CRs, authenticates via IRSA, creates/updates the K8s Secret. If ESO crashes, existing pods and Secrets keep working; new syncs pause until recovery.

### ExternalSecret (`k8s/aws/external-secret.yaml`)

| Field | Purpose |
|-------|---------|
| secretStoreRef | ClusterSecretStore (EKS/IRSA) or SecretStore (local/static) |
| target.name | K8s Secret name ESO creates |
| refreshInterval | Poll interval for AWS SM (e.g. 1h) |
| data | Maps AWS SM JSON keys → K8s Secret keys |

### K8s Secret (myapp-database-creds)

Owned by ESO (`creationPolicy: Owner`). base64 in etcd. Pods use it via `envFrom` and/or volume mount.

### IRSA

EKS OIDC → pod ServiceAccount annotated with IAM role ARN → ESO exchanges K8s token for AWS temp creds via STS. Role policy: GetSecretValue (and describe/list) on this secret only. No access keys in cluster.

### Env vars vs Volume mount

| | Env vars | Volume mount |
|---|---|---|
| Set when | Pod start | Read on each filesystem call |
| After rotation | Stale until restart | Updates ~60s after Secret change |
| Refresh | Restart pod or Stakater Reloader | Automatic |

Reloader: watches Secret annotation on Deployment; on Secret change triggers rolling restart so env vars refresh.

### CSI Driver — the other pattern

[Secrets Store CSI Driver](https://secrets-store-csi-driver.sigs.k8s.io/) mounts AWS SM directly into the pod as a volume; no K8s Secret by default. Env vars not native. This lab uses ESO for the full chain and to teach env/volume divergence during rotation. → [ESO vs CSI](ESO-VS-CSI.md)

## What happens during rotation

1. Update secret in AWS SM. 2. ESO syncs (next refreshInterval or force-sync). 3. ESO updates K8s Secret. 4. Volume: kubelet updates mounted file (~60s); pod sees new value on next read. 5. Env: still old until pod restarts. 6. Reloader triggers rollout; new pods get new env. 7. All match again. → [Run rotation test](ROTATION.md)

## Navigation

- [README →](../README.md) · [Local setup →](DEPLOY-LOCAL.md) · [EKS setup →](DEPLOY-EKS.md) · [Terraform →](TERRAFORM.md) · [Rotation →](ROTATION.md) · [ESO vs CSI →](ESO-VS-CSI.md) · [Troubleshooting →](TROUBLESHOOTING.md)
