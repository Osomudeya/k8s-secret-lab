# ESO vs CSI Driver — two patterns for K8s secrets

Both get secrets from an external store into pods. This lab uses **ESO**; [Secrets Store CSI Driver](https://secrets-store-csi-driver.sigs.k8s.io/) is a different approach (not a replacement). → [HOW-IT-WORKS](HOW-IT-WORKS.md) for flow.

## How each works

**ESO:** AWS SM → ESO polls → creates/updates K8s Secret → pod uses envFrom + volume. **CSI:** AWS SM → CSI Driver + provider → volume mount in pod (no K8s Secret by default). Env not native for CSI.

## Comparison

| | ESO | CSI Driver |
|---|---|---|
| K8s Secret | Yes | No (optional syncSecret) |
| Env vars | Yes (envFrom) | Workaround only |
| Rotation | ESO + Reloader for env | File can auto-update |
| etcd | Secret in etcd (base64) | Not in etcd |
| IRSA | Yes | Yes |
| Best for | Most teams, full chain | No-K8s-Secrets policy |

## Why this lab uses ESO

ESO is common in interviews and production; the full chain (AWS SM → ESO → K8s Secret → pod) and env/volume divergence during rotation are the main teaching moments. CSI doesn’t show env vs volume the same way.

## When to choose CSI

Security policy forbids K8s Secrets (etcd); you only need volume; you want rotation without Reloader.

**Further reading:** [ESO](https://external-secrets.io/latest/) · [CSI Driver](https://secrets-store-csi-driver.sigs.k8s.io/) · [AWS CSI provider](https://github.com/aws/secrets-store-csi-driver-provider-aws) · [Try CSI in this repo](CSI-DRIVER-AWS.md)

→ [README →](../README.md) · [HOW-IT-WORKS →](HOW-IT-WORKS.md) · [Troubleshooting →](TROUBLESHOOTING.md)
