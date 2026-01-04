# React Component Generator - Documentation

## Vue d'ensemble

React Component Generator est une application web qui utilise l'IA pour générer des composants React à partir de descriptions en langage naturel. L'utilisateur décrit un composant et l'application génère du code React TypeScript prêt pour la production en temps réel.

## Fonctionnalités

- **Génération par IA** : Supporte OpenAI GPT-4o-mini et Google Gemini
- **Streaming en temps réel** : Le code est diffusé au fur et à mesure de sa génération
- **Validation des requêtes** : Vérifie que les requêtes sont à 70%+ liées aux composants React
- **Sécurité** : Limite de 1000 tokens par génération
- **Interface moderne** : Thème sombre avec mise en page en deux colonnes

## Stack technologique

- **Framework** : Next.js 16+ (App Router)
- **Langage** : TypeScript
- **Styling** : Tailwind CSS
- **Fournisseurs IA** : OpenAI SDK, Google Gemini SDK
- **Coloration syntaxique** : react-syntax-highlighter

## Installation

1. **Installer les dépendances**
   ```bash
   npm install
   ```

2. **Créer `.env.local`**
   ```env
   OPENAI_API_KEY=votre_cle_ici
   GEMINI_API_KEY=votre_cle_ici
   ```

3. **Lancer le serveur de développement**
   ```bash
   npm run dev
   ```

4. **Ouvrir le navigateur**
   Naviguer vers `http://localhost:3000`

## Structure du projet

```
src/
├── app/
│   ├── api/generate/route.ts    # Point d'API
│   ├── page.tsx                 # Page principale
│   └── globals.css              # Styles
├── components/
│   ├── ComponentGenerator.tsx   # Composant principal
│   ├── CodeDisplay.tsx          # Affichage du code
│   └── CopyButton.tsx           # Fonctionnalité de copie
├── lib/
│   ├── openai.ts                # Intégration OpenAI
│   └── gemini.ts                # Intégration Gemini
└── types/
    └── index.ts                 # Définitions de types
```

## Point d'API

### POST `/api/generate`

**Requête :**
```json
{
  "description": "string",
  "provider": "openai" | "gemini"
}
```

**Réponse :** Flux Server-Sent Events avec des morceaux de code

## Fonctionnalités de sécurité

1. **Limitation de tokens** : Maximum 1000 tokens par génération
2. **Validation des requêtes** : Seuil de pertinence de 70% pour les composants React
3. **Protection des clés API** : Clés stockées uniquement côté serveur

## Utilisation

1. Sélectionner le fournisseur IA (OpenAI ou Gemini)
2. Entrer la description du composant
3. Cliquer sur générer ou appuyer sur Entrée
4. Le code apparaît en temps réel dans le panneau de droite
5. Cliquer sur le bouton de copie pour copier le code

## Configuration

- **Limite de tokens** : 1000 tokens (configurable dans `src/lib/openai.ts` et `src/lib/gemini.ts`)
- **Seuil de validation** : 70% (configurable dans les prompts de validation)
- **Modèles IA** : GPT-4o-mini (OpenAI), Gemini Pro (Gemini)

## Gestion des erreurs

- Erreurs de validation : Affichées lorsque la requête n'est pas liée à React
- Limite de tokens : Arrête la génération à 1000 tokens
- Erreurs API : Affichées avec des messages utiles
