# GitHub Actions Workflows

This directory contains CI/CD workflows for the VABERP application.

## Workflows

### 1. `ci-cd.yml` - Main CI/CD Pipeline

**Triggers:**
- Push to `master` branch
- Manual workflow dispatch

**Jobs:**
- **test-and-build**: Installs dependencies, builds API and Frontend, runs tests
- **deploy-dev**: Auto-deploys to Dev environment on master push
- **deploy-qa**: Manually triggered deployment to QA environment
- **notify**: Reports deployment status

### 2. `pr-checks.yml` - Pull Request Validation

**Triggers:**
- Pull requests to `master` branch

**Jobs:**
- **lint-and-test**: Lints, tests, and builds code to ensure PR quality

## Quick Start

1. **Setup GitHub Secrets** (see [CICD_SETUP.md](../../CICD_SETUP.md))
   - `DEPLOY_HOST`
   - `DEPLOY_PORT`
   - `DEPLOY_USER`
   - `DEPLOY_PASSWORD`

2. **Push to master** → Dev deploys automatically

3. **Deploy to QA** → Go to Actions → Run workflow → Select "qa"

## Status Badges

Add these to your README.md:

```markdown
![CI/CD Pipeline](https://github.com/VAB-informatics-Private-Limited/VABERP/actions/workflows/ci-cd.yml/badge.svg)
![PR Checks](https://github.com/VAB-informatics-Private-Limited/VABERP/actions/workflows/pr-checks.yml/badge.svg)
```

## Learn More

- [Full Setup Guide](../../CICD_SETUP.md)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
