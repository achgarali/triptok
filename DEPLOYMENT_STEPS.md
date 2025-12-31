# Guide Pratique de Déploiement - Étapes Détaillées

Ce guide vous accompagne étape par étape pour déployer TripTok sur Vercel.

## ✅ Étape 0 : Vérifications Préalables

### Vérifier que le build fonctionne
```bash
npm run build
```
✅ Si le build réussit, vous pouvez continuer.

### Vérifier les fichiers de configuration
- ✅ `vercel.json` existe
- ✅ `package.json` contient les scripts nécessaires
- ✅ `next.config.js` est configuré
- ✅ `prisma/schema.prisma` est à jour

## 📦 Étape 1 : Initialiser Git (si pas déjà fait)

```bash
# Initialiser git
git init

# Ajouter tous les fichiers
git add .

# Faire le premier commit
git commit -m "Initial commit - TripTok ready for deployment"
```

## 🔗 Étape 2 : Créer un Repository GitHub

1. Allez sur [GitHub](https://github.com)
2. Cliquez sur "New repository"
3. Nommez-le (ex: `triptok`)
4. Ne cochez PAS "Initialize with README" (vous avez déjà des fichiers)
5. Cliquez sur "Create repository"

### Pousser votre code sur GitHub

```bash
# Ajouter le remote GitHub (remplacez USERNAME et REPO par vos valeurs)
git remote add origin https://github.com/USERNAME/REPO.git

# Pousser le code
git branch -M main
git push -u origin main
```

## 🚀 Étape 3 : Créer un Projet Vercel

1. Allez sur [Vercel](https://vercel.com)
2. Cliquez sur "Sign Up" ou "Log In"
3. Connectez-vous avec votre compte GitHub
4. Cliquez sur "Add New Project"
5. Sélectionnez votre repository `triptok`
6. Vercel détectera automatiquement Next.js
7. **NE CLIQUEZ PAS ENCORE SUR DEPLOY** - nous devons d'abord configurer la base de données

## 🗄️ Étape 4 : Créer la Base de Données PostgreSQL

### Option A : Vercel Postgres (Recommandé - Plus Simple)

1. Dans votre projet Vercel (après l'avoir créé), allez dans l'onglet **"Storage"**
2. Cliquez sur **"Create Database"**
3. Sélectionnez **"Postgres"**
4. Choisissez un nom pour votre base de données (ex: `triptok-db`)
5. Sélectionnez une région (ex: `Frankfurt` ou `Washington, D.C.`)
6. Cliquez sur **"Create"**
7. Vercel créera automatiquement la base de données
8. **Copiez l'URL de connexion** (elle ressemble à : `postgres://...`)

### Option B : Supabase (Alternative Gratuite)

1. Allez sur [Supabase](https://supabase.com)
2. Créez un compte gratuit
3. Créez un nouveau projet
4. Notez les informations de connexion :
   - Host
   - Database name
   - User
   - Password
   - Port (généralement 5432)
5. Construisez l'URL : `postgresql://user:password@host:port/database?schema=public`

## 🔐 Étape 5 : Générer NEXTAUTH_SECRET

Ouvrez un terminal et exécutez :

```bash
# Sur Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Sur Mac/Linux
openssl rand -base64 32
```

**Copiez le résultat** - vous en aurez besoin pour l'étape suivante.

## ⚙️ Étape 6 : Configurer les Variables d'Environnement sur Vercel

1. Dans votre projet Vercel, allez dans **"Settings"**
2. Cliquez sur **"Environment Variables"**
3. Ajoutez les variables suivantes une par une :

### Variable 1 : DATABASE_URL
- **Name:** `DATABASE_URL`
- **Value:** L'URL de votre base de données (copiée à l'étape 4)
- **Environments:** Cochez `Production`, `Preview`, et `Development`
- Cliquez sur **"Save"**

### Variable 2 : NEXTAUTH_SECRET
- **Name:** `NEXTAUTH_SECRET`
- **Value:** Le secret généré à l'étape 5
- **Environments:** Cochez `Production`, `Preview`, et `Development`
- Cliquez sur **"Save"**

### Variable 3 : NEXTAUTH_URL
- **Name:** `NEXTAUTH_URL`
- **Value:** Pour l'instant, mettez `https://votre-projet.vercel.app` (vous obtiendrez l'URL exacte après le premier déploiement)
- **Environments:** Cochez `Production`
- Cliquez sur **"Save"**

### Variable 4 : NODE_ENV
- **Name:** `NODE_ENV`
- **Value:** `production`
- **Environments:** Cochez `Production`
- Cliquez sur **"Save"**

## 🗃️ Étape 7 : Exécuter les Migrations sur la Base de Données

### Option A : Via Vercel CLI (Recommandé)

1. Installez Vercel CLI :
```bash
npm install -g vercel
```

2. Connectez-vous à Vercel :
```bash
vercel login
```

3. Liez votre projet :
```bash
cd "c:\Users\achga\OneDrive\Bureau\revise_en_groupe\TripTok\triptok\android\app\src\main\kotlin\com\example\triptok"
vercel link
```

4. Téléchargez les variables d'environnement :
```bash
vercel env pull .env.production
```

5. Exécutez les migrations :
```bash
npx prisma migrate deploy
```

### Option B : Via Supabase Dashboard (si vous utilisez Supabase)

1. Allez dans votre projet Supabase
2. Cliquez sur "SQL Editor"
3. Copiez le contenu de vos migrations Prisma
4. Exécutez-les dans l'éditeur SQL

### Option C : Via Connection String Directe

```bash
# Définir la variable d'environnement temporairement
$env:DATABASE_URL="postgresql://user:password@host:port/database?schema=public"

# Exécuter les migrations
npx prisma migrate deploy
```

## 🚀 Étape 8 : Déployer sur Vercel

1. Retournez sur Vercel
2. Allez dans l'onglet **"Deployments"**
3. Si vous n'avez pas encore déployé, cliquez sur **"Deploy"**
4. Si vous avez déjà déployé, cliquez sur les **"..."** à côté du dernier déploiement et **"Redeploy"**
5. Vercel va :
   - Installer les dépendances
   - Générer le client Prisma
   - Builder l'application Next.js
   - Déployer l'application

6. **Attendez la fin du build** (cela peut prendre 2-5 minutes)

## ✅ Étape 9 : Vérifier le Déploiement

1. Une fois le déploiement terminé, cliquez sur l'URL fournie (ex: `https://triptok-xxx.vercel.app`)
2. Testez les fonctionnalités :
   - ✅ Créer un compte
   - ✅ Se connecter
   - ✅ Créer un voyage
   - ✅ Ajouter des lieux
   - ✅ Voir la carte

## 🔄 Étape 10 : Mettre à Jour NEXTAUTH_URL

1. Une fois que vous avez l'URL de votre déploiement (ex: `https://triptok-xxx.vercel.app`)
2. Retournez dans **Settings** → **Environment Variables** sur Vercel
3. Modifiez `NEXTAUTH_URL` avec votre URL exacte
4. Redéployez l'application

## 📝 Checklist Finale

- [ ] Code poussé sur GitHub
- [ ] Projet Vercel créé
- [ ] Base de données PostgreSQL créée
- [ ] Variables d'environnement configurées :
  - [ ] DATABASE_URL
  - [ ] NEXTAUTH_SECRET
  - [ ] NEXTAUTH_URL
  - [ ] NODE_ENV
- [ ] Migrations exécutées sur la base de production
- [ ] Application déployée sur Vercel
- [ ] Tests de fonctionnalités effectués
- [ ] NEXTAUTH_URL mis à jour avec l'URL finale

## 🆘 Problèmes Courants

### Erreur : "Prisma Client not generated"
**Solution :** Ajoutez `prisma generate` dans le script `postinstall` (déjà fait dans package.json)

### Erreur : "Database connection failed"
**Solution :** 
- Vérifiez que DATABASE_URL est correct
- Vérifiez que la base de données accepte les connexions depuis Vercel
- Pour Supabase, vérifiez les paramètres de sécurité réseau

### Erreur : "NEXTAUTH_SECRET is missing"
**Solution :** Assurez-vous que NEXTAUTH_SECRET est configuré dans les variables d'environnement Vercel

### Erreur : "Migration failed"
**Solution :** 
- Vérifiez que DATABASE_URL pointe vers la bonne base de données
- Exécutez `npx prisma migrate deploy` localement avec la bonne DATABASE_URL

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs de build sur Vercel
2. Vérifiez les logs de runtime sur Vercel
3. Consultez la section "Dépannage" dans DEPLOYMENT.md

