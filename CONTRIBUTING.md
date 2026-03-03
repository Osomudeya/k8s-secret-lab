# Contributing to K8s Secrets Lab

Thanks for your interest in improving this lab.

## How to contribute

- **Bug fixes and typos:** Open a pull request with a short description. Ensure Terraform and the lab UI still work (e.g. `terraform fmt`, `npm run build` in `lab-ui/`).
- **New content (modules, quiz questions, scenarios):** Open an issue first to discuss the idea, then a PR. Keep the same style as existing steps (concept, body, prod/tip, code blocks where relevant).
- **CI/CD or Terraform changes:** Test locally. The deploy workflow targets EKS; document any new assumptions in `DEPLOY.md`.

## Repo layout

- `lab-ui/` — React + Vite app (the interactive tutorial). Run with `npm run dev` from repo root or from `lab-ui/`.
- `terraform/aws` and `terraform/azure` — Terraform for AWS and Azure. Run from each directory.
- `k8s/aws` and `k8s/azure` — Kubernetes manifests. Replace placeholders (e.g. `YOUR_DOCKERHUB_USERNAME`) before applying.
- `app/` — Sample Node app; image is built by CI and published to Docker Hub.

## Repo hygiene

- `.DS_Store` is in `.gitignore`. If it was committed before, remove it from the index: `git rm --cached .DS_Store` (and `k8s/.DS_Store`, `lab-ui/.DS_Store`, etc. if present).

## Code style

- Terraform: run `terraform fmt -recursive` before committing.
- Lab UI: follow existing patterns (functional components, inline styles where used).

## Questions

Open a GitHub Discussion or an issue. No formal process — we’re happy to iterate in PRs.
