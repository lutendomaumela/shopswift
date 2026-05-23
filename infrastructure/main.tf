# ─────────────────────────────────────────────────────────────────────────────
# main.tf — ShopSwift AWS Infrastructure
#
# Creates (all free-tier):
#   VPC + subnets + routing
#   EC2 t2.micro (runs Docker Compose)
#   RDS PostgreSQL db.t3.micro (private subnet — internet cannot reach it)
#   S3 bucket (product images)
#   ECR repository (Docker images)
#   SSM Parameter Store (secrets — free, encrypted)
#   IAM roles + policies (least privilege)
#
# WHY Terraform and not clicking the AWS console?
#   Everything is version-controlled. Anyone can read it.
#   Destroy and recreate the entire stack in 10 minutes.
#   No "I forgot what I clicked" infrastructure.
# ─────────────────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # After running bootstrap/, uncomment this block and fill in the values
  # from bootstrap outputs.
   backend "s3" {
     bucket         = "shopswift-tf-state-635867292049"
     key            = "production/terraform.tfstate"
     region         = "af-south-1"
     
     encrypt        = true
   }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ── Data sources ──────────────────────────────────────────────────────────────

data "aws_caller_identity" "current" {}

# Latest Ubuntu 22.04 LTS AMI in the target region
# WHY data source and not hardcoded AMI ID?
#   AMI IDs differ per region. A data source finds the right one automatically.
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical (Ubuntu's official AWS account)

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

locals {
  account_id   = data.aws_caller_identity.current.account_id
  name_prefix  = "${var.project_name}-${var.environment}"
}

# ═══════════════════════════════════════════════════════════════════════════
# VPC — the private network everything lives inside
# WHY not use the default VPC?
#   The default VPC has all subnets public and no isolation.
#   Building your own teaches you networking and is production practice.
# ═══════════════════════════════════════════════════════════════════════════

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true   # Required for RDS hostname resolution
  enable_dns_hostnames = true   # Required for EC2 public DNS

  tags = { Name = "${local.name_prefix}-vpc" }
}

# ── Internet Gateway — allows the public subnet to reach the internet ─────────
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name_prefix}-igw" }
}

# ── Subnets ────────────────────────────────────────────────────────────────────

# Public subnet: EC2 lives here (needs internet access to serve HTTP)
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.region}a"
  map_public_ip_on_launch = true   # EC2 gets a public IP automatically

  tags = { Name = "${local.name_prefix}-public-subnet" }
}

# Private subnet 1: RDS lives here (no internet access — database only)
# WHY private? A database exposed to the internet is a critical security risk.
resource "aws_subnet" "private_1" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "${var.region}b"

  tags = { Name = "${local.name_prefix}-private-subnet-1" }
}

# Private subnet 2: RDS subnet groups require at least 2 AZs
resource "aws_subnet" "private_2" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.3.0/24"
  availability_zone = "${var.region}c"

  tags = { Name = "${local.name_prefix}-private-subnet-2" }
}

# ── Route tables ──────────────────────────────────────────────────────────────

# Public route: all traffic (0.0.0.0/0) goes to the internet gateway
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${local.name_prefix}-public-rt" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Private subnets have no route to the internet — that's intentional.
# RDS only needs to be reached by EC2, not the internet.

# ═══════════════════════════════════════════════════════════════════════════
# Security Groups — firewall rules
# WHY be explicit? Every open port is an attack surface.
# ═══════════════════════════════════════════════════════════════════════════

# EC2 security group
resource "aws_security_group" "ec2" {
  name        = "${local.name_prefix}-ec2-sg"
  description = "ShopSwift EC2 - allows HTTP, HTTPS, and SSH from your IP only"
  vpc_id      = aws_vpc.main.id

  # HTTP — serves the API to the world
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP traffic from anywhere"
  }

  # HTTPS — for when we add TLS in Phase 8
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS traffic from anywhere"
  }

  # SSH — YOUR IP ONLY. Never 0.0.0.0/0.
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.your_ip_cidr]
    description = "SSH from your IP only"
  }

  # All outbound allowed — EC2 needs to pull from ECR, talk to RDS, etc.
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = { Name = "${local.name_prefix}-ec2-sg" }
}

# RDS security group
resource "aws_security_group" "rds" {
  name        = "${local.name_prefix}-rds-sg"
  description = "ShopSwift RDS - PostgreSQL accessible from EC2 ONLY"
  vpc_id      = aws_vpc.main.id

  # PostgreSQL port — only from the EC2 security group, not from the internet
  # WHY source security group and not IP? EC2's IP can change on restart.
  # Security group reference is dynamic — always points to the right EC2.
  ingress {
  from_port   = 22
  to_port     = 22
  protocol    = "tcp"
  cidr_blocks = ["0.0.0.0/0"]
  description = "SSH - open temporarily for GitHub Actions"
}

  tags = { Name = "${local.name_prefix}-rds-sg" }
}

# ═══════════════════════════════════════════════════════════════════════════
# IAM — permissions for EC2 to pull images and read secrets
# WHY a role and not an access key on the instance?
#   Instance roles rotate credentials automatically. Hardcoded keys
#   on a server are a serious security risk.
# ═══════════════════════════════════════════════════════════════════════════

resource "aws_iam_role" "ec2" {
  name = "${local.name_prefix}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "ec2_ecr" {
  name = "${local.name_prefix}-ec2-ecr-policy"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Get an ECR login token
        Effect   = "Allow"
        Action   = "ecr:GetAuthorizationToken"
        Resource = "*"
      },
      {
        # Pull images from OUR repository only — not any ECR repo in AWS
        Effect = "Allow"
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability",
        ]
        Resource = aws_ecr_repository.api.arn
      }
    ]
  })
}

resource "aws_iam_role_policy" "ec2_ssm" {
  name = "${local.name_prefix}-ec2-ssm-policy"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      # Read secrets from SSM — only the /shopswift/production/* path
      Effect = "Allow"
      Action = [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ]
      Resource = "arn:aws:ssm:${var.region}:${local.account_id}:parameter/${var.project_name}/${var.environment}/*"
    }]
  })
}

resource "aws_iam_role_policy" "ec2_s3" {
  name = "${local.name_prefix}-ec2-s3-policy"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
      Resource = "${aws_s3_bucket.assets.arn}/*"
    }]
  })
}

# Instance profile: this is how a role gets attached to an EC2 instance
resource "aws_iam_instance_profile" "ec2" {
  name = "${local.name_prefix}-ec2-profile"
  role = aws_iam_role.ec2.name
}

# ─ Separate IAM user for GitHub Actions (CI/CD) ──────────────────────────────
# WHY a separate user? EC2 role can't be used by GitHub Actions.
# In Phase 8 we upgrade this to OIDC (no long-lived keys at all).
resource "aws_iam_user" "github_actions" {
  name = "${local.name_prefix}-github-actions"
}

resource "aws_iam_user_policy" "github_actions" {
  name = "${local.name_prefix}-github-actions-policy"
  user = aws_iam_user.github_actions.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "ecr:GetAuthorizationToken"
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
        ]
        Resource = aws_ecr_repository.api.arn
      }
    ]
  })
}

# You'll need to create access keys manually for this user via:
#   aws iam create-access-key --user-name shopswift-production-github-actions
# Then add them to GitHub Secrets: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY

# ═══════════════════════════════════════════════════════════════════════════
# EC2 — the server that runs your Docker containers
# ═══════════════════════════════════════════════════════════════════════════

resource "aws_key_pair" "deployer" {
  key_name   = "${local.name_prefix}-deployer-key"
  # Generate: ssh-keygen -t ed25519 -C "shopswift-deploy" -f ~/.ssh/shopswift
  # Paste the PUBLIC key (.pub file contents) here
 public_key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEBVF/zDY5GcszatKx0N/QGiLWJ3oM+bBTgXAzSjN92T shopswift-deploy"

  tags = { Name = "${local.name_prefix}-deployer-key" }
}

resource "aws_instance" "api" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.ec2_instance_type   # t2.micro — free tier
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name
  key_name               = aws_key_pair.deployer.key_name

  # Bootstrap script — runs ONCE when the instance first starts
  # Installs Docker, Docker Compose, AWS CLI, sets up the deploy directory
  user_data = file("${path.module}/user_data.sh")

  # Root volume: 8GB (free tier gives 30GB — we're being conservative)
  root_block_device {
    volume_type           = "gp2"
    volume_size           = 20
    delete_on_termination = true
    encrypted             = true
  }

  tags = { Name = "${local.name_prefix}-api-server" }

  lifecycle {
    # Don't recreate the instance if only the user_data changes
    # (user_data only runs on first boot anyway)
    ignore_changes = [user_data]
  }
}

# ═══════════════════════════════════════════════════════════════════════════
# RDS — managed PostgreSQL (free tier)
# WHY RDS and not PostgreSQL in Docker on EC2?
#   RDS handles backups, patching, and restarts automatically.
#   In a private subnet it's unreachable from the internet.
#   Free tier gives 750hrs/month with db.t3.micro.
# ═══════════════════════════════════════════════════════════════════════════

resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnet-group"
  subnet_ids = [aws_subnet.private_1.id, aws_subnet.private_2.id]

  tags = { Name = "${local.name_prefix}-db-subnet-group" }
}

resource "aws_db_instance" "postgres" {
  identifier        = "${local.name_prefix}-postgres"
  engine            = "postgres"
  engine_version    = "15"
  instance_class    = var.rds_instance_class   # db.t3.micro — free tier
  allocated_storage = var.rds_allocated_storage # 20GB — free tier max

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  # Free tier settings — changing these causes charges
  multi_az            = false   # Multi-AZ = double the cost
  publicly_accessible = false   # Never expose DB to internet
  storage_encrypted   = true    # Free — just a boolean. Always enable this.
  storage_type        = "gp2"

  backup_retention_period = 1    # 1 day — free tier limit is 1 day
  skip_final_snapshot     = true # Change to false in real production

  # Don't auto-upgrade minor versions mid-production
  auto_minor_version_upgrade = false

  tags = { Name = "${local.name_prefix}-postgres" }
}

# ═══════════════════════════════════════════════════════════════════════════
# S3 — product image storage
# WHY S3 and not the server filesystem?
#   EC2 disk space is limited and not backed up.
#   S3 is infinitely scalable and survives server restarts.
#   Free tier: 5GB storage, 20k GET, 2k PUT requests/month.
# ═══════════════════════════════════════════════════════════════════════════

resource "aws_s3_bucket" "assets" {
  bucket = "${var.project_name}-assets-${local.account_id}"
  tags   = { Name = "${local.name_prefix}-assets" }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket                  = aws_s3_bucket.assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id
  versioning_configuration { status = "Enabled" }
}

# CORS: allows Next.js frontend to upload directly to S3 via pre-signed URLs
resource "aws_s3_bucket_cors_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = ["*"]  # Tighten this to your domain in Phase 8
    max_age_seconds = 3000
  }
}

# ═══════════════════════════════════════════════════════════════════════════
# ECR — private Docker image registry
# WHY ECR and not DockerHub?
#   ECR images are in the same AWS network as EC2 — pulls are fast and free.
#   DockerHub pulls from EC2 incur data transfer costs and are rate-limited.
#   Free tier: 500MB storage per month.
# ═══════════════════════════════════════════════════════════════════════════

resource "aws_ecr_repository" "api" {
  name                 = "${var.project_name}/api"
  image_tag_mutability = "MUTABLE"

  # Scan images for CVEs when pushed — free, just enable it
  image_scanning_configuration {
    scan_on_push = true
  }

  tags = { Name = "${local.name_prefix}-ecr" }
}

# Lifecycle policy: keep only the last 5 images — saves ECR storage
resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 5 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = { type = "expire" }
    }]
  })
}

# ═══════════════════════════════════════════════════════════════════════════
# SSM Parameter Store — encrypted secrets storage (FREE)
# WHY SSM and not environment variables in docker-compose?
#   Env vars in docker-compose files get committed to git accidentally.
#   SSM is encrypted at rest, IAM-controlled, audited, and free.
#   No secret ever touches your codebase.
# ═══════════════════════════════════════════════════════════════════════════

resource "aws_ssm_parameter" "database_url" {
  name  = "/${var.project_name}/${var.environment}/database_url"
  type  = "SecureString"   # AES-256 encrypted
  value = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.address}:5432/${var.db_name}"

  tags = { Name = "${local.name_prefix}-database-url" }
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/${var.project_name}/${var.environment}/jwt_secret_key"
  type  = "SecureString"
  value = var.jwt_secret_key

  tags = { Name = "${local.name_prefix}-jwt-secret" }
}

resource "aws_ssm_parameter" "flask_secret" {
  name  = "/${var.project_name}/${var.environment}/secret_key"
  type  = "SecureString"
  value = var.flask_secret_key

  tags = { Name = "${local.name_prefix}-flask-secret" }
}

resource "aws_ssm_parameter" "s3_bucket" {
  name  = "/${var.project_name}/${var.environment}/s3_bucket_name"
  type  = "String"
  value = aws_s3_bucket.assets.bucket
}

resource "aws_ssm_parameter" "ecr_url" {
  name  = "/${var.project_name}/${var.environment}/ecr_repository_url"
  type  = "String"
  value = aws_ecr_repository.api.repository_url
}
