#!/usr/bin/env bash
#
# Deploy the VacationHub App Runner CloudFormation stack.
#
# Usage:
#   ./deploy.sh
#
# Prerequisites:
#   - AWS CLI configured with correct credentials
#   - data stack already deployed (for VPC Connector SG)
#   - ECR repo with at least one image pushed
#   - Secrets Manager secret (vacationhub-secrets-prod) populated

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STACK_NAME="vacationhub-prod"
REGION="eu-west-1"
EXPECTED_ACCOUNT="444866822933"
DATA_STACK="vacationhub-data-prod"
SECRET_NAME="vacationhub-secrets-prod"

# --- Known infrastructure ---
VPC_ID="vpc-0b3b008f35eb0f7e1"
SUBNET_IDS="subnet-0a67399ea6d234fa8,subnet-083bdf340d5656283,subnet-0a5fb415679bdedcd"

# --- Verify AWS account ---
ACTUAL_ACCOUNT=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
if [[ "$ACTUAL_ACCOUNT" != "$EXPECTED_ACCOUNT" ]]; then
  echo "Error: Wrong AWS account. Expected ${EXPECTED_ACCOUNT}, got ${ACTUAL_ACCOUNT}"
  exit 1
fi

# --- Get security group from data stack ---
echo "=== Fetching AppRunner egress SG from ${DATA_STACK} ==="
SG_ID=$(aws cloudformation describe-stacks \
  --stack-name "$DATA_STACK" \
  --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='AppRunnerEgressSecurityGroupId'].OutputValue" \
  --output text)

if [[ -z "$SG_ID" || "$SG_ID" == "None" ]]; then
  echo "Error: Could not find AppRunnerEgressSecurityGroupId in ${DATA_STACK} outputs."
  echo "Deploy the data stack first: ./deploy-data.sh"
  exit 1
fi

echo "SG: ${SG_ID}"

# --- Get secret ARN ---
echo "=== Fetching secret ARN ==="
SECRET_ARN=$(aws secretsmanager describe-secret \
  --secret-id "$SECRET_NAME" \
  --region "$REGION" \
  --query 'ARN' \
  --output text)

if [[ -z "$SECRET_ARN" || "$SECRET_ARN" == "None" ]]; then
  echo "Error: Could not find secret ${SECRET_NAME}."
  echo "Create and populate it first with populate-secrets.sh"
  exit 1
fi

echo "Secret: ${SECRET_ARN}"
echo ""

PARAMS=(
  "Environment=prod"
  "VpcId=${VPC_ID}"
  "SubnetIds=${SUBNET_IDS}"
  "SecurityGroupIds=${SG_ID}"
  "AppUrl=https://vacaciones.alter5.com"
  "AppSecretArn=${SECRET_ARN}"
)

echo "=== Deploying ${STACK_NAME} ==="
echo "Region:  ${REGION}"
echo "VPC:     ${VPC_ID}"
echo "Subnets: ${SUBNET_IDS}"
echo "SG:      ${SG_ID}"
echo ""

echo "=== Running CloudFormation deploy ==="

aws cloudformation deploy \
  --template-file "${SCRIPT_DIR}/apprunner.yaml" \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --parameter-overrides "${PARAMS[@]}" \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset

echo ""
echo "=== Stack outputs ==="
aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs' \
  --output table

echo ""
echo "=== Done ==="
