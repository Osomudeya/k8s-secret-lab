# ------------------------------------------------------------------
# External Secrets Operator — installed via Helm in Terraform
# Only runs when connecting to EKS (use_eks=true or create_eks=true).
# For local MicroK8s: ESO is installed by spinup.sh directly.
# ------------------------------------------------------------------

locals {
  install_eso = var.use_eks || var.create_eks
}

resource "helm_release" "external_secrets" {
  count = local.install_eso ? 1 : 0

  name             = "external-secrets"
  repository       = "https://charts.external-secrets.io"
  chart            = "external-secrets"
  namespace        = "external-secrets"
  create_namespace = true
  version          = "0.14.4"

  set {
    name  = "installCRDs"
    value = "true"
  }

  # Annotate the ServiceAccount with the IRSA role ARN
  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = aws_iam_role.eso_role.arn
  }

  wait    = true
  timeout = 300
}

# ESO CRDs need time to register after Helm install.
# Without this the ClusterSecretStore apply below fails with
# "no kind ClusterSecretStore is registered".
resource "time_sleep" "wait_eso_crds" {
  count = local.install_eso ? 1 : 0

  depends_on      = [helm_release.external_secrets]
  create_duration = "60s"
}

# ------------------------------------------------------------------
# ClusterSecretStore — tells ESO where secrets come from (AWS SM)
# Cluster-scoped: any namespace can reference this store.
# Uses IRSA (JWT auth) — works on EKS only.
# For MicroK8s: apply k8s/aws/secret-store-static.yaml instead.
# ------------------------------------------------------------------
resource "kubectl_manifest" "cluster_secret_store" {
  count = local.install_eso ? 1 : 0

  depends_on = [time_sleep.wait_eso_crds]

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
