#!/usr/bin/env bash
# Build and push the sample app image to Docker Hub.
# Usage:
#   bash scripts/build-push-app.sh                    # uses DOCKERHUB_USERNAME or prompts
#   bash scripts/build-push-app.sh myusername         # build and push as myusername/k8s-secrets-lab-app:latest
#   DOCKERHUB_USERNAME=myusername bash scripts/build-push-app.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$REPO_ROOT/app"
IMAGE_NAME="k8s-secrets-lab-app"
TAG="${TAG:-latest}"

# Resolve Docker Hub username: script arg > env > prompt
if [[ -n "${1:-}" ]]; then
  DOCKERHUB_USERNAME="$1"
elif [[ -n "${DOCKERHUB_USERNAME:-}" ]]; then
  : # already set
else
  echo "Docker Hub username (e.g. veeno):"
  read -r DOCKERHUB_USERNAME
  [[ -z "$DOCKERHUB_USERNAME" ]] && { echo "Need a username."; exit 1; }
fi

FULL_IMAGE="${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${TAG}"

echo "Building ${FULL_IMAGE} from ${APP_DIR}..."
docker build -t "$FULL_IMAGE" "$APP_DIR"

echo "Pushing ${FULL_IMAGE}..."
docker push "$FULL_IMAGE"

echo "Done. Update k8s/aws/deployment.yaml image to: ${FULL_IMAGE}"
echo "  Then: kubectl apply -f k8s/aws/deployment.yaml  (or re-run spinup.sh)"
