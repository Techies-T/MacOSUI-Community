terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "macosui-tfstate-bucket"      # setup-tf-backend.sh で作成されるバケット名
    key            = "macosui-oss/terraform.tfstate"
    region         = "ap-northeast-1"
    dynamodb_table = "macosui-tfstate-lock"        # setup-tf-backend.sh で作成されるテーブル名
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}
