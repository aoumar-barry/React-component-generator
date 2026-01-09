# Dockerfile Generator - Prompts de Développement

Ce fichier contient tous les prompts utilisés pour développer l'outil Dockerfile Generator.

---

## Phase 1 : Conception et Planification

### Prompt 1 : Demande Initiale

**Prompt :**
```
You're an expert in network and system administration, your goal is to build aan optimized dockerfile generator. before you start implementing the code, i want you to give the step by step details on how to build it. if you're not sure about 70% on a feature ask for more details or clarifications. For intel, use the same styles and behavior as the reac-componenet-generator
```

**Traduction :**
Vous êtes un expert en administration réseau et système, votre objectif est de construire un générateur de Dockerfile optimisé. Avant de commencer à implémenter le code, je veux que vous donniez les détails étape par étape sur la façon de le construire. Si vous n'êtes pas sûr à 70% d'une fonctionnalité, demandez plus de détails ou de clarifications. Pour référence, utilisez les mêmes styles et comportements que le générateur de composants React.

**Plan proposé :**
- Phase 1: Préparation et structure de fichiers
- Phase 2: Implémentation des fonctions backend (validation, génération, réponse utile)
- Phase 3: Création de la route API
- Phase 4: Création du composant DockerfileGenerator avec layout identique
- Phase 5: Création de la page Next.js
- Phase 6: Mise à jour du menu sidebar et tests

**Clarifications demandées :**
1. Types d'applications supportés (tous types ou spécifiques ?)
2. Niveau de détail dans la description (simple ou détaillé ?)
3. Fichiers supplémentaires (.dockerignore, docker-compose.yml ?)
4. Optimisations spécifiques à prioriser
5. Seuil de validation (70% approprié ?)
6. Limite de tokens (1000 suffisant pour Dockerfiles complets ?)

### Prompt 2 : Réponses aux Clarifications

**Prompt :**
```
1. tout types d'applications, 2. niveau de détails simple, 3. pas de fichiers supplementaire, 4. choisi la meilleure option. 5. le seuil de 70% est idéal. 6. 200 tokens maximum
```

**Traduction :**
1. Tous types d'applications, 2. Niveau de détails simple, 3. Pas de fichiers supplémentaires, 4. Choisir la meilleure option. 5. Le seuil de 70% est idéal. 6. 200 tokens maximum

**Actions réalisées :**
- Ajustement de la limite de tokens à 200 (au lieu de 1000)
- Focus sur les optimisations essentielles (multi-stage quand bénéfique, sécurité, cache)
- Support de tous les types d'applications
- Description simple acceptée
- Pas de génération de fichiers supplémentaires
- Implémentation complète de l'outil avec ces spécifications

---

## Phase 2 : Documentation

### Prompt 3 : Génération des Prompts

**Prompt :**
```
great, now you have to generate the prompts used to build this app, look at the /prompt folder as follow the same style as the other tools
```

**Traduction :**
Excellent, maintenant vous devez générer les prompts utilisés pour construire cette application, regardez le dossier /prompt et suivez le même style que les autres outils.

**Actions réalisées :**
- Création du fichier `prompt/dockerfile-generator.md`
- Documentation de tous les prompts utilisés
- Mise à jour du `prompt/README.md`

---

## État Final

L'outil Dockerfile Generator est maintenant complètement fonctionnel avec :
- ✅ Layout identique au React Component Generator
- ✅ Validation des requêtes Dockerfile par IA (70% threshold)
- ✅ Génération de Dockerfiles optimisés en streaming
- ✅ Support de tous les types d'applications
- ✅ Génération de réponses utiles pour requêtes non valides
- ✅ Bouton collapse/expand pour agrandir le panneau de code
- ✅ Input qui se vide après soumission
- ✅ Guide d'attention avec animation
- ✅ Gestion d'erreurs robuste
- ✅ Support OpenAI et Gemini
- ✅ Limites de sécurité (200 tokens)
- ✅ Interface cohérente avec les autres outils
- ✅ Intégration dans le menu sidebar

---

## Notes

- La limite de 200 tokens est plus restrictive que les autres outils (1000 tokens) car les Dockerfiles peuvent être générés de manière concise
- Le support de "dockerfile" dans `CodeDisplay` utilise `react-syntax-highlighter` avec Prism, qui devrait supporter ce langage
- Si le highlight syntaxique ne fonctionne pas, on peut utiliser "docker" ou "bash" comme alternative
- Les optimisations sont appliquées intelligemment (multi-stage seulement quand bénéfique, etc.)
