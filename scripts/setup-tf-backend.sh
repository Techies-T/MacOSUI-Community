#!/bin/bash
set -e

REGION="ap-northeast-1"
BUCKET_NAME="macosui-tfstate-bucket"
TABLE_NAME="macosui-tfstate-lock"

echo "Checking if S3 bucket exists: $BUCKET_NAME"
if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    echo "S3 bucket already exists."
else
    echo "Creating S3 bucket..."
    aws s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$REGION" \
        --create-bucket-configuration LocationConstraint="$REGION"
    
    echo "Enabling versioning on S3 bucket..."
    aws s3api put-bucket-versioning \
        --bucket "$BUCKET_NAME" \
        --versioning-configuration Status=Enabled
fi

echo "Checking if DynamoDB table exists: $TABLE_NAME"
if aws dynamodb describe-table --table-name "$TABLE_NAME" --region "$REGION" >/dev/null 2>&1; then
    echo "DynamoDB table already exists."
else
    echo "Creating DynamoDB table..."
    aws dynamodb create-table \
        --table-name "$TABLE_NAME" \
        --attribute-definitions AttributeName=LockID,AttributeType=S \
        --key-schema AttributeName=LockID,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region "$REGION"
fi

echo "Terraform backend setup completed successfully."
