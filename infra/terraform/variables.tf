variable "aws_region" {
  description = "AWS region for all Proofmark resources."
  type        = string
  default     = "us-east-1"
}

variable "name" {
  description = "Name used for the ECR repository and App Runner service."
  type        = string
  default     = "proofmark"
}

variable "image_tag" {
  description = "Immutable ECR image tag deployed by App Runner."
  type        = string
  default     = "latest"
}

variable "openai_api_key_secret_arn" {
  description = "Optional ARN of an existing Secrets Manager secret containing the OpenAI API key."
  type        = string
  default     = null
  nullable    = true
}

variable "openai_vision_model" {
  description = "OpenAI vision model used by the server route."
  type        = string
  default     = "gpt-4.1-mini"
}

variable "cpu" {
  description = "CPU allocated to each App Runner instance."
  type        = string
  default     = "1 vCPU"
}

variable "memory" {
  description = "Memory allocated to each App Runner instance."
  type        = string
  default     = "2 GB"
}

variable "min_size" {
  description = "Minimum number of App Runner instances."
  type        = number
  default     = 1
}

variable "max_size" {
  description = "Maximum number of App Runner instances."
  type        = number
  default     = 3
}

variable "max_concurrency" {
  description = "Maximum concurrent requests per App Runner instance."
  type        = number
  default     = 50
}

variable "tags" {
  description = "Tags applied to managed AWS resources."
  type        = map(string)
  default = {
    Application = "Proofmark"
    ManagedBy   = "Terraform"
  }
}