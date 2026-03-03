terraform {
  required_version = ">= 1.5.0"

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

# EKS cluster data — assumes you have an existing cluster
# For the lab, we use kind locally so we point helm/kubectl at it
data "aws_eks_cluster" "cluster" {
  count = var.use_eks ? 1 : 0
  name  = var.cluster_name
}

data "aws_eks_cluster_auth" "cluster" {
  count = var.use_eks ? 1 : 0
  name  = var.cluster_name
}

locals {
  kube_config_context = var.use_eks ? null : (var.cluster_context != "" ? var.cluster_context : null)
}

provider "helm" {
  kubernetes {
    config_path    = var.use_eks ? null : var.kubeconfig_path
    config_context = var.use_eks ? null : local.kube_config_context

    host                   = var.use_eks ? data.aws_eks_cluster.cluster[0].endpoint : null
    cluster_ca_certificate = var.use_eks ? base64decode(data.aws_eks_cluster.cluster[0].certificate_authority[0].data) : null
    token                  = var.use_eks ? data.aws_eks_cluster_auth.cluster[0].token : null
  }
}

provider "kubectl" {
  config_path    = var.use_eks ? null : var.kubeconfig_path
  config_context = var.use_eks ? null : local.kube_config_context

  host                   = var.use_eks ? data.aws_eks_cluster.cluster[0].endpoint : null
  cluster_ca_certificate = var.use_eks ? base64decode(data.aws_eks_cluster.cluster[0].certificate_authority[0].data) : null
  token                  = var.use_eks ? data.aws_eks_cluster_auth.cluster[0].token : null
  load_config_file       = !var.use_eks
}
