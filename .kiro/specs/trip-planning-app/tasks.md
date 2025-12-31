# Implementation Plan: TripTok Trip Planning Application

## Overview

This implementation plan breaks down the TripTok application into discrete, incremental tasks. The approach follows a bottom-up strategy: starting with database setup and core services, then building API endpoints, and finally implementing the frontend. Each task builds on previous work, with property-based tests integrated throughout to validate correctness early.

## Tasks

- [x] 1. Project setup and database configuration
  - Initialize Next.js 14+ project with TypeScript and App Router
  - Install dependencies: Prisma, NextAuth.js, bcrypt, Tailwind CSS, fast-check, vitest
  - Configure Prisma with PostgreSQL connection
  - Create database schema (users, trips, places, sources tables)
  - Run initial migration
  - Set up test database configuration
  - _Requirements: All requirements depend on this foundation_

- [-] 2. Implement authentication service
  - [x] 2.1 Create user registration function with password hashing
    - Implement signup function that creates user with hashed password
    - Validate email format and password requirements
    - Handle duplicate email errors
    - _Requirements: 1.1, 1.5_
  
  - [x] 2.2 Write property tests for authentication
    - **Property 1: User registration creates unique accounts**
    - **Property 3: Duplicate email registration is rejected**
    - **Property 5: Password hashing is non-reversible**
    - _Requirements: 1.1, 1.3, 1.5_
  
  - [ ] 2.3 Create login function with credential validation
    - Implement login function that validates credentials
    - Create session/JWT token on successful authentication
    - Return appropriate errors for invalid credentials
    - _Requirements: 1.2, 1.4_
  
  - [ ] 2.4 Write property tests for login
    - **Property 2: Valid credentials authenticate successfully**
    - **Property 4: Invalid credentials are rejected**
    - _Requirements: 1.2, 1.4_

- [ ] 3. Configure NextAuth.js
  - Set up NextAuth.js with Credentials provider
  - Configure session strategy (JWT or database)
  - Create auth API routes (/api/auth/*)
  - Implement middleware for protected routes
  - _Requirements: 1.1, 1.2_

- [ ] 4. Implement trip management service
  - [ ] 4.1 Create trip CRUD functions
    - Implement createTrip with slug generation (using nanoid)
    - Implement getUserTrips with user filtering
    - Implement getTripById with ownership validation
    - Implement updateTrip with ownership validation
    - Implement deleteTrip with cascade deletion
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [ ] 4.2 Write property tests for trip management
    - **Property 6: Trip creation associates with user**
    - **Property 7: Trip dates are stored accurately**
    - **Property 8: Users see only their own trips**
    - **Property 9: Updates preserve entity identity**
    - **Property 11: Trip slugs are unique**
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_
  
  - [ ] 4.3 Write property test for cascade deletion
    - **Property 10: Trip deletion cascades to places and sources**
    - _Requirements: 2.5, 8.5_

- [ ] 5. Implement place management service
  - [ ] 5.1 Create place CRUD functions
    - Implement createPlace with trip association and type validation
    - Implement updatePlace with ownership validation and coordinate validation
    - Implement deletePlace with cascade deletion
    - Implement getPlacesByTrip with day grouping
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 3.7, 4.3_
  
  - [ ] 5.2 Write property tests for place management
    - **Property 12: Place creation associates with trip**
    - **Property 13: Optional place data is stored when provided**
    - **Property 14: Invalid place types are rejected**
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [ ] 5.3 Write property test for place cascade deletion
    - **Property 15: Place deletion cascades to sources**
    - _Requirements: 3.7, 8.6_

- [ ] 6. Implement day planning functionality
  - [ ] 6.1 Add day index management to place service
    - Implement day index assignment in createPlace and updatePlace
    - Implement grouping logic in getPlacesByTrip (group by day_index)
    - Handle null day_index (unassigned places)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [ ] 6.2 Write property tests for day planning
    - **Property 16: Day index assignment is stored**
    - **Property 17: Day index updates are reflected**
    - **Property 18: Places are grouped by day**
    - **Property 19: Null day index is supported**
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 7. Checkpoint - Ensure all tests pass
  - Run all unit and property tests
  - Verify database schema is correct
  - Ensure all services are working as expected
  - Ask the user if questions arise

- [ ] 8. Implement source management service
  - [ ] 8.1 Create source CRUD functions
    - Implement createSource with platform validation
    - Implement deleteSource with ownership validation
    - Support optional caption and thumbnailUrl fields
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ] 8.2 Write property tests for source management
    - **Property 20: Source creation associates with place**
    - **Property 21: Platform is validated and stored**
    - **Property 22: Optional source metadata is stored**
    - **Property 23: Source deletion is isolated**
    - **Property 24: Multiple sources per place are supported**
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 9. Implement validation utilities
  - [ ] 9.1 Create validation functions
    - Implement email and password validation
    - Implement coordinate range validation (lat: -90 to 90, lng: -180 to 180)
    - Implement non-empty string validation
    - Implement place type and platform enum validation
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [ ] 9.2 Write property tests for validation
    - **Property 33: Empty names are rejected**
    - **Property 34: Coordinate ranges are validated**
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 10. Implement public sharing service
  - [ ] 10.1 Create public trip access functions
    - Implement getPublicTripBySlug (no auth required)
    - Implement access control checks (isPublic flag)
    - Ensure default isPublic = false for new trips
    - Include all places and sources in public trip response
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  
  - [ ] 10.2 Write property tests for access control
    - **Property 29: Public trips are accessible via slug**
    - **Property 30: Private trips are restricted to owners**
    - **Property 31: Trips default to private**
    - **Property 32: Public trip data is complete**
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.4_

- [ ] 11. Create API routes for trips
  - [ ] 11.1 Implement trip API endpoints
    - POST /api/trips - create trip
    - GET /api/trips - list user's trips
    - GET /api/trips/[id] - get trip details
    - PATCH /api/trips/[id] - update trip
    - DELETE /api/trips/[id] - delete trip
    - Add authentication middleware to all routes
    - Add error handling and validation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ] 11.2 Write integration tests for trip API
    - Test complete trip CRUD flow
    - Test error responses (401, 403, 404, 400)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 12. Create API routes for places
  - [ ] 12.1 Implement place API endpoints
    - POST /api/trips/[tripId]/places - create place
    - PATCH /api/places/[id] - update place
    - DELETE /api/places/[id] - delete place
    - Add authentication and ownership validation
    - Add error handling and validation
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 3.7, 4.1, 4.2_
  
  - [ ] 12.2 Write integration tests for place API
    - Test complete place CRUD flow
    - Test error responses
    - _Requirements: 3.1, 3.6, 3.7_

- [ ] 13. Create API routes for sources
  - [ ] 13.1 Implement source API endpoints
    - POST /api/places/[placeId]/sources - create source
    - DELETE /api/sources/[id] - delete source
    - Add authentication and ownership validation
    - Add error handling and validation
    - _Requirements: 5.1, 5.4_
  
  - [ ] 13.2 Write integration tests for source API
    - Test source creation and deletion
    - Test error responses
    - _Requirements: 5.1, 5.4_

- [ ] 14. Create public trip API route
  - Implement GET /api/public/trips/[slug] - get public trip (no auth)
  - Return 404 for private or non-existent trips
  - Include all places and sources in response
  - Add error handling
  - _Requirements: 7.1, 7.3, 7.4, 7.6_

- [ ] 15. Checkpoint - Ensure all API tests pass
  - Run all API integration tests
  - Test API routes manually with Postman or similar
  - Verify error handling works correctly
  - Ask the user if questions arise

- [ ] 16. Implement frontend layout and navigation
  - Create app layout with navigation header
  - Set up Tailwind CSS configuration
  - Create responsive navigation (mobile and desktop)
  - Add authentication state display (logged in user)
  - _Requirements: 9.1, 9.2, 9.4_

- [ ] 17. Implement authentication pages
  - [ ] 17.1 Create signup page
    - Build signup form with email and password fields
    - Add client-side validation
    - Handle form submission and errors
    - Redirect to trips list on success
    - _Requirements: 1.1_
  
  - [ ] 17.2 Create login page
    - Build login form with email and password fields
    - Add client-side validation
    - Handle form submission and errors
    - Redirect to trips list on success
    - _Requirements: 1.2_
  
  - [ ] 17.3 Write component tests for auth pages
    - Test form validation
    - Test error display
    - _Requirements: 1.1, 1.2_

- [ ] 18. Implement trip list page
  - [ ] 18.1 Create trip list component
    - Fetch and display user's trips
    - Show trip cards with name, destination, dates, place count
    - Add "New Trip" button
    - Handle loading and error states
    - _Requirements: 2.3_
  
  - [ ] 18.2 Write component tests for trip list
    - Test trip display
    - Test empty state
    - _Requirements: 2.3_

- [ ] 19. Implement trip creation modal
  - Create modal/form for new trip
  - Add fields: name, destination, start date, end date
  - Add client-side validation
  - Handle form submission
  - Redirect to trip detail page on success
  - _Requirements: 2.1, 2.2_

- [ ] 20. Implement trip detail page
  - [ ] 20.1 Create trip detail layout with tabs
    - Create page layout with trip header (name, destination, dates)
    - Add tabs for "Planning" (list view) and "Map" (map view)
    - Add trip settings (public/private toggle, delete button)
    - Add "Add Place" button
    - _Requirements: 2.3, 7.1, 7.2_
  
  - [ ] 20.2 Create planning tab (list view)
    - Display places grouped by day (Day 1, Day 2, Unassigned)
    - Show place cards with name, type icon, address, notes
    - Add edit and delete buttons for each place
    - Handle empty state
    - _Requirements: 4.3_
  
  - [ ] 20.3 Write component tests for trip detail
    - Test tab switching
    - Test place display
    - _Requirements: 2.3, 4.3_

- [ ] 21. Implement place management modal
  - [ ] 21.1 Create add/edit place modal
    - Add fields: name, address, type, day, notes, video URL
    - Add client-side validation
    - Handle form submission (create or update)
    - Support adding multiple video sources
    - _Requirements: 3.1, 3.2, 3.4, 4.1, 5.1_
  
  - [ ] 21.2 Write component tests for place modal
    - Test form validation
    - Test create and update modes
    - _Requirements: 3.1, 3.4_

- [ ] 22. Implement map visualization
  - [ ] 22.1 Set up Mapbox GL JS or Google Maps
    - Install and configure map library
    - Create MapView component
    - Initialize map centered on trip destination
    - _Requirements: 6.1, 6.4_
  
  - [ ] 22.2 Add place markers to map
    - Add markers for all places with coordinates
    - Use different colors/icons for different place types
    - Implement marker click to show place popup
    - Display place name, day, type, and video links in popup
    - Fit map bounds to show all markers
    - _Requirements: 6.1, 6.2, 6.3, 6.5_
  
  - [ ] 22.3 Write property tests for map data preparation
    - **Property 25: Map data includes all places with coordinates**
    - **Property 26: Marker click provides complete place data**
    - **Property 27: Place types map to distinct markers**
    - **Property 28: Map bounds include all markers**
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [ ] 23. Implement public trip view
  - Create public trip page at /public/[slug]
  - Fetch trip data without authentication
  - Display trip in read-only mode (no edit/delete buttons)
  - Show both list and map views
  - Handle 404 for non-existent or private trips
  - _Requirements: 7.3, 7.4, 7.6_

- [ ] 24. Implement trip sharing functionality
  - [ ] 24.1 Add public/private toggle to trip settings
    - Add toggle switch to trip detail page
    - Update trip isPublic flag on toggle
    - Show public link when trip is public
    - Add copy-to-clipboard button for public link
    - _Requirements: 7.1, 7.2_
  
  - [ ] 24.2 Write integration test for sharing flow
    - Test making trip public and accessing via slug
    - Test making trip private and verifying access denied
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 25. Checkpoint - Ensure all frontend tests pass
  - Run all component tests
  - Test application manually in browser
  - Test responsive layout on mobile and desktop
  - Verify all user flows work end-to-end
  - Ask the user if questions arise

- [ ] 26. Implement pagination for large place lists
  - [ ] 26.1 Add pagination to place queries
    - Modify getPlacesByTrip to support pagination
    - Add page and limit parameters
    - Return total count with results
    - _Requirements: 10.5_
  
  - [ ] 26.2 Write property test for pagination
    - **Property 35: Large place lists are paginated**
    - _Requirements: 10.5_
  
  - [ ] 26.3 Add pagination UI to trip detail page
    - Add pagination controls to planning tab
    - Handle page changes
    - Show total place count
    - _Requirements: 10.5_

- [ ] 27. Add error handling and loading states
  - Add error boundaries to catch React errors
  - Add loading spinners for async operations
  - Add toast notifications for success/error messages
  - Improve error messages to be user-friendly
  - _Requirements: All requirements benefit from better UX_

- [ ] 28. Implement security measures
  - Add rate limiting to auth endpoints
  - Add CSRF protection (NextAuth.js handles this)
  - Sanitize user input to prevent XSS
  - Add Content-Security-Policy headers
  - Verify all API routes have authentication
  - _Requirements: 8.4_

- [ ] 29. Performance optimizations
  - Add database indexes (already in schema)
  - Implement React.memo for expensive components
  - Lazy load map component
  - Add loading states to prevent layout shift
  - Optimize images (if using thumbnails)
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 30. Final testing and polish
  - [ ] 30.1 Run complete test suite
    - Run all unit tests
    - Run all property tests (100 iterations each)
    - Run all integration tests
    - Verify test coverage >80%
    - _Requirements: All requirements_
  
  - [ ] 30.2 Manual testing checklist
    - Test signup and login flows
    - Create trip and add places
    - Test map interaction
    - Test public sharing in incognito window
    - Test responsive layout on mobile
    - Test with real TikTok/Instagram URLs
    - Verify error messages are clear
    - Test with large trip (50+ places)
    - _Requirements: All requirements_
  
  - [ ] 30.3 Code review and cleanup
    - Remove console.logs and debug code
    - Add JSDoc comments to public functions
    - Ensure consistent code style
    - Update README with setup instructions
    - _Requirements: All requirements_

- [ ] 31. Deployment preparation
  - Set up environment variables for production
  - Configure database connection for production
  - Set up Vercel project (or chosen hosting)
  - Run database migrations on production database
  - Test deployment on staging environment
  - Set up error monitoring (Sentry or similar)
  - _Requirements: All requirements_

## Notes

- All tasks are required for comprehensive coverage
- Each property test task references specific properties from the design document
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- All tasks reference specific requirements for traceability
- The implementation follows a bottom-up approach: database → services → API → frontend
- Property tests are integrated throughout to catch errors early
- Integration tests validate complete user flows
