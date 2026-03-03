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
# Locals — resolve cluster connection details regardless of path
# Paths:
#   create_eks=true           → use resource outputs from eks.tf
#   use_eks=true, create_eks=false → use data sources (existing cluster)
#   use_eks=false             → use local kubeconfig (MicroK8s)
# ------------------------------------------------------------------
locals {
  is_eks = var.use_eks || var.create_eks

  cluster_endpoint = var.create_eks ? aws_eks_cluster.cluster[0].endpoint : (
    var.use_eks ? data.aws_eks_cluster.cluster[0].endpoint : ""
  )

  cluster_ca = var.create_eks ? aws_eks_cluster.cluster[0].certificate_authority[0].data : (
    var.use_eks ? data.aws_eks_cluster.cluster[0].certificate_authority[0].data : ""
  )

  cluster_token = var.create_eks ? data.aws_eks_cluster_auth.created[0].token : (
    var.use_eks ? data.aws_eks_cluster_auth.cluster[0].token : ""
  )

  # OIDC issuer — used in iam.tf to build IRSA trust policy
  oidc_issuer = var.create_eks ? aws_eks_cluster.cluster[0].identity[0].oidc[0].issuer : (
    var.use_eks ? data.aws_eks_cluster.cluster[0].identity[0].oidc[0].issuer : ""
  )
}

# ------------------------------------------------------------------
# Providers — helm and kubectl use locals so they work for all paths
# ------------------------------------------------------------------
provider "helm" {
  kubernetes {
    # EKS paths: connect via API credentials
    host                   = local.is_eks ? local.cluster_endpoint : null
    cluster_ca_certificate = local.is_eks ? base64decode(local.cluster_ca) : null
    token                  = local.is_eks ? local.cluster_token : null

    # Local path (MicroK8s): use kubeconfig file
    config_path    = local.is_eks ? null : var.kubeconfig_path
    config_context = local.is_eks ? null : (var.cluster_context != "" ? var.cluster_context : null)
  }
}

provider "kubectl" {
  host                   = local.is_eks ? local.cluster_endpoint : null
  cluster_ca_certificate = local.is_eks ? base64decode(local.cluster_ca) : null
  token                  = local.is_eks ? local.cluster_token : null

  config_path      = local.is_eks ? null : var.kubeconfig_path
  config_context   = local.is_eks ? null : (var.cluster_context != "" ? var.cluster_context : null)
  load_config_file = !local.is_eks
}
