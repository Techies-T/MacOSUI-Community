output "instance_public_ip" {
  description = "The public IP address of the EC2 instance"
  value       = aws_instance.macosui_server.public_ip
}

output "https_mode" {
  description = "The active HTTPS termination mode"
  value       = var.https_mode
}

output "app_https_url" {
  description = "The secure HTTPS URL to access the MacOSUI application"
  value = var.https_mode == "cloudfront" ? "https://${aws_cloudfront_distribution.macosui_cf[0].domain_name}" : (
    var.domain_name != "" ? "https://${var.domain_name}" : "http://${aws_lb.macosui_alb[0].dns_name}"
  )
}

output "acm_validation_records" {
  description = "DNS validation records for ACM certificate (if ALB with custom domain is used)"
  value       = var.https_mode == "alb" && var.domain_name != "" ? aws_acm_certificate.macosui_cert[0].domain_validation_options : null
}
