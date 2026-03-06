# How rotation works

What happens when you rotate the secret and how to run the test. Flow: [HOW-IT-WORKS.md](HOW-IT-WORKS.md).

## Flow

Update AWS SM → ESO syncs (refreshInterval or force-sync) → K8s Secret updated → Volume file updates ~60s; env stays old until pod restart → Reloader triggers rollout → new env = new value.

## /secrets/compare endpoint

`GET /secrets/compare` returns:

| Field | Meaning |
|-------|---------|
| comparison | Per-key: env, volume, match |
| all_match | true when env and volume match for all keys |
| rotation_detected | true when any key differs (volume new, env stale) |
| message | Short status text |

CI: after rotate + force-sync assert `rotation_detected: true`; after rollout assert `all_match: true`.

## Scripts step-by-step (for beginners)

**spinup.sh:** One script that (1) checks AWS and tools, (2) asks you to choose EKS or MicroK8s, (3) creates or uses Terraform backend (S3 + DynamoDB), (4) runs Terraform (AWS secret, optional EKS cluster, ESO, ClusterSecretStore), (5) waits for ESO CRDs and applies ExternalSecret + Deployment + Service, (6) prints the app URL. Flow: clone repo → `bash spinup.sh` (or `--cluster eks`) → follow prompts → open the URL when done.

**teardown.sh:** Reads the same state spinup wrote (e.g. cluster type, backend). It removes K8s resources (ExternalSecret, deployment, service), then runs `terraform destroy` so the AWS secret, IAM role, and (if you used EKS) ESO/ClusterSecretStore are removed. It does **not** delete the EKS cluster. Run when you’re done to avoid leaving paid resources on. Use `--yes` to skip confirmation.

**rotation/test-rotation.sh:** (1) Checks that the app pod and ExternalSecret exist. (2) Shows current secret value from the pod’s volume. (3) Puts a new value in AWS Secrets Manager. (4) Forces ESO to sync (annotation bump). (5) Waits a few seconds. (6) Shows the value from the volume again (now new) and calls `/secrets/compare`. You’ll see env still old, volume new (rotation_detected). After a rollout or restart, env and volume match again. Run from the repo root with `kubectl` and `aws` configured: `bash rotation/test-rotation.sh`.

## Run manually

```bash
bash rotation/test-rotation.sh
```

Script: ready check → show current volume/env → put new value in AWS SM → force ESO sync → show volume (new) vs env (old) → call /secrets/compare. Watch in-pod table: DB_PASSWORD ✗ then ✓ after restart.

## Run in CI

EKS: Actions → Rotation test. Workflow rotates secret, checks rotation_detected then all_match after rollout.

## Why env is stale; why volume updates

- **Env vars** are set once at container start and stay fixed for the life of the process. When the Secret is updated, the process env block does not change.
- **Volume**: the kubelet keeps the Secret-backed file in sync when the Secret changes (~60s). The app reads the file on each request, so it sees the new value.
- **The gap**: after rotation, volume = new value, env = old value until the pod restarts. That’s the “env stale, volume fresh” split interviewers care about. Use Reloader (or `kubectl rollout restart`) so env picks up the new secret.

## Rotation with the CSI driver (myapp-csi)

For the **ESO app (myapp)** rotation is: update AWS SM → ESO syncs (refreshInterval or force-sync) → K8s Secret updated → volume/env behavior above.

For the **CSI app (myapp-csi)** there is no ESO. The Secrets Store CSI Driver with `enableSecretRotation=true` (see [EKS-CSI-STEPS](EKS-CSI-STEPS.md) and [CSI-DRIVER-AWS](CSI-DRIVER-AWS.md)) periodically re-fetches the secret from AWS and updates the **mounted files** (and, if `syncSecret` is enabled, the synced K8s Secret). So:

1. **Same source:** Rotate the secret in AWS (e.g. `rotation/test-rotation.sh` or AWS console).
2. **Different sync:** CSI driver refreshes the volume on its own interval (e.g. 2 minutes). No ESO force-sync; the driver does the refresh.
3. **Env vs volume:** Same as ESO: the volume can update in place; env vars from the synced Secret still only update on pod restart unless you use Reloader.

To see rotation on the CSI app: rotate in AWS, wait for the driver’s rotation interval (or restart the pod to force a remount), then hit the CSI app’s `/secrets/compare`.

→ [README →](../README.md) · [HOW-IT-WORKS →](HOW-IT-WORKS.md) · [Troubleshooting →](TROUBLESHOOTING.md)
