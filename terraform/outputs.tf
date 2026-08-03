output "acm_certificate_validation_cname_name" {
  description = "Name of the CNAME record to add to your DNS provider (e.g. Oname.com) for ACM validation"
  value       = tolist(aws_acm_certificate.cert.domain_validation_options)[0].resource_record_name
}

output "acm_certificate_validation_cname_value" {
  description = "Value of the CNAME record to add to your DNS provider for ACM validation"
  value       = tolist(aws_acm_certificate.cert.domain_validation_options)[0].resource_record_value
}

output "alb_dns_name" {
  description = "The DNS Name of the Load Balancer. Create a CNAME record pointing your domain to this value."
  value       = aws_lb.main.dns_name
}
