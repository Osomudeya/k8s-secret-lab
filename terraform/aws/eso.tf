# ------------------------------------------------------------------
# External Secrets Operator — installed via Helm in Terraform
# This keeps ESO installation in your IaC, not a manual command.
# Pinned to 0.9.x for stability; current stable is 0.10.x — if you upgrade,
# check ESO changelog for ClusterSecretStore/ExternalSecret API changes.
# ------------------------------------------------------------------

resource "helm_release" "external_secrets" {
  name             = "external-secrets"
  repository       = "https://charts.external-secrets.io"
  chart            = "external-secrets"
  namespace        = "external-secrets"
  create_namespace = true
  version          = "0.9.11"

  # Install the CRDs (ExternalSecret, ClusterSecretStore, etc.)
  set {
    name  = "installCRDs"
    value = "true"
  }

  # Annotate the ServiceAccount with the IAM role ARN (IRSA)
  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = aws_iam_role.eso_role.arn
  }

  # Wait for all pods to be ready before continuing
  wait    = true
  timeout = 300
}

# ESO CRDs need time to register after Helm install. Without this sleep, the
# ClusterSecretStore apply fails with "no kind ClusterSecretStore".
resource "time_sleep" "wait_eso_crds" {
  depends_on      = [helm_release.external_secrets]
  create_duration = "30s"
}

# ------------------------------------------------------------------
# ClusterSecretStore — tells ESO WHERE secrets come from
# Cluster-scoped: any namespace can reference this store
# ------------------------------------------------------------------
resource "kubectl_manifest" "cluster_secret_store" {
  depends_on = [time_sleep.wait_eso_crds] # Wait for CRDs before applying ClusterSecretStore

  yaml_body = <<-YAML
    apiVersion: external-secrets.io/v1beta1
    kind: ClusterSecretStore
    metadata:
      name: aws-secrets-manager
    spec:
      provider:
        aws:
          service: SecretsManager
          region: ${var.aws_region}
          auth:
            jwt:
              serviceAccountRef:
                name: external-secrets
                namespace: external-secrets
  YAML
}
