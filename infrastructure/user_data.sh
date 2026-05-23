#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# user_data.sh — EC2 bootstrap script
# Runs ONCE when the instance first starts. Sets up everything Docker needs.
# You do NOT need to SSH in and run this manually.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# Log everything — visible in /var/log/cloud-init-output.log
exec > >(tee /var/log/user-data.log | logger -t user-data) 2>&1
echo "=== ShopSwift EC2 bootstrap starting $(date) ==="

# ── System update ─────────────────────────────────────────────────────────────
apt-get update -y
apt-get upgrade -y

# ── Install Docker ────────────────────────────────────────────────────────────
apt-get install -y ca-certificates curl gnupg lsb-release

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker and enable on boot
systemctl start docker
systemctl enable docker

# Add ubuntu user to docker group — allows running docker without sudo
usermod -aG docker ubuntu

# ── Install AWS CLI v2 ────────────────────────────────────────────────────────
curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
apt-get install -y unzip
unzip -q /tmp/awscliv2.zip -d /tmp
/tmp/aws/install
rm -rf /tmp/awscliv2.zip /tmp/aws

# ── Create deploy directory ────────────────────────────────────────────────────
mkdir -p /opt/shopswift
chown ubuntu:ubuntu /opt/shopswift

# ── Write the deploy script ────────────────────────────────────────────────────
# GitHub Actions SSHs into the server and runs this script to deploy
cat > /opt/shopswift/deploy.sh << 'DEPLOY_SCRIPT'
#!/bin/bash
set -euo pipefail

echo "=== ShopSwift deploy starting $(date) ==="

REGION="af-south-1"
PROJECT="shopswift"
ENV="production"
SSM_PATH="/${PROJECT}/${ENV}"

# Step 1: Fetch secrets from SSM Parameter Store
echo "Fetching secrets from SSM..."

export DATABASE_URL=$(aws ssm get-parameter \
  --name "${SSM_PATH}/database_url" \
  --with-decryption \
  --region "${REGION}" \
  --query 'Parameter.Value' \
  --output text)

export JWT_SECRET_KEY=$(aws ssm get-parameter \
  --name "${SSM_PATH}/jwt_secret_key" \
  --with-decryption \
  --region "${REGION}" \
  --query 'Parameter.Value' \
  --output text)

export SECRET_KEY=$(aws ssm get-parameter \
  --name "${SSM_PATH}/secret_key" \
  --with-decryption \
  --region "${REGION}" \
  --query 'Parameter.Value' \
  --output text)

export S3_BUCKET_NAME=$(aws ssm get-parameter \
  --name "${SSM_PATH}/s3_bucket_name" \
  --region "${REGION}" \
  --query 'Parameter.Value' \
  --output text)

export ECR_REPOSITORY_URL=$(aws ssm get-parameter \
  --name "${SSM_PATH}/ecr_repository_url" \
  --region "${REGION}" \
  --query 'Parameter.Value' \
  --output text)

# Step 2: Login to ECR
echo "Logging into ECR..."
aws ecr get-login-password --region "${REGION}" \
  | docker login --username AWS --password-stdin "${ECR_REPOSITORY_URL}"

# Step 3: Pull the latest image (tag passed as argument from GitHub Actions)
IMAGE_TAG="${1:-latest}"
export API_IMAGE="${ECR_REPOSITORY_URL}:${IMAGE_TAG}"
echo "Pulling image: ${API_IMAGE}"
docker pull "${API_IMAGE}"

# Step 4: Run docker compose with production config
echo "Starting containers..."
cd /opt/shopswift
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# Step 5: Health check — wait up to 60s for the API to respond
echo "Waiting for API to be healthy..."
for i in $(seq 1 12); do
  if curl -sf http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ API is healthy after ${i}×5s"
    exit 0
  fi
  echo "  Attempt ${i}/12 — waiting 5s..."
  sleep 5
done

echo "❌ API health check failed after 60s"
docker compose -f docker-compose.prod.yml logs api --tail=50
exit 1
DEPLOY_SCRIPT

chmod +x /opt/shopswift/deploy.sh
chown ubuntu:ubuntu /opt/shopswift/deploy.sh

echo "=== Bootstrap complete $(date) ==="
echo "EC2 is ready. GitHub Actions can now SSH and run /opt/shopswift/deploy.sh"
