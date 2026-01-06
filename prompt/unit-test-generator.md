# Unit Test Generator - Prompts de Développement

Ce fichier contient tous les prompts utilisés pour développer l'outil Unit Test Generator.

---

## Phase 1 : Conception et Architecture Multi-Outils

### Prompt 1 : Demande Initiale pour Multi-Outils

**Prompt :**
```
ok, now i would like to build other tools, that using the same interface, style, right side bar ai response generation, at the left side i would like to add menu a vertical menu and each item is a raute to my toolkit element, the react component generator is the first tool, we'll build 5 tools, the second on which we gonna focus is a unit test generator. when i paste a code you have to find out the languaguage and generate the units tests i can run. before you start, give me details step by steps on how you're going to proceed , if you are not sure about 80 percent on a feature ask me for more details or clarifications
```

**Traduction :**
Ok, maintenant je voudrais construire d'autres outils, utilisant la même interface, le même style, la barre latérale droite pour la génération de réponse IA, à gauche je voudrais ajouter un menu vertical et chaque élément est une route vers mon élément de boîte à outils, le générateur de composants React est le premier outil, nous allons construire 5 outils, le second sur lequel nous allons nous concentrer est un générateur de tests unitaires. Quand je colle un code, vous devez identifier la langue et générer les tests unitaires que je peux exécuter. Avant de commencer, donnez-moi des détails étape par étape sur la façon dont vous allez procéder, si vous n'êtes pas sûr à 80% d'une fonctionnalité, demandez-moi plus de détails ou de clarifications.

**Plan proposé :**
- Phase 1: Refactor pour architecture multi-outils (layout partagé, menu sidebar)
- Phase 2: Implémentation du générateur de tests unitaires
- Phase 3: Intégration et polish

**Clarifications demandées :**
1. Frameworks de tests par langage
2. Méthode d'input du code
3. Détection de langage (auto vs manuelle)
4. Exécution des tests
5. Design du menu
6. Les 3 autres outils

### Prompt 2 : Réponses aux Clarifications

**Réponses fournies :**
1. Frameworks : Jest (JS/TS), pytest (Python), JUnit 5 (Java), xUnit (C#), Testing (Go), RSpec (Ruby)
2. Large textarea (Option A)
3. Auto-détection uniquement (Option A)
4. Génération uniquement pour le moment (Option A)
5. Menu collapsible
6. Pas de préférence pour le moment

### Prompt 3 : Début Phase 1

**Prompt :**
```
for rhe moment, only implement phase 1, if everything is ok we'll move to the next one
```

**Traduction :**
Pour le moment, implémentez uniquement la phase 1, si tout est ok nous passerons à la suivante.

**Actions réalisées :**
- Création du composant SharedLayout
- Création du composant SidebarMenu (collapsible)
- Refactor du ComponentGenerator pour utiliser le nouveau layout
- Création des routes pour les 5 outils
- Pages placeholder pour les outils non implémentés

---

## Phase 2 : Implémentation du Générateur de Tests Unitaires

### Prompt 4 : Début Phase 2

**Prompt :**
```
great, start phase 2
```

**Traduction :**
Excellent, commencez la phase 2.

**Actions réalisées :**
- Création de la fonction de détection de langage (pattern-based)
- Création du composant UnitTestGenerator avec textarea
- Ajout des fonctions de génération de tests dans openai.ts et gemini.ts
- Création de l'endpoint API /api/generate-unit-tests
- Mise à jour de la page unit-test-generator

### Prompt 5 : Amélioration de la Détection de Langage

**Prompt :**
```
the language auto detection is not working correctly, you can try in the backend to call the model twice, one for getting the right language and the second to generate the unit tests. what do you think about that
```

**Traduction :**
La détection automatique de la langue ne fonctionne pas correctement, vous pouvez essayer dans le backend d'appeler le modèle deux fois, une pour obtenir la bonne langue et la deuxième pour générer les tests unitaires. Qu'en pensez-vous ?

**Réponse :** Excellente idée ! Utiliser l'IA pour détecter la langue sera beaucoup plus précis que la détection par patterns.

**Actions réalisées :**
- Création de fonctions `detectCodeLanguage()` dans openai.ts et gemini.ts
- Mise à jour de l'API pour d'abord détecter la langue, puis générer les tests
- Envoi du résultat de détection au client via streaming
- Mise à jour du composant pour afficher la détection en temps réel

### Prompt 6 : Affichage de la Détection de Langage

**Prompt :**
```
When there's no content pasted, do not show the language detection, show it only when the model responds
```

**Traduction :**
Quand il n'y a pas de contenu collé, ne montrez pas la détection de langue, montrez-la uniquement quand le modèle répond.

**Actions réalisées :**
- Suppression de la détection preview pendant la saisie
- Affichage uniquement après la réponse du modèle
- Ajout d'un spinner "Detecting language..." pendant la détection
- Nettoyage de l'état lors du changement de code

---

## Phase 3 : Corrections et Améliorations

### Prompt 7 : Correction d'Erreur Hydration

**Prompt :**
```
i have this issue in the browser, can you fix it before we move on: [Error Type: Console Error - Hydration Mismatch]
```

**Traduction :**
J'ai ce problème dans le navigateur, pouvez-vous le corriger avant de continuer : [Type d'erreur : Erreur de console - Hydration Mismatch]

**Actions réalisées :**
- Correction du problème d'hydratation dans SidebarMenu
- Ajout d'un état `mounted` pour synchroniser le rendu serveur/client
- Utilisation de `suppressHydrationWarning` pour les éléments modifiés par les extensions de navigateur
- Garantie d'un rendu initial cohérent entre serveur et client

---

## Détails Techniques Implémentés

### Détection de Langage par IA

**Système de prompts pour la détection :**
- Analyse du code fourni (jusqu'à 1000 caractères)
- Détection des langages supportés : JavaScript, TypeScript, Python, Java, C#, Go, Ruby
- Retour JSON avec : language, framework, displayName
- Utilisation de température basse (0.1) pour plus de précision

### Génération de Tests Unitaires

**Système de prompts pour la génération :**
- Instructions spécifiques par framework (Jest, pytest, JUnit 5, xUnit, Testing, RSpec)
- Génération de tests complets et exécutables
- Couverture des cas limites et gestion d'erreurs
- Streaming en temps réel des tests générés

### Frameworks Supportés

- **JavaScript/TypeScript** : Jest
- **Python** : pytest
- **Java** : JUnit 5
- **C#** : xUnit
- **Go** : Testing package
- **Ruby** : RSpec

### Limitations de Sécurité

- Limite de 1000 tokens pour la génération de tests
- Validation des entrées
- Gestion des erreurs de détection de langage
- Arrêt automatique si limite atteinte

---

## État Final

L'outil Unit Test Generator est maintenant complètement fonctionnel avec :
- Détection automatique de langage par IA
- Génération de tests unitaires avec frameworks appropriés
- Interface cohérente avec le reste de la boîte à outils
- Streaming en temps réel des résultats
- Gestion d'erreurs robuste

