# HelpGlass ERP/CRM System

## Overview
HelpGlass is a comprehensive ERP/CRM system designed for managing glass and mirror projects. It provides end-to-end business management capabilities including client relationship management, project tracking, complete financial management with real-time analytics, and workflow automation. The system targets businesses in the glass and mirror installation industry, offering tailored features to track quotes, projects, transactions, financial reports, and client interactions to streamline operations and enhance profitability.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes

**October 25, 2025 - Latest:**
- **Automatic Bill Synchronization with Projects**:
  - Implemented syncProjectBills() helper function for automatic account receivable management
  - Creates/updates "contas a receber" automatically based on project payment status
  - Triggers on project creation, updates, and transaction changes (create, update, delete)
  - Calculates pending amount: project value minus sum of received transactions (receitas)
  - Auto-creates bill when project has pending payment (status: "pendente")
  - Auto-updates bill value when payments are added or modified
  - Auto-marks bill as "pago" when project is fully paid
  - One receivable bill per project (prevents duplicates)
  - Added getTransaction() method to IStorage interface and DatabaseStorage
  - E2E tested: project creation, partial payments, full settlement
  
- **Fixed critical design violations and type safety issues**:
  - Removed border-l-4 from rounded Card components (violated design guidelines)
  - Replaced with colored status Badges: green (Pago), orange (Pendente), red (Atrasado)
  - CartaoObras now uses Transaction type from @shared/schema (no more local type definitions)
  - Safe value conversion with parseFloat(String(t.value)) for compatibility
  - Enhanced formatCurrency to accept both number and string types
  - Added null/undefined guards for Uppy upload results
  - Zero LSP errors remaining - all type warnings resolved
  
**October 25, 2025:**
- **Redesigned Projects page with enhanced visual UI/UX**:
  - Added 4 metric cards showing: Total a Receber, Pagamento Pendente, Atrasados, Total em Projetos
  - Visual filter badges for both project status and payment status (pago, pendente, atrasado)
  - Payment progress bars on each project card showing % received
  - Color-coded cards with borders: orange for pending payments, red for overdue
  - Automatic overdue detection for finished projects with pending payments
  - Large "Falta Receber" badges with visual alerts for projects with outstanding amounts
  - CheckCircle indicator for fully paid projects
  - Improved card layout with better spacing and visual hierarchy
  
- Implemented complete accounts payable and receivable system (Contas a Pagar/Receber):
  - New bills table in database with fields: type (pagar/receber), description, value, dueDate, status, projectId, date
  - Full CRUD operations in backend (getBills, createBill, updateBill, deleteBill)
  - API routes: GET/POST /api/bills, PATCH/DELETE /api/bills/:id
  - Tabs interface on Financeiro page to separate transactions and bills
  - Bills table with columns: Vencimento, Tipo, Descrição, Projeto, Status, Valor, Ações
  - Status badges (Pendente, Pago, Atrasado) with automatic overdue detection
  - Mark as paid functionality with CheckCircle2 icon
  - Create/edit bill dialog with comprehensive form (type, description, value, dates, project, status)
  - Loading states, empty states, and proper error handling throughout

- **Notification System for Bill Payment Reminders**:
  - Bell icon with badge counter in header showing total pending notifications
  - NotificationsDropdown component integrated in App.tsx header
  - Smart categorization of bills "a pagar" (accounts payable only):
    * **Vencidas** (Overdue): Bills with dueDate < today - shown with red AlertCircle icon
    * **Vence Hoje** (Due Today): Bills due exactly today - shown with orange Clock icon
    * **Próximas** (Upcoming): Bills due within next 3 days - shown with DollarSign icon
  - String-based date comparison to avoid timezone issues
  - Click on notification redirects to /financeiro page
  - Empty state "Tudo em dia!" when no pending payments
  - Each notification shows: description, formatted currency value, project name, and due date
  - ScrollArea for handling many notifications
  - Badge shows destructive variant for visual urgency
  - "Ver todas as contas" button at bottom for quick access

## System Architecture

### Frontend Architecture
The frontend is built with **React 18** and **TypeScript**, using **Vite** for tooling. **Wouter** handles routing, and **TanStack Query** manages server state, caching, and data synchronization. Styling is achieved with **Tailwind CSS** and **shadcn/ui** components, adopting a hybrid design system with a custom color palette and comprehensive dark mode support. State management primarily relies on TanStack Query for server state and React Context for UI themes. Key pages include Dashboard, Clients, Projects, Quotes, and Finance.

### Backend Architecture
The backend uses **Express.js** with **Node.js** and **TypeScript** for RESTful API endpoints. **Drizzle ORM** provides type-safe database queries and schema management, with **PostgreSQL** (via Neon serverless) as the primary database. A Repository pattern (`IStorage` interface) abstracts database operations. Data models include Clients, Projects (with payment tracking), Transactions, Quotes (with items and image uploads), and Project Files (with Replit Object Storage integration). File uploads utilize Uppy for a modal interface and secure signed URLs. The quotation system supports professional PDF export with auto-generated numbers and status tracking. The Financial Management System provides real-time analytics, multiple chart visualizations (bar, pie, line), advanced filtering, and complete transaction management.

### Key Architectural Decisions
- **Type Safety Across Stack**: Achieved through shared schema definitions using Drizzle ORM and Zod, with TypeScript strict mode enabled.
- **Styling Approach**: Utility-first CSS with Tailwind, leveraging design system variables and `class-variance-authority` (CVA).
- **Data Fetching Strategy**: TanStack Query is used for efficient data fetching, caching, optimistic updates, and automatic refetching.
- **Authentication**: Infrastructure is prepared for future session-based authentication using `connect-pg-simple`, though not currently implemented.

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: `react`, `react-dom`, `@tanstack/react-query`
- **Routing**: `wouter`
- **Build Tools**: `vite`, `esbuild`, `typescript`
- **Styling**: `tailwindcss`, `postcss`, `autoprefixer`

### UI Component Libraries
- **Radix UI**: Accessible, unstyled components (`@radix-ui/react-*`)
- **shadcn/ui**: Pre-built components based on Radix UI
- **Lucide React**: Icon library
- **Recharts**: Charting library

### Backend Infrastructure
- **Web Server**: `express`
- **ORM**: `drizzle-orm`, `drizzle-kit`
- **Database**: `@neondatabase/serverless` (for PostgreSQL)
- **Validation**: `zod`, `@hookform/resolvers`

### Developer Experience & Utilities
- **Replit Plugins**: `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`
- **Form Management**: `react-hook-form`
- **Utilities**: `clsx`, `tailwind-merge`, `date-fns`, `nanoid`

### Database Setup
- **PostgreSQL**: Provisioned through Neon (serverless).
- **Environment Variable**: `DATABASE_URL` is required.
- **Migrations**: Stored in `/migrations`.
- **Schema**: Defined in `shared/schema.ts`.

### Asset Management
- **Static Assets**: Stored in `attached_assets` and referenced via Vite aliases (`@assets`).
- **Fonts**: Google Fonts (Inter, Roboto) loaded via CDN.