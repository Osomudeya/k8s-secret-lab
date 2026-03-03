# EKS cluster and VPC — created when var.create_eks is true
# ------------------------------------------------------------------

data "aws_availability_zones" "available" {
  state = "available"
}

# 1. VPC
resource "aws_vpc" "main" {
  count                = var.create_eks ? 1 : 0
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = {
    Name = "k8s-secrets-lab-vpc"
  }
}

# 2. Subnets (two AZs)
resource "aws_subnet" "public" {
  count                   = var.create_eks ? 2 : 0
  vpc_id                  = aws_vpc.main[0].id
  cidr_block              = count.index == 0 ? "10.0.1.0/24" : "10.0.2.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags = {
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  }
}

# 3. Internet gateway
resource "aws_internet_gateway" "main" {
  count  = var.create_eks ? 1 : 0
  vpc_id = aws_vpc.main[0].id
}

# 4. Route table
resource "aws_route_table" "public" {
  count  = var.create_eks ? 1 : 0
  vpc_id = aws_vpc.main[0].id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main[0].id
  }
}

resource "aws_route_table_association" "public" {
  count          = var.create_eks ? 2 : 0
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public[0].id
}

# 5. IAM role for EKS cluster
resource "aws_iam_role" "eks_cluster" {
  count = var.create_eks ? 1 : 0
  name  = "k8s-secrets-lab-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  count      = var.create_eks ? 1 : 0
  role       = aws_iam_role.eks_cluster[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

# 6. IAM role for EKS node group
resource "aws_iam_role" "eks_node" {
  count = var.create_eks ? 1 : 0
  name  = "k8s-secrets-lab-eks-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eks_node_worker" {
  count      = var.create_eks ? 1 : 0
  role       = aws_iam_role.eks_node[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

resource "aws_iam_role_policy_attachment" "eks_node_cni" {
  count      = var.create_eks ? 1 : 0
  role       = aws_iam_role.eks_node[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}

resource "aws_iam_role_policy_attachment" "eks_node_ecr" {
  count      = var.create_eks ? 1 : 0
  role       = aws_iam_role.eks_node[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# 7. EKS cluster
resource "aws_eks_cluster" "cluster" {
  count    = var.create_eks ? 1 : 0
  name     = var.cluster_name
  role_arn = aws_iam_role.eks_cluster[0].arn
  # One minor version at a time: if cluster is 1.28, set to 1.29 first, apply, then 1.30
  version = "1.29"

  vpc_config {
    subnet_ids             = aws_subnet.public[*].id
    endpoint_public_access = true
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy
  ]
}

# 8. EKS node group (use cluster version — AMIs for 1.28 are no longer supported in 2025)
resource "aws_eks_node_group" "main" {
  count           = var.create_eks ? 1 : 0
  cluster_name    = aws_eks_cluster.cluster[0].name
  node_group_name = "k8s-secrets-lab-ng"
  node_role_arn   = aws_iam_role.eks_node[0].arn
  subnet_ids      = aws_subnet.public[*].id
  ami_type        = "AL2023_x86_64_STANDARD"

  scaling_config {
    desired_size = 2
    min_size     = 1
    max_size     = 3
  }

  instance_types = ["t3.small"]

  depends_on = [
    aws_iam_role_policy_attachment.eks_node_worker,
    aws_iam_role_policy_attachment.eks_node_cni,
    aws_iam_role_policy_attachment.eks_node_ecr
  ]
}

# 9. OIDC provider for IRSA
data "tls_certificate" "cluster" {
  count = var.create_eks ? 1 : 0
  url   = aws_eks_cluster.cluster[0].identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks_oidc" {
  count           = var.create_eks ? 1 : 0
  url             = aws_eks_cluster.cluster[0].identity[0].oidc[0].issuer
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.cluster[0].certificates[0].sha1_fingerprint]
}

# Grant GitHub Actions role access to the cluster so Terraform Helm provider can run in CI
resource "aws_eks_access_entry" "github_actions" {
  count         = var.create_eks && var.github_actions_role_arn != "" ? 1 : 0
  cluster_name  = aws_eks_cluster.cluster[0].name
  principal_arn = var.github_actions_role_arn
  type          = "STANDARD"
}

resource "aws_eks_access_policy_association" "github_actions_admin" {
  count         = var.create_eks && var.github_actions_role_arn != "" ? 1 : 0
  cluster_name  = aws_eks_cluster.cluster[0].name
  principal_arn = var.github_actions_role_arn
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
  access_scope {
    type = "cluster"
  }
}
