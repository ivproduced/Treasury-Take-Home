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

variable "custom_domain_name" {
  description = "Custom domain associated with the App Runner service. DNS validation records must be configured with the authoritative DNS provider."
  type        = string
  default     = "proofmark.ivproduced.com"
}

variable "image_tag" {
  description = "Immutable ECR image tag deployed by App Runner."
  type        = string
  default     = "latest"
}

variable "bedrock_model_id" {
  description = "Amazon Bedrock multimodal inference profile used by the server route."
  type        = string
  default     = "us.amazon.nova-lite-v1:0"
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