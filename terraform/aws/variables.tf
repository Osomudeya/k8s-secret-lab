variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "cluster_name" {
  description = "EKS cluster name (leave blank if using kind locally)"
  type        = string
  default     = "secrets-lab"
}

variable "use_eks" {
  description = "Set to true if using a real EKS cluster, false for local kind"
  type        = bool
  default     = false
}

variable "kubeconfig_path" {
  description = "Path to kubeconfig when use_eks = false. MicroK8s users should point this to their saved microk8s config path (e.g. ~/.kube/config-microk8s). Kind users can use the default."
  type        = string
  default     = "~/.kube/config"
}

variable "cluster_context" {
  description = "Kubectl context to use when use_eks = false. Leave empty to use the current context. Kind users typically set to 'kind-secrets-lab'; MicroK8s users set to 'microk8s'."
  type        = string
  default     = ""
}

variable "app_namespace" {
  description = "Kubernetes namespace for the sample app"
  type        = string
  default     = "default"
}

variable "secret_name" {
  description = "Name of the secret in AWS Secrets Manager"
  type        = string
  default     = "prod/myapp/database"
}
