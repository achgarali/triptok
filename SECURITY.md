# Security Measures

Ce document décrit les mesures de sécurité implémentées dans l'application TripTok.

## 1. Rate Limiting

### Endpoints d'authentification
- **Signup** (`/api/auth/signup`): 5 requêtes par 15 minutes par IP
- **Login** (`/api/auth/*`): 10 requêtes par 15 minutes par IP (via middleware)

### Implémentation
- Utilise un store en mémoire pour le rate limiting
- Pour la production, considérer l'utilisation de Redis ou un service dédié
- Les headers de réponse incluent:
  - `X-RateLimit-Limit`: Limite maximale
  - `X-RateLimit-Remaining`: Requêtes restantes
  - `X-RateLimit-Reset`: Timestamp de réinitialisation
  - `Retry-After`: Secondes avant de pouvoir réessayer

## 2. Protection CSRF

NextAuth.js gère automatiquement la protection CSRF pour toutes les routes d'authentification. Aucune configuration supplémentaire n'est nécessaire.

## 3. Protection XSS

### Sanitization des entrées
- Toutes les entrées utilisateur sont sanitizées avant traitement
- Fonctions de sanitization:
  - `escapeHtml()`: Échappe les caractères HTML spéciaux
  - `sanitizeString()`: Supprime les caractères de contrôle et null bytes
  - `sanitizeEmail()`: Valide et sanitize les adresses email
  - `sanitizeObject()`: Sanitize récursivement les objets

### Application
- Email et password sont sanitizés dans les endpoints d'authentification
- Les données utilisateur sont sanitizées avant stockage en base de données

## 4. Headers de sécurité

Les headers suivants sont configurés dans `next.config.js`:

- **Strict-Transport-Security**: Force HTTPS (max-age: 2 ans)
- **X-Frame-Options**: SAMEORIGIN (prévient le clickjacking)
- **X-Content-Type-Options**: nosniff (prévient le MIME sniffing)
- **X-XSS-Protection**: 1; mode=block (protection XSS du navigateur)
- **Referrer-Policy**: origin-when-cross-origin
- **Content-Security-Policy**: Politique stricte pour prévenir XSS et injection

### Content-Security-Policy
```
default-src 'self'
script-src 'self' 'unsafe-eval' 'unsafe-inline'
style-src 'self' 'unsafe-inline'
img-src 'self' data: https:
font-src 'self' data:
connect-src 'self'
frame-ancestors 'self'
base-uri 'self'
form-action 'self'
```

Note: `unsafe-eval` et `unsafe-inline` sont nécessaires pour Next.js et Tailwind CSS en développement. En production, considérer une configuration plus stricte.

## 5. Authentification des routes API

### Routes protégées (nécessitent authentification)
Toutes les routes suivantes vérifient l'authentification via `getCurrentUser()`:
- `/api/trips` - GET, POST
- `/api/trips/[id]` - GET, PATCH, DELETE
- `/api/trips/[id]/places` - GET, POST
- `/api/places/[id]` - PATCH, DELETE
- `/api/places/[id]/sources` - GET, POST
- `/api/sources/[id]` - DELETE

### Routes publiques (pas d'authentification requise)
- `/api/auth/signup` - POST (création de compte)
- `/api/auth/[...nextauth]` - GET, POST (gestion de session NextAuth)
- `/api/public/trips/[slug]` - GET (partage public de voyages)

### Validation de propriété
En plus de l'authentification, toutes les routes qui modifient des ressources vérifient que l'utilisateur est propriétaire de la ressource via:
- Validation de propriété du trip pour les places
- Validation de propriété du trip pour les sources (via place)
- Validation directe de propriété pour les trips

## 6. Validation des entrées

Toutes les entrées utilisateur sont validées:
- Format email valide
- Longueur minimale des mots de passe (8 caractères)
- Validation des types de données (place types, platforms)
- Validation des coordonnées géographiques
- Validation des dates

## 7. Gestion des erreurs

Les erreurs sont gérées de manière sécurisée:
- Pas d'exposition de détails techniques aux utilisateurs
- Messages d'erreur génériques pour les erreurs internes
- Logging des erreurs côté serveur pour le débogage
- Codes de statut HTTP appropriés (400, 401, 403, 404, 429, 500)

## Recommandations pour la production

1. **Rate Limiting**: Migrer vers Redis ou un service dédié pour la scalabilité
2. **CSP**: Configurer une politique plus stricte en production
3. **HTTPS**: S'assurer que HTTPS est forcé en production
4. **Monitoring**: Implémenter un système de monitoring pour détecter les attaques
5. **Audit de sécurité**: Effectuer des audits de sécurité réguliers
6. **Mise à jour des dépendances**: Maintenir les dépendances à jour pour les correctifs de sécurité

