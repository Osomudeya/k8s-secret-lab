output "secret_arn" {
  description = "ARN of the secret in AWS Secrets Manager"
  value       = aws_secretsmanager_secret.app_db.arn
  sensitive   = true
}

output "secret_name" {
  description = "Name of the secret (use this in ExternalSecret manifests)"
  value       = aws_secretsmanager_secret.app_db.name
  sensitive   = true
}

output "eso_role_arn" {
  description = "IAM Role ARN used by ESO (annotate your ServiceAccount with this)"
  value       = aws_iam_role.eso_role.arn
  sensitive   = true
}

# Alias so "terraform output role_arn" works from this module (ESO role).
# For the GitHub Actions OIDC role (AWS_ROLE_ARN secret), run: cd ../github-oidc && terraform output role_arn
output "role_arn" {
  description = "ESO IAM role ARN (same as eso_role_arn). For GitHub Actions OIDC role, use terraform/github-oidc and run: terraform output role_arn"
  value       = aws_iam_role.eso_role.arn
  sensitive   = true
}

output "random_password_value" {
  description = "Initial DB password (random). Retrieve with: terraform output -raw random_password_value"
  value       = random_password.db.result
  sensitive   = true
}

output "next_steps" {
  description = "What to do after terraform apply"
  value       = <<-EOT
    ✅ Infrastructure ready! Now apply the K8s manifests:

    kubectl apply -f ../../k8s/aws/cluster-secret-store.yaml
    kubectl apply -f ../../k8s/aws/external-secret.yaml
    kubectl apply -f ../../k8s/aws/deployment.yaml

    Then verify:
    kubectl get externalsecret app-db-secret
    kubectl exec deploy/myapp -- env | grep DB_
  EOT
}

output "eks_cluster_name" {
  description = "EKS cluster name (set when create_eks = true)"
  value       = var.create_eks ? aws_eks_cluster.cluster[0].name : ""
}

output "eks_cluster_endpoint" {
  description = "EKS cluster API endpoint (set when create_eks = true)"
  value       = var.create_eks ? aws_eks_cluster.cluster[0].endpoint : ""
}
