#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "================================================="
echo " MacOSUI - Infrastructure Setup Script"
echo "================================================="

# Step 1: Ensure AWS credentials are configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ Error: AWS credentials are not configured or session expired."
    echo "Please run 'aws configure' or authenticate with your SSO provider before running this script."
    exit 1
fi
echo "✅ AWS credentials verified."

# Step 2: Setup Terraform Backend (S3 & DynamoDB)
echo "-------------------------------------------------"
echo " Step 2: Provisioning Terraform Backend..."
echo "-------------------------------------------------"
bash ./scripts/setup-tf-backend.sh

# Step 3: Initialize Terraform
echo "-------------------------------------------------"
echo " Step 3: Initializing Terraform..."
echo "-------------------------------------------------"
cd terraform
terraform init

# Step 4: Apply Terraform Configuration
echo "-------------------------------------------------"
echo " Step 4: Provisioning AWS Resources (VPC, ECS, ALB, ECR, DynamoDB)..."
echo "-------------------------------------------------"
echo "Note: By default, HTTPS is disabled so you can test immediately."
echo "To enable HTTPS, set 'enable_https_listener = true' in terraform/variables.tf."

terraform apply -auto-approve

echo "================================================="
echo " 🎉 Infrastructure Provisioning Complete!"
echo "================================================="
echo "Your base AWS infrastructure is ready."
echo "Next step: Push your code to the 'main' branch to trigger GitHub Actions,"
echo "which will build the Docker container and deploy the MacOSUI application."
