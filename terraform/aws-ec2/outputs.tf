output "instance_public_ip" {
  description = "The public IP address of the EC2 instance"
  value       = aws_instance.macosui_server.public_ip
}

output "app_url" {
  description = "The URL to access the MacOSUI application"
  value       = "http://${aws_instance.macosui_server.public_ip}:8080"
}
