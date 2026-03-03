# 🔐 K8s Secrets Lab

> Learn how to connect Kubernetes pods to AWS Secrets Manager and Azure Key Vault — with Terraform, secret rotation, and CI/CD. The way it's done in production.

## ⚡ Quick Start (2 minutes)

```bash
git clone https://github.com/Osomudeya/k8s-secret-lab.git
cd k8s-secret-lab
bash spinup.sh          # auto-detects kind or MicroK8s, provisions everything
```

Use `bash spinup.sh` and `bash teardown.sh` (scripts may not have execute bits; `./spinup.sh` works after `chmod +x spinup.sh teardown.sh`).

Then run the lab UI: `npm run dev` and open **http://localhost:5173**. To see rotation live, run `bash rotation/test-rotation.sh` after spinup finishes.

To understand what spinup does step-by-step (or run without the script), see **[DEPLOY.md](DEPLOY.md)**.

---

## How it works (the big picture)

1. **You deploy infra** — Terraform creates the secret in **AWS Secrets Manager** and installs **External Secrets Operator (ESO)** into your Kubernetes cluster.
2. **ESO runs inside your cluster** — It doesn’t matter if the cluster is **local** (kind, MicroK8s, k3s) or **cloud** (EKS). ESO is just a controller in that cluster. There is **no special “ESO addon”** for MicroK8s; you install ESO via Helm (or Terraform does it for you).
3. **ESO reads from AWS and writes into the cluster** — It pulls the secret from AWS Secrets Manager and creates/updates a normal **Kubernetes Secret** in your cluster. Your app then uses that K8s Secret (env vars or volume). So: **AWS → ESO → K8s Secret → your pod.** The cluster never “syncs to” AWS; the cluster (via ESO) **syncs from** AWS.

For a **step-by-step deploy** (if you want to run each step manually instead of using spinup), see **[DEPLOY.md](DEPLOY.md)**.

---

## How to navigate the lab

- **Home** — Quick start, repo map, and module cards.
- **Full flow recap** (module 6) — One-page summary: create → sync → consume → read. Start here if you want the big picture first.
- **Modules 1–5** — Why External Secrets, AWS, Azure, Rotation, CI/CD.
- **Scenario-based interviews** (module 5) — 5 scenario questions with what interviewers test and strong answers.
- **Interview Quiz** — Multiple-choice questions with instant explanations.

---

## What You'll Learn

| Module | Topic |
|--------|-------|
| 01 | Why native K8s secrets aren't enough |
| 02 | AWS Secrets Manager + External Secrets Operator |
| 03 | Azure Key Vault + AKS Workload Identity |
| 04 | Secret rotation (zero downtime) |
| 05 | CI/CD with GitHub Actions OIDC |
| 06 | **Scenario-based interviews** — 5 real scenarios + strong answers |
| 07 | **Full flow recap** — Creation to consumption in one page |
| 🎯 | Interview question bank (multiple choice) |

---

## Prerequisites

```bash
# Check you have everything
kubectl version --client   # v1.25+
terraform --version        # v1.5+
helm version --short       # v3.10+
node --version             # v18+ (for the lab UI)
```

Plus: an AWS account (free tier) OR an Azure subscription (free tier). **Docker is not required for learners** — the sample app image is pre-built and published on Docker Hub.

---

## Who does what

| Role | What you do |
|------|-------------|
| **Learner** | Clone the repo, run Terraform, replace `YOUR_DOCKERHUB_USERNAME` in `k8s/aws/deployment.yaml` (and Azure if used) with the **repo owner’s** Docker Hub username, then apply the manifests. The app image pulls from Docker Hub. No build, no push. |
| **Repo owner** | Set `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` in GitHub Actions. The `deploy.yml` workflow builds and pushes the app image when `app/` or `k8s/` changes. Learners use your username in the manifest. |

---

## Sample app image

The app in `app/` is the sample Node server that runs in-cluster (read the code to see how it reads secrets from env and volume). The image is **pre-built and available on Docker Hub** at `<repo-owner-username>/k8s-secrets-lab-app:latest`.

- **Learners:** In `k8s/aws/deployment.yaml` (and `k8s/azure/deployment.yaml` if using Azure), replace `YOUR_DOCKERHUB_USERNAME` with the repo owner’s Docker Hub username (or your own if you’ve built and pushed the image). No build step needed.
- **Repo owner:** GitHub Actions builds and pushes the image on push to `main` when `app/` or `k8s/` change. Configure `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` in the repo’s Actions secrets. How to get or recreate these is in [DEPLOY.md](DEPLOY.md#what-you-need-to-set-up-for-cicd).

**Do not commit `terraform.tfstate` or `*.tfstate.*`** — they are in `.gitignore` and may contain account IDs and ARNs; never push them to a public repo.

**Rotation:** For rotation to trigger pod restarts when using env vars, install [Stakater Reloader](https://github.com/stakater/Reloader) (see [DEPLOY.md](DEPLOY.md#optional-install-reloader-for-secret-rotation-with-env-vars)); the lab UI explains the pattern.

**Troubleshooting:** See [DEPLOY.md — Troubleshooting](DEPLOY.md#troubleshooting) for common issues (ESO not syncing, image pull errors, Terraform, Reloader). Teardown/cleanup steps are there too.

---

## Repo structure (where to find what)

| Path | What's there |
|------|----------------|
| **[DEPLOY.md](DEPLOY.md)** | **Step-by-step deploy with Kind or MicroK8s** (local clusters). |
| `lab-ui/` | This interactive tutorial (React + Vite). Run with `npm run dev`. |
| `terraform/aws/` | AWS Secrets Manager, ESO Helm, IRSA, ClusterSecretStore. |
| `terraform/azure/` | Azure Key Vault, AKS, Workload Identity, CSI driver. |
| `k8s/aws/` | ExternalSecret, SecretStore (static auth for local), Deployment. |
| `k8s/azure/` | SecretProviderClass + Deployment (CSI volume + Secret). |
| `app/` | Sample Node app: `server.js` reads env + `/etc/secrets`. Dockerfile for the image. |
| `.github/workflows/` | Terraform plan/apply, build app image, deploy to K8s (OIDC). |
| `rotation/` | Script to test secret rotation (AWS path). |

```
k8s-secrets-lab/
├── lab-ui/          # Interactive tutorial (start here)
├── terraform/
│   ├── aws/         # AWS SM + IRSA + ESO
│   └── azure/       # AKS + Key Vault + Workload Identity
├── k8s/
│   ├── aws/         # ExternalSecret + SecretStore (static auth) + Deployment
│   └── azure/       # SecretProviderClass + Deployment manifests
├── app/             # Sample Node app (Dockerfile + server.js) deployed into K8s
├── rotation/        # Script to test secret rotation live
└── .github/
    └── workflows/   # Terraform CI + Deploy CD (OIDC auth)
```

---

## Who This Is For

Junior to mid-level engineers preparing for interviews or starting a new role where secrets management comes up. No handwaving — every step is real, runnable code.

---

**If this helped you, please [⭐ star the repo](https://github.com/Osomudeya/k8s-secrets-lab).** It helps others find the lab.

Built with ❤️ — follow along at [your Medium article link]. Questions? Open a [GitHub Discussion](https://github.com/Osomudeya/k8s-secrets-lab/discussions) or an issue.
