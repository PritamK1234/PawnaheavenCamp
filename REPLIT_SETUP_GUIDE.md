# LoonCamp Admin Panel - Replit Setup Guide

Complete guide to test the LoonCamp admin panel locally in Replit.

## Prerequisites

- Replit account (free tier works)
- Basic understanding of PostgreSQL

## Step-by-Step Setup

### 1. Create New Repl

1. Go to [Replit](https://replit.com)
2. Click "Create Repl"
3. Select "Node.js" template
4. Name it "looncamp-admin"
5. Click "Create Repl"

### 2. Upload Backend Files

Upload all files from the `backend/` folder:
- `controllers/`
- `middleware/`
- `routes/`
- `scripts/`
- `utils/`
- `db.js`
- `schema.sql`
- `server.js`
- `package.json`
- `.env.example`

### 3. Configure Replit

Create `.replit` file in root:

```toml
run = "node server.js"

[nix]
channel = "stable-22_11"

[[nix.packages]]
nodejs = "nodejs-18_x"

[[nix.packages]]
postgresql = "latest"
```

### 4. Install Node Dependencies

In Replit Shell tab, run:

```bash
npm install
```

This will install:
- express
- pg (PostgreSQL client)
- bcrypt
- jsonwebtoken
- cors
- dotenv

### 5. Setup PostgreSQL

In Replit Shell:

```bash
# Initialize PostgreSQL data directory
initdb -D ~/.postgresql/data

# Start PostgreSQL server
pg_ctl -D ~/.postgresql/data start

# Create database
createdb looncamp

# Verify database created
psql -l
```

### 6. Configure Secrets

Click the lock icon (Secrets) in Replit sidebar.

Add these secrets:

```
DATABASE_URL=postgresql://postgres@localhost:5432/looncamp
JWT_SECRET=looncamp-replit-secret-key-2024
PORT=5001
NODE_ENV=development
```

Important: In Replit, use `postgres@localhost` (no password needed)

### 7. Initialize Database Schema

In Replit Shell:

```bash
node scripts/initDb.js
```

You should see:
```
Database initialized successfully!

Default admin credentials:
Email: admin@looncamp.com
Password: admin123
```

### 8. Start the Server

Click the "Run" button or in Shell:

```bash
node server.js
```

You should see:
```
=================================
LoonCamp API Server
=================================
Server running on port 5001
Environment: development
Database connected successfully
=================================
```

### 9. Test the API

Open a new Shell tab and test:

```bash
# Health check
curl http://localhost:5001/api/health

# Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@looncamp.com","password":"admin123"}'
```

### 10. Access Admin Panel

#### Option A: Using Webview

1. Click on the webview icon in Replit
2. The URL will be: `https://your-repl-name.your-username.repl.co`
3. Navigate to: `https://your-repl-name.your-username.repl.co/admin`

Note: Since the admin panel is a separate React app, you have two options:

#### Option B: Serve Static Files (Recommended)

1. Build the React admin panel locally first:
   ```bash
   cd admin
   npm install
   npm run build
   ```

2. Upload the `build/` folder to Replit as `admin/`

3. The server is already configured to serve static files from `/admin`

4. Access: `https://your-repl.repl.co/admin`

#### Option C: Test APIs with Postman/Thunder Client

If you don't have the admin panel built, you can test all APIs using:
- Postman
- Thunder Client (VS Code)
- Insomnia
- curl commands

## Testing Checklist

### Database Tests

```bash
# Connect to database
psql looncamp

# Check tables
\dt

# Check admins table
SELECT * FROM admins;

# Check properties table
SELECT * FROM properties;

# Exit
\q
```

### API Tests

```bash
# 1. Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@looncamp.com","password":"admin123"}'

# Save the token from response

# 2. Get all properties
curl -X GET http://localhost:5001/api/properties/list \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 3. Create a property
curl -X POST http://localhost:5001/api/properties/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "Test Property",
    "description": "A test property",
    "category": "camping",
    "location": "Pawna Lake",
    "price": "₹2,999",
    "price_note": "per person",
    "capacity": 4,
    "rating": 4.5,
    "amenities": ["AC", "WiFi"],
    "activities": ["Boating"],
    "highlights": ["Lake view"],
    "policies": ["Free cancellation"],
    "images": ["https://example.com/image.jpg"]
  }'

# 4. Get public properties (no auth)
curl -X GET http://localhost:5001/api/properties/public-list
```

## Troubleshooting

### PostgreSQL Not Starting

```bash
# Stop any running instances
pg_ctl -D ~/.postgresql/data stop

# Clean data directory
rm -rf ~/.postgresql/data

# Reinitialize
initdb -D ~/.postgresql/data

# Start again
pg_ctl -D ~/.postgresql/data start
```

### Port Already in Use

Change PORT in Secrets to a different number like 5002.

### Database Connection Error

Make sure:
1. PostgreSQL is running: `pg_ctl status -D ~/.postgresql/data`
2. Database exists: `psql -l`
3. DATABASE_URL in Secrets is correct

### JWT Token Invalid

Make sure JWT_SECRET in Secrets matches the one used when creating tokens.

### CORS Errors

The server is configured to allow all origins. If you still see CORS errors, check that the API URL in the admin panel is correct.

## Production Deployment to Replit

### 1. Set Production Environment

In Secrets, change:
```
NODE_ENV=production
```

### 2. Use Strong JWT Secret

Generate a strong secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add to Secrets:
```
JWT_SECRET=your_generated_secret_here
```

### 3. Change Default Admin Password

After first login, you should change the password. Currently, you can do this by:

```bash
# Generate new hash
node -e "console.log(require('bcrypt').hashSync('your_new_password', 10))"

# Update in database
psql looncamp
UPDATE admins SET password_hash = 'new_hash_here' WHERE email = 'admin@looncamp.com';
```

### 4. Enable Always-On (Paid Feature)

Replit free tier sleeps after inactivity. For production:
- Upgrade to Replit Hacker plan
- Enable "Always On" for your Repl

## Testing Admin Panel Functionality

### 1. Login
- Navigate to `/admin`
- Enter credentials
- Should redirect to dashboard

### 2. Dashboard
- Should show property statistics
- Should list all properties
- Should have "Add New Property" button

### 3. Create Property
- Click "Add New Property"
- Fill all required fields
- Add amenities, activities, highlights
- Add image URLs
- Click "Create Property"

### 4. Edit Property
- Click "Edit" on any property
- Modify fields
- Click "Update Property"

### 5. Toggle Status
- Click "Activate/Deactivate" button
- Property status should change

### 6. Delete Property
- Click "Delete" button
- Confirm deletion
- Property should be removed

## Performance Tips

1. **Database Indexing**: Already configured in schema.sql
2. **Connection Pooling**: Configured in db.js (max 20 connections)
3. **JSON Field Storage**: Arrays stored as JSON strings
4. **Prepared Statements**: All queries use parameterized queries

## Next Steps

After successful testing in Replit:

1. Test all CRUD operations
2. Verify authentication works
3. Check public API (no auth)
4. Test with real property data
5. Deploy to Hostinger for production

## Common Issues

### "npm ERR! Cannot find module"

```bash
rm -rf node_modules package-lock.json
npm install
```

### "role 'postgres' does not exist"

```bash
createuser -s postgres
```

### "connection refused"

Make sure PostgreSQL is running:
```bash
pg_ctl -D ~/.postgresql/data start
```

## Support

If you encounter issues:
1. Check PostgreSQL is running
2. Verify all secrets are set
3. Check server logs in Shell
4. Test API endpoints with curl
5. Review database with psql

## Resources

- [Replit Docs](https://docs.replit.com)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Node.js Docs](https://nodejs.org/docs/)
