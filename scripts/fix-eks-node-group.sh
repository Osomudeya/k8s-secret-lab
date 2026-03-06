#!/usr/bin/env bash
# Delete a stuck EKS node group so Terraform can recreate it on next apply.
# Use after applying the EKS fix (endpoint_private_access + subnet tag "owned").
# Then re-run: bash spinup.sh --cluster eks
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

CLUSTER_NAME="${EKS_CLUSTER_NAME:-secrets-lab}"
NODEGROUP_NAME="${EKS_NODEGROUP_NAME:-k8s-secrets-lab-ng}"
AWS_REGION="${AWS_REGION:-us-east-1}"

echo "Cluster: $CLUSTER_NAME  Node group: $NODEGROUP_NAME  Region: $AWS_REGION"
STATUS=$(aws eks describe-nodegroup \
  --cluster-name "$CLUSTER_NAME" \
  --nodegroup-name "$NODEGROUP_NAME" \
  --region "$AWS_REGION" \
  --query 'nodegroup.status' --output text 2>/dev/null || echo "MISSING")

if [[ "$STATUS" == "MISSING" ]]; then
  echo "Node group not found. Nothing to delete. Run: bash spinup.sh --cluster eks"
  exit 0
fi

echo "Current status: $STATUS"
echo "Deleting node group (takes 2–5 min)..."
aws eks delete-nodegroup \
  --cluster-name "$CLUSTER_NAME" \
  --nodegroup-name "$NODEGROUP_NAME" \
  --region "$AWS_REGION"

echo "Waiting for node group to be deleted..."
aws eks wait nodegroup-deleted \
  --cluster-name "$CLUSTER_NAME" \
  --nodegroup-name "$NODEGROUP_NAME" \
  --region "$AWS_REGION"

echo "Done. Re-run spinup to recreate the node group with the fixed config:"
echo "  bash spinup.sh --cluster eks"
