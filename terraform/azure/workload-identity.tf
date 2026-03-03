# ------------------------------------------------------------------
# Workload Identity Federation
# AKS pod → OIDC token → Azure AD → managed identity → Key Vault
# Zero credentials stored anywhere — this is the production pattern
# ------------------------------------------------------------------

# Managed Identity that the pod will assume
resource "azurerm_user_assigned_identity" "myapp" {
  name                = "myapp-identity"
  resource_group_name = azurerm_resource_group.lab.name
  location            = azurerm_resource_group.lab.location
}

# Grant the managed identity read access to Key Vault secrets
resource "azurerm_role_assignment" "myapp_kv_reader" {
  scope                = azurerm_key_vault.lab.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.myapp.principal_id
}

# Federated credential — links K8s ServiceAccount to the managed identity
resource "azurerm_federated_identity_credential" "myapp" {
  name                = "myapp-federated"
  resource_group_name = azurerm_resource_group.lab.name
  audience            = ["api://AzureADTokenExchange"]
  issuer              = azurerm_kubernetes_cluster.lab.oidc_issuer_url
  parent_id           = azurerm_user_assigned_identity.myapp.id

  # Must match the ServiceAccount in your K8s deployment
  subject = "system:serviceaccount:default:myapp-sa"
}

# ------------------------------------------------------------------
# Secrets Store CSI Driver — install via Helm
# ------------------------------------------------------------------
resource "helm_release" "secrets_store_csi" {
  name       = "secrets-store-csi-driver"
  repository = "https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts"
  chart      = "secrets-store-csi-driver"
  namespace  = "kube-system"
  version    = "1.4.1"

  set {
    name  = "syncSecret.enabled"
    value = "true" # Sync to K8s Secret objects (enables env vars)
  }

  set {
    name  = "enableSecretRotation"
    value = "true" # Auto-rotate mounted secrets
  }

  wait    = true
  timeout = 300
}

resource "helm_release" "akv_provider" {
  name             = "akv2k8s"
  repository       = "https://charts.akv2k8s.io"
  chart            = "akv2k8s"
  namespace        = "akv2k8s"
  create_namespace = true
  version          = "2.5.3"

  depends_on = [helm_release.secrets_store_csi]

  wait    = true
  timeout = 300
}

# ------------------------------------------------------------------
# Outputs
# ------------------------------------------------------------------
output "aks_credentials_command" {
  value = "az aks get-credentials --resource-group ${var.resource_group_name} --name ${var.aks_cluster_name}"
}

output "managed_identity_client_id" {
  value       = azurerm_user_assigned_identity.myapp.client_id
  description = "Use this in your K8s ServiceAccount annotation"
}

output "key_vault_name" {
  value = azurerm_key_vault.lab.name
}

output "next_steps" {
  value = <<-EOT
    ✅ Azure infra ready!

    1. Get AKS credentials:
       az aks get-credentials --resource-group ${var.resource_group_name} --name ${var.aks_cluster_name}

    2. Apply K8s manifests:
       kubectl apply -f ../../k8s/azure/

    3. Verify:
       kubectl get secretproviderclass
       kubectl exec deploy/myapp -- env | grep DB_
  EOT
}
