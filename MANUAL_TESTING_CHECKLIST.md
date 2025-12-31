# Checklist de Tests Manuels

Cette checklist couvre tous les flux utilisateur et fonctionnalités de l'application TripTok.

## 1. Authentification

### Inscription
- [ ] Accéder à `/signup`
- [ ] Remplir le formulaire avec un email valide et un mot de passe (min 8 caractères)
- [ ] Vérifier la validation côté client (email invalide, mot de passe trop court)
- [ ] Soumettre le formulaire
- [ ] Vérifier la redirection vers `/login` avec message de succès
- [ ] Tester avec un email déjà existant (doit afficher une erreur)
- [ ] Tester le rate limiting (5 tentatives en 15 minutes)

### Connexion
- [ ] Accéder à `/login`
- [ ] Se connecter avec des identifiants valides
- [ ] Vérifier la redirection vers `/trips`
- [ ] Tester avec des identifiants invalides (doit afficher une erreur)
- [ ] Tester le rate limiting (10 tentatives en 15 minutes)
- [ ] Vérifier que la session persiste après rafraîchissement

### Déconnexion
- [ ] Cliquer sur "Déconnexion" dans la navigation
- [ ] Vérifier la redirection vers `/login`
- [ ] Vérifier que l'accès à `/trips` nécessite une nouvelle connexion

## 2. Gestion des Voyages

### Création de voyage
- [ ] Accéder à `/trips/new`
- [ ] Remplir le formulaire (nom, destination, dates optionnelles)
- [ ] Vérifier la validation (nom et destination requis)
- [ ] Vérifier la validation des dates (date de fin après date de début)
- [ ] Soumettre le formulaire
- [ ] Vérifier la redirection vers la page de détail du voyage
- [ ] Vérifier que le voyage apparaît dans la liste `/trips`

### Liste des voyages
- [ ] Accéder à `/trips`
- [ ] Vérifier l'affichage de tous les voyages de l'utilisateur
- [ ] Vérifier l'affichage des informations (nom, destination, dates)
- [ ] Vérifier l'indicateur "Public" pour les voyages publics
- [ ] Cliquer sur un voyage pour accéder à sa page de détail
- [ ] Vérifier le bouton "Nouveau Voyage"
- [ ] Tester l'état vide (aucun voyage)

### Détail du voyage
- [ ] Accéder à `/trips/[id]`
- [ ] Vérifier l'affichage des informations du voyage
- [ ] Tester le toggle public/privé
- [ ] Vérifier l'affichage du lien de partage quand public
- [ ] Tester la copie du lien dans le presse-papiers
- [ ] Vérifier le message de confirmation après copie
- [ ] Tester la suppression du voyage
- [ ] Vérifier la redirection après suppression

## 3. Gestion des Lieux

### Création de lieu
- [ ] Accéder à `/trips/[id]/places/new`
- [ ] Remplir le formulaire (nom, type, adresse, coordonnées, jour, notes)
- [ ] Vérifier la validation (nom et type requis)
- [ ] Vérifier la validation des coordonnées (lat: -90 à 90, lng: -180 à 180)
- [ ] Vérifier la validation de l'index de jour (entier positif)
- [ ] Soumettre le formulaire
- [ ] Vérifier la redirection vers la page de détail du voyage
- [ ] Vérifier que le lieu apparaît dans la liste

### Modification de lieu
- [ ] Accéder à `/trips/[id]/places/[placeId]/edit`
- [ ] Vérifier le pré-remplissage des champs
- [ ] Modifier les informations
- [ ] Soumettre le formulaire
- [ ] Vérifier que les modifications sont reflétées

### Suppression de lieu
- [ ] Depuis la page de détail du voyage, cliquer sur supprimer
- [ ] Confirmer la suppression
- [ ] Vérifier que le lieu disparaît de la liste
- [ ] Vérifier le message de succès (toast)

### Affichage des lieux
- [ ] Vérifier le groupement par jour dans l'onglet "Planning"
- [ ] Vérifier l'affichage des lieux non assignés
- [ ] Vérifier la pagination (si plus de 20 lieux)
- [ ] Vérifier les contrôles de pagination (Précédent/Suivant)
- [ ] Vérifier l'affichage du nombre total de lieux

## 4. Gestion des Sources Vidéo

### Ajout de source
- [ ] Depuis la page de détail d'un lieu, ajouter une source
- [ ] Remplir l'URL, la plateforme, le caption optionnel
- [ ] Vérifier la validation de l'URL
- [ ] Vérifier la validation de la plateforme
- [ ] Soumettre
- [ ] Vérifier l'affichage de la source dans la liste

### Suppression de source
- [ ] Supprimer une source depuis la liste
- [ ] Vérifier que la source disparaît

## 5. Visualisation de la Carte

### Carte interactive
- [ ] Accéder à l'onglet "Carte" dans la page de détail du voyage
- [ ] Vérifier le chargement de la carte
- [ ] Vérifier l'affichage des markers pour les lieux avec coordonnées
- [ ] Vérifier les couleurs différentes selon le type de lieu
- [ ] Cliquer sur un marker pour voir le popup
- [ ] Vérifier les informations dans le popup
- [ ] Vérifier l'ajustement automatique des bounds
- [ ] Tester avec un voyage sans lieux avec coordonnées

## 6. Partage Public

### Accès public
- [ ] Rendre un voyage public
- [ ] Copier le lien de partage
- [ ] Ouvrir le lien dans une fenêtre de navigation privée
- [ ] Vérifier l'accès sans authentification
- [ ] Vérifier l'affichage complet des informations
- [ ] Vérifier l'affichage de la carte
- [ ] Vérifier que les actions de modification ne sont pas disponibles

### Accès privé
- [ ] Rendre un voyage privé
- [ ] Essayer d'accéder au lien public dans une fenêtre privée
- [ ] Vérifier l'erreur 404

## 7. Responsive Design

### Desktop
- [ ] Tester sur un écran large (> 1024px)
- [ ] Vérifier la navigation desktop
- [ ] Vérifier la grille des voyages (3 colonnes)
- [ ] Vérifier la grille des lieux (3 colonnes)

### Tablette
- [ ] Tester sur un écran moyen (768px - 1024px)
- [ ] Vérifier la navigation
- [ ] Vérifier la grille des voyages (2 colonnes)
- [ ] Vérifier la grille des lieux (2 colonnes)

### Mobile
- [ ] Tester sur un écran petit (< 768px)
- [ ] Vérifier le menu hamburger
- [ ] Vérifier la navigation mobile
- [ ] Vérifier la grille des voyages (1 colonne)
- [ ] Vérifier la grille des lieux (1 colonne)
- [ ] Vérifier la lisibilité des formulaires
- [ ] Vérifier la carte interactive

## 8. Gestion des Erreurs

### Erreurs réseau
- [ ] Simuler une erreur réseau (déconnecter internet)
- [ ] Vérifier l'affichage des messages d'erreur
- [ ] Vérifier les error boundaries

### Erreurs de validation
- [ ] Tester avec des données invalides
- [ ] Vérifier les messages d'erreur clairs
- [ ] Vérifier les toasts d'erreur

### Erreurs serveur
- [ ] Vérifier les messages d'erreur 500
- [ ] Vérifier les messages d'erreur 404
- [ ] Vérifier les messages d'erreur 401/403

## 9. Performance

### Chargement
- [ ] Vérifier les skeleton loaders
- [ ] Vérifier l'absence de layout shift
- [ ] Vérifier le chargement rapide des pages

### Pagination
- [ ] Créer un voyage avec plus de 20 lieux
- [ ] Vérifier la pagination
- [ ] Vérifier la navigation entre les pages
- [ ] Vérifier les performances avec beaucoup de lieux

## 10. URLs Réelles

### TikTok
- [ ] Ajouter une source avec une URL TikTok réelle
- [ ] Vérifier que le lien fonctionne

### Instagram
- [ ] Ajouter une source avec une URL Instagram réelle
- [ ] Vérifier que le lien fonctionne

## 11. Cas Limites

### Voyage sans dates
- [ ] Créer un voyage sans dates
- [ ] Vérifier l'affichage "Dates non définies"

### Voyage avec beaucoup de lieux
- [ ] Créer un voyage avec 50+ lieux
- [ ] Vérifier les performances
- [ ] Vérifier la pagination

### Lieux sans coordonnées
- [ ] Créer des lieux sans coordonnées
- [ ] Vérifier qu'ils n'apparaissent pas sur la carte
- [ ] Vérifier qu'ils apparaissent dans la liste

### Jour 0 ou négatif
- [ ] Tester avec jour 0
- [ ] Tester avec jour négatif
- [ ] Vérifier la validation

## Notes

- Tous les tests doivent être effectués dans un navigateur moderne (Chrome, Firefox, Safari, Edge)
- Tester sur différents appareils si possible
- Documenter tout bug ou comportement inattendu
- Vérifier que tous les messages sont en français
- Vérifier l'accessibilité de base (navigation au clavier, contraste des couleurs)

