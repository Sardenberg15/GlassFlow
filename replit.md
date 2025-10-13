# HelpGlass ERP/CRM System

## Overview

HelpGlass is a comprehensive ERP/CRM system designed for managing glass and mirror projects. The application provides end-to-end business management capabilities including client relationship management, project tracking, financial management, and workflow automation. Built as a full-stack web application, it serves businesses in the glass and mirror installation industry with features tailored to track quotes, projects, transactions, and client interactions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and caching
- Tailwind CSS with shadcn/ui component library for styling

**Design System:**
- Hybrid approach combining Airbnb's refined visual language with enterprise dashboard functionality
- Custom color palette with primary blue (#2563EB), success green, alert orange, and danger red
- Comprehensive dark mode support with theme toggle
- Design tokens managed through CSS variables for consistent theming
- Inter font family for primary typography, Roboto for data tables

**State Management:**
- TanStack Query handles all server state with automatic caching and invalidation
- React Context API for theme management (light/dark mode)
- Local component state for UI interactions
- No global client state management library (Redux/Zustand) - server state is the source of truth

**UI Component Architecture:**
- shadcn/ui provides accessible, customizable components built on Radix UI primitives
- Custom business components (MetricCard, ProjectStatusBadge, CartaoObras, StatusWorkflow)
- Responsive design with mobile-first approach using Tailwind breakpoints
- Component composition pattern for reusability

### Backend Architecture

**Server Framework:**
- Express.js for HTTP server and RESTful API endpoints
- TypeScript for type safety across the stack
- Node.js runtime environment

**API Design:**
- RESTful endpoints following resource-based URL patterns
- CRUD operations for main entities (clients, projects, transactions)
- JSON request/response format
- Centralized error handling middleware
- Request logging middleware for debugging

**Database Layer:**
- Drizzle ORM for type-safe database queries and schema management
- PostgreSQL as the primary database (via Neon serverless)
- Connection pooling using @neondatabase/serverless
- Schema-first approach with shared types between client and server

**Data Models:**
- **Clients**: Customer information (name, contact, email, phone)
- **Projects**: Project details with status workflow (orcamento → aprovado → execucao → finalizado/cancelado)
- **Transactions**: Financial records (receita/despesa) linked to projects
- Relational structure with foreign key constraints and cascade deletes

**Storage Pattern:**
- Repository pattern implemented via `IStorage` interface
- `DatabaseStorage` class provides concrete implementation
- Abstraction allows for potential storage backend swapping
- All database operations return typed entities

### Development Workflow

**Build Process:**
- Vite handles client-side bundling with HMR in development
- esbuild bundles server code for production
- Shared TypeScript types between client/server in `/shared` directory
- Path aliases configured (@/ for client, @shared for shared code)

**Development Tools:**
- Replit-specific plugins for runtime error overlay and cartographer
- TypeScript compiler for type checking (noEmit mode)
- Drizzle Kit for database migrations and schema management

**Code Organization:**
- Monorepo structure with client, server, and shared directories
- Component co-location: UI components in `/components/ui`, business components alongside
- Route handlers in `server/routes.ts`
- Database logic abstracted in `server/storage.ts`

### Key Architectural Decisions

**Type Safety Across Stack:**
- Shared schema definitions using Drizzle ORM and Zod
- `createInsertSchema` generates Zod validators from database schema
- TypeScript strict mode enabled for maximum type safety
- Type inference from database schema to client code

**Styling Approach:**
- Utility-first CSS with Tailwind rather than CSS-in-JS
- Design system variables for consistent theming
- Component variants using class-variance-authority (CVA)
- Avoids runtime style calculation overhead

**Data Fetching Strategy:**
- TanStack Query eliminates need for loading/error state management in components
- Optimistic updates and automatic refetching on mutations
- Query key based cache invalidation
- Server-driven data model (no client-side data transformation)

**Authentication:**
- Currently not implemented (session management imports present but unused)
- Infrastructure prepared for future session-based auth with connect-pg-simple
- Cookie-based sessions likely intended approach

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: react, react-dom, @tanstack/react-query for UI and state management
- **Routing**: wouter (lightweight alternative to React Router)
- **Build Tools**: vite, esbuild, typescript for development and production builds
- **Styling**: tailwindcss, postcss, autoprefixer for utility-first CSS

### UI Component Libraries
- **Radix UI**: Complete suite of accessible, unstyled components (@radix-ui/react-*)
- **shadcn/ui**: Pre-built component patterns using Radix primitives
- **Lucide React**: Icon library for consistent iconography
- **Recharts**: Charting library for financial dashboards and analytics

### Backend Infrastructure
- **Express**: Web server framework
- **Drizzle ORM**: Type-safe ORM with drizzle-orm and drizzle-kit
- **Database**: @neondatabase/serverless for PostgreSQL connections
- **Validation**: zod for runtime type validation, @hookform/resolvers for form integration

### Developer Experience
- **Replit Plugins**: @replit/vite-plugin-runtime-error-modal, @replit/vite-plugin-cartographer, @replit/vite-plugin-dev-banner
- **Form Management**: react-hook-form for complex form handling
- **Utilities**: clsx, tailwind-merge for className composition, date-fns for date formatting, nanoid for ID generation

### Database Setup
- PostgreSQL database provisioned through Neon (serverless)
- DATABASE_URL environment variable required for connection
- Migration files stored in `/migrations` directory
- Schema defined in `shared/schema.ts` with Drizzle ORM

### Asset Management
- Static assets stored in `attached_assets` directory
- Logo and images referenced via Vite aliases (@assets)
- Google Fonts (Inter, Roboto) loaded via CDN in HTML head