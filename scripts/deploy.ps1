# Script d'aide au déploiement TripTok
# Ce script vous aide à préparer votre déploiement

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TripTok - Script de Déploiement" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que nous sommes dans le bon répertoire
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erreur: package.json introuvable. Exécutez ce script depuis la racine du projet." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Répertoire du projet détecté" -ForegroundColor Green
Write-Host ""

# Menu
Write-Host "Que souhaitez-vous faire ?" -ForegroundColor Yellow
Write-Host "1. Générer un NEXTAUTH_SECRET" -ForegroundColor White
Write-Host "2. Vérifier le build" -ForegroundColor White
Write-Host "3. Préparer les migrations" -ForegroundColor White
Write-Host "4. Vérifier les fichiers de configuration" -ForegroundColor White
Write-Host "5. Tout vérifier" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Votre choix (1-5)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Génération de NEXTAUTH_SECRET..." -ForegroundColor Yellow
        $secret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
        Write-Host ""
        Write-Host "✅ NEXTAUTH_SECRET généré :" -ForegroundColor Green
        Write-Host $secret -ForegroundColor Cyan
        Write-Host ""
        Write-Host "⚠️  Copiez cette valeur et ajoutez-la dans les variables d'environnement Vercel" -ForegroundColor Yellow
    }
    "2" {
        Write-Host ""
        Write-Host "Vérification du build..." -ForegroundColor Yellow
        npm run build
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Build réussi !" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "❌ Erreur lors du build" -ForegroundColor Red
        }
    }
    "3" {
        Write-Host ""
        Write-Host "Préparation des migrations..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Pour exécuter les migrations en production, vous aurez besoin de :" -ForegroundColor White
        Write-Host "1. La variable DATABASE_URL de votre base de production" -ForegroundColor White
        Write-Host "2. Exécuter : npx prisma migrate deploy" -ForegroundColor White
        Write-Host ""
        Write-Host "Ou utilisez Vercel CLI :" -ForegroundColor Yellow
        Write-Host "  vercel env pull .env.production" -ForegroundColor Cyan
        Write-Host "  npx prisma migrate deploy" -ForegroundColor Cyan
    }
    "4" {
        Write-Host ""
        Write-Host "Vérification des fichiers de configuration..." -ForegroundColor Yellow
        Write-Host ""
        
        $files = @(
            @{Name="vercel.json"; Path="vercel.json"},
            @{Name="package.json"; Path="package.json"},
            @{Name="next.config.js"; Path="next.config.js"},
            @{Name="prisma/schema.prisma"; Path="prisma/schema.prisma"}
        )
        
        $allOk = $true
        foreach ($file in $files) {
            if (Test-Path $file.Path) {
                Write-Host "✅ $($file.Name) trouvé" -ForegroundColor Green
            } else {
                Write-Host "❌ $($file.Name) manquant" -ForegroundColor Red
                $allOk = $false
            }
        }
        
        if ($allOk) {
            Write-Host ""
            Write-Host "✅ Tous les fichiers de configuration sont présents" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "❌ Certains fichiers manquent" -ForegroundColor Red
        }
    }
    "5" {
        Write-Host ""
        Write-Host "Vérification complète..." -ForegroundColor Yellow
        Write-Host ""
        
        # Vérifier les fichiers
        Write-Host "1. Vérification des fichiers..." -ForegroundColor Cyan
        $files = @("vercel.json", "package.json", "next.config.js", "prisma/schema.prisma")
        $allOk = $true
        foreach ($file in $files) {
            if (Test-Path $file) {
                Write-Host "   ✅ $file" -ForegroundColor Green
            } else {
                Write-Host "   ❌ $file manquant" -ForegroundColor Red
                $allOk = $false
            }
        }
        
        # Vérifier le build
        Write-Host ""
        Write-Host "2. Vérification du build..." -ForegroundColor Cyan
        $buildOk = $false
        try {
            npm run build 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   ✅ Build réussi" -ForegroundColor Green
                $buildOk = $true
            } else {
                Write-Host "   ❌ Build échoué" -ForegroundColor Red
            }
        } catch {
            Write-Host "   ❌ Erreur lors du build" -ForegroundColor Red
        }
        
        # Générer un secret
        Write-Host ""
        Write-Host "3. Génération d'un NEXTAUTH_SECRET..." -ForegroundColor Cyan
        $secret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
        Write-Host "   ✅ Secret généré : $secret" -ForegroundColor Green
        
        # Résumé
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        if ($allOk -and $buildOk) {
            Write-Host "✅ Tout est prêt pour le déploiement !" -ForegroundColor Green
            Write-Host ""
            Write-Host "Prochaines étapes :" -ForegroundColor Yellow
            Write-Host "1. Poussez votre code sur GitHub" -ForegroundColor White
            Write-Host "2. Créez un projet sur Vercel" -ForegroundColor White
            Write-Host "3. Configurez les variables d'environnement" -ForegroundColor White
            Write-Host "4. Déployez !" -ForegroundColor White
        } else {
            Write-Host "⚠️  Certaines vérifications ont échoué" -ForegroundColor Yellow
        }
        Write-Host "========================================" -ForegroundColor Cyan
    }
    default {
        Write-Host ""
        Write-Host "❌ Choix invalide" -ForegroundColor Red
    }
}

Write-Host ""

