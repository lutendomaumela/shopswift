# ─────────────────────────────────────────────────────────────────────────────
# outputs.tf — values printed after terraform apply
# These are the values you'll copy into GitHub Secrets and your .env files
# ─────────────────────────────────────────────────────────────────────────────

output "ec2_public_ip" {
  description = "Add this to GitHub Secrets as EC2_HOST — the server you SSH into"
  value       = aws_instance.api.public_ip
}

output "ec2_public_dns" {
  description = "Public DNS of the EC2 instance — use as your API base URL"
  value       = aws_instance.api.public_dns
}

output "ecr_repository_url" {
  description = "Add this to GitHub Secrets as ECR_REPOSITORY — where Docker images are pushed"
  value       = aws_ecr_repository.api.repository_url
}

output "rds_endpoint" {
  description = "RDS connection endpoint — only reachable from inside the VPC (EC2)"
  value       = aws_db_instance.postgres.address
}

output "s3_bucket_name" {
  description = "S3 bucket name for product images"
  value       = aws_s3_bucket.assets.bucket
}

output "aws_region" {
  value = var.region
}

output "next_steps" {
  description = "Paste these values into GitHub Secrets to complete the pipeline"
  value = <<-EOT

    ─────────────────────────────────────────────────
    GITHUB SECRETS TO ADD (Settings → Secrets → Actions)
    ─────────────────────────────────────────────────
    AWS_ACCESS_KEY_ID      → from: aws iam create-access-key --user-name shopswift-production-github-actions
    AWS_SECRET_ACCESS_KEY  → from: same command above
    EC2_HOST               → ${aws_instance.api.public_ip}
    EC2_SSH_KEY            → contents of ~/.ssh/shopswift (private key, not .pub)
    ECR_REPOSITORY         → ${aws_ecr_repository.api.repository_url}
    SLACK_WEBHOOK          → your Slack incoming webhook URL
    ─────────────────────────────────────────────────
  EOT
}
