# ─────────────────────────────────────────────────────────────────────────────
# BOOTSTRAP — run this ONCE before the main infrastructure
# It creates the S3 bucket and DynamoDB table that store Terraform state.
# Uses local state because it bootstraps the state backend itself.
#
# HOW TO RUN:
#   cd infrastructure/bootstrap
#   terraform init
#   terraform apply
#   → copy the outputs into infrastructure/backend.tf
# ─────────────────────────────────────────────────────────────────────────────

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "af-south-1"
}

# Pull the current AWS account ID — used to make bucket names globally unique
data "aws_caller_identity" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  bucket_name = "shopswift-tf-state-${local.account_id}"
  table_name  = "shopswift-tf-locks"
}

# ── S3 bucket: stores the Terraform state file ───────────────────────────────
resource "aws_s3_bucket" "tf_state" {
  bucket = local.bucket_name

  # Prevent accidental deletion — remove this manually if you ever need to
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  versioning_configuration {
    status = "Enabled"   # Every state change is versioned — easy rollback
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# State bucket must never be public
resource "aws_s3_bucket_public_access_block" "tf_state" {
  bucket                  = aws_s3_bucket.tf_state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ── DynamoDB table: prevents two people running terraform apply at once ───────
resource "aws_dynamodb_table" "tf_locks" {
  name         = local.table_name
  billing_mode = "PAY_PER_REQUEST"   # Free tier: first 25GB storage free
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}

# ── Outputs: copy these into infrastructure/backend.tf ───────────────────────
output "state_bucket_name" {
  value       = aws_s3_bucket.tf_state.bucket
  description = "Paste this into infrastructure/backend.tf → bucket ="
}

output "dynamodb_table_name" {
  value       = aws_dynamodb_table.tf_locks.name
  description = "Paste this into infrastructure/backend.tf → dynamodb_table ="
}

output "region" {
  value = "af-south-1"
}
