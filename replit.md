# PawnaHavenCamp - Luxury Resort Booking Platform

## Overview

PawnaHavenCamp is a luxury resort and cottage booking platform focused on properties near Pawna Lake and Lonavala, India. The application serves as a showcase and booking portal for premium glamping domes, cottages, and villas, featuring property listings with detailed information, image galleries, and direct contact integration via WhatsApp and phone.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture (Refactored Feb 2026)
- **Port Configuration**: Backend runs on port 5001, Frontend on port 5000 with proxy
- **Controller Structure**: Separated by property type to prevent cross-contamination
  - `controllers/shared/basePropertyController.js` - Common helper functions (parsePostgresArray, etc.)
  - `controllers/villa/villaController.js` - Villa logic (multi-unit support, with legacy fallback for villas without units)
  - `controllers/camping/camping_CottagesController.js` - Camping/cottage logic (unit-based)
  - `controllers/propertyController.js` - SHARED ADMIN FUNCTIONS (keep - not deprecated)

#### propertyController.js Migration Status (Feb 2026)
**MUST KEEP in propertyController.js** (Admin/shared functions):
- `getAllProperties` - Admin property listing
- `getPublicProperties` - Public listing with category settings
- `getCategorySettings/updateCategorySettings` - Category management
- `createProperty` - Create new property (both types)
- `deleteProperty` - Delete any property
- `togglePropertyStatus` - Toggle active/top-selling
- `getCalendarData/updateCalendarData` - General calendar fallback

**MIGRATED to type-specific controllers**:
- `getPropertyById` → villa/camping controllers
- `updateProperty` → villa/camping controllers  
- `getPublicPropertyBySlug` → villa/camping controllers
- `getPropertyUnits/*` → camping controller
- `getUnitCalendarData/*` → camping controller

#### Villa Admin Form Restructuring (Feb 2026)
- **Villa property-level form shows ONLY**: Status dropdown, Active/Available toggles, Referral Code, Property ID, Category selector, Owner Name, Owner WhatsApp Number, Owner OTP Number, Admin Mobile Number, VillaUnitManager (with Add Unit button and tabs), Save/Cancel buttons
- **Villa property-level form HIDES**: Property Title, Location, Google Maps Link, all Price fields, Max Capacity, Rating, Check-in/out Times, Amenities, Activities, Highlights, Policies, Schedule, Images, Description (all moved to unit level)
- **Villa unit form fields (23 total)**: name, title, description, location, google_maps_link, weekday_price, weekend_price, special_price, total_persons, check_in_time, check_out_time, rating, price_note, amenities, activities, highlights, policies, schedule, images, special_dates
- **Database**: property_units table has all unit-level columns: title, description, location, google_maps_link, check_in_time, check_out_time, highlights, activities, policies, schedule, rating, price_note (added Feb 2026)
- **DB Schema file**: `backend/schema.sql` - kept in sync with live database (updated Feb 2026)
- **Campings_cottages form**: Completely unchanged, all fields remain at property level
- **Conditional rendering**: `{formData.category !== "villa" && (<>...</>)}` wraps hidden sections

#### Image Sync Architecture (Feb 2026)
- Images are stored in the `property_images` table (property_id, image_url, display_order)
- Both `updateProperty` and `updateVilla` functions now sync images to property_images table
- Frontend components (Profile.tsx, Info.tsx) parse images from API response correctly
- Villa images: Managed at unit level (Property Gallery removed from villa Profile/Admin); admin Property Images section hidden for villa category
- Camping/cottage images: Managed at unit level
- **Home Page Villa Cards**: Villa properties expanded into unit-level cards (each unit = separate card with unit images, price, name)
- **Unit URL Param**: `?unit_id=X` on PropertyDetails auto-selects unit and scrolls to stay options
- **Villa Booking Logic**: Any ledger entry on a date marks the entire villa unit as booked (COUNT > 0, not capacity-based)
- **Unit Selector**: PropertyDetails shows "Select Stay Option" for both campings_cottages AND villa categories

#### Cloudinary Image Upload (Feb 2026)
- All image uploads go through backend API (`/api/properties/upload-image`) - NO direct frontend-to-Cloudinary uploads
- Backend uses multer memory storage + sharp for server-side compression + Cloudinary upload_stream
- Allowed formats: jpg, jpeg, png, webp
- Max 20 images per property/unit
- Images >20MB are auto-compressed server-side using sharp (iterative quality reduction + resize)
- Frontend validates format and count before upload; backend enforces all rules
- `backend/utils/cloudinary.js` - Core upload/compression logic
- `src/lib/cloudinary.ts` - Frontend upload helper (routes through backend API only)

- **API Routes**: 
  - `/api/villa/*` - Villa-specific endpoints (includes unit CRUD + unit calendar routes)
  - `/api/camping_Cottages/*` - Camping/cottages-specific endpoints (includes unit CRUD + unit calendar routes)
  - `/api/properties/*` - Shared/admin endpoints (keep for admin panel)
- **Database**: PostgreSQL with separate calendar tables
  - `availability_calendar` - Villa property-level availability (legacy fallback for villas without units)
  - `unit_calendar` - Unit-level availability (used by both Camping/Cottages and Villas with units)
  - `property_units` - Multi-unit support (used by both categories; villas without units use legacy property-level model)
  - **OTP Authentication (Feb 2026)**:
    - Unified OTP service: `backend/services/otpService.js` handles both owner_login and referral_login
    - MSG91 integration: POST `/api/v5/otp` (send), GET `/api/v5/otp/verify` (verify), authkey from `MSG91_AUTH_KEY` secret
    - No template_id or sender_id (uses MSG91 default OTP product)
    - Test mode: `OTP_TEST_MODE=true` env var enables fallback OTP `123456` (for pre-DLT testing)
    - Rate limiting: 4 OTPs per mobile per purpose per hour (tracked in `otp_verifications` table)
    - Mobile validation: 10-digit Indian numbers, auto-strips +91/91 prefix
    - DB presence check before sending: owners table (owner_login), referral_users (referral_login)
    - No OTP values logged or exposed in any API response
  - **Owner Number Separation (Feb 2026)**: 
    - `properties.owner_whatsapp_number` = WhatsApp number (for customer contact, set by admin)
    - `properties.owner_otp_number` = OTP number (for owner login, set during owner registration)
    - `owners.owner_otp_number` = OTP number (used for login/authentication)
    - `owners.owner_whatsapp_number` = WhatsApp number (copied from properties.owner_whatsapp_number on registration)
    - `referral_users.referral_otp_number` = OTP number for referral user login

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with @vitejs/plugin-react (Babel-based, SWC removed due to compatibility)
- **Routing**: React Router DOM for client-side navigation
- **State Management**: TanStack React Query for server state management
- **Styling**: Tailwind CSS with CSS variables for theming

### Component Library
- **UI Components**: shadcn/ui built on Radix UI primitives
- **Design System**: Custom premium theme with gold/navy color palette using CSS custom properties
- **Typography**: Outfit (sans-serif) and Cormorant Garamond (display) fonts
- **Icons**: Lucide React

### Design Patterns
- **Component Structure**: Feature-based organization with reusable UI components in `src/components/ui/`
- **Path Aliases**: `@/` alias configured for clean imports from `src/`
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints
- **SEO**: React Helmet Async for meta tag management

### Key Pages
- **Index**: Landing page with hero, destinations, and property listings
- **PropertyDetails**: Individual property view with image slider and booking information
- **TicketPage**: E-ticket display with QR code, auto-refreshes when waiting for owner confirmation
- **NotFound**: 404 error handling

### Booking & Payment System (Feb 2026)
- **Booking Flow**: PAYMENT_PENDING → PENDING_OWNER_CONFIRMATION (payment_status=SUCCESS) → TICKET_GENERATED (owner confirms)
- **Booking ID Format**: PHC-{timestamp36}-{hex} (e.g. PHC-M2K3F4-A1B2C3)
- **Payment Gateway**: Paytm (STAGING env with test credentials as fallback)
- **Payment Callback**: Verifies checksum, updates booking status, generates action tokens for owner
- **15-minute Payment Alert**: If booking stays PAYMENT_PENDING for 15 min, WhatsApp alert sent to admin
- **Owner Action Tokens**: Single-use, 1-hour expiry, prevent duplicate processing
- **Owner Action Endpoints**: GET /api/bookings/owner-action?token=...&action=CONFIRM|CANCEL
- **WhatsApp Webhook**: GET/POST /api/bookings/webhook/whatsapp for Meta webhook verification and button responses
- **Referral System**: 5% discount on advance amount, PENDING commission created on booking confirmation
- **E-Ticket**: Generated after owner confirms, shows QR code, property details, payment summary
- **Ticket Page States**: Loading, pending confirmation (auto-refresh 10s), confirmed (full ticket), expired, error

### PWA (Progressive Web App) - Feb 2026
- **3-Domain PWA Architecture** (production VPS deployment):
  - Public: `pawnahavencamp.com` → `manifest-public.json` (name: PawnaHavenCamp, theme: #0f172a)
  - Owner: `pawnahavencamp.shop` → `manifest-owner.json` (name: PawnaHavenCamp Owner, theme: #15803d)
  - Admin: `pawnahavencamp.cloud` → `manifest-admin.json` (name: PawnaHavenCamp Admin, theme: #7c3aed)
- **Multi-Build Architecture** (Feb 2026):
  - `index.html` → Public site entry point (references `manifest-public.json`)
  - `owner.html` → Owner dashboard entry point (references `manifest-owner.json`)
  - `admin/public/index.html` → Admin panel entry point (references `manifest-admin.json`)
  - `vite.config.public.ts` → Builds public site to `dist/public/`
  - `vite.config.owner.ts` → Builds owner dashboard to `dist/owner/`
  - `src/main-owner.tsx` + `src/AppOwner.tsx` → Owner-only React app entry
  - Build scripts: `npm run build:public`, `npm run build:owner`, `npm run build:admin`, `npm run build:all`
- **VPS NGINX Config**: 3 separate server blocks, each pointing to its own build folder:
  - `pawnahavencamp.com` → `dist/public/`
  - `pawnahavencamp.shop` → `dist/owner/`
  - `pawnahavencamp.cloud` → `admin/build/`
- **Unified Service Worker**: `public/sw.js` uses `self.location.hostname` for automatic per-domain cache isolation
- **Icons**: `public/icons/Public_sites_icon.png`, `Owner_dashboard_icon.png`, `Admin_dashboard_app-icon.png` (also copied to `admin/public/icons/`)
- **Install Button**: `src/components/PWAInstallButton.tsx` - unified component with iOS Safari modal support
- **VPS Deployment**: Hostinger VPS with PM2 (backend) + Nginx (reverse proxy + static files)
- **Environment Config**: `backend/.env.example` provides template for all required env vars

### Referral System (Extended Feb 2026)
- **Three referral types**: Public (15% commission), Owner (25% commission, property-linked), B2B (22% commission)
- **Commission structure**: No referral = 30% Admin; Public = 15% Referrer + 15% Admin; Owner = 25% Owner + 5% Admin; B2B = 22% B2B + 8% Admin
- **Admin owner referral creation**: Uses Property ID (e.g., 74SQF) to auto-fetch owner name + OTP number from owners table
- **Database columns**: `referral_type` (public/owner/b2b), `linked_property_id` (integer FK), `linked_property_slug`, `property_id` (varchar, e.g., 74SQF) on `referral_users` table
- **Admin-only creation**: Owner and B2B codes are created exclusively from Admin Dashboard > B2B tab
- **Owner referral links**: Redirect to specific property page (`/property/slug?ref=CODE`) and lock customer to that property via `localStorage.owner_referral_lock`
- **B2B/Public links**: Redirect to home page (`/?ref=CODE`)
- **Owner Dashboard referral page**: `/owner/referral` - auto-fetches owner's referral data by their mobile number
- **Database columns**: `referral_type` (public/owner/b2b), `linked_property_id`, `linked_property_slug` on `referral_users` table
- **Backend endpoints**: `POST /api/referrals/admin/create` (admin creates owner/b2b codes), `GET /api/referrals/owner-lookup/:mobile`, `GET /api/referrals/validate/:code` (returns type info)
- **Pages reused**: CheckEarningPage, GenerateCodePage, ReferralPage all display type-specific info via conditional rendering

### Data Architecture
- PostgreSQL database with full booking/payment schema
- Property data from database with category settings
- Referral users and transactions tables

## External Dependencies

### Third-Party Services
- **WhatsApp Business API**: Direct booking inquiries via WhatsApp links
- **Phone Integration**: Direct call functionality for bookings

### UI Libraries
- **Radix UI**: Full suite of accessible, unstyled primitives (accordion, dialog, dropdown, tabs, etc.)
- **Embla Carousel**: Image carousel functionality
- **React Day Picker**: Date selection components
- **cmdk**: Command palette functionality
- **Vaul**: Drawer component
- **Sonner**: Toast notifications
- **next-themes**: Theme switching support

### Development Tools
- **ESLint**: Code linting with React hooks and refresh plugins
- **TypeScript**: Type checking with relaxed strict mode settings
- **PostCSS/Autoprefixer**: CSS processing

### Fonts (External CDN)
- Google Fonts: Outfit and Cormorant Garamond