variable "github_repo" {
  description = "GitHub repo in format owner/repo (e.g. Osomudeya/k8s-secrets-lab)"
  type        = string
}

variable "github_branch" {
  description = "Branch that can assume this role (e.g. main)"
  type        = string
  default     = "main"
}

variable "aws_region" {
  description = "AWS region (for state bucket name pattern)"
  type        = string
  default     = "us-east-1"
}

variable "oidc_provider_arn" {
  description = "ARN of existing GitHub OIDC provider (if you created it manually). Leave empty to have Terraform create it. Example: arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
  type        = string
  default     = ""
}

variable "use_existing_oidc_provider" {
  description = "Set to true if the GitHub OIDC provider (token.actions.githubusercontent.com) already exists in your account (e.g. created manually or for another repo). Terraform will skip creating it and use the existing provider ARN."
  type        = bool
  default     = false
}
