# React Component Generator - Prompts de Développement

Ce fichier contient tous les prompts utilisés pour développer l'outil React Component Generator.

## Phase 1 : Conception Initiale

### Prompt 1 : Demande Initiale

**Prompt :**
```
Give me a very detailled plan on how to build a web app with no authentication where a user can describe a react component and get the code of that component. he'll be able to copy by clicking on the icon the entire generated code. if you're not sure about 90% of how to proceed on a feature ask me for more details or clarifications
```

**Traduction :**
Donnez-moi un plan très détaillé sur la façon de construire une application web sans authentification où un utilisateur peut décrire un composant React et obtenir le code de ce composant. Il pourra copier en cliquant sur l'icône tout le code généré. Si vous n'êtes pas sûr à 90% de la façon de procéder sur une fonctionnalité, demandez-moi plus de détails ou de clarifications.

**Clarifications demandées :**
- Méthode de génération (OpenAI, Gemini, etc.)
- Stack technologique
- Styling
- UI/UX
- Fonctionnalités supplémentaires
- Backend vs Frontend
- Choix du fournisseur IA

### Prompt 2 : Réponses aux Clarifications

**Réponses fournies :**
1. J'ai des clés OpenAI et Gemini
2. Choisir le meilleur langage qui convient avec Next.js (TypeScript)
3. Je suis ok (pour Tailwind CSS)
4. Textarea unique, page unique avec design moderne
5. On va s'en tenir à l'affichage de l'aperçu et à la coloration syntaxique pour le moment
6. Faire ce qui est le meilleur selon les standards de l'industrie (backend avec API routes)
7. Utiliser les deux fournisseurs

---

## Phase 2 : Planification

### Prompt 3 : Guide Étape par Étape

**Prompt :**
```
now give me the steps by steps overview on how to build it from the beginning to the end so i can validate and follow along before we start
```

**Traduction :**
Maintenant, donnez-moi un aperçu étape par étape de la façon de le construire du début à la fin afin que je puisse valider et suivre avant de commencer.

**Résultat :** Création du guide STEP_BY_STEP_GUIDE.md avec 12 étapes détaillées.

### Prompt 4 : Début de l'Implémentation

**Prompt :**
```
ok you can start from step 1 to step 6
```

**Traduction :**
Ok, vous pouvez commencer de l'étape 1 à l'étape 6.

**Actions réalisées :**
- Initialisation du projet Next.js
- Installation des dépendances
- Configuration des variables d'environnement
- Création des définitions de types
- Création des bibliothèques clientes IA (OpenAI et Gemini)
- Création de la route API

---

## Phase 3 : Interface Utilisateur

### Prompt 5 : Implémentation de l'UI

**Prompt :**
```
implement step 7 so i can run the app and test the ui a little bit
```

**Traduction :**
Implémentez l'étape 7 pour que je puisse exécuter l'application et tester l'UI un peu.

**Actions réalisées :**
- Création de tous les composants UI
- ProviderToggle
- CopyButton
- CodeDisplay
- ComponentGenerator
- Mise à jour de la page principale

### Prompt 6 : Corrections de Configuration

**Prompts de correction :**
- Correction de l'erreur Tailwind CSS (downgrade vers v3)
- Correction de l'erreur de format de module (suppression de "type: commonjs")

---

## Phase 4 : Améliorations UX

### Prompt 7 : Loader

**Prompt :**
```
i would like a tiny loader that shows aside because i can the response to be streamed so i get to set what's generate by the model
```

**Traduction :**
Je voudrais un petit loader qui s'affiche sur le côté car je peux faire en sorte que la réponse soit diffusée en continu, donc je peux voir ce qui est généré par le modèle.

**Actions réalisées :**
- Implémentation du streaming
- Ajout d'un petit loader dans l'en-tête
- Affichage du code en temps réel

### Prompt 8 : Aperçu du Composant

**Prompt :**
```
now i want you to work on the preview of the generated component so i can see and test it right away
```

**Traduction :**
Maintenant, je veux que vous travailliez sur l'aperçu du composant généré pour que je puisse le voir et le tester immédiatement.

**Actions réalisées :**
- Amélioration du composant de prévisualisation
- Gestion des erreurs TypeScript
- Suppression des interfaces et types TypeScript

### Prompt 9 : Suppression de l'Aperçu

**Prompt :**
```
you can remove the live preview feature
```

**Traduction :**
Vous pouvez supprimer la fonctionnalité d'aperçu en direct.

**Actions réalisées :**
- Suppression du composant ComponentPreview
- Mise à jour de la mise en page pour afficher uniquement le code

---

## Phase 5 : Design

### Prompt 10 : Nouveau Design

**Prompt :**
```
i would like the interface to look like this image
```

**Traduction :**
Je voudrais que l'interface ressemble à cette image.

**Actions réalisées :**
- Redesign complet avec thème sombre
- Mise en page centrée
- Barre de saisie moderne
- Boutons stylisés

### Prompt 11 : Modifications de Design

**Prompts :**
- "replace this text 'What are you working on?' by 'react component generator'"
- "make each first letter in the words uppercase"
- "double the font-size of the text"
- "the text 'react component Generation' must be bold and centered with the textarea horizontally and vertically with 80% of the left side width"
- "remove the mic icon in the textarea"
- "the openai and openai should be a dropdown and must be at the place of the plus icon. the default value selected will be openai"

**Traduction :**
- Remplacer le texte "What are you working on?" par "react component generator"
- Mettre chaque première lettre des mots en majuscule
- Doubler la taille de la police du texte
- Le texte "react component Generation" doit être en gras et centré avec le textarea horizontalement et verticalement avec 80% de la largeur du côté gauche
- Supprimer l'icône du micro dans le textarea
- OpenAI et Gemini doivent être un menu déroulant et doivent être à la place de l'icône plus. La valeur par défaut sélectionnée sera OpenAI

---

## Phase 6 : Layout et Transitions

### Prompt 12 : Layout Split

**Prompt :**
```
when i click on the generate butotn i woudl like the generated code to be at the right of the page with 30% width. if it's not splitted yet there should be a really nice and modern transition to guide the user to look at the right for the transition
```

**Traduction :**
Quand je clique sur le bouton générer, je voudrais que le code généré soit à droite de la page avec 30% de largeur. S'il n'est pas encore divisé, il devrait y avoir une transition vraiment belle et moderne pour guider l'utilisateur à regarder à droite pour la transition.

**Actions réalisées :**
- Mise en page split (70% gauche, 30% droite)
- Animation de transition
- Guide d'attention avec flèche
- Affichage du code à droite

---

## Phase 7 : Validation et Sécurité

### Prompt 13 : Validation des Requêtes

**Prompt :**
```
now we gonna add a little bit of precaution, before generating the code we gonna ask the model to check if the question is related to react compoment, if yes the model can proceed and generate the corresponding code, and if not the model can just respond with an appropiate answer and letting the user know what we can generate with this app
```

**Traduction :**
Maintenant, nous allons ajouter un peu de précaution, avant de générer le code, nous allons demander au modèle de vérifier si la question est liée à un composant React, si oui le modèle peut procéder et générer le code correspondant, et si non le modèle peut simplement répondre avec une réponse appropriée et informer l'utilisateur de ce que nous pouvons générer avec cette application.

**Actions réalisées :**
- Fonction de validation
- Vérification de la pertinence (70%)
- Génération de réponses utiles pour les requêtes non valides

### Prompt 14 : Réponse du Modèle

**Prompt :**
```
instead of having that helpful message, i would like to get a response form the model itself
```

**Traduction :**
Au lieu d'avoir ce message utile, je voudrais obtenir une réponse du modèle lui-même.

**Actions réalisées :**
- Génération de réponses par le modèle au lieu de messages statiques
- Streaming des réponses utiles

### Prompt 15 : Seuil de Validation

**Prompt :**
```
i would like the model to do a check if the question is not about 70% about react component generation, it should respond by letting the user know that he can only genrate react component
```

**Traduction :**
Je voudrais que le modèle vérifie si la question n'est pas à 70% sur la génération de composants React, il devrait répondre en informant l'utilisateur qu'il ne peut générer que des composants React.

**Actions réalisées :**
- Seuil de validation à 70%
- Messages directs pour les requêtes non valides

---

## Phase 8 : Sécurité et Limites

### Prompt 16 : Limite de Tokens

**Prompt :**
```
ok great we gonna add a security measre you can not genenrate more than 50 tokens. that's the limit. if you reach it just stop streaming and let the user know that
```

**Traduction :**
Ok, nous allons ajouter une mesure de sécurité : vous ne pouvez pas générer plus de 50 tokens. C'est la limite. Si vous l'atteignez, arrêtez simplement le streaming et informez l'utilisateur.

**Actions réalisées :**
- Limite de 50 tokens (plus tard changée à 1000)
- Arrêt automatique du streaming
- Notification à l'utilisateur

### Prompt 17 : Message de Fade-Out

**Prompt :**
```
ok it's stop when it reaches 50 tokens, i would like a fade out message that let the user know. the message should last for 10 seconds
```

**Traduction :**
Ok, ça s'arrête quand il atteint 50 tokens, je voudrais un message de fondu qui informe l'utilisateur. Le message devrait durer 10 secondes.

**Actions réalisées :**
- Message de fade-out
- Animation de 10 secondes
- Positionnement dans l'interface

### Prompt 18 : Position du Message

**Prompts :**
- "the message shoudl appear on the bottom right of the right side section with a 20 px margin-bottom"
- "the fade out message must be at the right side or the right section"
- "no it shoudl appear at the bottom-right of the right section with a margin bottom of 20px"
- "remove the fade out message and the fixed message error in the right section and only conserve the one in the left section"

**Traduction :**
- Le message devrait apparaître en bas à droite de la section de droite avec une marge inférieure de 20 px
- Le message de fondu doit être sur le côté droit ou la section de droite
- Non, il devrait apparaître en bas à droite de la section de droite avec une marge inférieure de 20px
- Supprimer le message de fondu et le message d'erreur fixe dans la section de droite et ne conserver que celui de la section de gauche

### Prompt 19 : Augmentation de la Limite

**Prompt :**
```
ok great now set the max token to 1000
```

**Traduction :**
Ok, maintenant définissez le token maximum à 1000.

**Actions réalisées :**
- Changement de la limite de 50 à 1000 tokens
- Mise à jour des messages d'erreur

---

## Phase 9 : Configuration et Modèle

### Prompt 20 : Modèle OpenAI

**Prompt :**
```
which model are you calling for the openai
```

**Traduction :**
Quel modèle appelez-vous pour OpenAI ?

**Réponse :** GPT-4-turbo-preview (plus tard changé en gpt-4o-mini)

### Prompt 21 : Changement de Modèle

**Prompt :**
```
i would like you to use gpt-4o-mini
```

**Traduction :**
Je voudrais que vous utilisiez gpt-4o-mini.

**Actions réalisées :**
- Changement de tous les appels OpenAI vers gpt-4o-mini

---




