# Plan d'Implémentation Détaillé : SQL Query Optimizer

## Vue d'ensemble

Cet outil permettra aux utilisateurs de coller une requête SQL et d'obtenir :
- **Côté droit (30%)** : Requête originale et requête optimisée en streaming
- **Côté gauche (70%)** : Explications détaillées avec markdown interprété (en haut) + Zone de saisie SQL (en bas)
- **Styles** : Cohérents avec les autres outils (ComponentGenerator, UnitTestGenerator)

---

## Structure de Layout Demandée

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
│           │  │  │  Explanations   │ │  │ Original SQL │  │  │
│           │  │  │  (Markdown)     │ │  │ (streaming)  │  │  │
│           │  │  │                 │ │  └──────────────┘  │  │
│           │  │  │                 │ │  ┌──────────────┐  │  │
│           │  │  │                 │ │  │ Optimized SQL│  │  │
│           │  │  │                 │ │  │ (streaming)  │  │  │
│           │  │  └────────────────┘ │  └──────────────┘  │  │
│           │  │                      │                    │  │
│           │  │  ┌────────────────┐ │                    │  │
│           │  │  │  SQL Textarea  │ │                    │  │
│           │  │  │  (bottom)      │ │                    │  │
│           │  │  │  + Controls    │ │                    │  │
│           │  │  └────────────────┘ │                    │  │
│           │  └──────────────────────┴────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Étapes Détaillées d'Implémentation

### **Phase 1 : Préparation et Vérification (15 min)**

#### Étape 1.1 : Vérifier l'état actuel
- [ ] Vérifier que `SQLOptimizer.tsx` existe
- [ ] Vérifier que `src/app/api/optimize-sql/route.ts` existe
- [ ] Vérifier que `src/app/tool-3/page.tsx` existe
- [ ] Vérifier que `MarkdownRenderer.tsx` existe et fonctionne
- [ ] Vérifier que les fonctions SQL existent dans `lib/openai.ts` et `lib/gemini.ts`

#### Étape 1.2 : Identifier les différences avec les exigences
- [ ] Comparer le layout actuel avec les exigences
- [ ] Identifier les fonctions manquantes dans les libs
- [ ] Lister les modifications nécessaires

---

### **Phase 2 : Implémentation des Fonctions Backend (30 min)**

#### Étape 2.1 : Ajouter les fonctions SQL dans `src/lib/openai.ts`

**Fonctions à créer :**

1. **`validateSQLRequest(query: string)`**
   - Valide si la requête est à 70%+ liée à l'optimisation SQL
   - Retourne `{ isValid: boolean, relevance: number, message?: string }`
   - Utilise le modèle `gpt-4o-mini`
   - Format JSON strict

2. **`optimizeSQLStream(query: string)`**
   - Génère une requête SQL optimisée en streaming
   - Limite de 1500 tokens (comme dans l'API route actuelle)
   - Retourne un `AsyncGenerator<string>`
   - Gère le marqueur `[TOKEN_LIMIT_REACHED]`

3. **`generateHelpfulResponseStreamForSQL(query: string)`**
   - Génère une réponse utile si la requête n'est pas valide
   - Streaming
   - Limite de 1500 tokens

4. **`generateSQLExplanationStream(originalQuery: string, optimizedQuery: string)`**
   - Génère des explications markdown détaillées
   - Compare la requête originale et optimisée
   - Streaming
   - Limite de 1500 tokens

**Structure des prompts :**

```typescript
// Validation Prompt
"You are a validation assistant for a SQL Query Optimizer app.
Your task is to determine if the user's request is AT LEAST 70% about SQL query optimization.
The app can ONLY optimize SQL queries. It cannot:
- Answer general questions
- Generate non-SQL code
- Provide tutorials
- Optimize other types of queries

IMPORTANT: The request must be at least 70% focused on SQL query optimization.
Respond with ONLY a JSON object: {\"isValid\": true/false, \"relevance\": 0-100, \"message\": \"...\"}"

// Optimization Prompt
"You are a SQL query optimization expert. Given the following SQL query, provide an optimized version.
Focus on:
- Index usage
- Query performance
- Best practices
- Reducing execution time
- Proper JOIN strategies
- Subquery optimization

Return ONLY the optimized SQL query, no explanations (explanations will be generated separately)."

// Explanation Prompt
"You are a SQL optimization expert. Compare the original and optimized queries.
Provide detailed explanations in Markdown format covering:
- What was changed
- Why each change improves performance
- Performance impact estimates
- Best practices applied

Use headers, bullet points, and code blocks for clarity."
```

#### Étape 2.2 : Ajouter les mêmes fonctions dans `src/lib/gemini.ts`

**Même structure que OpenAI :**
- `validateSQLRequest`
- `optimizeSQLStream`
- `generateHelpfulResponseStreamForSQL`
- `generateSQLExplanationStream`

**Différences Gemini :**
- Utilise `gemini-pro` ou `gemini-1.5-flash`
- Format de streaming différent (Google SDK)
- Gestion des tokens différente

---

### **Phase 3 : Refactorisation du Composant SQLOptimizer (45 min)**

#### Étape 3.1 : Restructurer le layout

**Structure cible :**

```tsx
<div className="w-full h-full flex flex-col">
  {/* Title Bar - Top Left (70% width when split) */}
  <div className="flex-shrink-0 px-4 pt-4 pb-2">
    <h1 className="text-3xl font-semibold text-white mb-2">
      SQL Query Optimizer
    </h1>
    <p className="text-sm text-gray-400">
      Paste your SQL query below to get an optimized version with detailed explanations
    </p>
  </div>

  {/* Main Split Layout */}
  <div className="flex-1 flex gap-6 px-4 pb-4 overflow-hidden">
    {/* LEFT SIDE (70%) */}
    <div className="w-[70%] flex flex-col">
      {/* Explanations Section (Top, scrollable) */}
      <div className="flex-1 overflow-y-auto px-4 mb-4">
        {explanations ? (
          <MarkdownRenderer content={explanations} />
        ) : (
          <div className="text-gray-500 text-sm">
            {isExplaining ? 'Generating explanations...' : 'Optimize a query to see explanations here'}
          </div>
        )}
      </div>

      {/* Input Section (Bottom, fixed) */}
      <div className="flex-shrink-0">
        {/* Textarea + Controls */}
      </div>
    </div>

    {/* RIGHT SIDE (30%) */}
    <div className="w-[30%] flex flex-col">
      {/* Original Query */}
      {/* Optimized Query */}
    </div>
  </div>
</div>
```

#### Étape 3.2 : Implémenter le streaming côté droit

**Comportement :**
- Afficher la requête originale immédiatement (copiée depuis l'input)
- Streamer la requête optimisée en temps réel
- Deux sections distinctes : "Original Query" et "Optimized Query"
- Utiliser `CodeDisplay` avec `language="sql"` pour les deux

**État à gérer :**
- `originalQuery: string | null` - Requête originale (copiée depuis input)
- `optimizedQuery: string | null` - Requête optimisée (streaming)
- `isOptimizing: boolean` - État de chargement

#### Étape 3.3 : Implémenter les explications côté gauche

**Comportement :**
- Les explications commencent APRÈS que l'optimisation soit terminée
- Appel séparé à l'API en mode `explain`
- Streaming des explications markdown
- Utiliser `MarkdownRenderer` pour l'affichage

**État à gérer :**
- `explanations: string | null` - Explications markdown
- `isExplaining: boolean` - État de génération des explications

#### Étape 3.4 : Positionner le textarea en bas de la section gauche

**Contraintes :**
- Textarea fixe en bas de la section gauche (70%)
- Largeur maximale : 100% de la section gauche
- Hauteur : ~200-250px (ajustable)
- Contrôles : Provider dropdown + Submit button
- Style cohérent avec les autres outils

**Structure :**
```tsx
<div className="flex-shrink-0 bg-[#2a2a2a] rounded-xl border border-[#3a3a3a] p-4">
  <textarea
    className="w-full h-64 bg-transparent text-white font-mono text-sm"
    placeholder="Paste your SQL query here... (Ctrl+Enter to optimize)"
  />
  <div className="flex items-center gap-2 mt-3">
    {/* Provider dropdown */}
    {/* Submit button */}
  </div>
</div>
```

#### Étape 3.5 : Ajouter les animations et transitions

**Animations nécessaires :**
- `slide-in-right` pour le panneau droit (déjà dans globals.css)
- Transition douce lors de l'apparition du panneau droit
- Guide d'attention (flèche) si nécessaire

#### Étape 3.6 : Gérer les erreurs et messages

**Messages d'erreur :**
- Afficher dans la section gauche (sous le textarea ou au-dessus)
- Style cohérent avec les autres outils (rouge pour erreur, bleu pour validation)
- Gérer les limites de tokens

---

### **Phase 4 : Mise à jour de la Route API (20 min)**

#### Étape 4.1 : Vérifier que la route `/api/optimize-sql` fonctionne

**Vérifications :**
- [ ] Les imports des fonctions SQL sont corrects
- [ ] La validation fonctionne (70% threshold)
- [ ] Le mode `optimize` stream correctement
- [ ] Le mode `explain` stream correctement
- [ ] Les limites de tokens sont respectées (1500)

#### Étape 4.2 : Ajuster si nécessaire

**Points à vérifier :**
- Gestion des erreurs
- Format des réponses SSE
- Cohérence avec les autres routes API

---

### **Phase 5 : Intégration dans la Page Tool-3 (10 min)**

#### Étape 5.1 : Mettre à jour `src/app/tool-3/page.tsx`

**Changements :**
```tsx
import SharedLayout from '@/components/SharedLayout';
import SQLOptimizer from '@/components/SQLOptimizer';

export default function Tool3Page() {
  return (
    <SharedLayout>
      <SQLOptimizer />
    </SharedLayout>
  );
}
```

#### Étape 5.2 : Mettre à jour le menu sidebar

**Changements dans `SidebarMenu.tsx` :**
- Changer le label de "Tool 3" à "SQL Optimizer"
- Optionnel : Changer l'icône pour une icône SQL

---

### **Phase 6 : Tests et Ajustements (20 min)**

#### Étape 6.1 : Tests fonctionnels

**Scénarios à tester :**
1. ✅ Coller une requête SQL valide → Voir optimisation + explications
2. ✅ Coller une requête non-SQL → Voir message d'aide
3. ✅ Tester avec OpenAI
4. ✅ Tester avec Gemini
5. ✅ Vérifier le streaming (requête optimisée)
6. ✅ Vérifier le streaming (explications)
7. ✅ Vérifier l'affichage markdown
8. ✅ Vérifier la limite de tokens (1500)
9. ✅ Vérifier le layout responsive
10. ✅ Vérifier les animations

#### Étape 6.2 : Ajustements de style

**Points à vérifier :**
- Cohérence des couleurs avec les autres outils
- Espacements et padding
- Tailles de police
- Responsive design
- Scrollbars

---

### **Phase 7 : Documentation (10 min)**

#### Étape 7.1 : Mettre à jour la documentation

**Fichiers à mettre à jour :**
- `docs/README.md` (si nécessaire)
- `prompt/README.md` (ajouter les prompts SQL)

---

## Questions de Clarification

Avant de commencer, j'ai besoin de clarifications sur :

1. **Layout initial :**
   - Quand l'utilisateur arrive sur la page, doit-on afficher les deux panneaux (70/30) même s'il n'y a pas encore de requête optimisée ?
   - Ou doit-on afficher uniquement la section gauche avec le textarea jusqu'à ce qu'une optimisation soit lancée ?

2. **Requête originale :**
   - La requête originale doit-elle être affichée immédiatement dans le panneau droit dès qu'elle est collée, ou seulement après le clic sur "Optimize" ?

3. **Ordre d'affichage :**
   - Les explications doivent-elles commencer à streamer en même temps que l'optimisation, ou attendre que l'optimisation soit terminée ? (Actuellement, elles attendent la fin)

4. **Textarea :**
   - Quelle hauteur préférée pour le textarea ? (200px, 250px, autre ?)
   - Le textarea doit-il être redimensionnable par l'utilisateur ?

5. **Limite de tokens :**
   - Confirmer 1500 tokens pour l'optimisation ET pour les explications séparément, ou 1500 tokens au total ?

6. **Validation :**
   - Le seuil de 70% est-il correct pour la validation SQL ?

---

## Estimation Totale

- **Phase 1** : 15 minutes
- **Phase 2** : 30 minutes
- **Phase 3** : 45 minutes
- **Phase 4** : 20 minutes
- **Phase 5** : 10 minutes
- **Phase 6** : 20 minutes
- **Phase 7** : 10 minutes

**Total estimé : ~2h30**

---

## Fichiers à Modifier/Créer

### Fichiers à modifier :
1. `src/lib/openai.ts` - Ajouter 4 fonctions SQL
2. `src/lib/gemini.ts` - Ajouter 4 fonctions SQL
3. `src/components/SQLOptimizer.tsx` - Refactorisation complète
4. `src/app/tool-3/page.tsx` - Intégrer SQLOptimizer
5. `src/components/SidebarMenu.tsx` - Mettre à jour le label

### Fichiers à vérifier (probablement OK) :
1. `src/app/api/optimize-sql/route.ts` - Vérifier et ajuster si nécessaire
2. `src/components/MarkdownRenderer.tsx` - Vérifier qu'il fonctionne bien
3. `src/components/CodeDisplay.tsx` - Vérifier le support SQL

---

## Résultat Attendu

À la fin de l'implémentation, l'utilisateur pourra :
1. Coller une requête SQL dans le textarea (bas gauche)
2. Cliquer sur "Optimize" ou appuyer sur Ctrl+Enter
3. Voir la requête originale et optimisée streamer dans le panneau droit (30%)
4. Voir les explications markdown streamer dans le panneau gauche (70%, en haut)
5. Copier les requêtes SQL optimisées
6. Utiliser OpenAI ou Gemini via le dropdown

Le tout avec un design cohérent avec les autres outils.

