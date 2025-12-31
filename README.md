# TripTok

Transformez vos vidéos de voyage sauvegardées en itinéraires structurés.

## Description

TripTok est une application web qui permet aux utilisateurs de créer et gérer des itinéraires de voyage basés sur des vidéos TikTok et Instagram. Les utilisateurs peuvent organiser leurs lieux par jour, ajouter des sources vidéo, et visualiser leurs voyages sur une carte interactive.

## Fonctionnalités

- **Gestion de voyages** : Créez, modifiez et supprimez vos voyages
- **Gestion de lieux** : Ajoutez des lieux à vos voyages avec coordonnées, adresse et notes
- **Planification par jour** : Organisez vos lieux par jour d'itinéraire
- **Sources vidéo** : Liez des vidéos TikTok et Instagram à vos lieux
- **Carte interactive** : Visualisez vos lieux sur une carte Leaflet
- **Partage public** : Partagez vos voyages publiquement via un lien unique
- **Pagination** : Gestion efficace des grandes listes de lieux
- **Authentification sécurisée** : Système d'authentification avec NextAuth.js

## Technologies

- **Framework** : Next.js 14+ (App Router)
- **Langage** : TypeScript
- **Base de données** : PostgreSQL avec Prisma ORM
- **Authentification** : NextAuth.js
- **Styling** : Tailwind CSS
- **Cartes** : Leaflet / React-Leaflet
- **Tests** : Vitest avec Fast-check pour les tests property-based

## Prérequis

- Node.js 18+ 
- PostgreSQL 12+
- npm ou yarn

## Installation

### 1. Cloner le repository

```bash
git clone <repository-url>
cd triptok
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d'environnement

Créez un fichier `.env` à la racine du projet :

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/triptok?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Node Environment
NODE_ENV="development"
```

Générez un secret pour NextAuth :
```bash
openssl rand -base64 32
```

### 4. Configurer la base de données

```bash
# Générer le client Prisma
npx prisma generate

# Exécuter les migrations
npx prisma migrate dev

# (Optionnel) Ouvrir Prisma Studio pour visualiser la base de données
npx prisma studio
```

### 5. Lancer l'application

```bash
# Mode développement
npm run dev

# Mode production
npm run build
npm start
```

L'application sera accessible sur `http://localhost:3000`

## Structure du Projet

```
triptok/
├── app/                    # Pages Next.js (App Router)
│   ├── api/               # Routes API
│   ├── trips/             # Pages de gestion des voyages
│   ├── login/             # Page de connexion
│   ├── signup/            # Page d'inscription
│   └── public/            # Pages publiques
├── components/            # Composants React réutilisables
├── lib/                   # Code partagé
│   ├── services/         # Services métier
│   ├── utils/            # Utilitaires
│   └── prisma.ts         # Client Prisma
├── prisma/               # Schéma et migrations Prisma
├── tests/                # Tests
│   └── properties/      # Tests property-based
└── public/               # Fichiers statiques
```

## Scripts Disponibles

- `npm run dev` : Lancer le serveur de développement
- `npm run build` : Construire l'application pour la production
- `npm start` : Lancer le serveur de production
- `npm test` : Exécuter les tests
- `npm run lint` : Vérifier le code avec ESLint

## Tests

Les tests sont organisés en deux catégories :

1. **Tests unitaires** : Tests de base pour les utilitaires
2. **Tests property-based** : Tests utilisant Fast-check pour valider les propriétés du système

Exécuter tous les tests :
```bash
npm test
```

## Sécurité

L'application implémente plusieurs mesures de sécurité :

- Rate limiting sur les endpoints d'authentification
- Protection XSS avec sanitization des entrées
- Headers de sécurité (CSP, HSTS, etc.)
- Authentification requise pour toutes les routes protégées
- Protection CSRF via NextAuth.js

Voir `SECURITY.md` pour plus de détails.

## Performance

L'application est optimisée pour les performances :

- React.memo pour les composants coûteux
- Lazy loading pour le composant de carte
- Skeleton loaders pour éviter le layout shift
- Pagination pour les grandes listes
- Index de base de données optimisés

## Déploiement

### Vercel (Recommandé)

1. Connecter votre repository GitHub à Vercel
2. Configurer les variables d'environnement
3. Configurer la base de données PostgreSQL
4. Déployer

### Autres plateformes

L'application peut être déployée sur toute plateforme supportant Next.js :
- Netlify
- Railway
- AWS
- Google Cloud Platform

## Contribution

Les contributions sont les bienvenues ! Veuillez :

1. Fork le projet
2. Créer une branche pour votre fonctionnalité
3. Commiter vos changements
4. Pousser vers la branche
5. Ouvrir une Pull Request

## Licence

Ce projet est sous licence MIT.

## Support

Pour toute question ou problème, veuillez ouvrir une issue sur GitHub.
