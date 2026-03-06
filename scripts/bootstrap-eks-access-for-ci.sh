#!/usr/bin/env bash
# =============================================================================
# Bootstrap EKS access for GitHub Actions (one-time after spinup with EKS)
#
# Problem: Terraform plan in CI refreshes helm_release before the EKS access
# entry exists, so "Kubernetes cluster unreachable: credentials" fails.
#
# Fix: From a context that already has cluster access (your machine after
# spinup.sh with EKS), create only the access entry so the GitHub Actions
# role can talk to the cluster. Then CI plan/apply will succeed.
#
# Usage (from repo root):
#   export GITHUB_ACTIONS_ROLE_ARN="arn:aws:iam::ACCOUNT:role/github-actions-Osomudeya-k8s-secret-lab"
#   bash scripts/bootstrap-eks-access-for-ci.sh
#
# Or get the ARN from terraform/github-oidc:
#   (cd terraform/github-oidc && terraform output -raw role_arn)
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TF_DIR="$REPO_ROOT/terraform/aws"
OIDC_DIR="$REPO_ROOT/terraform/github-oidc"

[[ -d "$TF_DIR" ]] || { echo "terraform/aws/ not found"; exit 1; }

# GitHub Actions role ARN (required for EKS access entry)
GITHUB_ACTIONS_ROLE_ARN="${GITHUB_ACTIONS_ROLE_ARN:-}"
if [[ -z "$GITHUB_ACTIONS_ROLE_ARN" ]] && [[ -d "$OIDC_DIR" ]]; then
  if (cd "$OIDC_DIR" && terraform output -raw role_arn 2>/dev/null); then
    GITHUB_ACTIONS_ROLE_ARN="$(cd "$OIDC_DIR" && terraform output -raw role_arn)"
  fi
fi
[[ -z "$GITHUB_ACTIONS_ROLE_ARN" ]] && {
  echo "Set GITHUB_ACTIONS_ROLE_ARN (or run terraform output -raw role_arn in terraform/github-oidc)"
  exit 1
}

# Load .lab-state if present (from spinup.sh)
if [[ -f "$REPO_ROOT/.lab-state" ]]; then
  # shellcheck source=/dev/null
  source "$REPO_ROOT/.lab-state"
fi
AWS_REGION="${AWS_REGION:-us-east-1}"
EKS_CLUSTER_NAME="${EKS_CLUSTER_NAME:-secrets-lab}"
BUCKET_NAME="${BUCKET_NAME:-}"
DYNAMO_TABLE="${DYNAMO_TABLE:-k8s-secrets-lab-tflock}"

echo "Bootstrap EKS access for CI"
echo "  Cluster: $EKS_CLUSTER_NAME"
echo "  Region:  $AWS_REGION"
echo "  Role:    $GITHUB_ACTIONS_ROLE_ARN"
echo ""

cd "$TF_DIR"

# Init (backend from .lab-state or env)
if [[ -n "$BUCKET_NAME" && "$BUCKET_NAME" != "local" ]]; then
  echo "Initializing Terraform (S3 backend)..."
  terraform init -input=false -reconfigure \
    -backend-config=bucket="$BUCKET_NAME" \
    -backend-config=key=k8s-secrets-lab/terraform.tfstate \
    -backend-config=region="${AWS_REGION}" \
    -backend-config=dynamodb_table="${DYNAMO_TABLE}" \
    -backend-config=encrypt=true
else
  echo "Initializing Terraform (local backend or set TF_BACKEND_BUCKET)..."
  if [[ -n "${TF_BACKEND_BUCKET:-}" ]]; then
    terraform init -input=false -reconfigure \
      -backend-config=bucket="${TF_BACKEND_BUCKET}" \
      -backend-config=key=k8s-secrets-lab/terraform.tfstate \
      -backend-config=region="${TF_BACKEND_REGION:-$AWS_REGION}" \
      -backend-config=dynamodb_table="${TF_BACKEND_DYNAMO:-$DYNAMO_TABLE}" \
      -backend-config=encrypt=true
  else
    terraform init -input=false -reconfigure
  fi
fi

echo ""
echo "Creating EKS access entry for GitHub Actions role (targeted apply)..."
terraform apply -input=false -auto-approve \
  -target=aws_eks_access_entry.github_actions \
  -target=aws_eks_access_policy_association.github_actions_admin \
  -var="create_eks=true" \
  -var="use_eks=true" \
  -var="cluster_name=$EKS_CLUSTER_NAME" \
  -var="github_actions_role_arn=$GITHUB_ACTIONS_ROLE_ARN" \
  -var="aws_region=$AWS_REGION"

echo ""
echo "Done. The GitHub Actions role can now reach the EKS cluster. Re-run the Terraform CI workflow."