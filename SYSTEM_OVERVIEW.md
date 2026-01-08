# LoonCamp Admin Panel - System Overview

## What is This?

A complete, production-ready admin panel system for managing property bookings at LoonCamp. Built from scratch with Node.js, PostgreSQL, Express, and React.

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                  LoonCamp System                     │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────┐         ┌──────────────┐          │
│  │   Admin     │ ←────→  │   Backend    │          │
│  │   Panel     │  REST   │   API        │          │
│  │  (React)    │  JSON   │  (Express)   │          │
│  └─────────────┘         └──────────────┘          │
│                                 │                    │
│                                 ↓                    │
│                          ┌──────────────┐          │
│                          │  PostgreSQL  │          │
│                          │   Database   │          │
│                          └──────────────┘          │
│                                                       │
└─────────────────────────────────────────────────────┘
```

## Technology Stack

### Backend
- **Node.js 14+** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Relational database
- **pg** - PostgreSQL client for Node.js
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **CORS** - Cross-origin resource sharing

### Frontend
- **React 18** - UI framework
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **CSS3** - Styling

### Security
- JWT-based authentication
- Bcrypt password hashing (10 rounds)
- Parameterized queries (SQL injection prevention)
- Protected admin routes
- CORS configuration

## Database Schema

### Tables

#### 1. admins
```sql
id          SERIAL PRIMARY KEY
email       VARCHAR(255) UNIQUE NOT NULL
password_hash VARCHAR(255) NOT NULL
created_at  TIMESTAMP DEFAULT NOW()
```

#### 2. properties
```sql
id              SERIAL PRIMARY KEY
title           VARCHAR(500) NOT NULL
slug            VARCHAR(500) UNIQUE NOT NULL
description     TEXT NOT NULL
category        VARCHAR(50) CHECK (camping|cottage|villa)
location        VARCHAR(255) NOT NULL
rating          DECIMAL(2,1) CHECK (0-5)
price           VARCHAR(50) NOT NULL
price_note      VARCHAR(255) NOT NULL
capacity        INTEGER NOT NULL
check_in_time   VARCHAR(50) DEFAULT '2:00 PM'
check_out_time  VARCHAR(50) DEFAULT '11:00 AM'
status          VARCHAR(50) DEFAULT 'Verified'
is_top_selling  BOOLEAN DEFAULT FALSE
is_active       BOOLEAN DEFAULT TRUE
contact         VARCHAR(20) DEFAULT '+91 8669505727'
amenities       TEXT (JSON string)
activities      TEXT (JSON string)
highlights      TEXT (JSON string)
policies        TEXT (JSON string)
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
```

#### 3. property_images
```sql
id              SERIAL PRIMARY KEY
property_id     INTEGER REFERENCES properties(id)
image_url       TEXT NOT NULL
display_order   INTEGER DEFAULT 0
created_at      TIMESTAMP DEFAULT NOW()
```

## API Structure

### Authentication Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/auth/login` | No | Admin login |
| POST | `/api/auth/logout` | No | Admin logout |
| GET | `/api/auth/verify` | Yes | Verify JWT token |

### Property Endpoints (Admin)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/properties/list` | Yes | Get all properties |
| GET | `/api/properties/:id` | Yes | Get single property |
| POST | `/api/properties/create` | Yes | Create new property |
| PUT | `/api/properties/update/:id` | Yes | Update property |
| DELETE | `/api/properties/delete/:id` | Yes | Delete property |
| PATCH | `/api/properties/toggle-status/:id` | Yes | Toggle status |

### Property Endpoints (Public)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/properties/public-list` | No | Get active properties |

## File Structure

```
project/
├── backend/
│   ├── controllers/
│   │   ├── authController.js       # Login, logout, verify
│   │   └── propertyController.js   # CRUD operations
│   ├── middleware/
│   │   └── auth.js                 # JWT verification
│   ├── routes/
│   │   ├── auth.js                 # Auth routes
│   │   └── properties.js           # Property routes
│   ├── scripts/
│   │   ├── initDb.js               # Database initialization
│   │   └── generatePasswordHash.js # Password hash generator
│   ├── utils/
│   │   └── jwt.js                  # JWT helpers
│   ├── db.js                       # Database connection
│   ├── schema.sql                  # Database schema
│   ├── server.js                   # Express server
│   ├── package.json                # Dependencies
│   ├── .env.example                # Environment template
│   └── README.md                   # Backend documentation
├── admin/
│   ├── public/
│   │   └── index.html              # HTML template
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.js            # Login page
│   │   │   ├── Dashboard.js        # Main dashboard
│   │   │   ├── PropertyForm.js     # Create/Edit form
│   │   │   └── ProtectedRoute.js   # Auth guard
│   │   ├── services/
│   │   │   └── api.js              # API client
│   │   ├── App.js                  # Main app
│   │   ├── index.js                # Entry point
│   │   └── index.css               # Styles
│   └── package.json                # Dependencies
├── ADMIN_PANEL_README.md           # Main documentation
├── REPLIT_SETUP_GUIDE.md           # Replit deployment
├── HOSTINGER_DEPLOYMENT_GUIDE.md   # Hostinger deployment
└── SYSTEM_OVERVIEW.md              # This file
```

## Quick Start Commands

### Local Development

```bash
# 1. Setup Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run init-db
npm run dev

# 2. Setup Admin Panel (separate terminal)
cd admin
npm install
npm start

# 3. Access
# Backend: http://localhost:5001
# Admin Panel: http://localhost:3000/admin
```

### Replit Deployment

```bash
# 1. Upload backend files to Replit
# 2. Install dependencies
npm install

# 3. Setup PostgreSQL
initdb -D ~/.postgresql/data
pg_ctl -D ~/.postgresql/data start
createdb looncamp

# 4. Initialize database
node scripts/initDb.js

# 5. Start server
node server.js

# Access: https://your-repl.repl.co/admin
```

### Hostinger Deployment

```bash
# 1. Build admin panel locally
cd admin
npm run build

# 2. Upload backend + admin/build to server
# 3. SSH into server
cd ~/nodejs/looncamp
npm install --production

# 4. Initialize database
node scripts/initDb.js

# 5. Configure in hPanel
# - Set environment variables
# - Start Node.js application

# Access: https://yourdomain.com/admin
```

## Default Credentials

```
Email: admin@looncamp.com
Password: admin123
```

**CRITICAL**: Change this password immediately after first login!

## Environment Variables

```env
PORT=5001
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@localhost:5432/looncamp
JWT_SECRET=your-super-secret-key
JWT_EXPIRY=24h
```

## Security Features

### Password Security
- Bcrypt hashing with 10 salt rounds
- Passwords never stored in plain text
- Password verification using bcrypt.compare()

### Authentication
- JWT tokens with configurable expiry
- Token verification on protected routes
- Automatic token refresh on API requests
- Client-side token storage in localStorage

### API Security
- All admin routes protected with JWT middleware
- Parameterized queries prevent SQL injection
- CORS configuration for allowed origins
- Input validation on all endpoints

### Database Security
- Connection pooling (max 20 connections)
- Separate database user for application
- SSL support in production
- Foreign key constraints
- Cascade delete for related records

## Key Features

### Admin Dashboard
- Statistics overview (total, active, top selling)
- Property list with filters
- Quick actions (edit, delete, toggle)
- Responsive design

### Property Management
- Create new properties
- Edit existing properties
- Delete properties
- Toggle active/inactive status
- Mark as top selling
- Image management

### Data Management
- Arrays stored as JSON strings
- Automatic slug generation from titles
- Timestamps (created_at, updated_at)
- Soft delete support (via is_active flag)

## API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description"
}
```

## Common Operations

### Create Property
```javascript
POST /api/properties/create
Headers: { Authorization: "Bearer <token>" }
Body: {
  title: "Property Name",
  description: "Description",
  category: "camping",
  location: "Pawna Lake",
  price: "₹7,499",
  price_note: "per person with meal",
  capacity: 4,
  rating: 4.8,
  amenities: ["AC", "Pool"],
  activities: ["Boating"],
  highlights: ["Lake view"],
  policies: ["Free cancellation"],
  images: ["https://..."]
}
```

### Update Property
```javascript
PUT /api/properties/update/:id
Headers: { Authorization: "Bearer <token>" }
Body: { /* fields to update */ }
```

### Toggle Status
```javascript
PATCH /api/properties/toggle-status/:id
Headers: { Authorization: "Bearer <token>" }
Body: {
  field: "is_active",
  value: true
}
```

## Testing

### Backend Tests
```bash
# Health check
curl http://localhost:5001/api/health

# Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@looncamp.com","password":"admin123"}'

# Get properties (with token)
curl -X GET http://localhost:5001/api/properties/list \
  -H "Authorization: Bearer <token>"
```

### Admin Panel Tests
1. Navigate to `/admin`
2. Login with default credentials
3. Create a test property
4. Edit the property
5. Toggle active status
6. Delete the property

## Deployment Checklist

- [ ] PostgreSQL database created
- [ ] Environment variables configured
- [ ] Database schema initialized
- [ ] Admin panel built for production
- [ ] Backend files uploaded
- [ ] Dependencies installed
- [ ] SSL certificate enabled
- [ ] Default password changed
- [ ] Database backups configured
- [ ] Monitoring enabled

## Performance Considerations

### Database
- Connection pooling (max 20)
- Indexed columns (slug, category, is_active)
- Efficient JSON storage
- Cascade delete for cleanup

### API
- Response caching (optional)
- Gzip compression (optional)
- Rate limiting (optional)
- Query optimization

### Frontend
- Code splitting
- Lazy loading
- Optimized production build
- Static asset caching

## Future Enhancements

- Password change functionality in admin panel
- Multi-admin support with roles
- Image upload to cloud storage
- Advanced search and filtering
- Booking management system
- Payment integration
- Email notifications
- Analytics dashboard
- Multi-language support
- Mobile app

## Troubleshooting Quick Reference

### Cannot login
- Check credentials
- Verify database has admin record
- Check JWT_SECRET matches
- Clear browser localStorage

### API not responding
- Check server is running
- Verify port is correct
- Check database connection
- Review server logs

### Database connection failed
- PostgreSQL running?
- Correct DATABASE_URL?
- Database exists?
- Credentials correct?

### Admin panel not loading
- Built for production?
- Static files uploaded?
- Server configured to serve static files?
- Check browser console for errors

## Support & Documentation

### Documentation Files
- `ADMIN_PANEL_README.md` - Complete system documentation
- `REPLIT_SETUP_GUIDE.md` - Replit deployment guide
- `HOSTINGER_DEPLOYMENT_GUIDE.md` - Hostinger deployment guide
- `backend/README.md` - Backend API documentation

### Key Technologies
- [Node.js](https://nodejs.org)
- [Express.js](https://expressjs.com)
- [PostgreSQL](https://www.postgresql.org)
- [React](https://react.dev)
- [JWT](https://jwt.io)

## License

MIT License - Free to use for your projects.

## Credits

Built for LoonCamp property booking platform.
Production-ready and deployment-tested.

---

Ready to deploy? Follow the deployment guides and get your admin panel running in minutes!
