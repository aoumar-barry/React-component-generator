# Network Troubleshooting Assistant - Prompts de Développement

Ce fichier contient tous les prompts utilisés pour développer l'outil Network Troubleshooting Assistant.

---

## Phase 1 : Conception et Planification

### Prompt 1 : Demande Initiale

**Prompt :**
```
You are an expert in network and system administration, your goal is to build a network troubleshooting assistant as the 5th tool in the toolkit. You have to start with a very details steps on how to build the tool. if you're not sure about 70% on a feature, ask for more details or clarifications. For intel the interface ( design and behavior) must be same as the sql query optimizer tool without the 30% section at the right
```

**Traduction :**
Vous êtes un expert en administration réseau et système, votre objectif est de construire un assistant de dépannage réseau comme 5ème outil dans la boîte à outils. Vous devez commencer par des étapes très détaillées sur la façon de construire l'outil. Si vous n'êtes pas sûr à 70% d'une fonctionnalité, demandez plus de détails ou de clarifications. Pour référence, l'interface (design et comportement) doit être identique à l'outil SQL Query Optimizer sans la section 30% à droite.

**Plan proposé :**
- Phase 1: Architecture et structure de base
- Phase 2: Implémentation des fonctions backend (validation, génération, réponse utile)
- Phase 3: Interface utilisateur avec layout 100% (sans section droite)
- Phase 4: Streaming et gestion des réponses
- Phase 5: Tests et validation

**Clarifications demandées :**
1. Types de problèmes réseau à traiter (connectivité, latence, configuration, ports, pare-feu, tous ?)
2. Format d'entrée (description textuelle, commandes réseau, IP/domaine, tous ?)
3. Format de sortie (diagnostic, commandes, explications, solutions, tous ?)
4. Seuil de validation (70% comme les autres outils ?)
5. Limite de tokens (1000, 1500, 200, autre ?)
6. Comportement spécifique (générer des commandes réelles ou seulement explications ?)

### Prompt 2 : Réponses aux Clarifications

**Prompt :**
```
1. tous les types de problèmes, 2. toute sorte de description/entrée, 3. tous les types qui sont nécessaires, 4. 50% de seuil, 5. 2000 tokens maximum, 6. tous les deux,
```

**Traduction :**
1. Tous les types de problèmes, 2. Toute sorte de description/entrée, 3. Tous les types qui sont nécessaires, 4. 50% de seuil, 5. 2000 tokens maximum, 6. Tous les deux (commandes réelles ET explications).

**Actions réalisées :**
- Ajustement du seuil de validation à 50% (plus permissif que les autres outils)
- Limite de tokens fixée à 2000 (plus élevée que les autres outils pour permettre des guides complets)
- Support de tous les types de problèmes réseau
- Acceptation de toute forme d'entrée (description, commandes, IP, etc.)
- Génération de commandes réelles ET d'explications détaillées
- Layout 100% à gauche (sans section droite initialement)

---

## Phase 2 : Implémentation Backend

### Prompt 3 : Début de l'Implémentation

**Prompt :**
```
(Implémentation automatique après les clarifications)
```

**Actions réalisées :**
- Création de la page Next.js `src/app/network-troubleshooting/page.tsx`
- Ajout de l'entrée "Network Troubleshooting" dans le SidebarMenu avec icône WiFi
- Création du composant `NetworkTroubleshooting.tsx` avec layout 100%
- Création de l'API route `/api/network-troubleshooting/route.ts`
- Implémentation des fonctions dans `lib/openai.ts` et `lib/gemini.ts` :
  - `validateNetworkTroubleshootingRequest()` : Validation avec seuil 50%
  - `generateNetworkTroubleshootingStream()` : Génération de guides de dépannage en streaming (2000 tokens)
  - `generateHelpfulResponseStreamForNetwork()` : Réponses utiles pour requêtes invalides
- Intégration du streaming avec Server-Sent Events (SSE)
- Gestion des limites de tokens (2000 tokens maximum)
- Support de tous les types de problèmes réseau
- Génération de commandes réelles et d'explications markdown

---

## Phase 3 : Fonctionnalité d'Extraction de Code

### Prompt 4 : Ajout de l'Extraction de Code

**Prompt :**
```
if only if there are code to copy in order to fix the problem, when the stream of the left side finishes, send a request to get the copy and show the 30% right section in streaming mode
```

**Traduction :**
Si et seulement s'il y a du code à copier pour résoudre le problème, quand le stream de la section gauche se termine, envoyez une requête pour obtenir la copie et affichez la section droite 30% en mode streaming.

**Actions réalisées :**
- Ajout de la fonction `hasCodeBlocks()` pour détecter les blocs de code dans le markdown
- Création des fonctions d'extraction de code :
  - `extractNetworkCodeStream()` dans `lib/openai.ts`
  - `extractNetworkCodeStream()` dans `lib/gemini.ts`
- Ajout du mode `extract-code` dans l'API route
- Modification du composant pour :
  - Détecter automatiquement les blocs de code à la fin du stream principal
  - Appeler l'API pour extraire le code si détecté
  - Afficher une section droite (30%) avec le code en streaming
  - Réduire la section gauche à 70% quand le code est présent
  - Ajout d'un bouton collapse/expand pour masquer/afficher la section gauche
- Utilisation de `CodeDisplay` avec syntax highlighting (langage `bash`)
- Streaming du code extrait en temps réel

**Fonctionnalités ajoutées :**
- Détection automatique des blocs de code (``` dans le markdown)
- Extraction intelligente des commandes réseau, scripts et configurations
- Affichage conditionnel de la section droite (30%) uniquement si du code est détecté
- Layout dynamique : 100% gauche sans code, 70/30 avec code
- Transition fluide vers le layout split quand le code est extrait

---

## Phase 4 : Documentation

### Prompt 5 : Génération des Prompts

**Prompt :**
```
now i would like you to generate the prompts used to build the network assistant troubleshooting tool in the /prompt folder
```

**Traduction :**
Maintenant, j'aimerais que vous génériez les prompts utilisés pour construire l'outil d'assistant de dépannage réseau dans le dossier /prompt.

**Actions réalisées :**
- Création du fichier `prompt/network-troubleshooting-assistant.md`
- Documentation de tous les prompts utilisés depuis le début
- Suivi du même style que les autres outils dans le dossier `/prompt`

---

## État Final

L'outil Network Troubleshooting Assistant est maintenant complètement fonctionnel avec :

- ✅ Layout identique au SQL Query Optimizer mais sans section droite initialement
- ✅ Section droite (30%) qui apparaît automatiquement si du code est détecté
- ✅ Validation des requêtes réseau par IA (50% threshold - plus permissif)
- ✅ Génération de guides de dépannage complets en streaming (2000 tokens)
- ✅ Support de tous les types de problèmes réseau
- ✅ Acceptation de toute forme d'entrée (description, commandes, IP, etc.)
- ✅ Génération de commandes réelles ET d'explications détaillées
- ✅ Détection automatique des blocs de code dans le guide
- ✅ Extraction intelligente du code pour affichage dans la section droite
- ✅ Streaming du code extrait en temps réel
- ✅ Génération de réponses utiles pour requêtes non valides
- ✅ Bouton collapse/expand pour agrandir/réduire la section gauche
- ✅ Input qui se vide après soumission
- ✅ Transitions fluides entre les états (initial → avec guide → avec code)
- ✅ Gestion d'erreurs robuste
- ✅ Support OpenAI et Gemini
- ✅ Limites de sécurité (2000 tokens pour le guide, pas de limite pour l'extraction de code)
- ✅ Interface cohérente avec les autres outils
- ✅ Intégration dans le menu sidebar avec icône WiFi

---

## Détails Techniques

### Validation
- **Seuil** : 50% de pertinence réseau (plus permissif que les autres outils à 70%)
- **Raison** : Les problèmes réseau peuvent être décrits de nombreuses façons différentes

### Limite de Tokens
- **Guide principal** : 2000 tokens maximum
- **Raison** : Les guides de dépannage peuvent être longs et détaillés
- **Extraction de code** : Pas de limite stricte (2000 tokens max pour l'extraction)

### Détection de Code
- **Méthode** : Analyse regex des blocs de code markdown (```)
- **Déclenchement** : Automatique à la fin du stream principal
- **Extraction** : Appel API séparé en mode `extract-code`

### Layout Dynamique
- **Sans code** : Section gauche 100% de largeur
- **Avec code** : Section gauche 70%, section droite 30%
- **Transition** : Animations CSS fluides (`slide-in-from-right`)

### Types de Problèmes Supportés
- Connectivité (ping, traceroute, DNS)
- Latence et performance
- Configuration réseau (IP, subnet, gateway)
- Ports et services
- Pare-feu et sécurité
- Tous les problèmes réseau

### Formats d'Entrée Acceptés
- Descriptions textuelles ("Je ne peux pas me connecter à google.com")
- Commandes réseau spécifiques ("ping google.com")
- IP/Domaine + problème ("192.168.1.1 - timeout")
- Toute forme de description réseau

### Formats de Sortie
- Diagnostic du problème
- Commandes réseau à exécuter (ping, traceroute, nslookup, etc.)
- Explications étape par étape
- Solutions recommandées
- Meilleures pratiques

---

## Notes

- La limite de 2000 tokens est plus élevée que les autres outils (1000-1500 tokens) car les guides de dépannage réseau peuvent nécessiter plus de détails
- Le seuil de validation à 50% est plus permissif que les autres outils (70%) car les problèmes réseau peuvent être décrits de nombreuses façons
- La détection de code est automatique et ne nécessite aucune action de l'utilisateur
- L'extraction de code est silencieuse : si elle échoue, aucun message d'erreur n'est affiché à l'utilisateur
- Le code extrait est affiché avec syntax highlighting en langage `bash` par défaut
- La section droite n'apparaît que si du code est effectivement détecté et extrait
- Les transitions sont fluides et guidées par des animations CSS personnalisées

