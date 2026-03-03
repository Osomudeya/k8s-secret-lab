variable "resource_group_name" {
  type    = string
  default = "k8s-secrets-lab-rg"
}

variable "location" {
  type    = string
  default = "eastus"
}

variable "aks_cluster_name" {
  type    = string
  default = "secrets-lab-aks"
}

# ------------------------------------------------------------------
# Resource Group
# ------------------------------------------------------------------
resource "azurerm_resource_group" "lab" {
  name     = var.resource_group_name
  location = var.location
}

# ------------------------------------------------------------------
# AKS Cluster with Workload Identity enabled
# Production thinking: workload identity = no credentials stored anywhere
# ------------------------------------------------------------------
resource "azurerm_kubernetes_cluster" "lab" {
  name                = var.aks_cluster_name
  location            = azurerm_resource_group.lab.location
  resource_group_name = azurerm_resource_group.lab.name
  dns_prefix          = "secretslab"

  default_node_pool {
    name       = "default"
    node_count = 1
    vm_size    = "Standard_B2s" # Cheap — fine for the lab
  }

  identity {
    type = "SystemAssigned"
  }

  # Enable OIDC issuer — needed for workload identity federation
  oidc_issuer_enabled       = true
  workload_identity_enabled = true

  tags = {
    Environment = "lab"
    ManagedBy   = "terraform"
  }
}

# ------------------------------------------------------------------
# Azure Key Vault
# ------------------------------------------------------------------
resource "azurerm_key_vault" "lab" {
  name                = "k8s-secrets-lab-kv"
  location            = azurerm_resource_group.lab.location
  resource_group_name = azurerm_resource_group.lab.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  # Production thinking: always enable soft delete + purge protection
  soft_delete_retention_days = 7
  purge_protection_enabled   = false # Set true in real production

  # Enable RBAC instead of access policies (modern approach)
  enable_rbac_authorization = true

  tags = {
    ManagedBy = "terraform"
  }
}

# Grant yourself access to manage secrets in the lab
resource "azurerm_role_assignment" "kv_admin" {
  scope                = azurerm_key_vault.lab.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = data.azurerm_client_config.current.object_id
}

# ------------------------------------------------------------------
# The actual secret
# ------------------------------------------------------------------
resource "azurerm_key_vault_secret" "db_password" {
  name         = "db-password"
  value        = "initial-password-change-me"
  key_vault_id = azurerm_key_vault.lab.id

  depends_on = [azurerm_role_assignment.kv_admin]

  tags = {
    app = "myapp"
  }
}

resource "azurerm_key_vault_secret" "db_username" {
  name         = "db-username"
  value        = "dbadmin"
  key_vault_id = azurerm_key_vault.lab.id

  depends_on = [azurerm_role_assignment.kv_admin]
}
