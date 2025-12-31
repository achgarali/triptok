# Guide de Déploiement - TripTok

Ce guide vous explique comment déployer TripTok en production.

## Prérequis

- Un compte GitHub (pour le repository)
- Un compte sur la plateforme de déploiement choisie (Vercel recommandé)
- Une base de données PostgreSQL (Vercel Postgres, Supabase, Railway, etc.)
- Node.js 18+ installé localement (pour les migrations)

## Option 1 : Déploiement sur Vercel (Recommandé)

### Étape 1 : Préparer le repository

1. Assurez-vous que votre code est poussé sur GitHub
2. Vérifiez que tous les fichiers nécessaires sont commités

### Étape 2 : Créer un projet Vercel

1. Connectez-vous à [Vercel](https://vercel.com)
2. Cliquez sur "Add New Project"
3. Importez votre repository GitHub
4. Vercel détectera automatiquement Next.js

### Étape 3 : Configurer les variables d'environnement

Dans les paramètres du projet Vercel, ajoutez les variables suivantes :

```
DATABASE_URL=postgresql://user:password@host:port/database?schema=public
NEXTAUTH_URL=https://votre-domaine.vercel.app
NEXTAUTH_SECRET=votre-secret-generé-avec-openssl-rand-base64-32
NODE_ENV=production
```

**Important :**
- Générez `NEXTAUTH_SECRET` avec : `openssl rand -base64 32`
- `NEXTAUTH_URL` doit correspondre à l'URL de votre déploiement Vercel
- `DATABASE_URL` doit pointer vers votre base de données PostgreSQL de production

### Étape 4 : Configurer la base de données PostgreSQL

#### Option A : Vercel Postgres (Intégré)

1. Dans votre projet Vercel, allez dans l'onglet "Storage"
2. Cliquez sur "Create Database" → "Postgres"
3. Vercel créera automatiquement la base de données
4. Copiez l'URL de connexion et ajoutez-la comme `DATABASE_URL`

#### Option B : Base de données externe (Supabase, Railway, etc.)

1. Créez une base de données PostgreSQL sur votre fournisseur
2. Copiez l'URL de connexion
3. Ajoutez-la comme `DATABASE_URL` dans Vercel

### Étape 5 : Exécuter les migrations

**Avant le premier déploiement :**

1. Installez Prisma CLI globalement : `npm install -g prisma`
2. Exécutez les migrations sur la base de production :

```bash
# Avec la variable d'environnement DATABASE_URL pointant vers la production
prisma migrate deploy
```

**Ou via Vercel CLI :**

```bash
# Installer Vercel CLI
npm install -g vercel

# Se connecter
vercel login

# Lier le projet
vercel link

# Exécuter les migrations (après avoir configuré DATABASE_URL)
vercel env pull .env.production
prisma migrate deploy
```

### Étape 6 : Déployer

1. Vercel déploiera automatiquement à chaque push sur la branche principale
2. Vous pouvez aussi déclencher un déploiement manuel depuis le dashboard
3. Vérifiez les logs de build pour s'assurer que tout fonctionne

### Étape 7 : Vérifier le déploiement

1. Visitez l'URL de votre déploiement
2. Testez la création de compte
3. Testez la création d'un voyage
4. Vérifiez que la base de données fonctionne correctement

## Option 2 : Déploiement sur Railway

### Étape 1 : Créer un projet Railway

1. Connectez-vous à [Railway](https://railway.app)
2. Créez un nouveau projet depuis GitHub
3. Ajoutez un service PostgreSQL

### Étape 2 : Configurer les variables d'environnement

Dans les variables d'environnement du service, ajoutez :

```
DATABASE_URL=<fourni automatiquement par Railway>
NEXTAUTH_URL=https://votre-projet.railway.app
NEXTAUTH_SECRET=votre-secret-generé
NODE_ENV=production
```

### Étape 3 : Exécuter les migrations

Railway peut exécuter automatiquement les migrations via un script de build. Ajoutez dans `package.json` :

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

## Option 3 : Déploiement sur Netlify

### Étape 1 : Créer un projet Netlify

1. Connectez-vous à [Netlify](https://netlify.com)
2. Importez votre repository GitHub
3. Configurez les paramètres de build :
   - Build command: `npm run build`
   - Publish directory: `.next`

### Étape 2 : Configurer les variables d'environnement

Ajoutez les mêmes variables que pour Vercel dans les paramètres du site.

### Étape 3 : Base de données

Netlify ne fournit pas de PostgreSQL intégré. Utilisez une base externe (Supabase, Railway, etc.).

## Configuration de la Base de Données de Production

### Créer la base de données

1. Choisissez un fournisseur (Vercel Postgres, Supabase, Railway, AWS RDS, etc.)
2. Créez une nouvelle base de données PostgreSQL
3. Notez l'URL de connexion

### Exécuter les migrations

```bash
# Définir la variable d'environnement
export DATABASE_URL="postgresql://user:password@host:port/database?schema=public"

# Exécuter les migrations
npx prisma migrate deploy
```

### Vérifier la base de données

```bash
# Ouvrir Prisma Studio pour inspecter
npx prisma studio
```

## Scripts de Migration

Le projet inclut les scripts suivants dans `package.json` :

- `db:generate` : Génère le client Prisma
- `db:migrate` : Crée et applique une nouvelle migration (développement)
- `db:migrate:deploy` : Applique les migrations en production
- `db:push` : Pousse le schéma vers la base de données (développement uniquement)
- `db:studio` : Ouvre Prisma Studio

**Pour la production, utilisez toujours `db:migrate:deploy`.**

## Configuration de la Surveillance des Erreurs (Optionnel)

### Sentry

1. Créez un compte sur [Sentry](https://sentry.io)
2. Créez un nouveau projet Next.js
3. Installez les dépendances :

```bash
npm install @sentry/nextjs
```

4. Initialisez Sentry :

```bash
npx @sentry/wizard@latest -i nextjs
```

5. Ajoutez `SENTRY_DSN` dans les variables d'environnement

## Checklist de Déploiement

- [ ] Repository GitHub créé et code poussé
- [ ] Base de données PostgreSQL créée
- [ ] Variables d'environnement configurées
- [ ] Migrations exécutées sur la base de production
- [ ] `NEXTAUTH_SECRET` généré et configuré
- [ ] `NEXTAUTH_URL` configuré avec l'URL de production
- [ ] Application déployée
- [ ] Tests de fonctionnalités de base effectués
- [ ] Monitoring configuré (optionnel)

## Dépannage

### Erreur de connexion à la base de données

- Vérifiez que `DATABASE_URL` est correctement configuré
- Vérifiez que la base de données accepte les connexions depuis votre plateforme
- Vérifiez les credentials

### Erreur d'authentification

- Vérifiez que `NEXTAUTH_SECRET` est configuré
- Vérifiez que `NEXTAUTH_URL` correspond à l'URL de production
- Vérifiez que les cookies fonctionnent (pas de problème CORS)

### Erreur de build

- Vérifiez les logs de build dans votre plateforme
- Assurez-vous que toutes les dépendances sont installées
- Vérifiez que TypeScript compile sans erreurs

## Support

Pour toute question ou problème, consultez :
- [Documentation Next.js](https://nextjs.org/docs)
- [Documentation Prisma](https://www.prisma.io/docs)
- [Documentation Vercel](https://vercel.com/docs)

