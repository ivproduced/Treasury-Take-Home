# AWS deployment

Proofmark runs on AWS App Runner as a container stored in Amazon ECR. This keeps the server-rendered application and `/api/analyze` route in one managed service. S3 static website hosting is not compatible with the API route.

## Terraform deployment

Terraform manages the ECR repository, lifecycle policy, least-privilege App Runner roles, autoscaling configuration, and App Runner service. The deployment script handles the required artifact ordering: ECR must exist before the first image can be pushed, and that image must exist before App Runner can start.

### Prerequisites

- An AWS account and an IAM principal that can manage ECR, App Runner, IAM, and Secrets Manager
- AWS CLI v2 authenticated to the target account
- Docker with BuildKit enabled
- Terraform 1.7 or newer
- A chosen AWS region; the default is `us-east-1`

Authenticate the AWS CLI, start Docker, and run:

```bash
export AWS_REGION=us-east-1
./scripts/deploy-aws.sh
```

The script uses the current Git commit as an immutable image tag. A dirty worktree receives a timestamped `dirty` suffix to prevent collisions; committed releases are recommended for traceability. Set `IMAGE_TAG` to select another unique release tag. Terraform prompts for approval twice on the first deployment: once for ECR, then once for the complete service.

Real vision analysis uses Amazon Bedrock through the App Runner instance role. Terraform grants `bedrock:InvokeModel` to the configured inference profile and grants its underlying Amazon Nova Lite foundation-model access only when `bedrock:InferenceProfileArn` equals that profile. No model API key or Secrets Manager secret is required. Override `bedrock_model_id` only with another validated multimodal Bedrock profile and update the scoped foundation-model ARN.

For persistent team environments, configure a remote Terraform backend before the first shared deployment. Do not commit local state or populated `.tfvars` files. Copy `infra/terraform/terraform.tfvars.example` to a local `.tfvars` file for non-secret overrides.

### Custom domain

Terraform associates `proofmark.ivproduced.com` with App Runner, while Bluehost remains the authoritative DNS provider. In Bluehost DNS, create the application CNAME using the `custom_domain_dns_target` Terraform output and create every certificate-validation CNAME reported by:

```bash
aws apprunner describe-custom-domains \
  --region "$AWS_REGION" \
  --service-arn "$(terraform -chdir=infra/terraform output -raw service_arn)"
```

Keep the validation CNAMEs in DNS so App Runner can renew its managed TLS certificate. The custom domain becomes available after App Runner reports its status as `active`.

### Manual Terraform workflow

The script is a convenience, not a separate deployment system. Its equivalent first deployment is:

1. Run `terraform -chdir=infra/terraform init`.
2. Apply the ECR repository with `terraform -chdir=infra/terraform apply -target=aws_ecr_repository.app -target=aws_ecr_lifecycle_policy.app`.
3. Build the container and push an immutable tag to the `ecr_repository_url` output.
4. Run the full apply with the same tag: `terraform -chdir=infra/terraform apply -var='image_tag=YOUR_TAG'`.

The targeted first apply is necessary only because Terraform does not build container artifacts and App Runner rejects a service whose image does not exist.

### Destroy

Run `terraform -chdir=infra/terraform destroy` to remove the App Runner service, IAM roles, and ECR repository. ECR deletion fails while images remain, intentionally protecting release artifacts. Delete the repository images first only when permanent teardown is intended.

## Release an update

Run `./scripts/deploy-aws.sh` from a new Git commit, or set a unique `IMAGE_TAG`. The ECR repository rejects tag overwrites. Keep the previous ECR tag available for rollback by applying its tag as `image_tag`.

## Production controls

Before processing agency data, add authentication and authorization in front of the application, use an AWS WAF rate-based rule, restrict Bedrock model access and regions according to agency policy, enable App Runner logs and alarms, and define retention and incident-response procedures. The in-memory request limiter is per container and is not a distributed production control.

The current request path buffers one image in memory and accepts up to 8 MB. Keep at least 2 GB of service memory and test the limit through any custom proxy or WAF configuration. A higher-volume deployment should use private S3 uploads, malware scanning, a durable queue, and bounded workers rather than increasing the synchronous request limit.