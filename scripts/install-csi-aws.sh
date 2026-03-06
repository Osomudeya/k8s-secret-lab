#!/usr/bin/env bash
# Install Secrets Store CSI Driver and AWS provider (for use with docs/CSI-DRIVER-AWS.md).
# Run from repo root. Requires: kubectl, helm, cluster with AWS credentials (or IRSA on EKS).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Adding Helm repos..."
helm repo add secrets-store-csi-driver https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts
helm repo add aws-secrets-manager https://aws.github.io/secrets-store-csi-driver-provider-aws
helm repo update

echo "Installing Secrets Store CSI Driver..."
helm upgrade --install csi-secrets-store secrets-store-csi-driver/secrets-store-csi-driver \
  --namespace kube-system \
  --set syncSecret.enabled=true \
  --set enableSecretRotation=true \
  --wait --timeout 3m

echo "Installing AWS provider..."
helm upgrade --install csi-secrets-store-provider-aws aws-secrets-manager/secrets-store-csi-driver-provider-aws \
  --namespace kube-system \
  --wait --timeout 3m

echo "Done. Next: kubectl apply -f $REPO_ROOT/k8s/aws/csi/secret-provider-class.yaml"
echo "Then: kubectl apply -f $REPO_ROOT/k8s/aws/csi/deployment.yaml"
echo "See docs/CSI-DRIVER-AWS.md for EKS IRSA and MicroK8s auth."
