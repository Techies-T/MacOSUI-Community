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

variable "repo_url" {
  description = "Git Repository URL to clone (without https://, e.g. github.com/Techies-T/MacOSUI-oss.git)"
  type        = string
  default     = "github.com/Techies-T/MacOSUI-oss.git"
}

variable "github_token" {
  description = "GitHub Personal Access Token for private repositories (leave empty if repository is public)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "https_mode" {
  description = "HTTPS termination method: 'cloudfront' (low-cost CDN with default HTTPS domain) or 'alb' (production ALB with ACM)"
  type        = string
  default     = "cloudfront"

  validation {
    condition     = contains(["cloudfront", "alb"], var.https_mode)
    error_message = "https_mode must be either 'cloudfront' or 'alb'. Plain HTTP is not permitted for activation and security compliance."
  }
}

variable "domain_name" {
  description = "Optional custom domain name (e.g., macosui.your-domain.com) for ALB / ACM certificate"
  type        = string
  default     = ""
}
