output "ecr_repository_url" {
  description = "ECR repository URL used to publish Proofmark images."
  value       = aws_ecr_repository.app.repository_url
}

output "service_arn" {
  description = "ARN of the App Runner service."
  value       = aws_apprunner_service.app.arn
}

output "service_url" {
  description = "HTTPS hostname assigned to the App Runner service."
  value       = "https://${aws_apprunner_service.app.service_url}"
}

output "custom_domain_dns_target" {
  description = "CNAME target for the custom domain at the authoritative DNS provider."
  value       = aws_apprunner_custom_domain_association.app.dns_target
}