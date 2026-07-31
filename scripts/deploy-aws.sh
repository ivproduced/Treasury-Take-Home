#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TERRAFORM_DIR="$ROOT_DIR/infra/terraform"
AWS_REGION="${AWS_REGION:-us-east-1}"

if [[ -z "${IMAGE_TAG:-}" ]]; then
  GIT_SHA="$(git -C "$ROOT_DIR" rev-parse --short HEAD)"
  if [[ -n "$(git -C "$ROOT_DIR" status --porcelain)" ]]; then
    IMAGE_TAG="$GIT_SHA-dirty-$(date -u +%Y%m%d%H%M%S)"
  else
    IMAGE_TAG="$GIT_SHA"
  fi
fi

command -v aws >/dev/null || { echo "AWS CLI is required." >&2; exit 1; }
command -v docker >/dev/null || { echo "Docker is required." >&2; exit 1; }
command -v terraform >/dev/null || { echo "Terraform is required." >&2; exit 1; }

terraform -chdir="$TERRAFORM_DIR" init

TF_VAR_aws_region="$AWS_REGION" TF_VAR_image_tag="$IMAGE_TAG" \
  terraform -chdir="$TERRAFORM_DIR" apply \
  -target=aws_ecr_repository.app \
  -target=aws_ecr_lifecycle_policy.app \
  "$@"

ECR_URI="$(terraform -chdir="$TERRAFORM_DIR" output -raw ecr_repository_url)"
REGISTRY="${ECR_URI%%/*}"

aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$REGISTRY"

docker build --platform linux/amd64 -t "$ECR_URI:$IMAGE_TAG" "$ROOT_DIR"
docker push "$ECR_URI:$IMAGE_TAG"

TF_VAR_aws_region="$AWS_REGION" TF_VAR_image_tag="$IMAGE_TAG" \
  terraform -chdir="$TERRAFORM_DIR" apply "$@"

terraform -chdir="$TERRAFORM_DIR" output service_url