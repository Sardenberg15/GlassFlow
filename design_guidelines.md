# Design Guidelines: HelpGlass ERP/CRM System

## Design Approach
**Hybrid System-Reference Approach**: Professional enterprise dashboard combining Airbnb's refined visual language (soft shadows, generous spacing, clean cards) with Pipedrive/HubSpot's functional workflow clarity. This is a utility-focused business application prioritizing efficiency and data clarity while maintaining visual polish.

## Core Design Elements

### A. Color Palette

**Primary Colors:**
- Primary Blue: `#2563EB` (216 91% 60%) - Main actions, primary buttons, active states
- Success Green: `#10B981` (160 84% 39%) - Completed status, positive metrics, success messages
- Alert Orange: `#F59E0B` (38 92% 50%) - Warnings, pending actions
- Danger Red: `#EF4444` (0 84% 60%) - Critical actions, overdue items, errors

**Neutral Palette:**
- Background: `#F8FAFC` (210 20% 98%) - Main app background
- Card White: `#FFFFFF` - Card backgrounds, modals
- Text Primary: `#1E293B` (217 33% 17%) - Headings, primary text
- Text Secondary: `#64748B` (215 20% 65%) - Secondary text, labels
- Border: `#E2E8F0` (214 32% 91%) - Dividers, card borders

**Dark Mode (Consistent Throughout):**
- Background: `#0F172A` (222 47% 11%)
- Card: `#1E293B` (217 33% 17%)
- Text Primary: `#F1F5F9` (210 20% 98%)
- Text Secondary: `#94A3B8` (214 32% 91%)
- Borders: `#334155` (215 25% 27%)

### B. Typography

**Font Stack:**
- Primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif
- Secondary: 'Roboto', sans-serif (for data tables and numeric values)

**Type Scale:**
- Headings H1: 2rem (32px), font-weight 700, tracking-tight
- Headings H2: 1.5rem (24px), font-weight 600
- Headings H3: 1.25rem (20px), font-weight 600
- Body: 0.875rem (14px), font-weight 400, line-height 1.5
- Small/Labels: 0.75rem (12px), font-weight 500, uppercase tracking

### C. Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16
- Micro spacing (gaps, padding): p-2, p-4
- Card padding: p-6, p-8
- Section spacing: py-8, py-12, py-16
- Consistent use of gap-4 and gap-6 for grids

**Grid Structure:**
- Sidebar: Fixed 16rem (256px) width on desktop, collapsible on mobile
- Main content: max-w-7xl container with px-6 padding
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-4 for metrics
- Table layouts: Full width within container, responsive horizontal scroll on mobile

### D. Component Library

**Navigation:**
- Fixed sidebar with logo at top, primary nav items with icons
- Active state: bg-primary-50 dark:bg-primary-900/20 with border-l-4 accent
- Top bar: breadcrumb navigation, user profile, notifications

**Cards (Airbnb-inspired):**
- Background: white/dark-card
- Border radius: rounded-lg (8px)
- Shadow: shadow-sm hover:shadow-md transition-shadow
- Padding: p-6 for content
- Headers: border-b with pb-4 mb-4

**Buttons:**
- Primary: bg-primary-600 hover:bg-primary-700, rounded-md, px-4 py-2
- Secondary: border border-gray-300, bg-white hover:bg-gray-50
- Success: bg-success-600 for positive actions
- Danger: bg-danger-600 for destructive actions
- All buttons: font-medium text-sm, transition-colors

**Forms:**
- Input fields: rounded-md border-gray-300, focus:border-primary-500 focus:ring-1 focus:ring-primary-500
- Labels: text-sm font-medium text-gray-700 dark:text-gray-300, mb-1
- Dark mode inputs: bg-gray-800 border-gray-600 text-white
- Form groups: space-y-6 for vertical rhythm

**Tables:**
- Header: bg-gray-50 dark:bg-gray-800, font-medium text-xs uppercase
- Rows: border-b hover:bg-gray-50 dark:hover:bg-gray-800/50
- Cells: py-4 px-6, align-middle
- Status badges: Inline with rounded-full px-3 py-1 text-xs

**Dashboard Metrics Cards:**
- Icon: Rounded background circle with brand color
- Number: text-2xl font-bold
- Label: text-sm text-gray-600
- Trend indicator: Small arrow with percentage change

**Cartão de Obras (Project Finance Card):**
- Two-column layout: Receitas (green accent) | Despesas (red accent)
- Running totals with large numbers
- Line items in scrollable list with dates and descriptions
- Net balance prominently displayed at bottom

**Status Workflow:**
- Visual pipeline: Horizontal stepper showing Orçamento → Aprovado → Em Execução → Finalizado
- Color coding: Gray (pending), Blue (active), Green (complete), Orange (attention needed)
- Progress bar showing completion percentage

### E. Interactions

**Animations:** Minimal, purposeful only
- Hover transitions: transition-colors duration-200
- Modal/drawer entry: slide-in-right animation, duration-300
- Card hover: subtle shadow elevation
- No decorative or scroll-triggered animations

**Loading States:**
- Skeleton screens for data tables using pulse animation
- Spinner for button actions
- Progress bar for file uploads

## Images

**Dashboard:** No hero image - utility app launches directly into functional dashboard
**Login/Auth Pages:** Optional subtle background pattern or abstract gradient, not photograph
**Empty States:** Simple illustrations (not photographs) for empty project lists, client lists
**Client Profiles:** Avatar placeholders with initials, optional company logo upload

## Key Design Principles

1. **Information Density**: Maximize visible data without clutter - use compact tables and card grids
2. **Workflow Clarity**: Visual status indicators and clear action buttons at every step
3. **Financial Transparency**: Cartão de Obras uses clear visual separation of income/expenses with color coding
4. **Responsive Data**: Tables become cards on mobile, sidebar collapses to hamburger menu
5. **Consistent Patterns**: Reuse same card style, button treatments, and spacing across all views