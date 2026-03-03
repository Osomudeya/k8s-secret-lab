# GitHub Actions OIDC — one-time setup

This folder creates the **GitHub OIDC provider** (if you don’t have it) and the **IAM role** that GitHub Actions uses to talk to AWS (no long-lived keys). Run it **once** from your machine, then add the role ARN to GitHub Secrets.

---

## If you don’t have the GitHub OIDC provider yet (most users)

Terraform will create both the OIDC provider and the IAM role. You only need your repo name:

```bash
cd terraform/github-oidc
terraform init
terraform plan  -var="github_repo=YOUR_ORG/YOUR_REPO"
terraform apply -var="github_repo=YOUR_ORG/YOUR_REPO"
```

Example: `-var="github_repo=Osomudeya/k8s-secrets-lab"`. Default branch is `main`; override with `-var="github_branch=your-branch"` if needed.

---

## If the OIDC provider already exists (e.g. EntityAlreadyExists)

If you see **Provider with url https://token.actions.githubusercontent.com already exists**, use the existing provider and only create/update the role:

```bash
terraform apply \
  -var="github_repo=Osomudeya/k8s-secrets-lab" \
  -var="use_existing_oidc_provider=true"
```

Terraform will skip creating the provider and use the one in your account.

---

## If you already have the provider and want to pass its ARN

```bash
terraform apply \
  -var="github_repo=YOUR_ORG/YOUR_REPO" \
  -var="oidc_provider_arn=arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
```

Find the ARN in **IAM → Identity providers → token.actions.githubusercontent.com**.

---

## 3. Copy the role ARN

```bash
terraform output role_arn
```

Example: `arn:aws:iam::334091769766:role/github-actions-Osomudeya-k8s-secrets-lab`

## 4. Add to GitHub

1. Repo → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**
3. Name: `AWS_ROLE_ARN`
4. Value: paste the `role_arn` from step 3
5. Save

After that, the Terraform CI, Deploy, and Teardown workflows can use this role via OIDC (no access keys).

## Restrict to a different branch or environment

To allow only `production` branch or a GitHub Environment, change the trust policy condition in `main.tf` (e.g. `ref:refs/heads/production` or use `environment` claim). Default is `main`.
