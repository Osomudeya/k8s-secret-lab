# ------------------------------------------------------------------
# AWS Secrets Manager — source of truth for all app secrets
# Never hardcode passwords in Terraform — even for labs. random_password
# teaches the right pattern and keeps initial value out of code.
# ------------------------------------------------------------------

resource "random_password" "db" {
  length  = 24
  special = true
}

resource "aws_secretsmanager_secret" "app_db" {
  name                    = var.secret_name
  description             = "Database credentials for myapp — managed by Terraform"
  recovery_window_in_days = 7 # 7-day safety window before permanent deletion

  tags = {
    Environment = "lab"
    ManagedBy   = "terraform"
    App         = "myapp"
  }
}

resource "aws_secretsmanager_secret_version" "app_db" {
  secret_id = aws_secretsmanager_secret.app_db.id

  # Store as JSON so ESO can extract individual keys
  secret_string = jsonencode({
    username = "dbadmin"
    password = random_password.db.result
    host     = "rds.lab.example.com"
    port     = "5432"
    dbname   = "myappdb"
  })
}

# ------------------------------------------------------------------
# Rotation configuration — DISABLED: AWS requires rotation_lambda_arn.
# Without a Lambda, CreateSecretRotation fails with "No Lambda rotation
# function ARN is associated with this secret". Use test-rotation.sh for
# manual rotation; or add a Lambda and set count = var.use_eks ? 1 : 0.
# ------------------------------------------------------------------
resource "aws_secretsmanager_secret_rotation" "app_db" {
  count     = 0 # Set to (var.use_eks ? 1 : 0) only when rotation_lambda_arn is set
  secret_id = aws_secretsmanager_secret.app_db.id

  rotation_rules {
    automatically_after_days = 30
  }

  # rotation_lambda_arn = aws_lambda_function.rotation.arn
}
