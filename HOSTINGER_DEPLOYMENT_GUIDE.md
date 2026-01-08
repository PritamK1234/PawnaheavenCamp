# LoonCamp Admin Panel - Hostinger Deployment Guide

Complete guide to deploy the LoonCamp admin panel to Hostinger Business Hosting with Node.js support.

## Prerequisites

- Hostinger Business or Cloud hosting plan with Node.js support
- PostgreSQL database access
- SSH access to your hosting account
- Domain configured

## Deployment Steps

### 1. Prepare Files for Production

On your local machine:

#### Backend Preparation

```bash
cd backend

# Install dependencies (if not already done)
npm install

# No build step needed for backend
```

#### Admin Panel Preparation

```bash
cd admin

# Install dependencies
npm install

# Build for production
npm run build

# This creates an optimized 'build' folder
```

### 2. Create PostgreSQL Database

1. Login to Hostinger hPanel
2. Go to "Databases" > "PostgreSQL Databases"
3. Click "Create Database"
4. Database Name: `looncamp_db`
5. Username: Create new user or use existing
6. Password: Generate strong password
7. Note down:
   - Database name
   - Username
   - Password
   - Host (usually localhost or IP address)
   - Port (usually 5432)

### 3. Upload Files via SSH

Connect to your hosting via SSH:

```bash
ssh username@your-domain.com
```

Create application directory:

```bash
mkdir -p ~/nodejs/looncamp
cd ~/nodejs/looncamp
```

Upload files using SCP from your local machine:

```bash
# Upload backend files
scp -r backend/* username@your-domain.com:~/nodejs/looncamp/

# Upload admin panel build
scp -r admin/build username@your-domain.com:~/nodejs/looncamp/admin/
```

Or use FileZilla/FTP:
- Connect to your hosting
- Navigate to `~/nodejs/looncamp`
- Upload all `backend/` files
- Create `admin/` folder
- Upload contents of `admin/build/` to `admin/` folder

### 4. Install Dependencies on Server

SSH into your server:

```bash
cd ~/nodejs/looncamp
npm install --production
```

This installs only production dependencies (no devDependencies).

### 5. Configure Environment Variables

Create `.env` file on server:

```bash
nano .env
```

Add configuration:

```env
# Server Configuration
PORT=5001
NODE_ENV=production

# PostgreSQL Database
DATABASE_URL=postgresql://username:password@localhost:5432/looncamp_db

# JWT Configuration - USE STRONG SECRET IN PRODUCTION
JWT_SECRET=your-super-strong-random-secret-key-here
JWT_EXPIRY=24h
```

To generate a strong JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Save and exit (Ctrl+X, Y, Enter)

### 6. Initialize Database

```bash
# Connect to PostgreSQL and create tables
node scripts/initDb.js
```

You should see:
```
Database initialized successfully!
Default admin credentials:
Email: admin@looncamp.com
Password: admin123
```

### 7. Configure Node.js Application in hPanel

1. Login to Hostinger hPanel
2. Go to "Advanced" > "Node.js"
3. Click "Setup Application"
4. Configure:
   - Application Mode: Production
   - Application Root: `/home/username/nodejs/looncamp`
   - Application URL: Choose your domain
   - Application startup file: `server.js`
   - Node.js version: 14.x or higher
5. Click "Create"

### 8. Set Environment Variables in hPanel

In Node.js application settings:

1. Click "Edit" on your application
2. Scroll to "Environment Variables"
3. Add:
   - `NODE_ENV` = `production`
   - `PORT` = `5001`
   - `DATABASE_URL` = `postgresql://user:pass@localhost:5432/looncamp_db`
   - `JWT_SECRET` = `your-secret-key`
4. Save

### 9. Start the Application

In hPanel Node.js section:
1. Click "Start" button on your application
2. Wait for status to show "Running"

Or via SSH:

```bash
cd ~/nodejs/looncamp
npm start
```

### 10. Configure Domain/Subdomain

#### Option A: Using Subdomain

1. Go to hPanel > "Domains" > "Subdomains"
2. Create subdomain: `admin.yourdomain.com`
3. Point to `/home/username/nodejs/looncamp`

#### Option B: Using Path

Access via: `https://yourdomain.com/admin`

### 11. Configure SSL Certificate

1. Go to hPanel > "Advanced" > "SSL"
2. Enable SSL for your domain
3. Force HTTPS (recommended)

### 12. Test the Deployment

#### Test API

```bash
curl https://yourdomain.com/api/health

# Expected response:
{
  "success": true,
  "message": "LoonCamp API is running",
  "timestamp": "..."
}
```

#### Test Login

```bash
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@looncamp.com","password":"admin123"}'
```

#### Test Admin Panel

Open browser and navigate to:
```
https://yourdomain.com/admin
```

Login with:
- Email: `admin@looncamp.com`
- Password: `admin123`

### 13. Change Default Admin Password

IMPORTANT: Change the default password immediately!

1. Login to admin panel
2. Currently, password change must be done via database:

```bash
# SSH into server
ssh username@your-domain.com

# Connect to database
psql -h localhost -U username -d looncamp_db

# Generate new password hash locally:
node -e "console.log(require('bcrypt').hashSync('YourNewSecurePassword', 10))"

# Update password in database:
UPDATE admins SET password_hash = 'new_hash_here' WHERE email = 'admin@looncamp.com';

# Exit psql
\q
```

## Post-Deployment Configuration

### 1. Setup CORS (if needed)

If your frontend is on a different domain, update `server.js`:

```javascript
const cors = require('cors');

app.use(cors({
  origin: ['https://yourdomain.com', 'https://admin.yourdomain.com'],
  credentials: true
}));
```

### 2. Setup Logging

Create logs directory:

```bash
mkdir -p ~/nodejs/looncamp/logs
```

Update server.js to log to file (optional):

```javascript
const fs = require('fs');
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'logs', 'access.log'),
  { flags: 'a' }
);
```

### 3. Setup Process Manager (PM2)

For better process management:

```bash
# Install PM2 globally
npm install -g pm2

# Start application with PM2
pm2 start server.js --name looncamp

# Make it start on reboot
pm2 startup
pm2 save
```

### 4. Setup Database Backups

Create backup script:

```bash
nano ~/backup-db.sh
```

Add:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/username/backups"
mkdir -p $BACKUP_DIR
pg_dump -h localhost -U username looncamp_db > $BACKUP_DIR/looncamp_$DATE.sql
# Keep only last 7 days of backups
find $BACKUP_DIR -type f -mtime +7 -delete
```

Make executable:

```bash
chmod +x ~/backup-db.sh
```

Add to crontab for daily backups:

```bash
crontab -e

# Add this line for daily backup at 2 AM:
0 2 * * * /home/username/backup-db.sh
```

### 5. Monitor Application

Check application status:

```bash
# Via PM2
pm2 status
pm2 logs looncamp

# Or check server logs
tail -f ~/nodejs/looncamp/logs/access.log
```

## Troubleshooting

### Application Not Starting

1. Check Node.js version:
   ```bash
   node --version
   ```

2. Check for errors:
   ```bash
   cd ~/nodejs/looncamp
   node server.js
   ```

3. Check environment variables:
   ```bash
   cat .env
   ```

### Database Connection Issues

1. Test database connection:
   ```bash
   psql -h localhost -U username -d looncamp_db
   ```

2. Check DATABASE_URL format:
   ```
   postgresql://username:password@localhost:5432/looncamp_db
   ```

3. Verify database exists:
   ```bash
   psql -h localhost -U username -l
   ```

### Cannot Access Admin Panel

1. Check server is running:
   ```bash
   curl http://localhost:5001/api/health
   ```

2. Check static files are present:
   ```bash
   ls -la ~/nodejs/looncamp/admin/
   ```

3. Check server.js serves static files:
   ```javascript
   app.use('/admin', express.static(path.join(__dirname, 'admin')));
   ```

### 502 Bad Gateway Error

1. Application may not be running
2. Check port configuration
3. Check Hostinger Node.js application status

### SSL Certificate Issues

1. Force SSL in hPanel
2. Update API URLs in admin panel to use HTTPS
3. Clear browser cache

## Performance Optimization

### 1. Enable Gzip Compression

Update server.js:

```javascript
const compression = require('compression');
app.use(compression());
```

Install:
```bash
npm install compression --save
```

### 2. Setup Redis Caching (Optional)

If Hostinger provides Redis:

```bash
npm install redis --save
```

### 3. Database Optimization

```sql
-- Create indexes (already in schema.sql)
CREATE INDEX idx_properties_slug ON properties(slug);
CREATE INDEX idx_properties_category ON properties(category);
CREATE INDEX idx_properties_is_active ON properties(is_active);
```

### 4. Enable HTTP/2

Usually enabled by default in Hostinger with SSL.

## Security Checklist

- [ ] Changed default admin password
- [ ] Set strong JWT_SECRET
- [ ] Enabled SSL/HTTPS
- [ ] Database user has limited permissions
- [ ] Environment variables not exposed
- [ ] CORS configured properly
- [ ] Rate limiting enabled (optional)
- [ ] Regular database backups
- [ ] Application logs monitored
- [ ] Server firewall configured

## Maintenance

### Update Application

```bash
# SSH into server
cd ~/nodejs/looncamp

# Backup current version
cp -r . ../looncamp-backup

# Upload new files
# Install dependencies
npm install --production

# Restart application
pm2 restart looncamp
```

### Database Maintenance

```bash
# Vacuum database
psql -h localhost -U username -d looncamp_db -c "VACUUM ANALYZE;"

# Check database size
psql -h localhost -U username -d looncamp_db -c "SELECT pg_size_pretty(pg_database_size('looncamp_db'));"
```

## Support & Resources

- Hostinger Knowledge Base: https://support.hostinger.com
- Node.js Documentation: https://nodejs.org/docs/
- PostgreSQL Documentation: https://www.postgresql.org/docs/

## Production URLs

After deployment, your application will be accessible at:

- Admin Panel: `https://yourdomain.com/admin`
- API: `https://yourdomain.com/api`
- Health Check: `https://yourdomain.com/api/health`
- Public Properties: `https://yourdomain.com/api/properties/public-list`

## Next Steps

1. Integrate with your main LoonCamp website
2. Add payment gateway integration
3. Implement booking system
4. Add email notifications
5. Setup analytics and monitoring
6. Create mobile-responsive views
7. Add customer reviews system

## Conclusion

Your LoonCamp admin panel is now deployed on Hostinger! Make sure to:
- Monitor application performance
- Keep dependencies updated
- Regular database backups
- Security audits

For any issues, refer to the troubleshooting section or contact Hostinger support.
