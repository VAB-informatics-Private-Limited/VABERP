# VAB Enterprise API - Server Deployment Guide

## Option 1: Docker Deployment (Recommended)

### Prerequisites
- Docker and Docker Compose installed on the server
- Git (to clone the repository)

### Steps

1. **Copy project to server:**
   ```bash
   # Using SCP
   scp -r /path/to/api user@server:/path/to/deploy
   
   # Or using Git
   git clone <repository-url>
   cd api
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   nano .env  # Edit with production values
   ```

3. **Update .env with secure values:**
   ```env
   DB_PASSWORD=your_strong_password_here
   JWT_SECRET=your_secure_jwt_secret_min_32_chars
   NODE_ENV=production
   CORS_ORIGIN=https://your-frontend-domain.com
   ```

4. **Start the containers:**
   ```bash
   docker-compose up -d
   ```

5. **Verify deployment:**
   ```bash
   # Check container status
   docker-compose ps
   
   # Check API logs
   docker-compose logs -f api
   
   # Access Swagger docs
   curl http://localhost:3001/docs
   ```

---

## Option 2: Manual Deployment (Without Docker)

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- npm or yarn

### Steps

1. **Install PostgreSQL and create database:**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   
   # Start PostgreSQL
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   
   # Create database and user
   sudo -u postgres psql
   ```
   
   ```sql
   CREATE DATABASE vab_enterprise;
   CREATE USER vab_user WITH ENCRYPTED PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE vab_enterprise TO vab_user;
   \q
   ```

2. **Copy project and install dependencies:**
   ```bash
   cd /path/to/api
   npm ci
   npm run build
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   nano .env
   ```

4. **Update .env:**
   ```env
   NODE_ENV=production
   PORT=3001
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=vab_user
   DB_PASSWORD=your_password
   DB_DATABASE=vab_enterprise
   JWT_SECRET=your_secure_jwt_secret_min_32_chars
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=https://your-frontend-domain.com
   ```

5. **Run database migrations:**
   ```bash
   npm run migration:run
   ```

6. **Start the server:**
   ```bash
   # Development mode
   npm run start:dev
   
   # Production mode (recommended)
   npm run start:prod
   ```

7. **Use PM2 for process management (recommended):**
   ```bash
   npm install -g pm2
   pm2 start dist/main.js --name vab-api
   pm2 save
   pm2 startup
   ```

---

## Connecting Frontend to Backend

Update the frontend API client to use the new NestJS backend:

### 1. Update Frontend Environment
```env
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://your-server-ip:3001
```

### 2. API Endpoint Mapping

| Old PHP Endpoint | New NestJS Endpoint |
|-----------------|---------------------|
| `login.php` | `POST /auth/login` |
| `register_enterprise.php` | `POST /auth/register` |
| `getCustomerList.php` | `GET /customers` |
| `addNewCustomer.php` | `POST /customers` |
| `updateCustomer.php` | `PUT /customers/:id` |
| `deleteCustomer.php` | `DELETE /customers/:id` |
| `getProductList.php` | `GET /products` |
| `addNewProducts.php` | `POST /products` |
| `getEnquiryList.php` | `GET /enquiries` |
| `addNewEnquiry.php` | `POST /enquiries` |
| `getTodayfollowups.php` | `GET /enquiries/today-followups` |
| `addNewQuotation.php` | `POST /quotations` |
| `getJobCartList.php` | `GET /manufacturing/job-cards` |
| `getInventoryList.php` | `GET /inventory` |

### 3. Response Format
The NestJS API uses consistent response format:
```json
{
  "message": "Success message",
  "data": { ... },
  "totalRecords": 100,
  "page": 1,
  "limit": 20
}
```

### 4. Authentication
- JWT tokens are returned on login
- Include token in Authorization header: `Bearer <token>`
- Enterprise ID is extracted from JWT, not request body

---

## Swagger Documentation

After deployment, access API documentation at:
```
http://your-server:3001/docs
```

This provides:
- All available endpoints
- Request/response schemas
- Try-it-out functionality

---

## Troubleshooting

### Container won't start
```bash
docker-compose logs postgres  # Check database logs
docker-compose logs api       # Check API logs
```

### Database connection failed
- Verify PostgreSQL is running
- Check credentials in .env match PostgreSQL setup
- Ensure database exists

### Port already in use
```bash
# Check what's using the port
lsof -i :3001
# Kill the process or change PORT in .env
```

### TypeORM sync issues
```bash
# Reset database (WARNING: deletes all data)
npm run schema:drop
npm run migration:run
```
