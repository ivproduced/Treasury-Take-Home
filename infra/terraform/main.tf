data "aws_partition" "current" {}

resource "aws_ecr_repository" "app" {
  name                 = var.name
  image_tag_mutability = "IMMUTABLE"

  encryption_configuration {
    encryption_type = "AES256"
  }

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Retain the 20 most recent release images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 20
      }
      action = {
        type = "expire"
      }
    }]
  })
}

data "aws_iam_policy_document" "apprunner_ecr_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    effect  = "Allow"

    principals {
      type        = "Service"
      identifiers = ["build.apprunner.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "apprunner_ecr" {
  name_prefix        = "${var.name}-ecr-"
  assume_role_policy = data.aws_iam_policy_document.apprunner_ecr_assume_role.json
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr" {
  role       = aws_iam_role.apprunner_ecr.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

data "aws_iam_policy_document" "apprunner_instance_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    effect  = "Allow"

    principals {
      type        = "Service"
      identifiers = ["tasks.apprunner.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "apprunner_instance" {
  name_prefix        = "${var.name}-instance-"
  assume_role_policy = data.aws_iam_policy_document.apprunner_instance_assume_role.json
}

data "aws_iam_policy_document" "openai_secret" {
  count = var.openai_api_key_secret_arn == null ? 0 : 1

  statement {
    sid       = "ReadOpenAIKey"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [var.openai_api_key_secret_arn]
  }
}

resource "aws_iam_role_policy" "openai_secret" {
  count = var.openai_api_key_secret_arn == null ? 0 : 1

  name   = "read-openai-api-key"
  role   = aws_iam_role.apprunner_instance.id
  policy = data.aws_iam_policy_document.openai_secret[0].json
}

resource "aws_apprunner_auto_scaling_configuration_version" "app" {
  auto_scaling_configuration_name = var.name
  max_concurrency                 = var.max_concurrency
  max_size                        = var.max_size
  min_size                        = var.min_size
}

resource "aws_apprunner_service" "app" {
  service_name = var.name

  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.app.arn

  source_configuration {
    auto_deployments_enabled = false

    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr.arn
    }

    image_repository {
      image_identifier      = "${aws_ecr_repository.app.repository_url}:${var.image_tag}"
      image_repository_type = "ECR"

      image_configuration {
        port = "8080"
        runtime_environment_variables = {
          OPENAI_VISION_MODEL = var.openai_vision_model
        }
        runtime_environment_secrets = var.openai_api_key_secret_arn == null ? {} : {
          OPENAI_API_KEY = var.openai_api_key_secret_arn
        }
      }
    }
  }

  instance_configuration {
    cpu               = var.cpu
    memory            = var.memory
    instance_role_arn = aws_iam_role.apprunner_instance.arn
  }

  health_check_configuration {
    healthy_threshold   = 1
    interval            = 10
    protocol            = "TCP"
    timeout             = 5
    unhealthy_threshold = 5
  }

  depends_on = [aws_iam_role_policy_attachment.apprunner_ecr]
}

resource "aws_apprunner_custom_domain_association" "app" {
  domain_name          = var.custom_domain_name
  enable_www_subdomain = false
  service_arn          = aws_apprunner_service.app.arn
}