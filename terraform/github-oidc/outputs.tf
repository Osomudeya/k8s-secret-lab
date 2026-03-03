output "role_arn" {
  description = "ARN of the IAM role for GitHub Actions. Add this to GitHub repo Secrets as AWS_ROLE_ARN."
  value       = aws_iam_role.github_actions.arn
}

output "next_step" {
  description = "What to do next"
  value       = <<-EOT
    1. Copy the role_arn above.
    2. In GitHub: repo → Settings → Secrets and variables → Actions.
    3. New repository secret: Name = AWS_ROLE_ARN, Value = <paste role_arn>.
    4. Push to main (or run Terraform CI workflow) — Actions will use this role via OIDC.
  EOT
}
