# Deploy this lab — choose your path

This repo has **two separate deploy paths**. Pick one and follow its guide. No branching inside the doc.

| Path | Guide | Best for |
|------|--------|----------|
| **Local** (kind / MicroK8s) | **[DEPLOY-LOCAL.md](DEPLOY-LOCAL.md)** | Learning the concepts, zero EKS cost, port-forward to the app. |
| **EKS** (production-like) | **[DEPLOY-EKS.md](DEPLOY-EKS.md)** | Full CI/CD, OIDC, ALB, rotation test in Actions. |

- **Local:** `bash spinup.sh` → port-forward → http://localhost:3000. When done: `bash teardown.sh`.
- **EKS:** `bash spinup.sh --cluster eks` → push to main → open ALB URL. When done: Teardown workflow or `bash teardown.sh`.

See the [README](README.md#choose-your-path) for the comparison table and quick start of each path.
