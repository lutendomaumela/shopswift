# ─────────────────────────────────────────────────────────────────────────────
# variables.tf  — all configurable values live here
# Copy terraform.tfvars.example → terraform.tfvars and fill in your values.
# Never commit terraform.tfvars — it's in .gitignore
# ─────────────────────────────────────────────────────────────────────────────

variable "region" {
  description = "AWS region. af-south-1 = Cape Town — closest to Pretoria."
  type        = string
  default     = "af-south-1"
}

variable "project_name" {
  description = "Used as a prefix on all resource names for easy identification."
  type        = string
  default     = "shopswift"
}

variable "environment" {
  description = "Deployment environment: production, staging, etc."
  type        = string
  default     = "production"
}

variable "your_ip_cidr" {
  description = <<-EOT
    Your home/office public IP in CIDR notation — e.g. "105.224.10.15/32"
    Only this IP can SSH into the EC2 instance.
    Find your IP: https://checkip.amazonaws.com
    WHY: Never open SSH to 0.0.0.0/0 — bots scan port 22 constantly.
  EOT
  type        = string
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "shopswift"
}

variable "db_username" {
  description = "PostgreSQL master username. Stored in SSM after creation."
  type        = string
  default     = "shopswift_admin"
}

variable "db_password" {
  description = <<-EOT
    PostgreSQL master password.
    WHY sensitive = true: Terraform won't print it in plan/apply output.
    Must be at least 8 chars, no @/:
  EOT
  type        = string
  sensitive   = true
}

variable "jwt_secret_key" {
  description = "Flask JWT secret key — random 64-char string. Generate: openssl rand -hex 32"
  type        = string
  sensitive   = true
}

variable "flask_secret_key" {
  description = "Flask SESSION secret key — random 64-char string. Generate: openssl rand -hex 32"
  type        = string
  sensitive   = true
}

variable "ec2_instance_type" {
  description = "EC2 instance type. t2.micro = free tier (750 hrs/month). Do NOT change."
  type        = string
  default     = "t3.micro"
}

variable "rds_instance_class" {
  description = "RDS instance class. db.t3.micro = free tier (750 hrs/month). Do NOT change."
  type        = string
  default     = "db.t3.micro"
}

variable "rds_allocated_storage" {
  description = "RDS storage in GB. Free tier gives 20GB. Stay at 20."
  type        = number
  default     = 20
}
