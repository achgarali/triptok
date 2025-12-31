# Migration vers Supabase

## Étape 1 : Créer un compte Supabase

1. Allez sur https://supabase.com
2. Cliquez sur "Start your project"
3. Connectez-vous avec GitHub (recommandé)
4. Créez une nouvelle organisation si nécessaire

## Étape 2 : Créer un nouveau projet

1. Cliquez sur "New Project"
2. Remplissez les informations :
   - **Name** : `triptok` (ou le nom de votre choix)
   - **Database Password** : Choisissez un mot de passe fort (notez-le !)
   - **Region** : Choisissez la région la plus proche (par exemple `West Europe (Paris)` pour la France)
   - **Pricing Plan** : Free (gratuit)
3. Cliquez sur "Create new project"
4. Attendez 2-3 minutes que le projet soit créé

## Étape 3 : Récupérer les informations de connexion

### Option A : Utiliser le pooler de connexions (Recommandé pour Vercel)

1. Dans votre projet Supabase, allez dans **Settings** → **Database**
2. Faites défiler jusqu'à la section **Connection string**
3. Sélectionnez **Connection pooling** dans le menu déroulant
4. Sélectionnez **Transaction** mode
5. Copiez l'URL de connexion (format : `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:6543/postgres`)
6. Remplacez `[YOUR-PASSWORD]` par le mot de passe que vous avez défini lors de la création du projet
7. **Note** : Le port est `6543` (pooler) au lieu de `5432` (direct)

### Option B : Utiliser la connexion directe (Pour le développement local)

1. Dans votre projet Supabase, allez dans **Settings** → **Database**
2. Faites défiler jusqu'à la section **Connection string**
3. Sélectionnez **URI** dans le menu déroulant
4. Copiez l'URL de connexion (format : `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`)
5. Remplacez `[YOUR-PASSWORD]` par le mot de passe que vous avez défini lors de la création du projet

## Étape 4 : Configurer les variables d'environnement sur Vercel

1. Allez sur votre projet Vercel
2. Allez dans **Settings** → **Environment Variables**
3. Mettez à jour `DATABASE_URL` avec l'URL Supabase que vous avez copiée
4. **Supprimez** `PRISMA_DATABASE_URL` si elle existe (on n'en a plus besoin)
5. Assurez-vous que les autres variables sont toujours définies :
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`

## Étape 5 : Exécuter les migrations

1. Localement, mettez à jour votre `.env` avec la nouvelle URL Supabase :
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres"
   ```

2. Exécutez les migrations :
   ```bash
   npm run db:migrate:deploy
   ```

   Ou si vous préférez créer une nouvelle migration :
   ```bash
   npm run db:migrate
   ```

## Étape 6 : Tester la connexion

1. Vérifiez que la connexion fonctionne :
   ```bash
   npx prisma studio
   ```

2. Cela devrait ouvrir Prisma Studio et vous permettre de voir vos tables

## Étape 7 : Redéployer sur Vercel

1. Le redéploiement se fera automatiquement après la mise à jour de `DATABASE_URL`
2. Ou redéployez manuellement depuis le dashboard Vercel
3. Testez la création de compte sur votre application déployée

## Notes importantes

- **Supabase utilise PostgreSQL standard** : Votre code Prisma fonctionnera sans modification
- **Pooler de connexions** : Supabase a un pooler intégré qui gère les connexions efficacement
- **Limites du plan gratuit** :
  - 500 MB de base de données
  - 2 GB de bande passante
  - 50 000 requêtes par mois
- **Sécurité** : Assurez-vous de ne jamais commiter votre mot de passe dans le code

## Dépannage

### Erreur de connexion
- Vérifiez que le mot de passe dans l'URL est correct
- Vérifiez que l'URL est bien au format `postgresql://` (pas `postgres://`)
- Vérifiez que votre IP n'est pas bloquée (dans Supabase Settings → Database → Connection pooling)

### Erreur de migration
- Assurez-vous que la base de données est vide ou que vous avez sauvegardé les données existantes
- Vérifiez que vous avez les permissions nécessaires

## Support

- Documentation Supabase : https://supabase.com/docs
- Documentation Prisma : https://www.prisma.io/docs

