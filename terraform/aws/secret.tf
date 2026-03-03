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
# Rotation configuration
# Without rotation_lambda_arn AWS accepts this resource but rotation never
# actually executes. For real rotation use the test-rotation.sh script
# manually, or add a Lambda and set rotation_lambda_arn. This resource only
# sets the schedule, not the mechanism.
# ------------------------------------------------------------------
resource "aws_secretsmanager_secret_rotation" "app_db" {
  count     = var.use_eks ? 1 : 0 # Only configure rotation on real infra
  secret_id = aws_secretsmanager_secret.app_db.id

  rotation_rules {
    automatically_after_days = 30
  }

  # Required for rotation to actually run; not defined in this repo
  # rotation_lambda_arn = aws_lambda_function.rotation.arn
}
