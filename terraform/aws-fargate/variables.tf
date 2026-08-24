variable "aws_region" {
  type    = string
  default = "ap-northeast-1"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "public_subnet1_cidr" {
  type    = string
  default = "10.0.1.0/24"
}

variable "public_subnet2_cidr" {
  type    = string
  default = "10.0.2.0/24"
}

variable "container_port" {
  description = "Port the container is listening on"
  type        = number
  default     = 8080
}

variable "domain_name" {
  description = "The fully qualified domain name for the application (e.g. macosui-agent-test.techiespod.co.jp)"
  type        = string
  default     = "macosui-agent-test.techiespod.co.jp"
}

variable "hosted_zone_name" {
  description = "The parent Route 53 Hosted Zone name (e.g. techiespod.co.jp.)"
  type        = string
  default     = "techiespod.co.jp."
}

variable "enable_https_listener" {
  description = "Enable HTTPS listener and ACM certificate validation"
  type        = bool
  default     = true
}
