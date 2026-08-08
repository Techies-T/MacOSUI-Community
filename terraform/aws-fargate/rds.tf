resource "aws_db_subnet_group" "main" {
  name       = "macosui-db-subnet-group"
  subnet_ids = [aws_subnet.public1.id, aws_subnet.public2.id] # Using public subnets for simplicity in this setup

  tags = {
    Name = "MacOSUI DB Subnet Group"
  }
}

resource "aws_security_group" "rds" {
  name        = "macosui-rds-sg"
  description = "Allow inbound PostgreSQL traffic from ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
    cidr_blocks     = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "main" {
  identifier           = "macosui-postgres"
  engine               = "postgres"
  engine_version       = "16.14"
  instance_class       = "db.t4g.micro"
  allocated_storage    = 20
  storage_type         = "gp3"
  
  db_name              = "macosui"
  username             = "postgres"
  password             = "macosui_secure_password_123" # In production, use AWS Secrets Manager
  
  db_subnet_group_name = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  
  publicly_accessible  = true # Set to false in production if using private subnets
  skip_final_snapshot  = true # For development/testing
  multi_az             = false # User can toggle this later

  tags = {
    Name = "MacOSUI PostgreSQL"
  }
}

output "rds_endpoint" {
  value = aws_db_instance.main.endpoint
}
