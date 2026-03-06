#!/bin/bash
# rotation/test-rotation.sh
# Run this after everything is deployed to watch secret rotation happen live.
# Works for the AWS path. Azure path instructions at the bottom.

# Readiness check — run before anything else so the script fails fast if lab isn't up
kubectl wait --for=condition=ready pod -l app=myapp -n default --timeout=120s 2>/dev/null || { echo "❌ Pod not ready. Run spinup.sh first (or wait for the deployment to be up)."; exit 1; }
[ "$(kubectl get externalsecret app-db-secret -n default -o jsonpath='{.status.conditions[0].reason}' 2>/dev/null)" = "SecretSynced" ] || { echo "❌ Secret not synced yet. Wait a minute and retry."; exit 1; }

SECRET_NAME="${SECRET_NAME:-prod/myapp/database}"
AWS_REGION="${AWS_REGION:-us-east-1}"
NEW_PASSWORD="rotated-password-$(date +%s)"

echo ""
echo "🔐 K8s Secrets Lab — Rotation Test"
echo "────────────────────────────────────────"
echo ""

APP_POD=$(kubectl get pod -l app=myapp -n default -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -z "$APP_POD" ]; then
  echo "❌ No myapp pod found. Is the deployment running? Try: kubectl get pods -l app=myapp"
  exit 1
fi

# Step 1: Show current secret in pod (allow failure so we still show later steps)
echo "📦 Step 1: Current DB_PASSWORD in pod (volume mount):"
if ! kubectl exec "$APP_POD" -- cat /etc/secrets/DB_PASSWORD 2>/dev/null | sed 's/./*/g;s/\(.\{4\}\)$/\1/'; then
  echo "(file not found — check deployment and that ESO has synced)"
fi
echo ""

# Step 2: Show current env var (won't change until pod restarts)
echo "🌍 Step 2: Current DB_PASSWORD as env var:"
kubectl exec "$APP_POD" -- sh -c 'echo $DB_PASSWORD' 2>/dev/null | sed 's/./*/g;s/\(.\{4\}\)$/\1/' || echo "(not set)"
echo ""

# Step 3: Update the secret in AWS SM
set -e
echo "🔄 Step 3: Rotating secret in AWS Secrets Manager..."
aws secretsmanager put-secret-value \
  --secret-id "$SECRET_NAME" \
  --secret-string "{
    \"username\": \"dbadmin\",
    \"password\": \"$NEW_PASSWORD\",
    \"host\": \"rds.lab.example.com\",
    \"port\": \"5432\"
  }" \
  --region "$AWS_REGION" \
  --query 'VersionId' --output text

echo "   ✅ New password set: ***${NEW_PASSWORD: -4}"
echo ""

# Step 4: Force ESO to sync immediately (don't wait for refreshInterval)
echo "⚡ Step 4: Forcing ESO sync (annotation trick)..."
kubectl annotate externalsecret app-db-secret \
  force-sync="$(date +%s)" --overwrite
echo "   Waiting 10 seconds for ESO to sync..."
sleep 10
echo ""

# Step 5: Check ExternalSecret status
echo "🔍 Step 5: ExternalSecret sync status:"
kubectl get externalsecret app-db-secret \
  -o jsonpath='{.status.conditions[0].message}' && echo ""
echo ""

# Step 6: Check volume mount (should have updated)
echo "📁 Step 6: DB_PASSWORD from volume mount (should be NEW value):"
kubectl exec "$APP_POD" -- cat /etc/secrets/DB_PASSWORD 2>/dev/null | sed 's/./*/g;s/\(.\{4\}\)$/\1/' || echo "(read failed)"
echo ""

set +e
# Step 7: Check env var (should still be OLD value until pod restarts)
echo "🌍 Step 7: DB_PASSWORD from env var (still OLD — needs pod restart):"
kubectl exec "$APP_POD" -- sh -c 'echo $DB_PASSWORD' 2>/dev/null | sed 's/./*/g;s/\(.\{4\}\)$/\1/' || true
echo ""

# Step 8: Programmatic verification via the app endpoint
echo "🔍 Step 8: Checking /secrets/compare endpoint..."
APP_URL=""
# Prefer LoadBalancer (ALB/ELB on EKS) when available
LB_HOST=$(kubectl get svc myapp -n default -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null)
LB_IP=$(kubectl get svc myapp -n default -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
if [[ -n "$LB_HOST" ]]; then
  APP_URL="http://${LB_HOST}"
elif [[ -n "$LB_IP" ]]; then
  APP_URL="http://${LB_IP}"
fi
if [[ -n "$APP_URL" ]] && curl -sf --connect-timeout 5 "${APP_URL}/secrets/compare" >/dev/null 2>&1; then
  echo "   (using LoadBalancer: ${APP_URL})"
  if curl -s "${APP_URL}/secrets/compare" | python3 -m json.tool 2>/dev/null; then
    : # printed above
  else
    curl -s "${APP_URL}/secrets/compare"
  fi
else
  echo "   (no LoadBalancer address or unreachable — using port-forward)"
  kubectl port-forward svc/myapp 3001:80 -n default &
  PF_PID=$!
  sleep 3
  if curl -s http://localhost:3001/secrets/compare | python3 -m json.tool 2>/dev/null; then
    : # printed above
  else
    curl -s http://localhost:3001/secrets/compare
  fi
  kill $PF_PID 2>/dev/null || true
  wait $PF_PID 2>/dev/null || true
fi
echo ""

echo "────────────────────────────────────────"
echo "💡 Key insight: volume mount updated automatically."
echo "   Env var still shows old value — it only updates on pod restart."
echo ""
echo "   To get match ✓ again, RESTART the deployment (picks up new env vars):"
echo "   kubectl rollout restart deployment/myapp -n default"
echo "   kubectl rollout status deployment/myapp -n default"
echo "   Then refresh the app page or curl /secrets/compare again."
echo ""
echo "   (With Reloader installed, the restart happens automatically when the Secret changes.)"
echo ""

# -------------------------------------------------------
# Azure rotation (manual steps — az cli)
# -------------------------------------------------------
# az keyvault secret set \
#   --vault-name YOUR_KEY_VAULT_NAME \
#   --name db-password \
#   --value "new-rotated-password-$(date +%s)"
#
# CSI Driver polls every 2 minutes by default.
# Watch the volume mount update:
# kubectl exec deploy/myapp -- watch cat /etc/secrets/db-password
