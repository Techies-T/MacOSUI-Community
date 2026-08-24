# ==============================================================================
# Option 1: CloudFront CDN Distribution (https_mode == "cloudfront")
# ==============================================================================

resource "aws_cloudfront_distribution" "macosui_cf" {
  count = var.https_mode == "cloudfront" ? 1 : 0

  enabled         = true
  is_ipv6_enabled = true
  comment         = "MacOSUI Single EC2 CloudFront HTTPS Distribution"
  price_class     = "PriceClass_All"

  origin {
    domain_name = aws_instance.macosui_server.public_dns != "" ? aws_instance.macosui_server.public_dns : aws_instance.macosui_server.public_ip
    origin_id   = "EC2-MacOSUI"

    custom_origin_config {
      http_port              = 8080
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
      origin_read_timeout    = 60
    }
  }

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "EC2-MacOSUI"

    forwarded_values {
      query_string = true
      headers      = ["Accept", "Accept-Language", "Authorization", "Origin", "Referer", "User-Agent"]

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "MacOSUI-CloudFront"
  }
}

# ==============================================================================
# Option 2: Application Load Balancer (https_mode == "alb")
# ==============================================================================

data "aws_vpc" "default" {
  count   = var.https_mode == "alb" ? 1 : 0
  default = true
}

data "aws_subnets" "default" {
  count = var.https_mode == "alb" ? 1 : 0
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default[0].id]
  }
}

resource "aws_security_group" "alb_sg" {
  count       = var.https_mode == "alb" ? 1 : 0
  name        = "macosui-alb-sg"
  description = "Security group for MacOSUI ALB"
  vpc_id      = data.aws_vpc.default[0].id

  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_lb" "macosui_alb" {
  count              = var.https_mode == "alb" ? 1 : 0
  name               = "macosui-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg[0].id]
  subnets            = data.aws_subnets.default[0].ids

  tags = {
    Name = "MacOSUI-ALB"
  }
}

resource "aws_lb_target_group" "macosui_tg" {
  count       = var.https_mode == "alb" ? 1 : 0
  name        = "macosui-ec2-tg"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.default[0].id
  target_type = "instance"

  health_check {
    enabled             = true
    path                = "/api/health"
    port                = "8080"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_target_group_attachment" "macosui_tga" {
  count            = var.https_mode == "alb" ? 1 : 0
  target_group_arn = aws_lb_target_group.macosui_tg[0].arn
  target_id        = aws_instance.macosui_server.id
  port             = 8080
}

resource "aws_lb_listener" "http" {
  count             = var.https_mode == "alb" ? 1 : 0
  load_balancer_arn = aws_lb.macosui_alb[0].arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = var.domain_name != "" ? "redirect" : "forward"
    target_group_arn = var.domain_name == "" ? aws_lb_target_group.macosui_tg[0].arn : null

    dynamic "redirect" {
      for_each = var.domain_name != "" ? [1] : []
      content {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }
}

resource "aws_acm_certificate" "macosui_cert" {
  count             = var.https_mode == "alb" && var.domain_name != "" ? 1 : 0
  domain_name       = var.domain_name
  validation_method = "DNS"

  tags = {
    Name = "MacOSUI-Cert"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_lb_listener" "https" {
  count             = var.https_mode == "alb" && var.domain_name != "" ? 1 : 0
  load_balancer_arn = aws_lb.macosui_alb[0].arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.macosui_cert[0].arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.macosui_tg[0].arn
  }
}
