variable "aws_region" {
  description = "AWS region for the EC2 deployment"
  default     = "ap-northeast-1"
}

variable "instance_type" {
  description = "EC2 Instance type (ARM64 recommended for t4g)"
  default     = "t4g.micro"
}

variable "key_name" {
  description = "Optional AWS EC2 Key Pair name for SSH access"
  type        = string
  default     = null
}
