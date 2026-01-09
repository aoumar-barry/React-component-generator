# AI Toolkit - Documentation

## Vue d'ensemble

AI Toolkit est une collection d'outils basés sur l'IA pour aider les développeurs dans leurs tâches quotidiennes. Chaque outil utilise OpenAI GPT-4o-mini ou Google Gemini pour générer du code, optimiser des requêtes, ou fournir des solutions.

**Application en ligne :** [https://react-component-generator-roan.vercel.app](https://react-component-generator-roan.vercel.app)

## Outils Disponibles

### 1. React Component Generator
**Lien :** [https://react-component-generator-roan.vercel.app/](https://react-component-generator-roan.vercel.app/)

**Route :** `/`

Générateur de composants React TypeScript à partir de descriptions en langage naturel.

**Documentation :** [docs/react-component-generator.md](./docs/react-component-generator.md)

**Fonctionnalités :**
- Génération de composants React/TypeScript prêts pour la production
- Support OpenAI (GPT-4o-mini) et Gemini
- Streaming en temps réel
- Validation des requêtes (70% de pertinence)
- Limite de sécurité : 1000 tokens

---

### 2. Unit Test Generator
**Lien :** [https://react-component-generator-roan.vercel.app/unit-test-generator](https://react-component-generator-roan.vercel.app/unit-test-generator)

**Route :** `/unit-test-generator`

Générateur de tests unitaires pour différents langages de programmation avec détection automatique de langage.

**Documentation :** [docs/unit-test-generator.md](./docs/unit-test-generator.md)

**Fonctionnalités :**
- Détection automatique de langage par IA
- Génération de tests avec frameworks appropriés
- Support de 6 langages : JavaScript/TypeScript, Python, Java, C#, Go, Ruby
- Streaming en temps réel
- Limite de sécurité : 1000 tokens

---

### 3. SQL Query Optimizer
**Lien :** [https://react-component-generator-roan.vercel.app/tool-3](https://react-component-generator-roan.vercel.app/tool-3)

**Route :** `/tool-3`

Optimiseur de requêtes SQL avec explications détaillées des optimisations appliquées.

**Documentation :** [docs/sql-query-optimizer.md](./docs/sql-query-optimizer.md)

**Fonctionnalités :**
- Optimisation de requêtes SQL
- Explications markdown en streaming
- Affichage de la requête originale et optimisée
- Support OpenAI (GPT-4o-mini) et Gemini
- Validation des requêtes (70% de pertinence)
- Limite de sécurité : 1500 tokens

---

### 4. Dockerfile Generator
**Lien :** [https://react-component-generator-roan.vercel.app/dockerfile-generator](https://react-component-generator-roan.vercel.app/dockerfile-generator)

**Route :** `/dockerfile-generator`

Générateur de Dockerfiles optimisés pour tous types d'applications.

**Documentation :** [docs/dockerfile-generator.md](./docs/dockerfile-generator.md)

**Fonctionnalités :**
- Génération de Dockerfiles optimisés
- Support de tous types d'applications (Node.js, Python, Java, Go, etc.)
- Optimisations : multi-stage builds, sécurité, cache
- Support OpenAI (GPT-4o-mini) et Gemini
- Validation des requêtes (70% de pertinence)
- Limite de sécurité : 200 tokens

---

### 5. Network Troubleshooting Assistant
**Lien :** [https://react-component-generator-roan.vercel.app/network-troubleshooting](https://react-component-generator-roan.vercel.app/network-troubleshooting)

**Route :** `/network-troubleshooting`

Assistant de dépannage réseau qui génère des guides complets avec commandes et explications.

**Documentation :** [docs/network-troubleshooting-assistant.md](./docs/network-troubleshooting-assistant.md)

**Fonctionnalités :**
- Diagnostic de problèmes réseau
- Génération de commandes réseau exécutables
- Explications étape par étape
- Support de tous types de problèmes réseau
- Détection automatique et extraction de code
- Support OpenAI (GPT-4o-mini) et Gemini
- Validation des requêtes (50% de pertinence)
- Limite de sécurité : 2000 tokens

---

## Installation Locale

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

---

## Stack Technologique

- **Framework** : Next.js 16+ (App Router)
- **Langage** : TypeScript
- **Styling** : Tailwind CSS
- **Fournisseurs IA** : OpenAI SDK, Google Gemini SDK
- **Coloration syntaxique** : react-syntax-highlighter

---

## Caractéristiques Communes

Tous les outils partagent :
- Interface moderne avec thème sombre
- Menu sidebar collapsible pour navigation
- Support de deux fournisseurs IA (OpenAI et Gemini)
- Streaming en temps réel des réponses
- Validation des requêtes par IA
- Limites de sécurité (tokens)
- Gestion d'erreurs robuste
- Design cohérent et responsive

---

## Crédits

Ce projet a été réalisé par :

- **Alpha Oumar BARRY**
- **Soumaila COULIBALY**

