# CI/CD Setup Guide for VABERP

This guide explains how to set up and use the CI/CD pipeline for the VABERP application.

## Overview

The CI/CD pipeline automatically:
- **Tests and builds** code on every push and pull request
- **Deploys to Dev** automatically when code is pushed to `master` branch
- **Deploys to QA** manually via GitHub Actions UI (requires approval)

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   GitHub    │────▶│ GitHub       │────▶│   Server    │
│ Repository  │     │ Actions      │     │ (VPS)       │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ├─ Test & Build
                           ├─ Deploy to Dev (auto)
                           └─ Deploy to QA (manual)
```

## Setup Instructions

### 1. Configure GitHub Secrets

Navigate to your GitHub repository: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

Add the following secrets:

| Secret Name | Value | Description |
|------------|-------|-------------|
| `DEPLOY_HOST` | `64.235.43.187` | VPS server IP address |
| `DEPLOY_PORT` | `22` | SSH port (usually 22) |
| `DEPLOY_USER` | `root` | SSH username |
| `DEPLOY_PASSWORD` | `your-password` | SSH password |

**Important**: Never commit these values to the repository. They should only exist in GitHub Secrets.

### 2. Configure GitHub Environments (Optional but Recommended)

For additional security and approval workflows:

1. Go to `Settings` → `Environments`
2. Create two environments:
   - **development**
     - Environment URL: `https://vaberp.com`
   - **qa**
     - Environment URL: `https://qa.vaberp.com`
     - Enable "Required reviewers" and add team members who should approve QA deployments

### 3. Workflow Files

The following GitHub Actions workflows are configured:

#### `ci-cd.yml` - Main CI/CD Pipeline
- **Triggers**: Push to master, manual dispatch
- **Jobs**:
  1. **test-and-build**: Tests and builds both API and Frontend
  2. **deploy-dev**: Auto-deploys to Dev on master push
  3. **deploy-qa**: Manual deployment to QA (requires workflow dispatch)
  4. **notify**: Sends deployment status notification

#### `pr-checks.yml` - Pull Request Checks
- **Triggers**: Pull requests to master
- **Jobs**: Lints, tests, and builds code to verify PR quality

## Usage

### Automatic Deployment to Dev

1. Make your changes and commit to a feature branch
2. Create a Pull Request to `master`
3. Wait for PR checks to pass (automated)
4. Merge the PR
5. **Dev environment is automatically deployed** 🚀

### Manual Deployment to QA

1. Go to `Actions` tab in GitHub
2. Select `CI/CD Pipeline` workflow
3. Click `Run workflow` button
4. Select `qa` from the environment dropdown
5. Click `Run workflow`
6. If environment protection is enabled, approve the deployment
7. **QA environment is deployed** 🚀

### Monitoring Deployments

1. Go to `Actions` tab
2. Click on the running/completed workflow
3. View logs for each job
4. Check deployment status in the summary

## Deployment Scripts

### `deploy.py` - Deploy to Dev
Uploads API and Frontend to `/var/www/html/enterprise/` and restarts PM2 processes.

### `deploy_qa.py` - Deploy to QA
Uploads API and Frontend to `/var/www/html/enterprise-qa/` and restarts PM2 processes.

Both scripts now use environment variables for credentials:
- `DEPLOY_HOST`
- `DEPLOY_PORT`
- `DEPLOY_USER`
- `DEPLOY_PASSWORD`

## Environment URLs

- **Dev**: https://vaberp.com (API: https://api.vaberp.com)
- **QA**: https://qa.vaberp.com (API: https://api.qa.vaberp.com)

## Troubleshooting

### Build Failures

**Problem**: Build fails in GitHub Actions but works locally

**Solution**:
- Check if all dependencies are in `package.json`
- Ensure environment variables are set correctly
- Review build logs in Actions tab

### Deployment Failures

**Problem**: Deployment fails with authentication error

**Solution**:
- Verify GitHub Secrets are configured correctly
- Check server credentials haven't changed
- Ensure SSH access is working: `ssh root@64.235.43.187`

### QA Deployment Not Triggering

**Problem**: QA deployment doesn't run after clicking "Run workflow"

**Solution**:
- Ensure you selected `qa` from the environment dropdown
- Check workflow logs for errors
- Verify `deploy_qa.py` script is present in repository

## Adding Tests

To enable testing in CI/CD, add test scripts to your `package.json`:

### API (NestJS)
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage"
  }
}
```

### Frontend (Next.js)
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

## Security Best Practices

1. ✅ **Never commit credentials** to the repository
2. ✅ **Use GitHub Secrets** for sensitive data
3. ✅ **Enable branch protection** on `master` branch
4. ✅ **Require PR reviews** before merging
5. ✅ **Enable environment protection** for QA/Production
6. 🔄 **Consider SSH keys** instead of password authentication (more secure)

## Future Enhancements

- [ ] Add database migration step before deployment
- [ ] Implement rollback functionality
- [ ] Add Slack/Email notifications
- [ ] Create staging environment
- [ ] Add performance testing
- [ ] Implement blue-green deployments
- [ ] Add code coverage reporting

## Support

For issues or questions:
1. Check the GitHub Actions logs
2. Review this documentation
3. Contact the DevOps team

---

**Last Updated**: April 2026
**Maintained by**: VAB Informatics Development Team
