#!/usr/bin/env bash
# =============================================================================
# teardown.sh — K8s Secrets Lab infrastructure destroyer
#
# What this does (in order):
#   1.  Reads .lab-state written by spinup.sh
#   2.  Confirms you actually want to destroy everything
#   3.  Deletes K8s resources (Deployment, ExternalSecret, Secrets, SecretStore)
#   4.  Uninstalls Reloader if it was installed
#   5.  Runs terraform destroy (removes ESO Helm release + AWS SM secret + IAM role)
#   6.  Optionally deletes the S3 backend bucket + DynamoDB table
#   7.  Optionally deletes the kind cluster (or stops MicroK8s)
#   8.  Cleans up local files (backend.tf, tfplan, .lab-state)
#   9.  Reports what was destroyed and what was skipped
#
# Usage:
#   bash teardown.sh                   # interactive — asks before each major step
#   bash teardown.sh --yes             # non-interactive — destroys everything
#   bash teardown.sh --keep-cluster    # skip cluster deletion
#   bash teardown.sh --keep-backend    # skip S3 + DynamoDB deletion
#   bash teardown.sh --keep-aws        # skip terraform destroy (keep AWS resources)
#   bash teardown.sh --dry-run         # show what would be destroyed, nothing deleted
#
# Note: AWS SM has a 7-day recovery window on secrets. If you re-run spinup.sh
# within 7 days of teardown, it will fail with "secret already exists in pending
# deletion". Run: aws secretsmanager restore-secret --secret-id prod/myapp/database
# to recover it, or change secret_name in variables.tf.
# =============================================================================

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()     { echo -e "${GREEN}[ OK ]${NC}  $*"; }
warn()   { echo -e "${YELLOW}[WARN]${NC}  $*"; }
skip()   { echo -e "${CYAN}[SKIP]${NC}  $*"; }
err()    { echo -e "${RED}[ERR ]${NC}  $*" >&2; }
header() {
  echo -e "\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${CYAN}  $*${NC}"
  echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}
step()   { echo -e "\n${BOLD}▶  $*${NC}"; }
die()    { err "$*"; exit 1; }

# Destroy tracking — written to REPORT at the end
DESTROYED=()
SKIPPED=()
FAILED=()

destroyed() { DESTROYED+=("$1"); ok "Destroyed : $1"; }
skipped()   { SKIPPED+=("$1");   skip "Skipped   : $1"; }
failed()    { FAILED+=("$1");    warn "Failed    : $1 (see log for details)"; }

# ── Locate repo root ──────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR"
STATE_FILE="$REPO_ROOT/.lab-state"
LOG_FILE="$REPO_ROOT/teardown.log"

# ── Args ──────────────────────────────────────────────────────────────────────
YES=false
KEEP_CLUSTER=false
KEEP_BACKEND=false
KEEP_AWS=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes)           YES=true;          shift ;;
    --keep-cluster)  KEEP_CLUSTER=true; shift ;;
    --keep-backend)  KEEP_BACKEND=true; shift ;;
    --keep-aws)      KEEP_AWS=true;     shift ;;
    --dry-run)       DRY_RUN=true;      shift ;;
    --help|-h)
      grep '^#' "$0" | head -25 | sed 's/^# \?//'
      exit 0 ;;
    *) warn "Unknown argument: $1 (ignored)"; shift ;;
  esac
done

[[ "$DRY_RUN" == "true" ]] && YES=true  # dry-run is non-interactive

# ── Logging ───────────────────────────────────────────────────────────────────
exec > >(tee -a "$LOG_FILE") 2>&1

header "K8s Secrets Lab — Teardown"
echo "  Started  : $(date)"
echo "  DryRun   : $DRY_RUN"
echo ""

# =============================================================================
# STEP 1 — Load state from spinup.sh
# =============================================================================
step "Step 1/9 — Reading lab state"

if [[ ! -f "$STATE_FILE" ]]; then
  warn ".lab-state not found — spinup.sh may not have completed."
  warn "Attempting teardown with defaults. Some steps may fail gracefully."
  # Fall back to safe defaults
  CLUSTER_TYPE="${CLUSTER_TYPE:-generic}"
  KUBECONFIG_ABS="${KUBECONFIG:-$HOME/.kube/config}"
  CLUSTER_CONTEXT=""
  KIND_CLUSTER_NAME="secrets-lab"
  AWS_REGION="${AWS_REGION:-us-east-1}"
  AWS_ACCOUNT=""
  SECRET_NAME="prod/myapp/database"
  SECRET_ARN=""
  USE_BACKEND="false"
  BUCKET_NAME="local"
  DYNAMO_TABLE="local"
  TF_DIR="$REPO_ROOT/terraform/aws"
  K8S_DIR="$REPO_ROOT/k8s/aws"
else
  # shellcheck source=/dev/null
  source "$STATE_FILE"
  ok "State loaded from .lab-state (created: $LAB_DATE)"
  log "Cluster      : $CLUSTER_TYPE"
  log "Kubeconfig   : $KUBECONFIG_ABS"
  log "AWS Region   : $AWS_REGION"
  log "Secret name  : $SECRET_NAME"
  log "TF backend   : ${USE_BACKEND} (bucket: $BUCKET_NAME)"
fi

# Set kubeconfig for all kubectl calls
if [[ -n "${KUBECONFIG_ABS:-}" && -f "$KUBECONFIG_ABS" ]]; then
  export KUBECONFIG="$KUBECONFIG_ABS"
  log "KUBECONFIG=$KUBECONFIG_ABS"
fi

# =============================================================================
# STEP 2 — Confirmation
# =============================================================================
step "Step 2/9 — Confirmation"

echo ""
echo -e "  ${RED}${BOLD}This will destroy:${NC}"
echo -e "  ${RED}  • K8s Deployment, ExternalSecret, K8s Secrets${NC}"
[[ "$KEEP_AWS" == "false" ]] && \
  echo -e "  ${RED}  • AWS Secrets Manager secret: $SECRET_NAME (7-day recovery window)${NC}"
[[ "$KEEP_AWS" == "false" ]] && \
  echo -e "  ${RED}  • IAM role: eso-secrets-reader-lab${NC}"
[[ "$KEEP_AWS" == "false" ]] && \
  echo -e "  ${RED}  • ESO Helm release in your cluster${NC}"
[[ "$KEEP_BACKEND" == "false" && "$USE_BACKEND" == "true" ]] && \
  echo -e "  ${RED}  • S3 bucket: $BUCKET_NAME (ALL VERSIONS)${NC}"
[[ "$KEEP_BACKEND" == "false" && "$USE_BACKEND" == "true" ]] && \
  echo -e "  ${RED}  • DynamoDB table: $DYNAMO_TABLE${NC}"
[[ "$KEEP_CLUSTER" == "false" && "$CLUSTER_TYPE" == "kind" ]] && \
  echo -e "  ${RED}  • kind cluster: $KIND_CLUSTER_NAME${NC}"
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
  echo -e "  ${YELLOW}DRY RUN — nothing will actually be deleted.${NC}"
  echo ""
elif [[ "$YES" == "false" ]]; then
  read -rp "  Type 'yes' to confirm teardown: " CONFIRM
  [[ "$CONFIRM" == "yes" ]] || { echo "Aborted."; exit 0; }
fi

# Helper: run a command only if not dry-run
run() {
  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "  ${CYAN}[DRY RUN]${NC} would run: $*"
  else
    "$@"
  fi
}

# Helper: kubectl delete that doesn't fail if resource doesn't exist (or was already removed by ESO)
kube_delete() {
  local desc="$1"; shift
  if kubectl get "$@" &>/dev/null 2>&1; then
    run kubectl delete "$@" 2>/dev/null || true
    # Delete may fail with NotFound if ESO already removed it (e.g. Secret when ExternalSecret deleted)
    if kubectl get "$@" &>/dev/null 2>&1; then
      warn "K8s $desc — delete failed (resource still exists)"
    else
      destroyed "K8s $desc"
    fi
  else
    skipped "K8s $desc (not found)"
  fi
}

# =============================================================================
# STEP 3 — K8s resources
# =============================================================================
step "Step 3/9 — Kubernetes resources"

# Check cluster is reachable before trying kubectl
CLUSTER_REACHABLE=false
kubectl cluster-info &>/dev/null 2>&1 && CLUSTER_REACHABLE=true

if [[ "$CLUSTER_REACHABLE" == "true" ]]; then
  log "Cluster reachable — deleting K8s resources"

  kube_delete "Deployment/myapp"              deployment myapp -n default
  kube_delete "Service/myapp"                 service myapp -n default
  kube_delete "ExternalSecret/app-db-secret"  externalsecret app-db-secret -n default
  kube_delete "Secret/myapp-database-creds"   secret myapp-database-creds -n default
  kube_delete "Secret/aws-eso-credentials"    secret aws-eso-credentials -n default
  kube_delete "SecretStore/aws-secrets-manager-static" \
    secretstore aws-secrets-manager-static -n default

  # Reloader — only uninstall if it was deployed
  if helm list -n default 2>/dev/null | grep -q "reloader"; then
    log "Uninstalling Stakater Reloader..."
    run helm uninstall reloader -n default
    destroyed "Helm/reloader"
  else
    skipped "Helm/reloader (not installed)"
  fi
else
  warn "Cluster not reachable — skipping K8s resource deletion"
  warn "If using kind, the cluster may be gone already."
  warn "If using MicroK8s, check: microk8s status"
  skipped "K8s resources (cluster unreachable)"
fi

# =============================================================================
# STEP 4 — Terraform destroy (removes ESO, AWS SM secret, IAM role)
# =============================================================================
step "Step 4/9 — Terraform destroy"

if [[ "$KEEP_AWS" == "true" ]]; then
  skipped "Terraform destroy (--keep-aws)"
elif [[ ! -d "$TF_DIR" ]]; then
  warn "terraform/aws/ not found at $TF_DIR — skipping terraform destroy"
  skipped "Terraform destroy (directory not found)"
else
  cd "$TF_DIR"

  # Re-init in case providers need downloading or backend changed
  log "Running terraform init (to ensure state is accessible)..."
  if [[ "$DRY_RUN" == "false" ]]; then
    terraform init -input=false -upgrade 2>&1 \
      | grep -E "Initializing|backend|error|Error" || true
  fi

  log "Running terraform destroy..."
  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "  ${CYAN}[DRY RUN]${NC} would run: terraform destroy -auto-approve"
    skipped "Terraform destroy (dry run)"
  else
    [[ "$CLUSTER_TYPE" == "eks" ]] && USE_EKS_VAR="true" || USE_EKS_VAR="false"
    terraform destroy \
      -auto-approve \
      -var="aws_region=${AWS_REGION}" \
      -var="use_eks=${USE_EKS_VAR}" \
      2>&1 || {
        warn "terraform destroy had errors — some resources may need manual cleanup"
        failed "Terraform destroy"
      }
    destroyed "Terraform resources (ESO Helm, AWS SM secret, IAM role)"
  fi

  # ── AWS SM recovery window warning ───────────────────────────────────────────
  echo ""
  warn "AWS Secrets Manager note:"
  warn "  Secret '$SECRET_NAME' is in a 7-day recovery window."
  warn "  If you re-run spinup.sh within 7 days it will fail with:"
  warn "  'InvalidRequestException: secret already scheduled for deletion'"
  warn "  To recover: aws secretsmanager restore-secret --secret-id '$SECRET_NAME'"
  warn "  To force immediate delete (irreversible):"
  warn "  aws secretsmanager delete-secret --secret-id '$SECRET_NAME' --force-delete-without-recovery"
  echo ""

  cd "$REPO_ROOT"
fi

# =============================================================================
# STEP 5 — Delete S3 backend bucket + DynamoDB table
# =============================================================================
step "Step 5/9 — Terraform state backend"

if [[ "$KEEP_BACKEND" == "true" ]]; then
  skipped "S3 backend + DynamoDB (--keep-backend)"
elif [[ "$USE_BACKEND" != "true" || "$BUCKET_NAME" == "local" ]]; then
  skipped "S3 backend (was not used)"
else
  # ── Empty and delete S3 bucket ────────────────────────────────────────────────
  if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    log "Emptying S3 bucket (including all versions for versioned bucket)..."
    if [[ "$DRY_RUN" == "false" ]]; then
      # Must delete all object versions before bucket can be deleted
      aws s3api list-object-versions \
        --bucket "$BUCKET_NAME" \
        --output json 2>/dev/null \
        | python3 -c "
import json, sys, subprocess
data = json.load(sys.stdin)
for version_type in ['Versions', 'DeleteMarkers']:
    for obj in data.get(version_type, []):
        cmd = [
            'aws', 's3api', 'delete-object',
            '--bucket', '$BUCKET_NAME',
            '--key', obj['Key'],
            '--version-id', obj['VersionId']
        ]
        subprocess.run(cmd, check=True, capture_output=True)
print('All object versions deleted')
" 2>/dev/null || {
          # Fallback if python3 not available or no versions
          aws s3 rm "s3://$BUCKET_NAME" --recursive 2>/dev/null || true
        }

      aws s3api delete-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$AWS_REGION"
      destroyed "S3 bucket: $BUCKET_NAME"
    else
      echo -e "  ${CYAN}[DRY RUN]${NC} would empty and delete s3://$BUCKET_NAME"
      skipped "S3 bucket (dry run)"
    fi
  else
    skipped "S3 bucket $BUCKET_NAME (does not exist)"
  fi

  # ── Delete DynamoDB table ─────────────────────────────────────────────────────
  if aws dynamodb describe-table \
       --table-name "$DYNAMO_TABLE" \
       --region "$AWS_REGION" &>/dev/null; then
    log "Deleting DynamoDB lock table: $DYNAMO_TABLE"
    if [[ "$DRY_RUN" == "false" ]]; then
      aws dynamodb delete-table \
        --table-name "$DYNAMO_TABLE" \
        --region "$AWS_REGION" >/dev/null
      destroyed "DynamoDB table: $DYNAMO_TABLE"
    else
      echo -e "  ${CYAN}[DRY RUN]${NC} would delete DynamoDB table: $DYNAMO_TABLE"
      skipped "DynamoDB table (dry run)"
    fi
  else
    skipped "DynamoDB table $DYNAMO_TABLE (does not exist)"
  fi
fi

# =============================================================================
# STEP 6 — Cluster deletion / MicroK8s stop
# =============================================================================
step "Step 6/9 — Cluster"

if [[ "$KEEP_CLUSTER" == "true" ]]; then
  skipped "Cluster (--keep-cluster)"
else
  case "$CLUSTER_TYPE" in
    kind|kind-create)
      if kind get clusters 2>/dev/null | grep -q "^${KIND_CLUSTER_NAME}$"; then
        log "Deleting kind cluster: $KIND_CLUSTER_NAME"
        run kind delete cluster --name "$KIND_CLUSTER_NAME"
        destroyed "kind cluster: $KIND_CLUSTER_NAME"
      else
        skipped "kind cluster $KIND_CLUSTER_NAME (does not exist)"
      fi
      ;;
    microk8s)
      warn "MicroK8s: not stopping automatically (it may serve other workloads)."
      warn "  Stop manually: microk8s stop"
      warn "  Uninstall:     sudo snap remove microk8s"
      skipped "MicroK8s (manual step — see above)"
      ;;
    eks)
      warn "EKS cluster not deleted by teardown.sh (EKS deletion is destructive and slow)."
      warn "  Delete manually: eksctl delete cluster --name $EKS_CLUSTER_NAME --region $AWS_REGION"
      warn "  Or via AWS Console: EKS → Clusters → Delete"
      skipped "EKS cluster (manual step — see above)"
      ;;
    *)
      skipped "Cluster deletion (generic or unknown cluster type)"
      ;;
  esac
fi

# =============================================================================
# STEP 7 — Local file cleanup
# =============================================================================
step "Step 7/9 — Local file cleanup"

cleanup_file() {
  local f="$1" desc="$2"
  if [[ -f "$f" ]]; then
    run rm "$f"
    destroyed "$desc"
  else
    skipped "$desc (not found)"
  fi
}

cleanup_dir() {
  local d="$1" desc="$2"
  if [[ -d "$d" ]]; then
    run rm -rf "$d"
    destroyed "$desc"
  else
    skipped "$desc (not found)"
  fi
}

cleanup_file "$REPO_ROOT/.lab-state"               ".lab-state"
cleanup_file "$TF_DIR/backend.tf"                  "terraform/aws/backend.tf"
cleanup_file "$TF_DIR/tfplan"                      "terraform/aws/tfplan"
cleanup_file "$TF_DIR/terraform.tfstate"           "terraform/aws/terraform.tfstate (local state)"
cleanup_file "$TF_DIR/terraform.tfstate.backup"    "terraform/aws/terraform.tfstate.backup"
cleanup_dir  "$TF_DIR/.terraform"                  "terraform/aws/.terraform/"

# =============================================================================
# STEP 8 — Docker Hub note (manual)
# =============================================================================
step "Step 8/9 — Docker Hub"

warn "Docker Hub images are NOT deleted automatically."
warn "  If you pushed images, clean them up manually at: https://hub.docker.com"
warn "  Or via CLI: docker rmi YOUR_DOCKERHUB_USERNAME/k8s-secrets-lab-app:latest"
skipped "Docker Hub images (manual step)"

# =============================================================================
# STEP 9 — Report
# =============================================================================
step "Step 9/9 — Teardown report"

header "Teardown Complete"
echo "  Finished : $(date)"
echo ""

if [[ "${#DESTROYED[@]}" -gt 0 ]]; then
  echo -e "  ${GREEN}${BOLD}Destroyed (${#DESTROYED[@]}):${NC}"
  for item in "${DESTROYED[@]}"; do
    echo -e "    ${GREEN}✓${NC} $item"
  done
  echo ""
fi

if [[ "${#SKIPPED[@]}" -gt 0 ]]; then
  echo -e "  ${CYAN}${BOLD}Skipped (${#SKIPPED[@]}):${NC}"
  for item in "${SKIPPED[@]}"; do
    echo -e "    ${CYAN}–${NC} $item"
  done
  echo ""
fi

if [[ "${#FAILED[@]}" -gt 0 ]]; then
  echo -e "  ${RED}${BOLD}Failed (${#FAILED[@]}) — needs manual cleanup:${NC}"
  for item in "${FAILED[@]}"; do
    echo -e "    ${RED}✗${NC} $item"
  done
  echo ""
fi

# ── Re-run reminder ───────────────────────────────────────────────────────────
if [[ "${#DESTROYED[@]}" -gt 0 ]] && echo "${DESTROYED[*]}" | grep -q "Terraform"; then
  echo -e "  ${YELLOW}${BOLD}Important — AWS SM 7-day window:${NC}"
  echo -e "  Secret '$SECRET_NAME' is in pending deletion."
  echo -e "  Wait 7 days before re-running spinup.sh, OR:"
  echo -e "  ${CYAN}aws secretsmanager restore-secret --secret-id '$SECRET_NAME'${NC}"
  echo -e "  Then re-run spinup.sh."
  echo ""
fi

echo -e "  Full log: ${CYAN}$LOG_FILE${NC}"

# Non-zero exit if anything failed
[[ "${#FAILED[@]}" -eq 0 ]] || exit 1