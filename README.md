# 🔐 K8s Secrets Lab

> Learn how to connect Kubernetes pods to AWS Secrets Manager — with Terraform, secret rotation, and CI/CD. The way it's done in production.

---

## Quick Start

```bash
git clone https://github.com/Osomudeya/k8s-secrets-lab
cd k8s-secrets-lab
bash spinup.sh
```

spinup.sh will ask:

```
Choose your cluster:
1) EKS (production-like, ~$0.16/hr, 15-20 min)
2) MicroK8s (local, free, 5 min)
```

**Option 1 — EKS:** Terraform creates the cluster, ESO, secrets, and ALB. CI/CD takes over after first run.
**Option 2 — MicroK8s:** Everything runs locally. Access via port-forward.

---

## How it works (the big picture)

1. **You deploy infra** — Terraform creates the secret in **AWS Secrets Manager** and installs **External Secrets Operator (ESO)** in your cluster.
2. **ESO runs in-cluster** — It syncs from AWS into a normal **Kubernetes Secret**. Your app uses that Secret via env vars and/or volume. **AWS → ESO → K8s Secret → pod.**
3. **Local path** uses a static SecretStore (K8s Secret with AWS creds). **EKS path** uses IRSA (no stored keys).

---

## How to navigate the lab

- **Home** — Module cards and repo map.
- **Modules 1–5** — Why External Secrets, AWS, Rotation, CI/CD (path pills show [Local ✓] [EKS ✓] or [EKS only] per step).
- **Scenario-based interviews** (module 5) — 13 scenario questions + strong answers.
- **Interview Quiz** — Multiple-choice with explanations.
- **Full flow recap** (module 6) — One-page summary.

---

## What you'll learn

| Module | Topic |
|--------|-------|
| 01 | Why native K8s secrets aren't enough |
| 02 | AWS Secrets Manager + External Secrets Operator |
| 03 | Azure Key Vault + AKS Workload Identity |
| 04 | Secret rotation (zero downtime) |
| 05 | CI/CD with GitHub Actions OIDC *(EKS path)* |
| 06 | Scenario-based interviews |
| 07 | Full flow recap |
| 🎯 | Interview question bank |

---

## Prerequisites

- **Both paths:** `kubectl`, `terraform` (~1.7), `helm`, AWS CLI, Node (for lab UI). AWS account (free tier is enough).
- **Local:** MicroK8s installed.
- **EKS:** An EKS cluster (or create one); optional `gh` CLI so spinup can set GitHub secrets.

**Deploy guides:** [DEPLOY-LOCAL.md](DEPLOY-LOCAL.md) (local) · [DEPLOY-EKS.md](DEPLOY-EKS.md) (EKS) · [Troubleshooting](DEPLOY-LOCAL.md#troubleshooting) is in both.

---

## Repo structure

| Path | What's there |
|------|----------------|
| **[DEPLOY-LOCAL.md](DEPLOY-LOCAL.md)** | Local path only (MicroK8s). |
| **[DEPLOY-EKS.md](DEPLOY-EKS.md)** | EKS path only (CI/CD, ALB, OIDC). |
| `lab-ui/` | Interactive tutorial. Run with `npm run dev`. |
| `terraform/aws/` | AWS SM, ESO Helm, IRSA, ClusterSecretStore. |
| `k8s/aws/` | ExternalSecret, SecretStore (static for local), Deployment. |
| `app/` | Sample Node app (env + volume). |
| `.github/workflows/` | Terraform CI, Deploy, Teardown, Rotation test. |
| `rotation/` | Script to test rotation (`bash rotation/test-rotation.sh`). |

---

**If this helped you, please [⭐ star the repo](https://github.com/Osomudeya/k8s-secrets-lab).** Questions? Open a [Discussion](https://github.com/Osomudeya/k8s-secrets-lab/discussions) or an issue.
