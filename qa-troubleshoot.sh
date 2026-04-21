#!/bin/bash

# QA Troubleshooting Script
# Diagnoses and fixes common QA environment issues
# Usage: bash qa-troubleshoot.sh

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  QA Environment Diagnostics${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

echo -e "${YELLOW}[1] Checking PM2 Processes...${NC}"
pm2 status
echo ""

echo -e "${YELLOW}[2] Checking Ports...${NC}"
echo "QA API (2263):"
netstat -tulpn | grep 2263 || echo -e "${RED}  Port 2263 not listening!${NC}"
echo "QA Frontend (2264):"
netstat -tulpn | grep 2264 || echo -e "${RED}  Port 2264 not listening!${NC}"
echo ""

echo -e "${YELLOW}[3] Testing API Directly...${NC}"
echo "Local API test:"
curl -s http://localhost:2263/api/health || echo -e "${RED}  API not responding on localhost${NC}"
echo ""

echo -e "${YELLOW}[4] Testing via HTTPS...${NC}"
echo "HTTPS API test:"
curl -sk https://qa.vaberp.com/api/health || echo -e "${RED}  API not responding via HTTPS${NC}"
echo ""

echo -e "${YELLOW}[5] Checking PM2 Logs (API - last 30 lines)...${NC}"
pm2 logs vab-api-qa --lines 30 --nostream
echo ""

echo -e "${YELLOW}[6] Checking PM2 Logs (Frontend - last 30 lines)...${NC}"
pm2 logs vab-frontend-qa --lines 30 --nostream
echo ""

echo -e "${YELLOW}[7] Checking Nginx Configuration...${NC}"
nginx -t
echo ""

echo -e "${YELLOW}[8] Checking Frontend .env...${NC}"
cat /var/www/html/enterprise-qa/frontend/.env
echo ""

echo -e "${YELLOW}[9] Checking API .env exists...${NC}"
if [ -f /var/www/html/enterprise-qa/api/.env ]; then
    echo -e "${GREEN}  ✓ API .env file exists${NC}"
    echo "  Database config:"
    grep "^DB_" /var/www/html/enterprise-qa/api/.env
else
    echo -e "${RED}  ✗ API .env file missing!${NC}"
fi
echo ""

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  Common Fixes${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo "If services are not running, try:"
echo "  pm2 restart vab-api-qa vab-frontend-qa"
echo ""
echo "If API has errors, rebuild:"
echo "  cd /var/www/html/enterprise-qa/api"
echo "  npm install --legacy-peer-deps"
echo "  npx nest build"
echo "  pm2 restart vab-api-qa"
echo ""
echo "If Frontend has errors, rebuild:"
echo "  cd /var/www/html/enterprise-qa/frontend"
echo "  npm install --legacy-peer-deps"
echo "  npm run build"
echo "  pm2 restart vab-frontend-qa"
echo ""
