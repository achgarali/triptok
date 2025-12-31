# Database Initialization Guide

## Prerequisites

You need a PostgreSQL database running. You can use:
- Local PostgreSQL installation
- Docker container
- Cloud service (Supabase, Neon, Render, etc.)

## Option 1: Using Docker (Recommended for Development)

```bash
# Start PostgreSQL container
docker run --name triptok-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_USER=user -e POSTGRES_DB=triptok -p 5432:5432 -d postgres:15

# Create test database
docker exec -it triptok-postgres psql -U user -d triptok -c "CREATE DATABASE triptok_test;"
```

## Option 2: Using Local PostgreSQL

```bash
# Connect to PostgreSQL
psql -U postgres

# Create databases
CREATE DATABASE triptok;
CREATE DATABASE triptok_test;

# Create user (optional)
CREATE USER triptok_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE triptok TO triptok_user;
GRANT ALL PRIVILEGES ON DATABASE triptok_test TO triptok_user;
```

## Option 3: Using Cloud Service

1. Create a PostgreSQL database on your preferred service
2. Get the connection string
3. Update `.env` file with your connection string

## Running Migrations

After setting up your database, run:

```bash
# Generate Prisma Client
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name init

# Or for production
npx prisma migrate deploy
```

## Verify Setup

```bash
# Check database connection
npx prisma db pull

# Open Prisma Studio to view data
npx prisma studio
```

## Environment Variables

Update your `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/triptok?schema=public"
TEST_DATABASE_URL="postgresql://user:password@localhost:5432/triptok_test?schema=public"
```

Replace:
- `user` with your database username
- `password` with your database password
- `localhost:5432` with your database host and port
- `triptok` with your database name
