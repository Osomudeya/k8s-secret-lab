terraform {
  required_version = ">= 1.5.0"

  backend "s3" {}

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    kubectl = {
      source  = "gavinbunney/kubectl"
      version = "~> 1.14"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.9"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ------------------------------------------------------------------
# Data sources
# ------------------------------------------------------------------
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Only look up existing cluster data when use_eks=true AND we are NOT creating it.
# When create_eks=true we reference aws_eks_cluster.cluster[0] directly.
data "aws_eks_cluster" "cluster" {
  count = (var.use_eks && !var.create_eks) ? 1 : 0
  name  = var.cluster_name
}

data "aws_eks_cluster_auth" "cluster" {
  count = (var.use_eks && !var.create_eks) ? 1 : 0
  name  = var.cluster_name
}

# Auth for newly created cluster — needed when create_eks=true
data "aws_eks_cluster_auth" "created" {
  count = var.create_eks ? 1 : 0
  name  = aws_eks_cluster.cluster[0].name

  depends_on = [aws_eks_cluster.cluster]
}

# ------------------------------------------------------------------
# Locals — cluster connection and OIDC (for iam.tf); providers use only data below
# ------------------------------------------------------------------
locals {
  is_eks = var.use_eks || var.create_eks

  # Only "existing EKS" (use_eks && !create_eks) has data sources; avoid resource refs in provider config
  use_eks_connection = var.use_eks && !var.create_eks

  cluster_endpoint = var.create_eks ? aws_eks_cluster.cluster[0].endpoint : (
    var.use_eks ? data.aws_eks_cluster.cluster[0].endpoint : ""
  )
  cluster_ca = var.create_eks ? aws_eks_cluster.cluster[0].certificate_authority[0].data : (
    var.use_eks ? data.aws_eks_cluster.cluster[0].certificate_authority[0].data : ""
  )
  cluster_token = var.create_eks ? data.aws_eks_cluster_auth.created[0].token : (
    var.use_eks ? data.aws_eks_cluster_auth.cluster[0].token : ""
  )

  # OIDC issuer — used in iam.tf to build IRSA trust policy (resource-time only)
  oidc_issuer = var.create_eks ? aws_eks_cluster.cluster[0].identity[0].oidc[0].issuer : (
    var.use_eks ? data.aws_eks_cluster.cluster[0].identity[0].oidc[0].issuer : ""
  )
}

# ------------------------------------------------------------------
# Providers — use only DATA SOURCES for EKS connection (never aws_eks_cluster resource).
# This avoids "depends on values that cannot be determined until apply" when running
# with MicroK8s (use_eks=false) or when importing (e.g. secret already in AWS).
# - MicroK8s / local: use_eks_connection = false → config_path (kubeconfig).
# - Existing EKS: use_eks_connection = true → data sources (unchanged).
# - New EKS (create_eks=true): use_eks_connection = false → config_path; cluster is
#   created in same apply; ensure kubeconfig is updated (e.g. spinup or update-kubeconfig) so Helm can connect.
# ------------------------------------------------------------------
provider "helm" {
  kubernetes {
    host                   = local.use_eks_connection ? data.aws_eks_cluster.cluster[0].endpoint : null
    cluster_ca_certificate = local.use_eks_connection ? base64decode(data.aws_eks_cluster.cluster[0].certificate_authority[0].data) : null
    token                  = local.use_eks_connection ? data.aws_eks_cluster_auth.cluster[0].token : null

    config_path    = local.use_eks_connection ? null : var.kubeconfig_path
    config_context = local.use_eks_connection ? null : (var.cluster_context != "" ? var.cluster_context : null)
  }
}

provider "kubectl" {
  host                   = local.use_eks_connection ? data.aws_eks_cluster.cluster[0].endpoint : null
  cluster_ca_certificate = local.use_eks_connection ? base64decode(data.aws_eks_cluster.cluster[0].certificate_authority[0].data) : null
  token                  = local.use_eks_connection ? data.aws_eks_cluster_auth.cluster[0].token : null

  config_path      = local.use_eks_connection ? null : var.kubeconfig_path
  config_context   = local.use_eks_connection ? null : (var.cluster_context != "" ? var.cluster_context : null)
  load_config_file = !local.use_eks_connection
}
