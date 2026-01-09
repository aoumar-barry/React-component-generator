# Prompts de Développement

Ce dossier contient tous les prompts utilisés pour développer chaque outil de l'application AI Toolkit, depuis le début jusqu'à l'état actuel.

## Structure

Les prompts sont organisés par outil dans des fichiers séparés, montrant l'évolution de chaque fonctionnalité étape par étape.

## Outils Disponibles

### 1. React Component Generator
📁 [react-component-generator.md](./react-component-generator.md)

Générateur de composants React avec TypeScript à partir de descriptions en langage naturel.

**Fonctionnalités :**
- Génération de composants React/TypeScript
- Support OpenAI et Gemini
- Validation des requêtes (70% de pertinence)
- Streaming en temps réel
- Limite de sécurité (1000 tokens)

### 2. Unit Test Generator
📁 [unit-test-generator.md](./unit-test-generator.md)

Générateur de tests unitaires pour différents langages de programmation.

**Fonctionnalités :**
- Détection automatique de langage par IA
- Génération de tests avec frameworks appropriés
- Support de 6 langages : JS/TS, Python, Java, C#, Go, Ruby
- Streaming en temps réel
- Interface cohérente avec la boîte à outils

### 3. SQL Query Optimizer
📁 [sql-query-optimizer.md](./sql-query-optimizer.md)

Optimiseur de requêtes SQL avec explications détaillées.

**Fonctionnalités :**
- Optimisation de requêtes SQL
- Explications markdown en streaming
- Support OpenAI et Gemini
- Validation des requêtes (70% de pertinence)
- Streaming en temps réel
- Limite de sécurité (1500 tokens)

### 4. Dockerfile Generator
📁 [dockerfile-generator.md](./dockerfile-generator.md)

Générateur de Dockerfiles optimisés pour tous types d'applications.

**Fonctionnalités :**
- Génération de Dockerfiles optimisés
- Support de tous types d'applications (Node.js, Python, Java, Go, etc.)
- Optimisations : multi-stage builds, sécurité, cache
- Support OpenAI et Gemini
- Validation des requêtes (70% de pertinence)
- Streaming en temps réel
- Limite de sécurité (200 tokens)

### 5. Tool 5
🚧 À venir

---

## Format des Fichiers

Chaque fichier de prompts suit la même structure :

1. **Titre et Description** : Vue d'ensemble de l'outil
2. **Phases de Développement** : Organisation chronologique
3. **Prompts Détaillés** : Chaque prompt avec :
   - Le prompt original
   - La traduction (si nécessaire)
   - Les actions réalisées
   - Les résultats
4. **Détails Techniques** : Implémentations spécifiques
5. **État Final** : Récapitulatif des fonctionnalités

---

## Utilisation

Ces fichiers servent de documentation pour :
- Comprendre l'évolution de chaque outil
- Référencer les décisions de conception
- Maintenir la cohérence entre les outils
- Faciliter l'ajout de nouveaux outils

---

## Notes

- Les prompts sont documentés dans leur langue originale (anglais/français)
- Les traductions sont fournies pour faciliter la compréhension
- Les actions réalisées sont décrites de manière détaillée
- Les phases sont numérotées pour suivre la progression



