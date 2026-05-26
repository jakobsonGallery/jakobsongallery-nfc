# Jakobson NFC — Certificats d'authenticité

Système NFC connecté à Airtable pour afficher les certificats d'œuvres d'art.

## Déploiement sur Vercel (gratuit)

### 1. Créer un compte GitHub
Allez sur https://github.com et créez un compte gratuit.

### 2. Créer un nouveau repository
- Cliquez sur "New repository"
- Nom : `jakobson-nfc`
- Privé ou public (au choix)
- Uploadez tous les fichiers de ce dossier

### 3. Créer un compte Vercel
Allez sur https://vercel.com et connectez-vous avec GitHub.

### 4. Importer le projet
- "Add New Project" → sélectionnez `jakobson-nfc`
- Cliquez "Deploy"

### 5. Ajouter la clé API Airtable
Dans Vercel → Settings → Environment Variables, ajoutez :
- Nom : `AIRTABLE_API_KEY`
- Valeur : votre token Airtable (https://airtable.com/create/tokens)

### 6. Redéployez
Settings → Deployments → Redeploy

## Utilisation

Chaque œuvre a une URL unique :
```
https://votre-projet.vercel.app/oeuvre/recXXXXXXXXXXXXXX
```

Programmez cette URL sur votre tag NFC avec l'app NFC Tools.

## Structure du projet

```
jakobson-nfc/
├── api/
│   └── oeuvre.js       ← API qui lit Airtable
├── public/
│   └── index.html      ← Page certificat vue par le client
├── vercel.json         ← Configuration Vercel
└── package.json
```
