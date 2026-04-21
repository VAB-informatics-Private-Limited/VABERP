#!/bin/bash

# Complete QA Reconfiguration Script for Single Domain
# This script reconfigures QA to use qa.vaberp.com for both frontend and API
# Frontend: https://qa.vaberp.com
# API: https://qa.vaberp.com/api
#
# Usage: bash qa-reconfigure-single-domain.sh

set -e  # Exit on any error

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  QA Single Domain Reconfiguration${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
   echo -e "${RED}Please run as root or with sudo${NC}"
   exit 1
fi

# Step 1: Remove old api.qa.vaberp.com configuration
echo -e "${YELLOW}[1/5] Removing api.qa.vaberp.com configuration...${NC}"
rm -f /etc/nginx/sites-enabled/api.qa.vaberp.com
rm -f /etc/nginx/sites-available/api.qa.vaberp.com
echo -e "${GREEN}✓ Old API subdomain config removed${NC}"

# Step 2: Update nginx configuration for qa.vaberp.com
echo -e "${YELLOW}[2/5] Updating nginx configuration...${NC}"
cat > /etc/nginx/sites-available/qa.vaberp.com << 'EOF'
server {
    listen 80;
    server_name qa.vaberp.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name qa.vaberp.com;

    ssl_certificate /etc/letsencrypt/live/qa.vaberp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/qa.vaberp.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options "DENY";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";

    # Logs
    access_log /var/log/nginx/qa.vaberp.com.access.log;
    error_log /var/log/nginx/qa.vaberp.com.error.log;

    # API Backend - proxy /api/* to QA API (port 2263)
    location /api {
        proxy_pass http://localhost:2263;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Uploads - proxy /uploads/* to QA API
    location /uploads {
        proxy_pass http://localhost:2263/uploads;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Cache-Control "public, max-age=31536000";
    }

    # API Docs - proxy /docs to Swagger
    location /docs {
        proxy_pass http://localhost:2263/docs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend - proxy everything else to Next.js (port 2264)
    location / {
        proxy_pass http://localhost:2264;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Next.js static files
    location /_next/static {
        proxy_pass http://localhost:2264;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    client_max_body_size 10M;
}
EOF

ln -sf /etc/nginx/sites-available/qa.vaberp.com /etc/nginx/sites-enabled/
echo -e "${GREEN}✓ Nginx config updated${NC}"

# Step 3: Test and reload nginx
echo -e "${YELLOW}[3/5] Testing and reloading nginx...${NC}"
nginx -t
systemctl reload nginx
echo -e "${GREEN}✓ Nginx reloaded${NC}"

# Step 4: Update Frontend .env
echo -e "${YELLOW}[4/5] Updating Frontend .env...${NC}"
cat > /var/www/html/enterprise-qa/frontend/.env << 'EOF'
NEXT_PUBLIC_API_URL=https://qa.vaberp.com
NEXT_PUBLIC_UPLOAD_URL=https://qa.vaberp.com/uploads
EOF

chmod 644 /var/www/html/enterprise-qa/frontend/.env
echo -e "${GREEN}✓ Frontend .env updated${NC}"

# Step 5: Rebuild and restart Frontend
echo -e "${YELLOW}[5/5] Rebuilding and restarting Frontend...${NC}"
cd /var/www/html/enterprise-qa/frontend
npm run build 2>&1 | tail -20
pm2 restart vab-frontend-qa
echo -e "${GREEN}✓ Frontend restarted${NC}"
echo ""

# Display final status
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Reconfiguration Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}QA Environment URLs:${NC}"
echo -e "  Frontend:  ${GREEN}https://qa.vaberp.com${NC}"
echo -e "  API:       ${GREEN}https://qa.vaberp.com/api${NC}"
echo -e "  API Docs:  ${GREEN}https://qa.vaberp.com/docs${NC}"
echo -e "  Uploads:   ${GREEN}https://qa.vaberp.com/uploads${NC}"
echo ""
echo -e "${YELLOW}Current Configuration:${NC}"
echo -e "  Frontend .env:"
cat /var/www/html/enterprise-qa/frontend/.env | sed 's/^/    /'
echo ""
echo -e "${YELLOW}Test Commands:${NC}"
echo -e "  curl https://qa.vaberp.com/api/health"
echo -e "  curl https://qa.vaberp.com"
echo ""
echo -e "${YELLOW}PM2 Status:${NC}"
pm2 status | grep -E "(name|vab-.*-qa)"
echo ""
echo -e "${GREEN}Visit https://qa.vaberp.com in your browser${NC}"
echo -e "Login: admin@vab.com / admin123"
echo ""
