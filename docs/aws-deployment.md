# AWS deployment

Proofmark runs on AWS App Runner as a container stored in Amazon ECR. This keeps the server-rendered application and `/api/analyze` route in one managed service. S3 static website hosting is not compatible with the API route.

## Prerequisites

- An AWS account and an IAM principal that can manage ECR, App Runner, IAM, and Secrets Manager
- AWS CLI v2 authenticated to the target account
- Docker with BuildKit enabled
- A chosen AWS region; the examples use `us-east-1`

Set deployment variables for the current shell:

```bash
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
export ECR_REPOSITORY=proofmark
export IMAGE_TAG="$(git rev-parse --short HEAD)"
```

## Build and publish

Create the private image repository once:

```bash
aws ecr describe-repositories \
  --region "$AWS_REGION" \
  --repository-names "$ECR_REPOSITORY" >/dev/null 2>&1 || \
aws ecr create-repository \
  --region "$AWS_REGION" \
  --repository-name "$ECR_REPOSITORY" \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256
```

Build for App Runner and push the immutable release tag:

```bash
export ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY"

aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin \
  "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

docker build --platform linux/amd64 -t "$ECR_URI:$IMAGE_TAG" .
docker push "$ECR_URI:$IMAGE_TAG"
```

Use `linux/arm64` instead when the App Runner service is intentionally configured for ARM64.

## Create the service

In the AWS console, open **App Runner**, create a service, and choose **Container registry** followed by **Amazon ECR**.

Configure the service as follows:

| Setting | Value |
|---|---|
| Image URI | The `$ECR_URI:$IMAGE_TAG` value pushed above |
| Deployment trigger | Manual for controlled releases; automatic for a mutable release tag |
| Port | `8080` |
| CPU and memory | Start with 1 vCPU and 2 GB |
| Health check | TCP |
| Environment variable | `OPENAI_VISION_MODEL=gpt-4.1-mini` |

The application works in demo simulation mode without an API key. For real vision analysis, store the key in AWS Secrets Manager, grant the App Runner instance role `secretsmanager:GetSecretValue` for that secret, and map it to the runtime secret environment variable `OPENAI_API_KEY`. Never configure it as a build argument or a `NEXT_PUBLIC_` variable.

App Runner creates a default HTTPS URL after the service becomes healthy. Verify both the home page and an analysis request before attaching a custom domain.

## Release an update

Build and push a new immutable tag, then update the App Runner service to that image tag. Keep the previous ECR tag available for rollback. Do not overwrite a deployed tag because image provenance and rollback become ambiguous.

## Production controls

Before processing agency data, add authentication and authorization in front of the application, use an AWS WAF rate-based rule, restrict outbound access to the approved AI provider, enable App Runner logs and alarms, and define retention and incident-response procedures. The in-memory request limiter is per container and is not a distributed production control.

The current request path buffers one image in memory and accepts up to 8 MB. Keep at least 2 GB of service memory and test the limit through any custom proxy or WAF configuration. A higher-volume deployment should use private S3 uploads, malware scanning, a durable queue, and bounded workers rather than increasing the synchronous request limit.