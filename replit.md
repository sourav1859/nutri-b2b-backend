# Odyssey B2B Backend

## Overview

Odyssey B2B is an enterprise-grade multi-tenant nutrition platform backend that provides vendor catalog management, customer health profiles, data ingestion capabilities, and health-aware product matching. The system is designed to handle 50 vendors with up to 500k products and 1M customers each, with strict HIPAA compliance requirements and performance SLOs of ≤500ms for matches API and ≤300ms for search operations.

The platform features a full-stack TypeScript implementation with a React frontend for administrative operations and a robust Express.js backend with PostgreSQL for data persistence. The architecture emphasizes tenant isolation, audit logging, and scalable data processing through queue-based ingestion workers.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side application is built with React and TypeScript, using Vite as the build tool. It implements a component-based architecture with shadcn/ui components for consistent design. The frontend features:

- **Routing**: File-based routing using wouter for lightweight navigation
- **State Management**: React Query (@tanstack/react-query) for server state management and caching
- **UI Framework**: shadcn/ui components with Radix UI primitives and Tailwind CSS for styling
- **Authentication**: Custom auth hooks that integrate with Appwrite for user authentication

The application follows a dashboard-centric design with dedicated pages for vendors, products, customers, ingestion jobs, and analytics monitoring.

### Backend Architecture
The server implements a RESTful API using Express.js with TypeScript, structured around multi-tenant isolation:

- **Database Layer**: Drizzle ORM with PostgreSQL, featuring tenant-scoped queries and partitioning strategy
- **Authentication**: Appwrite JWT-based authentication with role-based access control (RBAC)
- **Queue System**: PostgreSQL-backed job queue using `SELECT ... FOR UPDATE SKIP LOCKED` pattern
- **Worker System**: Background job processors for CSV ingestion and data synchronization
- **Error Handling**: RFC 9457 Problem Details for HTTP APIs standard implementation

The backend emphasizes data isolation through vendor_id scoping on all database operations and implements comprehensive audit logging for HIPAA compliance.

### Data Storage Architecture
The database schema implements LIST partitioning by vendor_id with HASH sub-partitioning for scalability:

- **Primary Tables**: Products, customers, and health profiles with full-text search capabilities
- **Audit System**: Comprehensive logging of all data access and modifications
- **Partitioning**: Vendor-based partitioning with hash sub-partitions for optimal performance
- **Search**: PostgreSQL full-text search with GIN indexes and tsvector maintenance

### Security and Compliance
The system implements HIPAA-compliant security measures:

- **Authentication**: JWT-based authentication through Appwrite
- **Authorization**: Role-based permissions with vendor isolation
- **Audit Trails**: Complete audit logging for all health data access
- **Data Encryption**: Supabase Vault for encrypted secrets storage
- **Idempotency**: Request deduplication for safe retries

## External Dependencies

### Authentication and User Management
- **Appwrite**: Primary authentication provider for JWT token validation and user management
- **Appwrite Teams**: Tenant organization and role assignment

### Database and Storage
- **Supabase PostgreSQL**: Primary database with read replica support for heavy operations
- **Supabase Storage**: File storage with TUS resumable upload support for large CSV files
- **Supabase Vault**: Encrypted secrets and PII storage with audit capabilities

### Development and Infrastructure
- **Drizzle ORM**: Type-safe database operations with PostgreSQL dialect
- **Neon Database**: Serverless PostgreSQL provider (@neondatabase/serverless)
- **TUS Protocol**: Resumable file uploads for large dataset ingestion (@tus/s3-store)

### Monitoring and Observability
- **React Query**: Client-side data fetching and caching with real-time updates
- **Real-time Metrics**: WebSocket-based performance monitoring for API latencies
- **Health Checks**: Database connection monitoring and system status reporting

### Third-party Integrations
- **Webhook Delivery**: HMAC-SHA256 signed webhook delivery to vendor endpoints
- **CSV Processing**: Streaming CSV parser for large file ingestion
- **External API Sync**: Configurable API connectors for vendor data synchronization

The system is designed for horizontal scalability with read replicas, partitioned tables, and queue-based processing to handle enterprise-scale data volumes while maintaining strict performance and compliance requirements.