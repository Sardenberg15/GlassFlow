# HelpGlass ERP/CRM System

## Overview

HelpGlass is a comprehensive ERP/CRM system designed for managing glass and mirror projects. The application provides end-to-end business management capabilities including client relationship management, project tracking, complete financial management with real-time analytics, and workflow automation. Built as a full-stack web application, it serves businesses in the glass and mirror installation industry with features tailored to track quotes, projects, transactions, financial reports, and client interactions.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**October 16, 2025:**
- Reorganized quotation form layout: "Endereço da Obra" section (Local/Ambiente and Tipo) now appears immediately after client selection, before validity date
- Added "Endereço da Obra" section to quote details view modal for complete information display
- Fixed JSX syntax error in Clientes page CardHeader structure
- Optimized PDF layout to reduce space usage:
  - Removed "Endereço da Obra" section from PDF to save vertical space
  - Reduced image sizes (110→90px) and section widths (120→100px)
  - Adjusted spacing between items (20→15 margin)
  - Maintained readable font sizes (8pt for tables and text)
  - Removed wrap={false} to allow flexible page breaks
  - Added page numbering ("Página X de Y") in footer
  - Changed discount value color from red to green (#10B981)
  - Result: PDFs fit more items per page with maintained readability

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

**Key Pages:**
- **Dashboard**: Overview metrics, recent projects, revenue trends
- **Clientes**: Client management with CRUD operations
- **Projetos**: Project tracking with status workflow, financial details, and payment tracking (shows Valor Cobrado, Recebido, and Falta Receber badge)
- **Orçamentos**: Quotation generation with PDF export
- **Financeiro**: Complete financial management with analytics, charts, and transaction management

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
- **Clients**: Customer information (name, contact, email [optional], phone, address [optional], CNPJ/CPF [optional])
- **Projects**: Project details with status workflow (orcamento → aprovado → execucao → finalizado/cancelado)
  - Project payment tracking: Valor Cobrado (project.value), Valor Recebido (sum of receitas), Falta Receber (Valor Cobrado - Recebido)
  - Supports common payment patterns: 50% advance, 50% on completion
- **Transactions**: Financial records (receita/despesa) linked to projects
- **Quotes**: Quotation details with client reference, number, status, validity date, and observations
- **Quote Items**: Individual items in quotes with description, quantity, unit price, total, and optional image/drawing
- **Project Files**: File attachments for projects (comprovantes, notas fiscais) with metadata and categorization
- Relational structure with foreign key constraints and cascade deletes

**Storage Pattern:**
- Repository pattern implemented via `IStorage` interface
- `DatabaseStorage` class provides concrete implementation
- Abstraction allows for potential storage backend swapping
- All database operations return typed entities

**File Upload System:**
- Replit Object Storage integration for file management
- Uppy file uploader with modal interface (React Dashboard component)
- Three file categories for project documentation:
  - Comprovantes de Pagamento (Payment receipts)
  - Notas Fiscais Recebidas (Received invoices)
  - Notas Fiscais Emitidas (Issued invoices)
- File metadata stored in PostgreSQL (projectFiles table)
- Files stored in private object storage bucket (PRIVATE_OBJECT_DIR)
- ACL configuration ensures proper access control
- ObjectStorageService handles signed URLs for secure upload/download
- API routes: POST /api/projects/:id/files, GET /api/files/:id/download, DELETE /api/files/:id
- Uppy CSS loaded via CDN to avoid bundling issues

**Quotation System (Orçamentos Page):**
- Complete quote generation with professional PDF export
- Quote management with CRUD operations (create, edit, delete) and delete confirmation dialogs
- Professional layout based on industry-standard quotation format
- Form organization:
  1. Cliente selection (required)
  2. **Endereço da Obra** section (visually grouped with border and background):
     - Local/Ambiente (optional)
     - Tipo (optional)
  3. Válido até (required)
  4. Desconto % (optional)
  5. Items list with comprehensive fields
  6. General observations
- Quote items with comprehensive card-based form:
  - Descrição do Item (required)
  - Quantidade (required, supports decimals)
  - Largura (mm), Altura (mm) (optional)
  - Cor e Espessura (optional)
  - Valor Unitário (required)
  - Cor Perfil, Cor Acessório (optional)
  - Linha, Data de Entrega (optional)
  - Observações do Item (optional textarea)
  - Upload de Imagem (optional)
- Image upload for individual quote items:
  - Upload interface integrated into item cards
  - Uses Replit Object Storage for image storage
  - Upload flow: Generate signed URL → Upload to storage → Save public URL path
  - Stores stable public paths (/objects/uploads/{uuid}) for persistent access
  - Visual feedback during upload (loading state, icons)
  - Accepts image files only (image/*)
- Professional PDF template:
  - Company branding with contact info (phone: 22 99821-3739, email: alpheu25@gmail.com)
  - Complete client data section with all fields
  - **Endereço da Obra** section (appears after client data, before items):
    - Local/Ambiente
    - Tipo
  - Per-item layout:
    - Image positioned on left (if available)
    - Item description and details on right (cor perfil, cor acessório, linha, data entrega)
    - Professional table: ITEM | QTDE. | LARGURA | ALTURA | COR E ESPESSURA | VLR. UNIT. | VLR. TOTAL
    - Item observations section below table
  - Quantity formatting with pt-BR locale (preserves decimals: 1.5 → "1,5")
  - Total calculation with observations section
  - Legal footer text
- Quote number auto-generation (format: ORC-YYYY-NNN)
- Status badges (pendente, aprovado, recusado)
- Client selection dropdown with search
- Validity date picker
- General observations field for quote-level notes

**Financial Management System (Financeiro Page):**
- Complete financial analytics dashboard with real-time data
- Four key metrics display: Total Revenue, Total Expenses, Net Profit, Profit Margin
- Multiple chart visualizations:
  - Bar Chart: Monthly Revenue vs Expenses comparison
  - Pie Chart: Revenue breakdown by project category (vidro, espelho, reparo)
  - Line Chart: Cash Flow trend analysis
- Advanced filtering capabilities:
  - Period filters: Last month, 3 months, 6 months, year, all time
  - Type filters: All transactions, Revenue only, Expenses only
- Real-time data aggregation from transactions:
  - Monthly aggregation based on transaction dates
  - Category aggregation based on project types
  - Automatic recalculation using useMemo hooks
- Complete transaction management:
  - Create new transactions with controlled form components
  - Full transaction table with date, type, description, project, and value
  - Delete transactions with cache invalidation
  - Validation and error handling
- Controlled form implementation using React useState for all fields (fixes shadcn Select compatibility)
- Empty state handling for periods with no data
- Responsive charts using Recharts library

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