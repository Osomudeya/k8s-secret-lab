# Deploy this lab — choose your path

This repo has **two separate deploy paths**. Pick one and follow its guide. No branching inside the doc.

| Path | Guide | Best for |
|------|--------|----------|
| **Local** (kind / MicroK8s) | **[DEPLOY-LOCAL.md](docs/DEPLOY-LOCAL.md)** | Learning the concepts, zero EKS cost, port-forward to the app. |
| **EKS** (production-like) | **[DEPLOY-EKS.md](docs/DEPLOY-EKS.md)** | Full CI/CD, OIDC, ALB, rotation test in Actions. |

- **Local:** `bash spinup.sh` → port-forward → http://localhost:3000. When done: `bash teardown.sh`.
- **EKS:** `bash spinup.sh --cluster eks` → push to main → open ALB URL. When done: Teardown workflow or `bash teardown.sh`.

See the [README](README.md#two-ways-to-run-this-lab) for the comparison table and quick start of each path.

---

## MicroK8s vs kind vs EKS — difference and flow

| | **MicroK8s** | **kind** | **EKS** |
|---|--------------|----------|---------|
| **Where it runs** | Your machine (or VM); single-node by default | Containers on your machine (Docker) | AWS; managed control plane + your node group |
| **Cost** | Free | Free | ~$0.16/hr (control plane + nodes) |
| **Auth for ESO** | Static credentials in a K8s Secret (SecretStore) | Same as MicroK8s | IRSA (no keys in cluster) |
| **Flow** | `spinup.sh` → choose 2 → Terraform creates AWS secret only; spinup installs ESO via Helm and applies static SecretStore + ExternalSecret | Same as MicroK8s if you point kubeconfig at kind | `spinup.sh --cluster eks` → Terraform creates EKS + ESO + ClusterSecretStore (IRSA); spinup applies ExternalSecret |
| **Access app** | `kubectl port-forward svc/myapp 3000:80` → http://localhost:3000 | Same | ALB URL (or port-forward) |
| **CI/CD** | Not used in this lab for local | Not used | GitHub Actions (Terraform, Deploy, Teardown, Rotation test) |

**In short:** Local (MicroK8s/kind) = one machine, static AWS creds, port-forward. EKS = cloud, IRSA, ALB, and optional CI/CD with OIDC.

---
## Navigation
- [README →](README.md)
- [How it works →](docs/HOW-IT-WORKS.md)
- [Local setup →](docs/DEPLOY-LOCAL.md)
- [EKS setup →](docs/DEPLOY-EKS.md)
- [Terraform explained →](docs/TERRAFORM.md)
- [Rotation explained →](docs/ROTATION.md)
- [Troubleshooting →](docs/TROUBLESHOOTING.md)
