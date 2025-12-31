# Design Document: TripTok Trip Planning Application

## Overview

TripTok is a web application that transforms saved TikTok and Instagram travel videos into structured, shareable trip itineraries. The system consists of a Next.js frontend with API routes, PostgreSQL database, authentication layer, and map integration. Users can create trips, add places from video links or manually, organize places by day, visualize locations on a map, and share itineraries via public links.

The application targets young travelers (16-30 years old) who discover destinations through social media and need a simple way to organize their findings into actionable travel plans.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  (Next.js React Components + Tailwind CSS)                  │
│  - Trip List View                                           │
│  - Trip Detail View (List + Map tabs)                       │
│  - Place Management Modals                                  │
│  - Public Trip View                                         │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTP/REST
┌─────────────────▼───────────────────────────────────────────┐
│                     API Layer                                │
│  (Next.js API Routes)                                       │
│  - /api/auth/* (NextAuth.js)                               │
│  - /api/trips/*                                            │
│  - /api/places/*                                           │
│  - /api/sources/*                                          │
│  - /api/public/trips/:slug                                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                   Data Access Layer                          │
│  (Prisma ORM or pg client)                                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                   PostgreSQL Database                        │
│  Tables: users, trips, places, sources                      │
└──────────────────────────────────────────────────────────────┘

External Services:
- Mapbox GL JS / Google Maps API (Map rendering)
- NextAuth.js (Authentication)
```

### Technology Stack

**Frontend:**
- Next.js 14+ (React framework with App Router)
- TypeScript (type safety)
- Tailwind CSS (styling)
- Mapbox GL JS or Google Maps JavaScript API (map visualization)

**Backend:**
- Next.js API Routes (serverless functions)
- NextAuth.js (authentication)
- Prisma (ORM for database access)

**Database:**
- PostgreSQL (hosted on Supabase, Neon, or Render)

**Deployment:**
- Vercel (frontend and API routes)
- Managed PostgreSQL service

## Components and Interfaces

### 1. Authentication Module

**Responsibilities:**
- User registration and login
- Session management
- Password hashing and validation
- Protected route middleware

**Key Functions:**

```typescript
interface AuthService {
  // Register a new user
  signup(email: string, password: string): Promise<User>
  
  // Authenticate user and create session
  login(email: string, password: string): Promise<Session>
  
  // Validate current session
  validateSession(sessionToken: string): Promise<User | null>
  
  // End user session
  logout(sessionToken: string): Promise<void>
}
```

**Implementation Notes:**
- Use NextAuth.js with Credentials provider
- Hash passwords with bcrypt (minimum 10 rounds)
- Store sessions in database or JWT tokens
- Implement middleware to protect API routes

### 2. Trip Management Module

**Responsibilities:**
- CRUD operations for trips
- Trip ownership validation
- Public/private trip access control
- Slug generation for public sharing

**Key Functions:**

```typescript
interface TripService {
  // Create a new trip
  createTrip(userId: string, data: CreateTripInput): Promise<Trip>
  
  // Get all trips for a user
  getUserTrips(userId: string): Promise<Trip[]>
  
  // Get trip details with places and sources
  getTripById(tripId: string, userId: string): Promise<TripWithPlaces>
  
  // Update trip details
  updateTrip(tripId: string, userId: string, data: UpdateTripInput): Promise<Trip>
  
  // Delete trip and cascade delete places/sources
  deleteTrip(tripId: string, userId: string): Promise<void>
  
  // Get public trip by slug (no auth required)
  getPublicTrip(slug: string): Promise<TripWithPlaces | null>
}

interface CreateTripInput {
  name: string
  destination: string
  startDate?: Date
  endDate?: Date
}

interface UpdateTripInput {
  name?: string
  destination?: string
  startDate?: Date
  endDate?: Date
  isPublic?: boolean
}

interface Trip {
  id: string
  userId: string
  name: string
  destination: string
  startDate: Date | null
  endDate: Date | null
  isPublic: boolean
  slug: string
  createdAt: Date
}

interface TripWithPlaces extends Trip {
  places: PlaceWithSources[]
}
```

**Implementation Notes:**
- Generate unique slug using nanoid or similar library
- Validate user ownership before updates/deletes
- Cascade delete places and sources when trip is deleted
- Index slug column for fast public trip lookups

### 3. Place Management Module

**Responsibilities:**
- CRUD operations for places
- Day assignment and reordering
- Coordinate validation
- Type validation

**Key Functions:**

```typescript
interface PlaceService {
  // Create a new place in a trip
  createPlace(tripId: string, userId: string, data: CreatePlaceInput): Promise<Place>
  
  // Update place details
  updatePlace(placeId: string, userId: string, data: UpdatePlaceInput): Promise<Place>
  
  // Delete place and cascade delete sources
  deletePlace(placeId: string, userId: string): Promise<void>
  
  // Get places for a trip grouped by day
  getPlacesByTrip(tripId: string): Promise<PlacesByDay>
}

type PlaceType = 'food' | 'bar' | 'cafe' | 'photo' | 'museum' | 'activity' | 'other'

interface CreatePlaceInput {
  name: string
  address?: string
  lat?: number
  lng?: number
  type: PlaceType
  dayIndex?: number
  notes?: string
}

interface UpdatePlaceInput {
  name?: string
  address?: string
  lat?: number
  lng?: number
  type?: PlaceType
  dayIndex?: number
  notes?: string
}

interface Place {
  id: string
  tripId: string
  name: string
  address: string | null
  lat: number | null
  lng: number | null
  type: PlaceType
  dayIndex: number | null
  notes: string | null
  createdAt: Date
}

interface PlaceWithSources extends Place {
  sources: Source[]
}

interface PlacesByDay {
  [dayIndex: number]: PlaceWithSources[]
  unassigned: PlaceWithSources[]
}
```

**Implementation Notes:**
- Validate coordinates: lat ∈ [-90, 90], lng ∈ [-180, 180]
- Validate place type against enum
- Verify trip ownership before creating/updating places
- Support null dayIndex for unassigned places

### 4. Source Management Module

**Responsibilities:**
- Link video URLs to places
- Platform detection (TikTok/Instagram)
- Optional metadata storage

**Key Functions:**

```typescript
interface SourceService {
  // Add a video source to a place
  createSource(placeId: string, userId: string, data: CreateSourceInput): Promise<Source>
  
  // Delete a source
  deleteSource(sourceId: string, userId: string): Promise<void>
}

type Platform = 'tiktok' | 'instagram' | 'other'

interface CreateSourceInput {
  url: string
  platform: Platform
  caption?: string
  thumbnailUrl?: string
}

interface Source {
  id: string
  placeId: string
  platform: Platform
  url: string
  caption: string | null
  thumbnailUrl: string | null
  createdAt: Date
}
```

**Implementation Notes:**
- Detect platform from URL pattern (tiktok.com, instagram.com)
- Store URL as-is without validation (MVP)
- Allow multiple sources per place

### 5. Map Visualization Module

**Responsibilities:**
- Render interactive map with place markers
- Display place details on marker click
- Center map to show all markers
- Differentiate markers by place type

**Key Functions:**

```typescript
interface MapService {
  // Initialize map centered on destination
  initializeMap(containerId: string, center: Coordinates): MapInstance
  
  // Add markers for all places
  addMarkers(map: MapInstance, places: PlaceWithSources[]): void
  
  // Fit map bounds to show all markers
  fitBounds(map: MapInstance, places: PlaceWithSources[]): void
  
  // Show place details popup
  showPlacePopup(map: MapInstance, place: PlaceWithSources): void
}

interface Coordinates {
  lat: number
  lng: number
}

interface MapInstance {
  // Mapbox or Google Maps instance
  // Implementation-specific
}
```

**Implementation Notes:**
- Use Mapbox GL JS or Google Maps JavaScript API
- Assign marker colors/icons based on place type
- Display popup with: name, day, type, video links
- Handle places without coordinates gracefully

### 6. Public Sharing Module

**Responsibilities:**
- Serve public trip pages without authentication
- Enforce read-only access
- Handle non-existent or private trips

**Key Functions:**

```typescript
interface PublicSharingService {
  // Get public trip data by slug
  getPublicTripBySlug(slug: string): Promise<TripWithPlaces | null>
  
  // Check if trip is publicly accessible
  isPublicTrip(slug: string): Promise<boolean>
}
```

**Implementation Notes:**
- No authentication required for public trips
- Return 404 for non-existent or private trips
- Render same UI as authenticated view but read-only

## Data Models

### Database Schema

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trips table
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  start_date DATE,
  end_date DATE,
  is_public BOOLEAN DEFAULT FALSE,
  slug VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_slug ON trips(slug);

-- Places table
CREATE TABLE places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  type VARCHAR(20) NOT NULL CHECK (type IN ('food', 'bar', 'cafe', 'photo', 'museum', 'activity', 'other')),
  day_index INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_places_trip_id ON places(trip_id);
CREATE INDEX idx_places_day_index ON places(trip_id, day_index);

-- Sources table
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'other')),
  url TEXT NOT NULL,
  caption TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sources_place_id ON sources(place_id);
```

### Prisma Schema

```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  createdAt    DateTime @default(now()) @map("created_at")
  trips        Trip[]

  @@map("users")
}

model Trip {
  id          String    @id @default(uuid())
  userId      String    @map("user_id")
  name        String
  destination String
  startDate   DateTime? @map("start_date") @db.Date
  endDate     DateTime? @map("end_date") @db.Date
  isPublic    Boolean   @default(false) @map("is_public")
  slug        String    @unique
  createdAt   DateTime  @default(now()) @map("created_at")
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  places      Place[]

  @@index([userId])
  @@index([slug])
  @@map("trips")
}

model Place {
  id        String    @id @default(uuid())
  tripId    String    @map("trip_id")
  name      String
  address   String?
  lat       Decimal?  @db.Decimal(10, 8)
  lng       Decimal?  @db.Decimal(11, 8)
  type      PlaceType
  dayIndex  Int?      @map("day_index")
  notes     String?
  createdAt DateTime  @default(now()) @map("created_at")
  trip      Trip      @relation(fields: [tripId], references: [id], onDelete: Cascade)
  sources   Source[]

  @@index([tripId])
  @@index([tripId, dayIndex])
  @@map("places")
}

enum PlaceType {
  food
  bar
  cafe
  photo
  museum
  activity
  other
}

model Source {
  id           String   @id @default(uuid())
  placeId      String   @map("place_id")
  platform     Platform
  url          String
  caption      String?
  thumbnailUrl String?  @map("thumbnail_url")
  createdAt    DateTime @default(now()) @map("created_at")
  place        Place    @relation(fields: [placeId], references: [id], onDelete: Cascade)

  @@index([placeId])
  @@map("sources")
}

enum Platform {
  tiktok
  instagram
  other
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Authentication Properties

**Property 1: User registration creates unique accounts**
*For any* valid email and password combination not already in the system, creating a user account should result in a new user with a unique ID and hashed password that differs from the plaintext password.
**Validates: Requirements 1.1, 1.5**

**Property 2: Valid credentials authenticate successfully**
*For any* user account in the system, providing the correct email and password should successfully authenticate and create a valid session.
**Validates: Requirements 1.2**

**Property 3: Duplicate email registration is rejected**
*For any* email already associated with an existing user, attempting to create a new account with that email should be rejected with an error.
**Validates: Requirements 1.3**

**Property 4: Invalid credentials are rejected**
*For any* email/password combination where either the email doesn't exist or the password is incorrect, authentication should be rejected with an error.
**Validates: Requirements 1.4**

**Property 5: Password hashing is non-reversible**
*For any* two users with the same password, their stored password hashes should be different (due to salting), and no hash should equal its plaintext password.
**Validates: Requirements 1.5**

### Trip Management Properties

**Property 6: Trip creation associates with user**
*For any* user and valid trip data (name and destination), creating a trip should result in a new trip associated with that user's ID.
**Validates: Requirements 2.1**

**Property 7: Trip dates are stored accurately**
*For any* trip with start and end dates, retrieving the trip should return the exact dates that were stored.
**Validates: Requirements 2.2**

**Property 8: Users see only their own trips**
*For any* user, requesting their trip list should return all and only the trips where the user_id matches their ID.
**Validates: Requirements 2.3**

**Property 9: Updates preserve entity identity**
*For any* trip or place, updating its properties should preserve its unique identifier (ID remains unchanged).
**Validates: Requirements 2.4, 3.6**

**Property 10: Trip deletion cascades to places and sources**
*For any* trip with associated places and sources, deleting the trip should result in all associated places and their sources being removed from the database.
**Validates: Requirements 2.5, 8.5**

**Property 11: Trip slugs are unique**
*For any* set of trips in the system, all trip slugs should be unique (no two trips share the same slug).
**Validates: Requirements 2.6**

### Place Management Properties

**Property 12: Place creation associates with trip**
*For any* trip and valid place data (name and type), creating a place should result in a new place associated with that trip's ID.
**Validates: Requirements 3.1**

**Property 13: Optional place data is stored when provided**
*For any* place, when optional fields (address, coordinates, notes) are provided, they should be stored and retrievable; when not provided, they should be null.
**Validates: Requirements 3.2, 3.3**

**Property 14: Invalid place types are rejected**
*For any* place type not in the set {food, bar, cafe, photo, museum, activity, other}, attempting to create or update a place with that type should be rejected.
**Validates: Requirements 3.4**

**Property 15: Place deletion cascades to sources**
*For any* place with associated sources, deleting the place should result in all associated sources being removed from the database.
**Validates: Requirements 3.7, 8.6**

### Day Planning Properties

**Property 16: Day index assignment is stored**
*For any* place and day index value, assigning the day index should result in the place being retrievable with that day index.
**Validates: Requirements 4.1**

**Property 17: Day index updates are reflected**
*For any* place with an assigned day index, updating to a different day index should result in the place being retrievable with the new day index.
**Validates: Requirements 4.2**

**Property 18: Places are grouped by day**
*For any* trip with places assigned to various days, requesting places should return them grouped by day index, with unassigned places (null day_index) in a separate group.
**Validates: Requirements 4.3**

**Property 19: Null day index is supported**
*For any* place created without a day index, the place should be stored with day_index = null and be retrievable.
**Validates: Requirements 4.4**

### Source Management Properties

**Property 20: Source creation associates with place**
*For any* place and valid source data (URL and platform), creating a source should result in a new source associated with that place's ID.
**Validates: Requirements 5.1**

**Property 21: Platform is validated and stored**
*For any* source with a URL, the platform should be validated against {tiktok, instagram, other} and stored correctly.
**Validates: Requirements 5.2**

**Property 22: Optional source metadata is stored**
*For any* source, when optional fields (caption, thumbnailUrl) are provided, they should be stored and retrievable; when not provided, they should be null.
**Validates: Requirements 5.3**

**Property 23: Source deletion is isolated**
*For any* place with multiple sources, deleting one source should remove only that source while leaving the place and other sources unchanged.
**Validates: Requirements 5.4**

**Property 24: Multiple sources per place are supported**
*For any* place, adding multiple sources should result in all sources being stored and retrievable for that place.
**Validates: Requirements 5.5**

### Map Visualization Properties

**Property 25: Map data includes all places with coordinates**
*For any* trip with places that have coordinates, the map data preparation should include markers for all places with valid lat/lng values.
**Validates: Requirements 6.1**

**Property 26: Marker click provides complete place data**
*For any* place marker, the click event handler should receive complete place data including name, day index, type, and all associated sources.
**Validates: Requirements 6.2**

**Property 27: Place types map to distinct markers**
*For any* two places with different types, their marker configurations should differ (different colors, icons, or identifiers).
**Validates: Requirements 6.3**

**Property 28: Map bounds include all markers**
*For any* trip with multiple places having coordinates, the calculated map bounds should include all place coordinates.
**Validates: Requirements 6.5**

### Sharing and Access Control Properties

**Property 29: Public trips are accessible via slug**
*For any* trip with isPublic = true, requesting the trip by its slug without authentication should return the complete trip data with places and sources.
**Validates: Requirements 7.1, 7.3**

**Property 30: Private trips are restricted to owners**
*For any* trip with isPublic = false, requesting the trip by a user other than the owner (or without authentication) should be denied.
**Validates: Requirements 7.2, 7.4, 8.4**

**Property 31: Trips default to private**
*For any* trip created without explicitly setting isPublic, the trip should have isPublic = false.
**Validates: Requirements 7.5**

**Property 32: Public trip data is complete**
*For any* public trip, the returned data should include all places with their sources and all necessary data for map rendering.
**Validates: Requirements 7.6**

### Validation Properties

**Property 33: Empty names are rejected**
*For any* trip or place creation/update with an empty or whitespace-only name, the operation should be rejected with a validation error.
**Validates: Requirements 8.1, 8.2**

**Property 34: Coordinate ranges are validated**
*For any* place with coordinates, if latitude is outside [-90, 90] or longitude is outside [-180, 180], the operation should be rejected with a validation error.
**Validates: Requirements 8.3**

### Pagination Property

**Property 35: Large place lists are paginated**
*For any* trip with more than 100 places, requesting places should return paginated results rather than all places at once.
**Validates: Requirements 10.5**



## Error Handling

### Error Categories

**1. Validation Errors (400 Bad Request)**
- Empty or invalid input fields
- Invalid coordinate ranges
- Invalid place types or platforms
- Malformed data

**Response Format:**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": [
    {
      "field": "lat",
      "message": "Latitude must be between -90 and 90"
    }
  ]
}
```

**2. Authentication Errors (401 Unauthorized)**
- Invalid credentials
- Expired or missing session token
- Unauthenticated access to protected resources

**Response Format:**
```json
{
  "error": "AUTHENTICATION_ERROR",
  "message": "Invalid credentials"
}
```

**3. Authorization Errors (403 Forbidden)**
- Accessing another user's private trip
- Modifying resources owned by another user

**Response Format:**
```json
{
  "error": "AUTHORIZATION_ERROR",
  "message": "You do not have permission to access this resource"
}
```

**4. Not Found Errors (404 Not Found)**
- Requesting non-existent trip, place, or source
- Accessing private trip via public URL

**Response Format:**
```json
{
  "error": "NOT_FOUND",
  "message": "Trip not found"
}
```

**5. Conflict Errors (409 Conflict)**
- Duplicate email during registration
- Duplicate slug generation (retry with new slug)

**Response Format:**
```json
{
  "error": "CONFLICT",
  "message": "Email already exists"
}
```

**6. Server Errors (500 Internal Server Error)**
- Database connection failures
- Unexpected exceptions
- External service failures (map API)

**Response Format:**
```json
{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred"
}
```

### Error Handling Strategies

**Database Errors:**
- Wrap all database operations in try-catch blocks
- Log errors with context (user ID, operation, timestamp)
- Return generic error messages to clients (don't expose DB details)
- Implement retry logic for transient failures

**Validation:**
- Validate input at API boundary before processing
- Use schema validation libraries (Zod, Yup)
- Return detailed validation errors to help users correct input
- Sanitize input to prevent injection attacks

**Authentication/Authorization:**
- Verify session/token on every protected route
- Check resource ownership before mutations
- Return consistent error messages (don't reveal if user exists)
- Implement rate limiting on auth endpoints

**Cascade Deletions:**
- Use database foreign key constraints with ON DELETE CASCADE
- Verify cascade behavior in tests
- Log deletion operations for audit trail

**External Services (Map API):**
- Handle API failures gracefully (show map without markers if API fails)
- Implement timeout for external requests
- Cache map tiles when possible
- Provide fallback behavior

## Testing Strategy

### Overview

The testing strategy employs a dual approach combining unit tests for specific examples and edge cases with property-based tests for universal correctness properties. This ensures both concrete functionality and general correctness across a wide range of inputs.

### Property-Based Testing

**Framework:** fast-check (for TypeScript/JavaScript)

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `Feature: trip-planning-app, Property {N}: {property_text}`

**Property Test Coverage:**

Each correctness property from the design document will be implemented as a property-based test:

1. **Authentication Properties (1-5):**
   - Generate random valid/invalid credentials
   - Test password hashing with multiple inputs
   - Verify session creation and validation

2. **Trip Management Properties (6-11):**
   - Generate random trip data (names, destinations, dates)
   - Test CRUD operations across many inputs
   - Verify cascade deletions with various data structures
   - Test slug uniqueness with concurrent creations

3. **Place Management Properties (12-15):**
   - Generate random place data with various types
   - Test optional field handling (null vs. provided)
   - Verify type validation with valid and invalid inputs
   - Test cascade deletions

4. **Day Planning Properties (16-19):**
   - Generate random day indices (including null)
   - Test grouping logic with various distributions
   - Verify updates and reassignments

5. **Source Management Properties (20-24):**
   - Generate random URLs and platforms
   - Test multiple sources per place
   - Verify isolated deletions

6. **Map Properties (25-28):**
   - Generate random coordinate sets
   - Test bounds calculations with edge cases
   - Verify marker data preparation

7. **Access Control Properties (29-32):**
   - Generate random public/private trips
   - Test access with various authentication states
   - Verify data completeness

8. **Validation Properties (33-34):**
   - Generate edge cases (empty strings, whitespace, boundary values)
   - Test coordinate validation with out-of-range values

9. **Pagination Property (35):**
   - Generate trips with varying place counts
   - Verify pagination triggers at threshold

**Example Property Test:**

```typescript
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';

// Feature: trip-planning-app, Property 11: Trip slugs are unique
describe('Trip slug uniqueness', () => {
  it('should generate unique slugs for all trips', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({
          name: fc.string({ minLength: 1 }),
          destination: fc.string({ minLength: 1 }),
        }), { minLength: 2, maxLength: 20 }),
        async (tripDataArray) => {
          const userId = await createTestUser();
          const createdTrips = [];
          
          for (const tripData of tripDataArray) {
            const trip = await createTrip(userId, tripData);
            createdTrips.push(trip);
          }
          
          const slugs = createdTrips.map(t => t.slug);
          const uniqueSlugs = new Set(slugs);
          
          expect(uniqueSlugs.size).toBe(slugs.length);
          
          // Cleanup
          await cleanupTestUser(userId);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing

**Framework:** Vitest (for TypeScript/JavaScript)

**Unit Test Coverage:**

1. **API Route Tests:**
   - Test each endpoint with specific examples
   - Test error responses (400, 401, 403, 404, 409, 500)
   - Test request/response formats
   - Test middleware (auth, validation)

2. **Service Layer Tests:**
   - Test business logic with concrete examples
   - Test edge cases (empty arrays, null values, boundary conditions)
   - Test error handling and exceptions
   - Mock database calls for isolation

3. **Data Access Layer Tests:**
   - Test database queries with specific data
   - Test transaction handling
   - Test cascade deletions
   - Use test database or in-memory database

4. **Integration Tests:**
   - Test complete user flows (signup → create trip → add places → share)
   - Test authentication flow end-to-end
   - Test public trip access without auth
   - Use test database with realistic data

5. **Component Tests (Frontend):**
   - Test React components with specific props
   - Test user interactions (clicks, form submissions)
   - Test conditional rendering
   - Mock API calls

**Example Unit Test:**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createTrip, deleteTrip, getPlacesByTrip } from './tripService';

describe('Trip deletion cascade', () => {
  let userId: string;
  let tripId: string;
  
  beforeEach(async () => {
    userId = await createTestUser();
    const trip = await createTrip(userId, {
      name: 'Paris Trip',
      destination: 'Paris, France'
    });
    tripId = trip.id;
    
    // Add places with sources
    await createPlace(tripId, userId, {
      name: 'Eiffel Tower',
      type: 'photo'
    });
  });
  
  it('should delete all places when trip is deleted', async () => {
    await deleteTrip(tripId, userId);
    
    const places = await getPlacesByTrip(tripId);
    expect(places).toEqual({ unassigned: [] });
  });
});
```

### Test Organization

```
src/
├── __tests__/
│   ├── unit/
│   │   ├── services/
│   │   │   ├── authService.test.ts
│   │   │   ├── tripService.test.ts
│   │   │   ├── placeService.test.ts
│   │   │   └── sourceService.test.ts
│   │   ├── api/
│   │   │   ├── auth.test.ts
│   │   │   ├── trips.test.ts
│   │   │   ├── places.test.ts
│   │   │   └── sources.test.ts
│   │   └── utils/
│   │       ├── validation.test.ts
│   │       └── slugGenerator.test.ts
│   ├── integration/
│   │   ├── tripFlow.test.ts
│   │   ├── authFlow.test.ts
│   │   └── publicSharing.test.ts
│   └── properties/
│       ├── auth.properties.test.ts
│       ├── trips.properties.test.ts
│       ├── places.properties.test.ts
│       ├── sources.properties.test.ts
│       ├── access.properties.test.ts
│       └── validation.properties.test.ts
└── components/
    └── __tests__/
        ├── TripList.test.tsx
        ├── TripDetail.test.tsx
        ├── PlaceCard.test.tsx
        └── MapView.test.tsx
```

### Test Data Management

**Generators for Property Tests:**

```typescript
// Custom arbitraries for domain objects
const validEmail = fc.emailAddress();
const validPassword = fc.string({ minLength: 8, maxLength: 100 });
const tripName = fc.string({ minLength: 1, maxLength: 255 });
const placeType = fc.constantFrom('food', 'bar', 'cafe', 'photo', 'museum', 'activity', 'other');
const validLat = fc.double({ min: -90, max: 90 });
const validLng = fc.double({ min: -180, max: 180 });
const dayIndex = fc.integer({ min: 1, max: 30 });
const platform = fc.constantFrom('tiktok', 'instagram', 'other');
```

**Test Database:**
- Use separate test database or in-memory database (SQLite)
- Reset database between test suites
- Use transactions and rollback for test isolation
- Seed with minimal required data

**Fixtures:**
- Create helper functions for common test data
- Use factories for generating test objects
- Maintain consistency across tests

### Continuous Integration

**CI Pipeline:**
1. Run linter (ESLint)
2. Run type checker (TypeScript)
3. Run unit tests
4. Run property-based tests (100 iterations)
5. Run integration tests
6. Generate coverage report (target: >80%)
7. Build application
8. Deploy to staging (on main branch)

**Test Execution:**
- Run tests in parallel when possible
- Fail fast on first error in CI
- Generate test reports (JUnit XML)
- Track test execution time

### Coverage Goals

- **Overall coverage:** >80%
- **Critical paths:** >95% (auth, trip/place CRUD, access control)
- **Property tests:** All 35 properties implemented
- **Unit tests:** All API endpoints, services, and critical utilities
- **Integration tests:** All major user flows

### Manual Testing

**Pre-release checklist:**
- [ ] Test signup and login flows in browser
- [ ] Create trip and add places manually
- [ ] Test map interaction (zoom, pan, marker clicks)
- [ ] Test public sharing link in incognito window
- [ ] Test responsive layout on mobile device
- [ ] Test with real TikTok/Instagram URLs
- [ ] Verify error messages are user-friendly
- [ ] Test performance with large trip (50+ places)

## Implementation Notes

### Security Considerations

1. **Password Security:**
   - Use bcrypt with minimum 10 rounds
   - Never log or expose passwords
   - Implement password strength requirements

2. **SQL Injection Prevention:**
   - Use parameterized queries (Prisma handles this)
   - Validate and sanitize all input
   - Never concatenate user input into queries

3. **XSS Prevention:**
   - Sanitize user-generated content (trip names, place notes)
   - Use React's built-in XSS protection
   - Set appropriate Content-Security-Policy headers

4. **CSRF Protection:**
   - Use NextAuth.js CSRF tokens
   - Verify origin headers
   - Use SameSite cookie attribute

5. **Rate Limiting:**
   - Implement rate limiting on auth endpoints (5 attempts per 15 minutes)
   - Rate limit API endpoints (100 requests per minute per user)
   - Use Redis or in-memory store for rate limit tracking

### Performance Optimizations

1. **Database:**
   - Index foreign keys (user_id, trip_id, place_id)
   - Index slug for fast public trip lookups
   - Use connection pooling
   - Implement query result caching for public trips

2. **API:**
   - Implement pagination for large result sets
   - Use database-level filtering instead of application-level
   - Return only necessary fields (avoid SELECT *)
   - Implement ETag caching for public trips

3. **Frontend:**
   - Lazy load map component
   - Implement virtual scrolling for long place lists
   - Use React.memo for expensive components
   - Debounce search and filter inputs
   - Optimize images (thumbnails)

4. **Map:**
   - Cluster markers when many places are close together
   - Lazy load map tiles
   - Cache geocoding results
   - Limit map re-renders

### Deployment Considerations

1. **Environment Variables:**
   - DATABASE_URL (PostgreSQL connection string)
   - NEXTAUTH_SECRET (session encryption key)
   - NEXTAUTH_URL (application URL)
   - MAPBOX_TOKEN or GOOGLE_MAPS_API_KEY
   - NODE_ENV (production/development)

2. **Database Migrations:**
   - Use Prisma migrations
   - Test migrations on staging before production
   - Backup database before migrations
   - Plan for zero-downtime deployments

3. **Monitoring:**
   - Log errors to service (Sentry, LogRocket)
   - Track API response times
   - Monitor database connection pool
   - Set up alerts for error rates

4. **Backup:**
   - Daily automated database backups
   - Test backup restoration process
   - Retain backups for 30 days

## Future Enhancements (Out of Scope for MVP)

1. **TikTok/Instagram API Integration:**
   - Auto-extract place information from video metadata
   - Fetch video thumbnails automatically
   - Import saved videos directly

2. **Collaborative Planning:**
   - Multiple users can edit same trip
   - Real-time updates with WebSockets
   - Comment system on places

3. **Advanced Features:**
   - Route optimization (best order to visit places)
   - Budget tracking per place
   - Weather integration
   - Export to PDF/Google Maps

4. **Mobile App:**
   - Native iOS/Android apps
   - Offline mode
   - Push notifications

5. **Monetization:**
   - Premium features (unlimited trips, advanced export)
   - Subscription management
   - Payment integration (Stripe)

6. **Social Features:**
   - Follow other users
   - Discover popular trips
   - Trip templates/recommendations
