# Plan d'Implémentation Détaillé : Dockerfile Generator

## Vue d'ensemble

Cet outil permettra aux utilisateurs de décrire leur application ou leurs besoins en conteneurisation et d'obtenir un Dockerfile optimisé généré par IA. L'outil suivra exactement les mêmes styles et comportements que le React Component Generator.

---

## Structure de Layout (Identique au React Component Generator)

```
┌─────────────────────────────────────────────────────────────┐
│  Sidebar  │  Main Content Area                              │
│           │  ┌──────────────────────┬────────────────────┐  │
│           │  │  LEFT (70%)          │  RIGHT (30%)       │  │
│           │  │                      │                    │  │
│           │  │  Title + Description │  Title + Desc      │  │
│           │  │  (top-left)          │  (top-left)        │  │
│           │  │                      │                    │  │
│           │  │  ┌────────────────┐ │  ┌──────────────┐  │  │
│           │  │  │  Input Field  │ │  │ Generated    │  │  │
│           │  │  │  (centered)    │ │  │ Dockerfile   │  │  │
│           │  │  │  + Controls    │ │  │ (streaming)  │  │  │
│           │  │  └────────────────┘ │  └──────────────┘  │  │
│           │  │                      │                    │  │
│           │  └──────────────────────┴────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Comportement :**
- **État initial** : Input centré au milieu, largeur max 2xl
- **Après génération** : Split layout 70/30, input à gauche, Dockerfile à droite
- **Transitions** : Identiques au React Component Generator (slide-in-right, etc.)

---

## Étapes Détaillées d'Implémentation

### **Phase 1 : Préparation et Structure (20 min)**

#### Étape 1.1 : Créer la structure de fichiers

**Fichiers à créer :**
1. `src/components/DockerfileGenerator.tsx` - Composant principal (copie de ComponentGenerator.tsx comme base)
2. `src/app/api/generate-dockerfile/route.ts` - Route API pour la génération
3. `src/app/dockerfile-generator/page.tsx` - Page Next.js pour l'outil

**Fichiers à modifier :**
1. `src/lib/openai.ts` - Ajouter fonctions Dockerfile
2. `src/lib/gemini.ts` - Ajouter fonctions Dockerfile
3. `src/components/SidebarMenu.tsx` - Ajouter l'entrée de menu (remplacer "Tool 4")
4. `src/types/index.ts` - Vérifier si des types sont nécessaires

#### Étape 1.2 : Mettre à jour le menu sidebar

**Changements dans `SidebarMenu.tsx` :**
- Remplacer l'entrée "Tool 4" par "Dockerfile Generator"
- Ajouter le chemin `/dockerfile-generator`
- Ajouter une icône Docker appropriée (SVG)

---

### **Phase 2 : Implémentation des Fonctions Backend (40 min)**

#### Étape 2.1 : Ajouter les fonctions Dockerfile dans `src/lib/openai.ts`

**Fonctions à créer :**

1. **`validateDockerfileRequest(description: string)`**
   - Valide si la requête est à 70%+ liée à la génération de Dockerfile
   - Retourne `{ isValid: boolean, relevance: number, message?: string }`
   - Utilise le modèle `gpt-4o-mini`
   - Format JSON strict

2. **`generateDockerfileStream(description: string)`**
   - Génère un Dockerfile optimisé en streaming
   - Limite de 1000 tokens (comme React Component Generator)
   - Retourne un `AsyncGenerator<string>`
   - Gère le marqueur `[TOKEN_LIMIT_REACHED]`

3. **`generateHelpfulResponseStreamForDockerfile(description: string)`**
   - Génère une réponse utile si la requête n'est pas valide
   - Streaming
   - Limite de 1000 tokens

**Structure des prompts :**

```typescript
// Validation Prompt
"You are a validation assistant for a Dockerfile Generator app.
Your task is to determine if the user's request is AT LEAST 70% about generating a Dockerfile or containerization.

The app can ONLY generate Dockerfiles. It cannot:
- Answer general questions
- Generate non-Dockerfile code
- Provide explanations or tutorials
- Generate docker-compose files, Kubernetes manifests, or other container orchestration files
- Generate application code

IMPORTANT: The request must be at least 70% focused on Dockerfile generation or containerization.
Respond with ONLY a JSON object: {\"isValid\": true/false, \"relevance\": 0-100, \"message\": \"...\"}"

// Generation Prompt
"You are an expert in Docker and containerization. Given the following application description, generate an optimized, production-ready Dockerfile.

Focus on:
- Multi-stage builds for smaller image sizes
- Proper layer caching
- Security best practices (non-root user, minimal base images)
- Efficient dependency installation
- Health checks
- Proper WORKDIR and ENV usage
- .dockerignore considerations
- Build optimization

Return ONLY the Dockerfile code, no explanations, no markdown code blocks, no additional text.
The Dockerfile should be complete and production-ready."
```

**Points d'optimisation à inclure dans le prompt :**
- Multi-stage builds
- Utilisation de .dockerignore
- Minimisation des couches
- Utilisation de cache pour les dépendances
- Images de base minimales (alpine, distroless)
- Utilisateur non-root
- Health checks
- Variables d'environnement appropriées
- Ordre des instructions pour optimiser le cache

#### Étape 2.2 : Ajouter les mêmes fonctions dans `src/lib/gemini.ts`

**Même structure que OpenAI :**
- `validateDockerfileRequest`
- `generateDockerfileStream`
- `generateHelpfulResponseStreamForDockerfile`

**Différences Gemini :**
- Utilise `gemini-pro`
- Format de streaming différent (Google SDK)
- Gestion des tokens différente

**Détails techniques :**
- Utiliser `generateContentStream` pour le streaming
- Gérer les marqueurs de code blocks (```dockerfile)
- Filtrer les explications markdown
- Estimer les tokens de la même manière

---

### **Phase 3 : Création de la Route API (25 min)**

#### Étape 3.1 : Créer `src/app/api/generate-dockerfile/route.ts`

**Structure identique à `/api/generate/route.ts` :**

```typescript
import { NextRequest } from 'next/server';
import { 
  generateDockerfileStream as generateOpenAIStream, 
  validateDockerfileRequest as validateOpenAI,
  generateHelpfulResponseStreamForDockerfile as generateOpenAIHelpfulResponse
} from '@/lib/openai';
import { 
  generateDockerfileStream as generateGeminiStream, 
  validateDockerfileRequest as validateGemini,
  generateHelpfulResponseStreamForDockerfile as generateGeminiHelpfulResponse
} from '@/lib/gemini';

interface GenerateDockerfileRequest {
  description: string;
  provider: 'openai' | 'gemini';
}

export async function POST(request: NextRequest) {
  // Validation des inputs
  // Création du stream SSE
  // Validation de la requête (70% threshold)
  // Génération du Dockerfile ou réponse utile
  // Gestion des limites de tokens (1000)
  // Retour du stream
}
```

**Logique :**
1. Valider `description` et `provider`
2. Appeler la fonction de validation (70% threshold)
3. Si valide → générer Dockerfile
4. Si non valide → générer réponse utile
5. Streamer les chunks avec SSE
6. Gérer les limites de tokens

---

### **Phase 4 : Création du Composant DockerfileGenerator (45 min)**

#### Étape 4.1 : Créer `src/components/DockerfileGenerator.tsx`

**Basé sur `ComponentGenerator.tsx` :**

**États à gérer :**
```typescript
const [description, setDescription] = useState('');
const [generatedDockerfile, setGeneratedDockerfile] = useState<string | null>(null);
const [helpfulResponse, setHelpfulResponse] = useState<string | null>(null);
const [isLoading, setIsLoading] = useState(false);
const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openai');
const [error, setError] = useState<string | null>(null);
const [isValidationMessage, setIsValidationMessage] = useState(false);
const [showAttentionGuide, setShowAttentionGuide] = useState(false);
const [tokenLimitReached, setTokenLimitReached] = useState(false);
const [isLeftSectionCollapsed, setIsLeftSectionCollapsed] = useState(false);
```

**Fonctionnalités identiques :**
- Input field (type="text") avec placeholder "Describe your application or containerization needs..."
- Provider dropdown (OpenAI/Gemini)
- Submit button (icône flèche)
- Loading state avec loader inline
- Streaming du Dockerfile
- Affichage avec `CodeDisplay` (language="dockerfile")
- Bouton collapse/expand
- Guide d'attention (flèche animée)
- Gestion des erreurs
- Limite de tokens (1000)
- Vider l'input après soumission

**Layout :**
- Identique au React Component Generator
- Split 70/30 après génération
- Transitions identiques

#### Étape 4.2 : Adapter les textes et placeholders

**Textes à changer :**
- Titre : "Dockerfile Generator"
- Description : "Describe your application and get an optimized, production-ready Dockerfile"
- Placeholder : "Describe your application or containerization needs..."
- Messages d'erreur : Adapter pour Dockerfile

#### Étape 4.3 : Utiliser CodeDisplay avec language="dockerfile"

**Vérifier que `CodeDisplay` supporte "dockerfile" :**
- Si oui, utiliser directement
- Si non, vérifier le support dans `react-syntax-highlighter` et ajouter si nécessaire

---

### **Phase 5 : Création de la Page Next.js (10 min)**

#### Étape 5.1 : Créer `src/app/dockerfile-generator/page.tsx`

```typescript
import SharedLayout from '@/components/SharedLayout';
import DockerfileGenerator from '@/components/DockerfileGenerator';

export default function DockerfileGeneratorPage() {
  return (
    <SharedLayout>
      <DockerfileGenerator />
    </SharedLayout>
  );
}
```

---

### **Phase 6 : Tests et Ajustements (30 min)**

#### Étape 6.1 : Tests fonctionnels

**Scénarios à tester :**
1. ✅ Description d'application Node.js → Dockerfile généré
2. ✅ Description d'application Python → Dockerfile généré
3. ✅ Description d'application multi-stage → Dockerfile optimisé
4. ✅ Requête non-Dockerfile → Message d'aide
5. ✅ Tester avec OpenAI
6. ✅ Tester avec Gemini
7. ✅ Vérifier le streaming
8. ✅ Vérifier la limite de tokens (1000)
9. ✅ Vérifier le layout et les transitions
10. ✅ Vérifier la syntaxe highlight (dockerfile)

#### Étape 6.2 : Vérifier la qualité des Dockerfiles générés

**Points à vérifier :**
- Multi-stage builds quand approprié
- Utilisation d'images de base minimales
- Utilisateur non-root
- Health checks
- Optimisation du cache
- Bonnes pratiques de sécurité

---

## Questions de Clarification

Avant de commencer, j'ai besoin de clarifications sur :

1. **Types d'applications supportés :**
   - Doit-on supporter tous les types d'applications (Node.js, Python, Java, Go, etc.) ?
   - Ou se concentrer sur certains types spécifiques ?

2. **Niveau de détail dans la description :**
   - L'utilisateur doit-il fournir beaucoup de détails (dépendances, ports, etc.) ?
   - Ou peut-on générer un Dockerfile basique à partir d'une description simple ?

3. **Fichiers supplémentaires :**
   - Doit-on générer uniquement le Dockerfile, ou aussi un `.dockerignore` suggéré ?
   - Doit-on suggérer un `docker-compose.yml` ?

4. **Optimisations spécifiques :**
   - Y a-t-il des optimisations spécifiques à prioriser ?
   - Multi-stage builds obligatoires ou optionnels ?

5. **Validation :**
   - Le seuil de 70% est-il approprié pour la validation Dockerfile ?
   - Doit-on être plus strict ou plus permissif ?

6. **Limite de tokens :**
   - 1000 tokens est-il suffisant pour un Dockerfile complet ?
   - Les Dockerfiles peuvent être assez longs (multi-stage, etc.)

---

## Estimation Totale

- **Phase 1** : 20 minutes
- **Phase 2** : 40 minutes
- **Phase 3** : 25 minutes
- **Phase 4** : 45 minutes
- **Phase 5** : 10 minutes
- **Phase 6** : 30 minutes

**Total estimé : ~2h50**

---

## Fichiers à Créer/Modifier

### Fichiers à créer :
1. `src/components/DockerfileGenerator.tsx`
2. `src/app/api/generate-dockerfile/route.ts`
3. `src/app/dockerfile-generator/page.tsx`

### Fichiers à modifier :
1. `src/lib/openai.ts` - Ajouter 3 fonctions Dockerfile
2. `src/lib/gemini.ts` - Ajouter 3 fonctions Dockerfile
3. `src/components/SidebarMenu.tsx` - Ajouter l'entrée de menu

### Fichiers à vérifier :
1. `src/components/CodeDisplay.tsx` - Vérifier le support "dockerfile"
2. `src/types/index.ts` - Vérifier si des types sont nécessaires

---

## Résultat Attendu

À la fin de l'implémentation, l'utilisateur pourra :
1. Décrire son application ou ses besoins de conteneurisation
2. Cliquer sur "Generate" ou appuyer sur Enter
3. Voir le Dockerfile optimisé streamer en temps réel dans le panneau droit (30%)
4. Copier le Dockerfile généré
5. Utiliser OpenAI ou Gemini via le dropdown
6. Recevoir des messages d'aide si la requête n'est pas liée aux Dockerfiles

Le tout avec un design et un comportement identiques au React Component Generator.

---

## Notes Techniques

### Optimisations Dockerfile à inclure dans les prompts :

1. **Multi-stage builds** : Réduire la taille de l'image finale
2. **Layer caching** : Ordre optimal des instructions
3. **Images de base minimales** : Alpine, distroless
4. **Utilisateur non-root** : Sécurité
5. **Health checks** : Monitoring
6. **.dockerignore** : Réduire le contexte de build
7. **Variables d'environnement** : Bonnes pratiques
8. **WORKDIR** : Organisation
9. **Dépendances** : Installation optimisée
10. **Build args** : Flexibilité

### Exemples de descriptions utilisateur :

- "Node.js application with Express, needs PostgreSQL connection"
- "Python Flask app with Redis cache"
- "Multi-stage build for a React app with Nginx"
- "Go microservice with health check"
- "Java Spring Boot application with Maven"

---

## Prochaines Étapes

Une fois les clarifications obtenues, je procéderai à l'implémentation dans l'ordre des phases.


