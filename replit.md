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
  - `controllers/villa/villaController.js` - Villa-only logic (NO units)
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

#### Image Sync Architecture (Feb 2026)
- Images are stored in the `property_images` table (property_id, image_url, display_order)
- Both `updateProperty` and `updateVilla` functions now sync images to property_images table
- Frontend components (Profile.tsx, Info.tsx) parse images from API response correctly
- Villa images: Managed at property level with gallery upload in admin panel
- Camping/cottage images: Managed at unit level

- **API Routes**: 
  - `/api/villa/*` - Villa-specific endpoints
  - `/api/camping_Cottages/*` - Camping/cottages-specific endpoints
  - `/api/properties/*` - Shared/admin endpoints (keep for admin panel)
- **Database**: PostgreSQL with separate calendar tables
  - `availability_calendar` - Villa property-level availability
  - `unit_calendar` - Camping/cottage unit-level availability

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with SWC for fast compilation
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
- **NotFound**: 404 error handling

### Data Architecture
- Currently uses static mock data embedded in components
- Property data structure supports categories (camping, cottage, villa), amenities, pricing, and multiple images
- Ready for backend integration via React Query

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