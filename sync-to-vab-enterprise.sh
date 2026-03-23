.#!/bin/bash

# Sync script for enterprise APK to VPS Server
# Usage: ./sync-to-vab-enterprise.sh [sync|connect|both]
#   sync    - Sync files to server (default)
#   connect - SSH into the server
#   both    - Sync files then connect

# Server Configuration
EC2_HOST="64.235.43.187"
EC2_USER="root"
SSH_PORT="22"
PASSWORD='6BH07w0xB48?~kW-F'

# Remote directory (adjust as needed)
REMOTE_DIR="/var/www/html/enterprise"

# Local directory to sync
LOCAL_DIR="$(dirname "$0")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse command line argument
ACTION="${1:-sync}"

# Function to connect to server
connect_to_server() {
    echo -e "${YELLOW}Connecting to server...${NC}"
    sshpass -p "$PASSWORD" ssh -p $SSH_PORT -o StrictHostKeyChecking=no $EC2_USER@$EC2_HOST
}

# If action is just "connect", skip to connection
if [ "$ACTION" = "connect" ]; then
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}  Connecting to VPS Server${NC}"
    echo -e "${YELLOW}========================================${NC}"
    echo ""
    echo -e "Host: ${GREEN}$EC2_HOST${NC}"
    echo -e "User: ${GREEN}$EC2_USER${NC}"
    echo -e "Port: ${GREEN}$SSH_PORT${NC}"
    echo ""

    # Check if sshpass is installed
    if ! command -v sshpass &> /dev/null; then
        echo -e "${RED}Error: sshpass is not installed.${NC}"
        echo "Install it using:"
        echo "  macOS: brew install hudochenkov/sshpass/sshpass"
        echo "  Ubuntu/Debian: sudo apt-get install sshpass"
        exit 1
    fi

    connect_to_server
    exit 0
fi

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  enterprise Sync to VPS Server${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo -e "Host: ${GREEN}$EC2_HOST${NC}"
echo -e "User: ${GREEN}$EC2_USER${NC}"
echo -e "Port: ${GREEN}$SSH_PORT${NC}"
echo ""

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    echo -e "${RED}Error: sshpass is not installed.${NC}"
    echo "Install it using:"
    echo "  macOS: brew install hudochenkov/sshpass/sshpass"
    echo "  Ubuntu/Debian: sudo apt-get install sshpass"
    exit 1
fi

# Build the project first (optional - uncomment if needed)
# echo -e "${YELLOW}Building the project...${NC}"
# npm run build
# if [ $? -ne 0 ]; then
#     echo -e "${RED}Build failed!${NC}"
#     exit 1
# fi
# echo -e "${GREEN}Build completed successfully!${NC}"

# Sync files using rsync with sshpass
echo -e "${YELLOW}Syncing files to server...${NC}"

sshpass -p "$PASSWORD" rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.angular' \
    --exclude 'platforms' \
    --exclude 'plugins' \
    --exclude '*.zip' \
    --exclude '.DS_Store' \
    --exclude 'android' \
    --exclude 'ios' \
    -e "ssh -p $SSH_PORT -o StrictHostKeyChecking=no"
    "$LOCAL_DIR/" "$EC2_USER@$EC2_HOST:$REMOTE_DIR/"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Sync completed successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  Sync failed!${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi

# Connect to server after sync if requested
if [ "$ACTION" = "both" ]; then
    echo ""
    connect_to_server
fi
ctur