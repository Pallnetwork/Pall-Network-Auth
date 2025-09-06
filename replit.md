# Overview

Pall Network is a secure authentication system built with a modern full-stack architecture. The application provides user registration, login, password recovery, and dashboard functionality using Firebase as the authentication backend and Firestore for data storage. The frontend is built with React and styled using shadcn/ui components with Tailwind CSS, while the backend uses Express.js with TypeScript.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development and building
- **Routing**: Wouter for client-side routing with pages for home, sign-in, sign-up, forgot password, and dashboard
- **UI Framework**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming and dark/light mode support
- **State Management**: TanStack React Query for server state management and caching
- **Forms**: React Hook Form with Zod validation for type-safe form handling

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Structure**: RESTful API with routes prefixed under `/api`
- **Storage Interface**: Abstracted storage layer with in-memory implementation (MemStorage) that can be extended
- **Development**: Vite middleware integration for hot reloading during development

## Database Schema
- **Users Table**: Contains id (UUID), name, username, email, password, invitation (optional), and createdAt timestamp
- **Validation**: Drizzle-Zod integration for type-safe schema validation
- **ORM**: Drizzle ORM configured for PostgreSQL with migrations support

## Authentication & Authorization
- **Primary Auth**: Firebase Authentication with Firestore for user data persistence
- **Session Management**: Client-side session handling using localStorage for user ID storage
- **Password Security**: Plain text storage in current implementation (should be hashed)
- **Route Protection**: Client-side route guards that redirect unauthenticated users

## External Dependencies

### Third-Party Services
- **Firebase**: Primary authentication service and Firestore database for user management
- **Neon Database**: PostgreSQL database service (configured but not actively used)

### Key Libraries
- **UI Components**: Radix UI primitives (@radix-ui/*) for accessible component foundation
- **Styling**: Tailwind CSS with shadcn/ui design system
- **Database**: Drizzle ORM with PostgreSQL adapter and Neon serverless driver
- **State Management**: TanStack React Query for API state management
- **Form Handling**: React Hook Form with Hookform Resolvers for validation
- **Icons**: Lucide React for consistent iconography
- **Utilities**: class-variance-authority for component variants, clsx for conditional classes

### Development Tools
- **Build Tool**: Vite with React plugin and TypeScript support
- **Code Quality**: TypeScript for type safety and ESLint configuration
- **Replit Integration**: Cartographer plugin and runtime error overlay for Replit environment