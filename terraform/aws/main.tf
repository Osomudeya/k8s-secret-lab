terraform {
  # CI pins to 1.7.x (terraform.yml); >= 1.5 allows local validate with older Terraform
  required_version = ">= 1.5.0"

  # S3 backend: configure via -backend-config in CI (TF_BACKEND_* secrets set by spinup.sh)
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
      # Community provider — used for applying CRD manifests (ClusterSecretStore).
      # hashicorp/kubectl exists but has different resource names; gavinbunney
      # is the established choice for ESO labs. If you hit CRD schema errors,
      # see: https://github.com/gavinbunney/terraform-provider-kubectl/issues
      source  = "gavinbunney/kubectl"
      version = "= 1.14.0"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.9"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
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

# EKS cluster data — only when using existing EKS (not creating one)
data "aws_eks_cluster" "cluster" {
  count = (var.use_eks && !var.create_eks) ? 1 : 0
  name  = var.cluster_name
}

data "aws_eks_cluster_auth" "cluster" {
  count = (var.use_eks || var.create_eks) ? 1 : 0
  name  = var.cluster_name
}

locals {
  kube_config_context = var.use_eks ? null : (var.cluster_context != "" ? var.cluster_context : null)
  cluster_endpoint    = var.create_eks ? aws_eks_cluster.cluster[0].endpoint : (var.use_eks ? data.aws_eks_cluster.cluster[0].endpoint : "")
  cluster_ca          = var.create_eks ? aws_eks_cluster.cluster[0].certificate_authority[0].data : (var.use_eks ? data.aws_eks_cluster.cluster[0].certificate_authority[0].data : "")
  cluster_token       = (var.use_eks || var.create_eks) ? data.aws_eks_cluster_auth.cluster[0].token : ""
  use_eks_auth        = var.use_eks || var.create_eks
  oidc_issuer         = var.create_eks ? aws_eks_cluster.cluster[0].identity[0].oidc[0].issuer : (var.use_eks ? data.aws_eks_cluster.cluster[0].identity[0].oidc[0].issuer : "")
}

provider "helm" {
  kubernetes {
    config_path    = local.use_eks_auth ? null : var.kubeconfig_path
    config_context = local.use_eks_auth ? null : local.kube_config_context

    host                   = local.use_eks_auth ? local.cluster_endpoint : null
    cluster_ca_certificate = local.use_eks_auth ? base64decode(local.cluster_ca) : null
    token                  = local.use_eks_auth ? local.cluster_token : null
  }
}

provider "kubectl" {
  config_path    = local.use_eks_auth ? null : var.kubeconfig_path
  config_context = local.use_eks_auth ? null : local.kube_config_context

  host                   = local.use_eks_auth ? local.cluster_endpoint : null
  cluster_ca_certificate = local.use_eks_auth ? base64decode(local.cluster_ca) : null
  token                  = local.use_eks_auth ? local.cluster_token : null
  load_config_file       = !local.use_eks_auth
}
