# LoonCamp Admin Panel - Production-Ready Property Booking System

A complete, production-ready admin panel for managing property bookings at LoonCamp. Built with Node.js, PostgreSQL, Express, and React.

## Features

- Secure JWT-based admin authentication
- Full CRUD operations for properties
- Image management for properties
- Toggle active/inactive status
- Mark properties as top selling
- Public API for active properties only
- Responsive admin dashboard
- Production-ready with PostgreSQL

## Technology Stack

**Backend:**
- Node.js + Express
- PostgreSQL (using `pg` library)
- JWT authentication
- bcrypt for password hashing
- REST API architecture

**Frontend:**
- React
- React Router
- Axios for API calls
- Responsive CSS

## Project Structure

```
looncamp/
├── backend/
│   ├── controllers/
│   │   ├── authController.js
│   │   └── propertyController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── properties.js
│   ├── scripts/
│   │   └── initDb.js
│   ├── utils/
│   │   └── jwt.js
│   ├── db.js
│   ├── schema.sql
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── admin/
    ├── public/
    ├── src/
    │   ├── components/
    │   │   ├── Login.js
    │   │   ├── Dashboard.js
    │   │   ├── PropertyForm.js
    │   │   └── ProtectedRoute.js
    │   ├── services/
    │   │   └── api.js
    │   ├── App.js
    │   ├── index.js
    │   └── index.css
    └── package.json
```

## Quick Start

### Prerequisites

- Node.js 14+ installed
- PostgreSQL 12+ installed and running
- npm or yarn

### 1. Database Setup

First, create a PostgreSQL database:

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE looncamp;

# Exit psql
\q
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file from example
cp .env.example .env

# Edit .env and configure your PostgreSQL connection
nano .env
```

Configure your `.env` file:

```env
PORT=5001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/looncamp
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRY=24h
```

Initialize the database:

```bash
# Run database initialization script
npm run init-db
```

Start the backend server:

```bash
# Development mode
npm run dev

# Production mode
npm start
```

Backend will run on `http://localhost:5001`

### 3. Admin Panel Setup

```bash
cd admin

# Install dependencies
npm install

# Start development server
npm start
```

Admin panel will run on `http://localhost:3000/admin`

### 4. Default Login Credentials

```
Email: admin@looncamp.com
Password: admin123
```

**IMPORTANT:** Change the default password after first login!

## API Endpoints

### Authentication

- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout
- `GET /api/auth/verify` - Verify JWT token (protected)

### Properties (Admin - Protected)

- `GET /api/properties/list` - Get all properties
- `GET /api/properties/:id` - Get single property
- `POST /api/properties/create` - Create new property
- `PUT /api/properties/update/:id` - Update property
- `DELETE /api/properties/delete/:id` - Delete property
- `PATCH /api/properties/toggle-status/:id` - Toggle property status

### Properties (Public)

- `GET /api/properties/public-list` - Get active properties only

## Database Schema

### Tables

1. **admins** - Admin user accounts
   - id, email, password_hash, created_at

2. **properties** - Property listings
   - id, title, slug, description, category, location, rating, price, price_note
   - capacity, check_in_time, check_out_time, status, is_top_selling, is_active
   - contact, amenities, activities, highlights, policies
   - created_at, updated_at

3. **property_images** - Property images
   - id, property_id, image_url, display_order, created_at

See `backend/schema.sql` for complete schema.

## Deployment

### Deploy to Hostinger (Node.js Apps)

1. **Prepare for Production:**

```bash
cd admin
npm run build
```

2. **Upload Files:**
   - Upload entire `backend/` folder
   - Upload `admin/build/` folder contents to `backend/admin/`

3. **Configure Database:**
   - Create PostgreSQL database in Hostinger
   - Note down connection details
   - Set environment variables in Hostinger Node.js app settings

4. **Environment Variables in Hostinger:**

```
NODE_ENV=production
PORT=5001
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-production-secret-key
```

5. **Initialize Database:**

SSH into Hostinger server:

```bash
cd your-app-directory
npm run init-db
```

6. **Start Application:**

Hostinger will automatically run `npm start`

7. **Access Admin Panel:**

```
https://yourdomain.com/admin
```

### Deploy to Replit

1. **Create New Repl:**
   - Select Node.js template
   - Upload all files from `backend/` folder

2. **Install PostgreSQL:**

Add to `.replit` file:

```
[nix]
channel = "stable-22_11"

[[nix.packages]]
postgresql = "latest"
```

3. **Configure Secrets:**

In Replit Secrets tab, add:

```
DATABASE_URL=postgresql://username:password@localhost:5432/looncamp
JWT_SECRET=your-secret-key
PORT=5001
```

4. **Initialize Database in Replit Shell:**

```bash
# Start PostgreSQL
pg_ctl -D ~/.postgresql/data start

# Create database
createdb looncamp

# Initialize schema
node scripts/initDb.js
```

5. **Run Application:**

```bash
node server.js
```

6. **Access Admin Panel:**

Click on the webview URL and navigate to `/admin`

## Testing in Replit

### Step-by-Step Replit Setup

1. **Create Replit Account** and create new Node.js Repl

2. **Upload Backend Files:**
   - Upload all files from `backend/` folder to Replit

3. **Configure Replit:**

Create `.replit` file:

```toml
run = "node server.js"

[nix]
channel = "stable-22_11"

[[nix.packages]]
nodejs = "nodejs-18_x"

[[nix.packages]]
postgresql = "latest"
```

4. **Install Dependencies:**

In Replit Shell:

```bash
npm install
```

5. **Setup PostgreSQL:**

```bash
# Initialize PostgreSQL data directory
initdb -D ~/.postgresql/data

# Start PostgreSQL
pg_ctl -D ~/.postgresql/data start

# Create database
createdb looncamp

# Initialize schema
node scripts/initDb.js
```

6. **Configure Secrets:**

In Replit Secrets (lock icon), add:

```
DATABASE_URL=postgresql://postgres@localhost:5432/looncamp
JWT_SECRET=your-secret-key-here
PORT=5001
```

7. **Start Server:**

Click "Run" button or:

```bash
node server.js
```

8. **Test Admin Panel:**

- Open webview
- Navigate to `/admin`
- Login with: `admin@looncamp.com` / `admin123`

## Security Best Practices

1. **Change Default Credentials:**
   - Change admin password immediately after setup
   - Use strong passwords

2. **Environment Variables:**
   - Never commit `.env` file
   - Use different JWT secrets for development/production
   - Rotate JWT secrets periodically

3. **Database Security:**
   - Use strong PostgreSQL passwords
   - Enable SSL in production
   - Limit database user permissions

4. **API Security:**
   - All admin routes are JWT protected
   - Passwords are hashed with bcrypt (10 rounds)
   - SQL injection prevention using parameterized queries
   - CORS configured for security

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Test connection
psql -U postgres -d looncamp -c "\dt"
```

### Port Already in Use

Change PORT in `.env` file:

```env
PORT=5002
```

### JWT Token Errors

- Clear browser localStorage
- Login again
- Check JWT_SECRET matches in .env

### Replit PostgreSQL Not Starting

```bash
# Stop any running PostgreSQL processes
pg_ctl -D ~/.postgresql/data stop

# Reinitialize if needed
rm -rf ~/.postgresql/data
initdb -D ~/.postgresql/data

# Start PostgreSQL
pg_ctl -D ~/.postgresql/data start
```

## Production Checklist

- [ ] Change default admin password
- [ ] Update JWT_SECRET to a strong, random value
- [ ] Enable PostgreSQL SSL
- [ ] Set NODE_ENV=production
- [ ] Configure proper CORS origins
- [ ] Set up database backups
- [ ] Enable HTTPS
- [ ] Configure rate limiting
- [ ] Set up monitoring/logging
- [ ] Test all API endpoints
- [ ] Test admin panel functionality

## API Usage Examples

### Login

```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@looncamp.com","password":"admin123"}'

Response:
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "admin": {
      "id": 1,
      "email": "admin@looncamp.com"
    }
  }
}
```

### Create Property

```bash
curl -X POST http://localhost:5001/api/properties/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{
    "title": "Luxury Lakeside Cottage",
    "description": "Beautiful cottage with lake views",
    "category": "cottage",
    "location": "Pawna Lake",
    "price": "₹7,499",
    "price_note": "per person with meal",
    "capacity": 4,
    "rating": 4.8,
    "amenities": ["AC", "Pool", "WiFi"],
    "activities": ["Boating", "Swimming"],
    "highlights": ["Lake view", "Private pool"],
    "policies": ["Free cancellation"],
    "images": ["https://example.com/image1.jpg"]
  }'
```

### Get All Properties (Admin)

```bash
curl -X GET http://localhost:5001/api/properties/list \
  -H "Authorization: Bearer your_jwt_token"
```

### Get Public Properties (No Auth Required)

```bash
curl -X GET http://localhost:5001/api/properties/public-list
```

## Admin Panel Features

### Dashboard
- Total properties count
- Active properties count
- Top selling properties count
- Quick property management

### Property Management
- Create new properties
- Edit existing properties
- Delete properties
- Toggle active/inactive status
- Mark as top selling
- Manage all property details:
  - Basic info (title, description, category)
  - Pricing and capacity
  - Check-in/check-out times
  - Images
  - Amenities
  - Activities
  - Highlights
  - Policies

### Image Management
- Add multiple image URLs
- Remove images
- Images automatically ordered

## Database Management

### Backup Database

```bash
# Create backup
pg_dump -U postgres looncamp > looncamp_backup.sql

# Restore from backup
psql -U postgres looncamp < looncamp_backup.sql
```

### Add New Admin User

```bash
# Connect to database
psql -U postgres looncamp

# Insert new admin (password must be bcrypt hashed)
INSERT INTO admins (email, password_hash)
VALUES ('newadmin@looncamp.com', '$2b$10$hashed_password_here');
```

To generate bcrypt hash:

```javascript
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash('your_password', 10);
console.log(hash);
```

## Future Enhancements

- Multi-image upload with file storage
- Advanced search and filtering
- Booking management system
- Payment integration
- Email notifications
- Analytics dashboard
- Customer reviews
- Multi-language support

## Support

For issues or questions:
- Check the troubleshooting section
- Review API documentation
- Test with Postman/curl
- Check server logs

## License

MIT License - feel free to use for your projects.

## Credits

Built for LoonCamp property booking platform.
Designed for easy deployment to Hostinger and Replit.
