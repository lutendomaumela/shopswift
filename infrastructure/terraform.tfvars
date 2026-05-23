# ─────────────────────────────────────────────────────────────────────────────
# terraform.tfvars.example
# Copy this to terraform.tfvars and fill in your real values.
# NEVER commit terraform.tfvars — it contains secrets.
# It is already in .gitignore.
# ─────────────────────────────────────────────────────────────────────────────

region       = "af-south-1"   # Cape Town — closest to Pretoria
project_name = "shopswift"
environment  = "production"

# Find your IP: https://checkip.amazonaws.com — add /32 at the end
your_ip_cidr = "105.245.110.145/32"

# Generate: openssl rand -base64 32
db_password      = "CGPxTnWHNSJXSpf1dLX29IrQpPFgoqL9"
jwt_secret_key   = "6f89ba79e1088582c9d4b5a07952813fcb488a579aa51dd8d0e5ee09296d0a82"
flask_secret_key = "6d11ffdf5622e8d1654854c8969b7d7f8cd659a6900d5e7d6f403ee98709c087"

# These stay at free-tier defaults — do NOT change
ec2_instance_type     = "t3.micro"
rds_instance_class    = "db.t3.micro"
rds_allocated_storage = 20
