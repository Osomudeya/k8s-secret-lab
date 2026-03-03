# ------------------------------------------------------------------
# IRSA — IAM Role for Service Accounts
# This is how ESO authenticates to AWS without any access keys.
# K8s ServiceAccount → OIDC token → AWS STS → temporary credentials
# ------------------------------------------------------------------

# OIDC provider for EKS — lookup when using existing cluster; created in eks.tf when create_eks
data "aws_iam_openid_connect_provider" "eks" {
  count = (var.use_eks && !var.create_eks) ? 1 : 0
  url   = data.aws_eks_cluster.cluster[0].identity[0].oidc[0].issuer
}

locals {
  eso_oidc_arn = var.use_eks ? (var.create_eks ? aws_iam_openid_connect_provider.eks_oidc[0].arn : data.aws_iam_openid_connect_provider.eks[0].arn) : null
}

# Trust policy: only the ESO service account can assume this role (EKS).
# When use_eks = false (local MicroK8s), the role is created so Terraform/Helm don't
# need conditional logic. Local cluster: static credential auth is used instead (see
# k8s/aws/secret-store-static.yaml). This trust policy is intentionally broad for lab use only —
# must be replaced with proper IRSA for production EKS.
data "aws_iam_policy_document" "eso_assume" {
  # EKS: only the ESO service account can assume this role (IRSA).
  dynamic "statement" {
    for_each = var.use_eks ? [1] : []
    content {
      effect  = "Allow"
      actions = ["sts:AssumeRoleWithWebIdentity"]
      principals {
        type        = "Federated"
        identifiers = [local.eso_oidc_arn]
      }
      condition {
        test     = "StringEquals"
        variable = "${replace(local.oidc_issuer, "https://", "")}:sub"
        values   = ["system:serviceaccount:external-secrets:external-secrets"]
      }
    }
  }

  # Local cluster: allow account root to assume this role (role exists for Terraform/Helm; ESO
  # actually uses static credentials from a K8s Secret — see k8s/aws/secret-store-static.yaml).
  # Federated only accepts OIDC/SAML ARNs; for account root we use AWS principal + AssumeRole.
  dynamic "statement" {
    for_each = var.use_eks ? [] : [1]
    content {
      effect  = "Allow"
      actions = ["sts:AssumeRole"]
      principals {
        type        = "AWS"
        identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
      }
    }
  }
}

resource "aws_iam_role" "eso_role" {
  name               = "eso-secrets-reader-lab"
  assume_role_policy = data.aws_iam_policy_document.eso_assume.json

  tags = {
    ManagedBy = "terraform"
  }
}

# Least-privilege: only read the specific secret, nothing else
resource "aws_iam_role_policy" "eso_policy" {
  name = "eso-read-secret"
  role = aws_iam_role.eso_role.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
          "secretsmanager:ListSecretVersionIds"
        ]
        # Scope to ONLY this secret, not all secrets in the account
        Resource = aws_secretsmanager_secret.app_db.arn
      }
    ]
  })
}
