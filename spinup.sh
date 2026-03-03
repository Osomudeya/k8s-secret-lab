#!/usr/bin/env bash
# =============================================================================
# spinup.sh — K8s Secrets Lab infrastructure provisioner
#
# What this does (in order):
#   1.  Checks prerequisites (aws, terraform, kubectl, helm)
#   2.  Validates AWS credentials
#   3.  Asks you to choose cluster: EKS or MicroK8s
#   4.  Sets kubeconfig + context correctly for each cluster type
#   5.  Enables required MicroK8s addons (dns, storage) if needed
#   6.  Creates S3 bucket + DynamoDB table for Terraform remote state
#   7.  Writes backend.tf into terraform/aws/
#   8.  Runs terraform init → plan → apply
#   9.  Creates K8s Secret with AWS credentials for ESO (local clusters only)
#   10. Applies static SecretStore (local clusters only)
#   11. Waits for ESO pods to be ready
#   12. Applies ExternalSecret + Deployment (patching store ref for local)
#   13. Verifies full chain: AWS SM → ESO → K8s Secret → Pod
#   14. Writes .lab-state for teardown.sh
#
# Usage:
#   bash spinup.sh                       # auto-detect everything
#   bash spinup.sh --cluster microk8s    # force MicroK8s
#   bash spinup.sh --cluster eks         # force EKS (set EKS_CLUSTER_NAME)
#   bash spinup.sh --region eu-west-1    # override AWS region
#   bash spinup.sh --no-backend          # skip S3, use local state
#   bash spinup.sh --dry-run             # plan only, no apply
#   bash spinup.sh --skip-cluster        # skip cluster setup, use current context
#
# Environment variables (all optional):
#   AWS_REGION          override region (default: us-east-1)
#   EKS_CLUSTER_NAME    when --cluster eks (default: secrets-lab)
# =============================================================================

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()     { echo -e "${GREEN}[ OK ]${NC}  $*"; }
warn()   { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()    { echo -e "${RED}[ERR ]${NC}  $*" >&2; }
header() {
  echo -e "\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${CYAN}  $*${NC}"
  echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}
step()   { echo -e "\n${BOLD}▶  $*${NC}"; }
die()    { err "$*"; exit 1; }

# ── Locate repo root ──────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR"
TF_DIR="$REPO_ROOT/terraform/aws"
K8S_DIR="$REPO_ROOT/k8s/aws"
STATE_FILE="$REPO_ROOT/.lab-state"
BACKEND_TF="$TF_DIR/backend.tf"
LOG_FILE="$REPO_ROOT/spinup.log"

[[ -d "$TF_DIR" ]]  || die "terraform/aws/ not found. Run spinup.sh from the repo root."
[[ -d "$K8S_DIR" ]] || die "k8s/aws/ not found. Run spinup.sh from the repo root."

# ── Defaults ──────────────────────────────────────────────────────────────────
CLUSTER_TYPE=""
USE_BACKEND=true
DRY_RUN=false
SKIP_CLUSTER=false
AWS_REGION="${AWS_REGION:-us-east-1}"
EKS_CLUSTER_NAME="${EKS_CLUSTER_NAME:-secrets-lab}"
CREATE_EKS="false"
USE_EKS="false"
KUBECONFIG_PATH=""
CLUSTER_CONTEXT=""

# ── Args ──────────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --cluster)      CLUSTER_TYPE="$2";  shift 2 ;;
    --region)       AWS_REGION="$2";    shift 2 ;;
    --no-backend)   USE_BACKEND=false;  shift   ;;
    --dry-run)      DRY_RUN=true;       shift   ;;
    --skip-cluster) SKIP_CLUSTER=true;  shift   ;;
    --help|-h)
      grep '^#' "$0" | head -25 | sed 's/^# \?//'
      exit 0 ;;
    *) warn "Unknown argument: $1 (ignored)"; shift ;;
  esac
done

# ── Logging ───────────────────────────────────────────────────────────────────
exec > >(tee -a "$LOG_FILE") 2>&1

header "K8s Secrets Lab — Spinup"
echo "  Started  : $(date)"
echo "  Repo     : $REPO_ROOT"
echo "  Region   : $AWS_REGION"
echo "  DryRun   : $DRY_RUN"
echo "  Backend  : $USE_BACKEND"
echo ""

# =============================================================================
# STEP 1 — Prerequisites
# =============================================================================
step "Step 1/13 — Prerequisites"

check_cmd() {
  local cmd="$1" hint="$2"
  if command -v "$cmd" &>/dev/null; then
    ok "$cmd → $(command -v "$cmd")"
  else
    die "'$cmd' not found.  $hint"
  fi
}

check_cmd aws       "Install: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html"
check_cmd terraform "Install: https://developer.hashicorp.com/terraform/install"
check_cmd kubectl   "Install: https://kubernetes.io/docs/tasks/tools/"
check_cmd helm      "Install: https://helm.sh/docs/intro/install/"
command -v microk8s &>/dev/null && ok "microk8s → $(command -v microk8s)" || warn "microk8s not installed (only needed for MicroK8s clusters)"
# gh CLI required if you want spinup to set GitHub Actions secrets (TF_BACKEND_*, EKS_CLUSTER_NAME, AWS_REGION)
command -v gh &>/dev/null && ok "gh       → $(command -v gh)" || warn "gh CLI not installed (optional: run 'brew install gh' or see https://cli.github.com/ — needed to auto-set GitHub Actions secrets for CI)"

# =============================================================================
# STEP 2 — AWS credentials
# =============================================================================
step "Step 2/13 — AWS credentials"

AWS_ID_JSON=$(aws sts get-caller-identity --output json 2>/dev/null) \
  || die "AWS credentials not configured or expired.\n  Fix: run 'aws configure'  OR  export AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY"

AWS_ACCOUNT=$(echo "$AWS_ID_JSON" | grep '"Account"' | cut -d'"' -f4)
AWS_USER=$(echo "$AWS_ID_JSON"    | grep '"Arn"'     | cut -d'"' -f4)
ok "Account  : $AWS_ACCOUNT"
ok "Identity : $AWS_USER"

# =============================================================================
# STEP 3 — Cluster choice (EKS or MicroK8s)
# =============================================================================
step "Step 3/13 — Kubernetes cluster"

if [[ -z "$CLUSTER_TYPE" ]]; then
  echo ""
  echo "  Choose your cluster:"
  echo "  1) EKS (production-like, ~\$0.16/hr, 15-20 min setup)"
  echo "  2) MicroK8s (local, free, 5 min setup)"
  echo ""
  read -r -p "  Enter 1 or 2: " choice
  case "$choice" in
    1|eks)      CLUSTER_TYPE="eks" ;;
    2|microk8s) CLUSTER_TYPE="microk8s" ;;
    *)          die "Invalid choice. Enter 1 (EKS) or 2 (MicroK8s)." ;;
  esac
fi

# Normalize --cluster flag
case "$CLUSTER_TYPE" in
  1|eks)       CLUSTER_TYPE="eks" ;;
  2|microk8s)  CLUSTER_TYPE="microk8s" ;;
esac

[[ "$CLUSTER_TYPE" != "eks" && "$CLUSTER_TYPE" != "microk8s" ]] && \
  die "Cluster must be 'eks' or 'microk8s'. Got: $CLUSTER_TYPE"

log "Cluster type: $CLUSTER_TYPE"

if [[ "$CLUSTER_TYPE" == "eks" ]]; then
  CREATE_EKS="true"
  USE_EKS="true"
  warn "EKS costs ~\$0.16/hr. Run teardown.sh when done to avoid charges."
  read -r -p "EKS cluster name (default: secrets-lab): " input_name
  EKS_CLUSTER_NAME="${input_name:-secrets-lab}"
  log "EKS cluster name: $EKS_CLUSTER_NAME (Terraform will create it)"
  # Kubeconfig set after terraform apply
  KUBECONFIG_PATH=""
  CLUSTER_CONTEXT=""
else
  CREATE_EKS="false"
  USE_EKS="false"
  # ── MicroK8s ─────────────────────────────────────────────────────────────
  setup_microk8s() {
    KUBECONFIG_PATH="$HOME/.kube/config-microk8s"
    CLUSTER_CONTEXT="microk8s"

    log "Exporting MicroK8s kubeconfig → $KUBECONFIG_PATH"
    microk8s config > "$KUBECONFIG_PATH" \
      || die "Failed to export MicroK8s kubeconfig — try: microk8s config"
    chmod 600 "$KUBECONFIG_PATH"
    export KUBECONFIG="$KUBECONFIG_PATH"
    ok "KUBECONFIG=$KUBECONFIG_PATH"

    local required_addons=("dns" "storage")
    for addon in "${required_addons[@]}"; do
      if microk8s status 2>/dev/null | grep -E "^\s+${addon}" | grep -q "enabled"; then
        ok "Addon already enabled: $addon"
      else
        log "Enabling MicroK8s addon: $addon"
        microk8s enable "$addon" \
          || die "Failed to enable MicroK8s addon '$addon'. Check: microk8s status"
        ok "Addon enabled: $addon"
      fi
    done

    log "Waiting for MicroK8s to be fully ready..."
    microk8s status --wait-ready --timeout 60 \
      || die "MicroK8s not ready after 60s"
    ok "MicroK8s ready"
  }
  setup_microk8s
fi

# Expand ~ so Terraform providers can use the path directly (MicroK8s only; EKS set after apply)
if [[ -n "$KUBECONFIG_PATH" ]]; then
  KUBECONFIG_ABS="${KUBECONFIG_PATH/#\~/$HOME}"
  log "Verifying cluster connectivity..."
  kubectl cluster-info 2>/dev/null | head -1 \
    || die "Cannot reach cluster. Kubeconfig: $KUBECONFIG_ABS"
  ok "Cluster reachable"
else
  KUBECONFIG_ABS=""
fi

# =============================================================================
# STEP 4 — S3 backend + DynamoDB
# =============================================================================
step "Step 4/13 — Terraform remote state"

# Name is deterministic — safe to re-run, always targets same bucket
BUCKET_NAME="k8s-secrets-lab-tfstate-${AWS_ACCOUNT}-${AWS_REGION}"
DYNAMO_TABLE="k8s-secrets-lab-tflock"

create_s3_backend() {
  # ── Bucket ────────────────────────────────────────────────────────────────────
  if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    ok "S3 bucket exists: $BUCKET_NAME"
  else
    log "Creating S3 bucket: $BUCKET_NAME"
    if [[ "$AWS_REGION" == "us-east-1" ]]; then
      aws s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$AWS_REGION" >/dev/null
    else
      aws s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$AWS_REGION" \
        --create-bucket-configuration LocationConstraint="$AWS_REGION" >/dev/null
    fi
    ok "S3 bucket created: $BUCKET_NAME"

    aws s3api put-bucket-versioning \
      --bucket "$BUCKET_NAME" \
      --versioning-configuration Status=Enabled >/dev/null
    ok "Versioning enabled (state rollback supported)"

    aws s3api put-bucket-encryption \
      --bucket "$BUCKET_NAME" \
      --server-side-encryption-configuration \
      '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}' >/dev/null
    ok "Server-side encryption enabled (AES256)"

    aws s3api put-public-access-block \
      --bucket "$BUCKET_NAME" \
      --public-access-block-configuration \
      'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true' >/dev/null
    ok "Public access blocked"
  fi

  # ── DynamoDB ──────────────────────────────────────────────────────────────────
  if aws dynamodb describe-table \
       --table-name "$DYNAMO_TABLE" \
       --region "$AWS_REGION" &>/dev/null; then
    ok "DynamoDB lock table exists: $DYNAMO_TABLE"
  else
    log "Creating DynamoDB lock table: $DYNAMO_TABLE"
    aws dynamodb create-table \
      --table-name "$DYNAMO_TABLE" \
      --attribute-definitions AttributeName=LockID,AttributeType=S \
      --key-schema AttributeName=LockID,KeyType=HASH \
      --billing-mode PAY_PER_REQUEST \
      --region "$AWS_REGION" >/dev/null
    log "Waiting for table to become active..."
    aws dynamodb wait table-exists \
      --table-name "$DYNAMO_TABLE" \
      --region "$AWS_REGION"
    ok "DynamoDB lock table active: $DYNAMO_TABLE"
  fi

  ok "S3 backend will be used (bucket: $BUCKET_NAME)"
}

if [[ "$USE_BACKEND" == "true" ]]; then
  create_s3_backend
else
  warn "--no-backend: using local state in terraform/aws/terraform.tfstate"
  warn "Do NOT commit terraform.tfstate — it contains AWS account IDs and secret ARNs."
  BUCKET_NAME="local"
  DYNAMO_TABLE="local"
fi

# =============================================================================
# STEP 5 — Terraform init
# =============================================================================
step "Step 5/13 — Terraform init"

cd "$TF_DIR"

log "Running terraform init..."
if [[ "$USE_BACKEND" == "true" && -n "$BUCKET_NAME" && "$BUCKET_NAME" != "local" ]]; then
  terraform init -input=false -upgrade \
    -backend-config=bucket="$BUCKET_NAME" \
    -backend-config=key=k8s-secrets-lab/terraform.tfstate \
    -backend-config=region="$AWS_REGION" \
    -backend-config=dynamodb_table="$DYNAMO_TABLE" \
    -backend-config=encrypt=true \
    2>&1 | grep -E "Initializing|Upgrading|installed|reusing|error|Error|backend|Successfully" || true
else
  terraform init -input=false -upgrade 2>&1 \
    | grep -E "Initializing|Upgrading|installed|reusing|error|Error|backend" || true
fi
ok "Terraform initialised"

# =============================================================================
# STEP 6 — Build Terraform vars
# =============================================================================
step "Step 6/13 — Terraform variables"

TF_VARS=()
TF_VARS+=("-var=aws_region=${AWS_REGION}")
TF_VARS+=("-var=create_eks=${CREATE_EKS}")
TF_VARS+=("-var=use_eks=${USE_EKS}")
TF_VARS+=("-var=cluster_name=${EKS_CLUSTER_NAME}")

# Pass kubeconfig + context for MicroK8s so Helm/kubectl providers target the cluster.
[[ -n "$KUBECONFIG_ABS" ]] && {
  TF_VARS+=("-var=kubeconfig_path=${KUBECONFIG_ABS}")
  log "kubeconfig_path → $KUBECONFIG_ABS"
}
[[ -n "$CLUSTER_CONTEXT" ]] && {
  TF_VARS+=("-var=cluster_context=${CLUSTER_CONTEXT}")
  log "cluster_context → $CLUSTER_CONTEXT"
}

if [[ "$CLUSTER_TYPE" == "eks" ]]; then
  log "create_eks → true, use_eks → true, cluster_name → $EKS_CLUSTER_NAME"
else
  log "create_eks → false, use_eks → false (static auth will be configured for ESO)"
fi

# =============================================================================
# Pre-flight: restore secret if it's in pending deletion (7-day recovery window)
# =============================================================================
CHECK_SECRET_NAME="${TF_SECRET_NAME:-prod/myapp/database}"
SECRET_DELETED_DATE=$(aws secretsmanager describe-secret \
  --secret-id "$CHECK_SECRET_NAME" \
  --query 'DeletedDate' \
  --output text 2>/dev/null || echo "")

if [[ -n "$SECRET_DELETED_DATE" && "$SECRET_DELETED_DATE" != "None" ]]; then
  warn "Secret '$CHECK_SECRET_NAME' is in pending deletion (7-day recovery window)."
  warn "Restoring it automatically so Terraform can manage it..."
  if ! aws secretsmanager restore-secret --secret-id "$CHECK_SECRET_NAME"; then
    err "Restore failed. Run manually then re-run spinup:"
    err "  aws secretsmanager restore-secret --secret-id $CHECK_SECRET_NAME"
    exit 1
  fi
  ok "Secret restored."
fi

# =============================================================================
# STEP 7 — Terraform plan
# =============================================================================
step "Step 7/13 — Terraform plan"

log "Running terraform plan..."
terraform plan \
  -out=tfplan \
  -input=false \
  "${TF_VARS[@]}"
ok "Plan complete"

[[ "$DRY_RUN" == "true" ]] && {
  warn "--dry-run: stopping before apply."
  warn "Review the plan above then re-run without --dry-run."
  exit 0
}

# =============================================================================
# STEP 8 — Terraform apply
# =============================================================================
step "Step 8/13 — Terraform apply"

log "Applying infrastructure (~3-5 min for ESO Helm install; EKS cluster add ~15 min)..."
terraform apply -input=false -auto-approve tfplan
ok "Terraform apply complete"

SECRET_ARN=$(terraform output -raw secret_arn     2>/dev/null || echo "")
SECRET_NAME=$(terraform output -raw secret_name   2>/dev/null || echo "prod/myapp/database")
ESO_ROLE_ARN=$(terraform output -raw eso_role_arn 2>/dev/null || echo "")
ok "Secret in AWS SM : $SECRET_NAME"
[[ -n "$SECRET_ARN" ]]   && ok "Secret ARN       : $SECRET_ARN"
[[ -n "$ESO_ROLE_ARN" ]] && ok "ESO IAM Role     : $ESO_ROLE_ARN"

# EKS: get kubeconfig after cluster is created (Terraform created the cluster)
if [[ "$CLUSTER_TYPE" == "eks" ]]; then
  log "Fetching EKS kubeconfig: cluster=$EKS_CLUSTER_NAME region=$AWS_REGION"
  aws eks update-kubeconfig --name "$EKS_CLUSTER_NAME" --region "$AWS_REGION" \
    || die "Failed to get EKS kubeconfig. Check cluster name and region."
  KUBECONFIG_ABS="$HOME/.kube/config"
  CLUSTER_CONTEXT=$(kubectl config current-context)
  ok "EKS context: $CLUSTER_CONTEXT"
fi

# =============================================================================
# STEP 9 — Static credentials for ESO (local clusters only)
# EKS uses IRSA — skip entirely
# =============================================================================
step "Step 9/13 — ESO authentication"

if [[ "$CLUSTER_TYPE" != "eks" ]]; then
  log "Local cluster — configuring static AWS credentials for ESO"
  warn "IRSA requires EKS. On kind/MicroK8s, ESO authenticates via a K8s Secret."
  warn "Use a dedicated IAM user scoped to only this secret in real setups."

  ESO_KEY_ID=""
  ESO_SECRET=""

  if [[ -n "${AWS_ACCESS_KEY_ID:-}" && -n "${AWS_SECRET_ACCESS_KEY:-}" ]]; then
    ESO_KEY_ID="$AWS_ACCESS_KEY_ID"
    ESO_SECRET="$AWS_SECRET_ACCESS_KEY"
    log "AWS creds sourced from environment variables"
  else
    ESO_KEY_ID=$(aws configure get aws_access_key_id     2>/dev/null || true)
    ESO_SECRET=$(aws configure get aws_secret_access_key 2>/dev/null || true)
    log "AWS creds sourced from ~/.aws/credentials"
  fi

  [[ -z "$ESO_KEY_ID" || -z "$ESO_SECRET" ]] && \
    die "Cannot retrieve AWS credentials for ESO.\nFix: export AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"

  # Delete + recreate (idempotent across multiple spinup runs)
  kubectl get secret aws-eso-credentials -n default &>/dev/null \
    && kubectl delete secret aws-eso-credentials -n default

  kubectl create secret generic aws-eso-credentials \
    -n default \
    --from-literal=accessKeyID="$ESO_KEY_ID" \
    --from-literal=secretAccessKey="$ESO_SECRET"
  ok "aws-eso-credentials secret created"

  STATIC_STORE="$K8S_DIR/secret-store-static.yaml"
  if [[ -f "$STATIC_STORE" ]]; then
    log "Applying static SecretStore (region: $AWS_REGION)..."
    sed "s/region: us-east-1/region: ${AWS_REGION}/g" "$STATIC_STORE" \
      | kubectl apply -f -
    ok "SecretStore 'aws-secrets-manager-static' applied"
  else
    warn "secret-store-static.yaml not found at $STATIC_STORE — create manually (DEPLOY.md Step 3)"
  fi
else
  log "EKS cluster — IRSA handles ESO auth, no static credentials needed"
fi

# =============================================================================
# STEP 10 — Wait for ESO
# =============================================================================
step "Step 10/13 — Waiting for ESO pods"

log "Waiting for ESO deployment (timeout: 3 min)..."
kubectl rollout status deployment/external-secrets \
  -n external-secrets \
  --timeout=180s \
  || {
    warn "ESO not fully ready yet — pod status:"
    kubectl get pods -n external-secrets || true
    warn "Continuing — ESO may still be starting."
    warn "Watch: kubectl get pods -n external-secrets -w"
  }
ok "ESO running"

# =============================================================================
# STEP 11 — Apply K8s manifests
# =============================================================================
step "Step 11/13 — Applying K8s manifests"

log "Applying ExternalSecret..."
if [[ "$CLUSTER_TYPE" != "eks" ]]; then
  # Local clusters: patch the ExternalSecret to point at the static SecretStore
  # instead of the ClusterSecretStore (which needs IRSA / EKS)
  log "Patching ExternalSecret to use static SecretStore (local cluster)..."
  sed \
    -e 's/name: aws-secrets-manager$/name: aws-secrets-manager-static/' \
    -e 's/kind: ClusterSecretStore/kind: SecretStore/' \
    "$K8S_DIR/external-secret.yaml" \
    | kubectl apply -f -
  ok "ExternalSecret applied (static SecretStore)"
else
  kubectl apply -f "$K8S_DIR/external-secret.yaml"
  ok "ExternalSecret applied (ClusterSecretStore / IRSA)"
fi

log "Waiting 20s for ESO to sync from AWS SM..."
sleep 20

SYNC_REASON=$(kubectl get externalsecret app-db-secret -n default \
  -o jsonpath='{.status.conditions[0].reason}' 2>/dev/null || echo "Unknown")
SYNC_MSG=$(kubectl get externalsecret app-db-secret -n default \
  -o jsonpath='{.status.conditions[0].message}' 2>/dev/null || echo "")

if [[ "$SYNC_REASON" == "SecretSynced" ]]; then
  ok "ExternalSecret synced ✓"
else
  warn "ExternalSecret status: $SYNC_REASON — $SYNC_MSG"
  warn "Debug: kubectl describe externalsecret app-db-secret"
  warn "Logs:  kubectl logs -n external-secrets -l app.kubernetes.io/name=external-secrets"
fi

log "Applying Deployment + Service..."
kubectl apply -f "$K8S_DIR/deployment.yaml"
ok "Deployment applied"

log "Waiting for myapp rollout (timeout: 2 min)..."
kubectl rollout status deployment/myapp -n default --timeout=120s \
  || {
    warn "Deployment not fully ready:"
    kubectl get pods -l app=myapp || true
  }

# =============================================================================
# STEP 12 — Verify full chain
# =============================================================================
step "Step 12/13 — Chain verification"

echo ""
echo -e "  ${BOLD}AWS SM → ESO → K8s Secret → Pod${NC}"
echo ""

# AWS SM
printf "  %-35s" "1. Secret in AWS SM:"
aws secretsmanager describe-secret \
  --secret-id "$SECRET_NAME" \
  --region "$AWS_REGION" \
  --query 'Name' \
  --output text 2>/dev/null \
  | grep -q . \
  && echo -e "${GREEN}✓ $SECRET_NAME${NC}" \
  || echo -e "${RED}✗ not found${NC}"

# ESO sync
printf "  %-35s" "2. ExternalSecret synced:"
ES_STATUS=$(kubectl get externalsecret app-db-secret -n default \
  -o jsonpath='{.status.conditions[0].reason}' 2>/dev/null || echo "NotFound")
[[ "$ES_STATUS" == "SecretSynced" ]] \
  && echo -e "${GREEN}✓ $ES_STATUS${NC}" \
  || echo -e "${YELLOW}⚠ $ES_STATUS${NC}"

# K8s Secret
printf "  %-35s" "3. K8s Secret exists:"
kubectl get secret myapp-database-creds -n default &>/dev/null \
  && echo -e "${GREEN}✓ myapp-database-creds${NC}" \
  || echo -e "${YELLOW}⚠ not yet created${NC}"

# Pod env
POD=$(kubectl get pod -l app=myapp -n default \
  -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)

printf "  %-35s" "4. Pod DB_USERNAME:"
if [[ -n "$POD" ]]; then
  DB_USER=$(kubectl exec "$POD" -n default \
    -- sh -c 'echo $DB_USERNAME' 2>/dev/null | tr -d '\r\n' || echo "")
  [[ -n "$DB_USER" ]] \
    && echo -e "${GREEN}✓ $DB_USER${NC}" \
    || echo -e "${YELLOW}⚠ not set yet${NC}"
else
  echo -e "${YELLOW}⚠ no pod running yet${NC}"
fi

printf "  %-35s" "5. Pod DB_PASSWORD:"
if [[ -n "$POD" ]]; then
  DB_PASS=$(kubectl exec "$POD" -n default \
    -- sh -c '[ -n "$DB_PASSWORD" ] && echo SET || echo "NOT SET"' \
    2>/dev/null || echo "unknown")
  [[ "$DB_PASS" == "SET" ]] \
    && echo -e "${GREEN}✓ SET${NC}" \
    || echo -e "${YELLOW}⚠ $DB_PASS${NC}"
else
  echo -e "${YELLOW}⚠ no pod running yet${NC}"
fi

printf "  %-35s" "6. Volume mount /etc/secrets:"
if [[ -n "$POD" ]]; then
  VOL=$(kubectl exec "$POD" -n default \
    -- sh -c '[ -f /etc/secrets/DB_PASSWORD ] && echo EXISTS || echo MISSING' \
    2>/dev/null || echo "unknown")
  [[ "$VOL" == "EXISTS" ]] \
    && echo -e "${GREEN}✓ EXISTS${NC}" \
    || echo -e "${YELLOW}⚠ $VOL${NC}"
else
  echo -e "${YELLOW}⚠ no pod running yet${NC}"
fi

echo ""

# =============================================================================
# STEP 13 — Write .lab-state
# =============================================================================
step "Step 13/13 — Saving lab state"

cat > "$STATE_FILE" <<STATE
# K8s Secrets Lab — state file
# Written: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# Consumed by teardown.sh — do not edit manually.
LAB_DATE="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
CLUSTER_TYPE="$CLUSTER_TYPE"
KUBECONFIG_ABS="$KUBECONFIG_ABS"
CLUSTER_CONTEXT="$CLUSTER_CONTEXT"
EKS_CLUSTER_NAME="$EKS_CLUSTER_NAME"
AWS_REGION="$AWS_REGION"
AWS_ACCOUNT="$AWS_ACCOUNT"
SECRET_NAME="$SECRET_NAME"
SECRET_ARN="$SECRET_ARN"
ESO_ROLE_ARN="$ESO_ROLE_ARN"
USE_BACKEND="$USE_BACKEND"
BUCKET_NAME="$BUCKET_NAME"
DYNAMO_TABLE="$DYNAMO_TABLE"
TF_DIR="$TF_DIR"
K8S_DIR="$K8S_DIR"
STATE_FILE="$STATE_FILE"

ok ".lab-state written → $STATE_FILE"

# =============================================================================
# Optional: set GitHub Actions secrets so CI can use S3 backend and EKS cluster name
# =============================================================================
if command -v gh &>/dev/null && [[ "$DRY_RUN" != "true" ]] && git -C "$REPO_ROOT" rev-parse --is-inside-work-tree &>/dev/null; then
  step "Setting GitHub Actions secrets (for CI handoff)"
  if (cd "$REPO_ROOT" && gh auth status &>/dev/null); then
    (
      cd "$REPO_ROOT"
      [[ "$USE_BACKEND" == "true" && -n "$BUCKET_NAME" && "$BUCKET_NAME" != "local" ]] && {
        gh secret set TF_BACKEND_BUCKET --body "$BUCKET_NAME" 2>/dev/null && ok "TF_BACKEND_BUCKET set" || warn "Could not set TF_BACKEND_BUCKET"
        gh secret set TF_BACKEND_REGION --body "$AWS_REGION" 2>/dev/null && ok "TF_BACKEND_REGION set" || true
        gh secret set TF_BACKEND_DYNAMO --body "$DYNAMO_TABLE" 2>/dev/null && ok "TF_BACKEND_DYNAMO set" || true
      }
      CLUSTER_NAME_FOR_CI="$EKS_CLUSTER_NAME"
      [[ "$CLUSTER_TYPE" == "microk8s" ]] && CLUSTER_NAME_FOR_CI="secrets-lab"
      gh secret set EKS_CLUSTER_NAME --body "$CLUSTER_NAME_FOR_CI" 2>/dev/null && ok "EKS_CLUSTER_NAME set → $CLUSTER_NAME_FOR_CI" || true
      gh secret set AWS_REGION --body "$AWS_REGION" 2>/dev/null && ok "AWS_REGION set" || true
    )
  else
    warn "gh not authenticated — run 'gh auth login'. Secrets not set; configure TF_BACKEND_* and EKS_CLUSTER_NAME manually in repo Settings → Secrets."
  fi
fi

# =============================================================================
# Summary
# =============================================================================
header "Spinup Complete ✅"
echo -e "  Cluster    : ${GREEN}$CLUSTER_TYPE${NC}"
echo -e "  Context    : ${GREEN}${CLUSTER_CONTEXT:-current context}${NC}"
echo -e "  Kubeconfig : ${GREEN}$KUBECONFIG_ABS${NC}"
echo -e "  AWS Region : ${GREEN}$AWS_REGION${NC}"
echo -e "  Secret     : ${GREEN}$SECRET_NAME${NC}"
if [[ "$USE_BACKEND" == "true" ]]; then
  echo -e "  TF State   : ${GREEN}s3://${BUCKET_NAME}${NC}"
  echo -e "  Lock table : ${GREEN}${DYNAMO_TABLE}${NC}"
else
  echo -e "  TF State   : ${YELLOW}local — terraform/aws/terraform.tfstate${NC}"
fi
echo ""
echo -e "  ${BOLD}Next: start the lab UI (interactive modules):${NC}"
echo -e "    ${CYAN}cd lab-ui && npm run dev${NC}"
echo -e "    Open ${CYAN}http://localhost:5173${NC}"
echo ""
echo -e "  ${BOLD}Try the app (after port-forward):${NC}"
echo -e "    ${CYAN}kubectl port-forward svc/myapp 3000:80 -n default${NC}"
echo -e "    Open ${CYAN}http://localhost:3000${NC}"
echo -e "    ${CYAN}http://localhost:3000/secrets/env${NC}    — env vars"
echo -e "    ${CYAN}http://localhost:3000/secrets/volume${NC} — volume mount"
echo ""
echo -e "  ${BOLD}Test rotation:${NC}"
echo -e "    ${CYAN}bash rotation/test-rotation.sh${NC}"
echo ""
echo -e "  ${BOLD}Tear everything down:${NC}"
echo -e "    ${CYAN}bash teardown.sh${NC}"
echo ""
echo -e "  Full log: ${CYAN}$LOG_FILE${NC}"