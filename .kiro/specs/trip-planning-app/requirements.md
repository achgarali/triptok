# Requirements Document

## Introduction

TripTok est une application web qui aide les utilisateurs de TikTok et Instagram à transformer les vidéos qu'ils sauvegardent pour un voyage en un itinéraire structuré. L'application permet de créer des voyages, d'ajouter des lieux à partir de liens de vidéos ou manuellement, d'organiser ces lieux par jour, de les visualiser sur une carte, et de partager l'itinéraire avec des amis.

## Glossary

- **User**: Une personne qui utilise l'application TripTok
- **Trip**: Un voyage créé par un utilisateur avec une destination et des dates optionnelles
- **Place**: Un lieu d'intérêt ajouté à un voyage (restaurant, bar, attraction, etc.)
- **Source**: Un lien vers une vidéo TikTok ou Instagram associée à un lieu
- **Day_Index**: Le numéro du jour dans l'itinéraire où un lieu est planifié
- **Public_Trip**: Un voyage dont le lien peut être consulté par n'importe qui
- **Private_Trip**: Un voyage accessible uniquement par son créateur
- **System**: L'application TripTok dans son ensemble

## Requirements

### Requirement 1: User Authentication

**User Story:** As a user, I want to create an account and log in, so that I can save and manage my trips securely.

#### Acceptance Criteria

1. WHEN a user provides a valid email and password THEN THE System SHALL create a new user account
2. WHEN a user provides valid login credentials THEN THE System SHALL authenticate the user and create a session
3. WHEN a user provides an email that already exists during signup THEN THE System SHALL reject the registration and return an error message
4. WHEN a user provides invalid credentials during login THEN THE System SHALL reject the authentication and return an error message
5. THE System SHALL store passwords using secure hashing algorithms

### Requirement 2: Trip Management

**User Story:** As a user, I want to create and manage trips with destinations and dates, so that I can organize my travel plans.

#### Acceptance Criteria

1. WHEN a user creates a trip with a name and destination THEN THE System SHALL save the trip and associate it with the user
2. WHEN a user provides start and end dates for a trip THEN THE System SHALL store these dates with the trip
3. WHEN a user requests their trip list THEN THE System SHALL return all trips belonging to that user
4. WHEN a user updates trip details THEN THE System SHALL save the changes and maintain the trip's unique identifier
5. WHEN a user deletes a trip THEN THE System SHALL remove the trip and all associated places and sources
6. THE System SHALL generate a unique slug for each trip to enable public sharing

### Requirement 3: Place Management

**User Story:** As a user, I want to add places to my trip with details like name, address, and type, so that I can build my itinerary.

#### Acceptance Criteria

1. WHEN a user adds a place with a name to a trip THEN THE System SHALL create the place and associate it with the trip
2. WHEN a user provides an address for a place THEN THE System SHALL store the address with the place
3. WHEN a user provides coordinates for a place THEN THE System SHALL store the latitude and longitude
4. WHEN a user assigns a type to a place THEN THE System SHALL validate the type against allowed values and store it
5. THE System SHALL support the following place types: food, bar, cafe, photo, museum, activity, other
6. WHEN a user updates place details THEN THE System SHALL save the changes while preserving the place identifier
7. WHEN a user deletes a place THEN THE System SHALL remove the place and all associated sources

### Requirement 4: Day Planning

**User Story:** As a user, I want to organize places by day in my trip, so that I can create a structured daily itinerary.

#### Acceptance Criteria

1. WHEN a user assigns a day index to a place THEN THE System SHALL store the day index with the place
2. WHEN a user moves a place to a different day THEN THE System SHALL update the day index
3. WHEN a user requests places for a trip THEN THE System SHALL return places grouped by day index
4. THE System SHALL allow places to have no assigned day (day_index = null)
5. WHEN a user reorders places within a day THEN THE System SHALL maintain the new order

### Requirement 5: Video Source Tracking

**User Story:** As a user, I want to attach TikTok or Instagram video links to places, so that I can remember where I found the recommendation.

#### Acceptance Criteria

1. WHEN a user adds a video URL to a place THEN THE System SHALL create a source record associated with the place
2. WHEN a user provides a TikTok or Instagram URL THEN THE System SHALL validate the platform and store it
3. WHEN a user adds optional caption or thumbnail URL THEN THE System SHALL store these details with the source
4. WHEN a user deletes a source THEN THE System SHALL remove only that source without affecting the place
5. THE System SHALL support multiple sources per place

### Requirement 6: Map Visualization

**User Story:** As a user, I want to see all my trip places on a map, so that I can visualize their locations and proximity.

#### Acceptance Criteria

1. WHEN a user views a trip with places that have coordinates THEN THE System SHALL display markers on a map
2. WHEN a user clicks on a map marker THEN THE System SHALL display place details including name, day, and video links
3. WHEN places have different types THEN THE System SHALL use distinct visual indicators for each type
4. WHEN a trip has no places with coordinates THEN THE System SHALL display an empty map centered on the destination
5. THE System SHALL center the map view to show all place markers

### Requirement 7: Trip Sharing

**User Story:** As a user, I want to share my trip with friends via a public link, so that they can view my itinerary.

#### Acceptance Criteria

1. WHEN a user sets a trip to public THEN THE System SHALL make the trip accessible via its unique slug
2. WHEN a user sets a trip to private THEN THE System SHALL restrict access to the trip owner only
3. WHEN anyone accesses a public trip URL THEN THE System SHALL display the trip in read-only mode without requiring authentication
4. WHEN a user accesses a private trip URL without authentication THEN THE System SHALL deny access
5. THE System SHALL create trips as private by default
6. WHEN displaying a public trip THEN THE System SHALL show all places, sources, and map data

### Requirement 8: Data Validation and Integrity

**User Story:** As a system administrator, I want data to be validated and consistent, so that the application remains reliable.

#### Acceptance Criteria

1. WHEN a place is created THEN THE System SHALL require a non-empty name
2. WHEN a trip is created THEN THE System SHALL require a non-empty name and destination
3. WHEN coordinates are provided THEN THE System SHALL validate that latitude is between -90 and 90 and longitude is between -180 and 180
4. WHEN a user attempts to access another user's private trip THEN THE System SHALL deny access
5. WHEN a trip is deleted THEN THE System SHALL cascade delete all associated places and sources
6. WHEN a place is deleted THEN THE System SHALL cascade delete all associated sources

### Requirement 9: Responsive User Interface

**User Story:** As a mobile user, I want the application to work well on my phone, so that I can plan trips on the go.

#### Acceptance Criteria

1. WHEN a user accesses the application on a mobile device THEN THE System SHALL display a mobile-optimized layout
2. WHEN a user accesses the application on a desktop THEN THE System SHALL display a desktop-optimized layout
3. WHEN a user interacts with the map on mobile THEN THE System SHALL provide touch-friendly controls
4. WHEN a user views trip lists on mobile THEN THE System SHALL display content in a single-column layout
5. THE System SHALL maintain functionality across viewport sizes from 320px to 1920px width

### Requirement 10: Performance

**User Story:** As a user, I want the application to respond quickly, so that I can efficiently plan my trips.

#### Acceptance Criteria

1. WHEN a user requests trip data THEN THE System SHALL respond within 200 milliseconds for trips with fewer than 100 places
2. WHEN a user creates or updates a trip or place THEN THE System SHALL complete the operation within 500 milliseconds
3. WHEN a user loads the map view THEN THE System SHALL render all markers within 1 second for trips with fewer than 50 places
4. WHEN multiple users access public trips simultaneously THEN THE System SHALL maintain response times within acceptable limits
5. THE System SHALL implement pagination for trips with more than 100 places
