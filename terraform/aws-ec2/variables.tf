variable "aws_region" {
  description = "AWS region for the EC2 deployment"
  default     = "ap-northeast-1"
}

variable "instance_type" {
  description = "EC2 Instance type (x86_64 / AMD / Intel, e.g., t3.micro, t3.small, t3a.small)"
  default     = "t3.micro"
}

variable "key_name" {
  description = "Optional AWS EC2 Key Pair name for SSH access"
  type        = string
  default     = null
}
