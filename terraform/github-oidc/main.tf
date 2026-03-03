# One-time bootstrap: GitHub OIDC provider + IAM role for Actions.
# Run this once with AWS credentials (e.g. from your laptop), then add the output ARN to GitHub Secrets as AWS_ROLE_ARN.

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Use existing OIDC provider if ARN given or use_existing_oidc_provider; otherwise create it
locals {
  existing_oidc_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
  oidc_arn          = var.oidc_provider_arn != "" ? var.oidc_provider_arn : (var.use_existing_oidc_provider ? local.existing_oidc_arn : aws_iam_openid_connect_provider.github[0].arn)
}

resource "aws_iam_openid_connect_provider" "github" {
  count = (var.oidc_provider_arn != "" || var.use_existing_oidc_provider) ? 0 : 1

  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

# Trust policy: repo can assume this role from main branch or from pull_request
data "aws_iam_policy_document" "github_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.oidc_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    # Allow: push to main, pull_request, PR merge ref, and job with environment (e.g. environment: production)
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:${var.github_repo}:ref:refs/heads/${var.github_branch}",
        "repo:${var.github_repo}:pull_request",
        "repo:${var.github_repo}:ref:refs/pull/*/merge",
        "repo:${var.github_repo}:environment:${var.github_environment}"
      ]
    }
  }
}

resource "aws_iam_role" "github_actions" {
  name               = "github-actions-${replace(var.github_repo, "/", "-")}"
  assume_role_policy = data.aws_iam_policy_document.github_trust.json
}

# Permissions for Terraform CI, Deploy, and Teardown workflows
data "aws_iam_policy_document" "github_actions" {
  # Secrets Manager — create/read/delete secret (terraform/aws/secret.tf)
  statement {
    effect = "Allow"
    actions = [
      "secretsmanager:CreateSecret",
      "secretsmanager:DeleteSecret",
      "secretsmanager:DescribeSecret",
      "secretsmanager:GetSecretValue",
      "secretsmanager:GetResourcePolicy",
      "secretsmanager:PutSecretValue",
      "secretsmanager:RestoreSecret",
      "secretsmanager:ListSecretVersionIds"
    ]
    resources = ["*"]
  }

  # IAM — create/delete ESO role and policy (terraform/aws/iam.tf)
  statement {
    effect = "Allow"
    actions = [
      "iam:CreateRole",
      "iam:DeleteRole",
      "iam:GetRole",
      "iam:PassRole",
      "iam:PutRolePolicy",
      "iam:DeleteRolePolicy",
      "iam:GetRolePolicy",
      "iam:AttachRolePolicy",
      "iam:DetachRolePolicy",
      "iam:ListRolePolicies",
      "iam:ListAttachedRolePolicies",
      "iam:CreateOpenIDConnectProvider",
      "iam:DeleteOpenIDConnectProvider",
      "iam:GetOpenIDConnectProvider",
      "iam:TagOpenIDConnectProvider"
    ]
    resources = ["*"]
  }

  # S3 — Terraform state bucket (spinup uses k8s-secrets-lab-tfstate-ACCOUNT-REGION)
  statement {
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket",
      "s3:GetBucketVersioning",
      "s3:PutBucketVersioning",
      "s3:GetEncryptionConfiguration",
      "s3:PutEncryptionConfiguration",
      "s3:GetBucketLocation",
      "s3:CreateBucket",
      "s3:PutBucketPublicAccessBlock",
      "s3:GetBucketPublicAccessBlock"
    ]
    resources = [
      "arn:aws:s3:::k8s-secrets-lab-tfstate-${data.aws_caller_identity.current.account_id}-*",
      "arn:aws:s3:::k8s-secrets-lab-tfstate-${data.aws_caller_identity.current.account_id}-*/*"
    ]
  }

  # DynamoDB — Terraform lock table
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:DeleteItem",
      "dynamodb:DescribeTable",
      "dynamodb:CreateTable",
      "dynamodb:DeleteTable",
      "dynamodb:BatchGetItem",
      "dynamodb:BatchWriteItem",
      "dynamodb:ConditionCheckItem"
    ]
    resources = [
      "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/k8s-secrets-lab-tflock"
    ]
  }

  # EKS — for deploy workflow (update-kubeconfig) and Terraform Helm/kubectl providers when use_eks = true
  statement {
    effect = "Allow"
    actions = [
      "eks:DescribeCluster",
      "eks:DescribeNodegroup",
      "eks:ListNodegroups",
      "eks:ListClusters"
    ]
    resources = ["*"]
  }

  # EC2 — required for Terraform plan/apply when create_eks = true (VPC, subnets, AZs)
  statement {
    effect = "Allow"
    actions = [
      "ec2:DescribeAvailabilityZones",
      "ec2:DescribeVpcs",
      "ec2:DescribeSubnets",
      "ec2:DescribeSecurityGroups",
      "ec2:DescribeInternetGateways",
      "ec2:DescribeRouteTables",
      "ec2:DescribeNatGateways",
      "ec2:DescribeNetworkInterfaces",
      "ec2:DescribeVpcAttribute",
      "ec2:DescribeAccountAttributes"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "github_actions" {
  name   = "github-actions-policy"
  role   = aws_iam_role.github_actions.id
  policy = data.aws_iam_policy_document.github_actions.json
}
