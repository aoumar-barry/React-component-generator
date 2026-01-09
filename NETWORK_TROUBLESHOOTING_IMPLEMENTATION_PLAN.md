# Plan d'Implémentation Détaillé : Network Troubleshooting Assistant

## Vue d'ensemble

Cet outil permettra aux utilisateurs de décrire un problème réseau et d'obtenir :
- **Côté gauche (100% width)** : Explications détaillées avec markdown interprété (en haut) + Zone de saisie (en bas)
- **Pas de section droite** : Contrairement au SQL Optimizer, cet outil n'a pas de section droite (30%)
- **Styles** : Cohérents avec les autres outils (ComponentGenerator, UnitTestGenerator, SQLOptimizer, DockerfileGenerator)

---

## ⚠️ QUESTIONS DE CLARIFICATION NÉCESSAIRES

Avant de commencer l'implémentation, j'ai besoin de clarifications sur plusieurs points :

### 1. **Type de dépannage réseau**
- **Q1.1** : Quels types de problèmes réseau l'outil doit-il traiter ?
  - Connectivité (ping, traceroute, DNS)
  - Latence et performance
  - Configuration réseau (IP, subnet, gateway)
  - Ports et services
  - Pare-feu et sécurité
  - Tous les types ci-dessus ?

### 2. **Format d'entrée**
- **Q2.1** : Quel format d'entrée l'utilisateur doit-il fournir ?
  - Description textuelle du problème (ex: "Je ne peux pas me connecter à google.com")
  - Commande réseau spécifique (ex: "ping google.com")
  - IP/Domaine + problème (ex: "192.168.1.1 - timeout")
  - Les deux (description OU commande) ?

### 3. **Format de sortie**
- **Q3.1** : Que doit contenir la réponse de l'outil ?
  - Diagnostic du problème
  - Commandes réseau à exécuter (ping, traceroute, nslookup, etc.)
  - Explications étape par étape
  - Solutions recommandées
  - Tous les éléments ci-dessus ?

### 4. **Validation**
- **Q4.1** : Quel seuil de validation (comme les autres outils) ?
  - 70% de pertinence réseau (comme Dockerfile Generator) ?
  - Autre seuil ?

### 5. **Limite de tokens**
- **Q5.1** : Quelle limite de tokens pour la génération ?
  - 1000 tokens (comme React Component Generator) ?
  - 1500 tokens (comme SQL Optimizer) ?
  - 200 tokens (comme Dockerfile Generator) ?
  - Autre valeur ?

### 6. **Modèle AI**
- **Q6.1** : Utiliser `gpt-4o-mini` pour OpenAI (comme les autres outils) ?
- **Q6.2** : Utiliser `gemini-pro` pour Gemini (comme les autres outils) ?

### 7. **Comportement spécifique**
- **Q7.1** : L'outil doit-il générer des commandes réseau réelles (ping, traceroute, etc.) ou seulement des explications ?
- **Q7.2** : Doit-il suggérer des commandes à exécuter dans un terminal, ou fournir uniquement des explications théoriques ?

---

## Structure de Layout Demandée

```
┌─────────────────────────────────────────────────────────────┐
│  Sidebar  │  Main Content Area (100% width)                 │
│           │  ┌──────────────────────────────────────────┐  │
│           │  │  LEFT (100%)                              │  │
│           │  │                                           │  │
│           │  │  Title + Description (top)                │  │
│           │  │                                           │  │
│           │  │  ┌────────────────────────────────────┐  │  │
│           │  │  │  Explanations (Markdown)           │  │  │
│           │  │  │  (scrollable, top section)         │  │  │
│           │  │  │                                    │  │  │
│           │  │  │                                    │  │  │
│           │  │  └────────────────────────────────────┘  │  │
│           │  │                                           │  │
│           │  │  ┌────────────────────────────────────┐  │  │
│           │  │  │  Textarea (bottom, fixed)           │  │  │
│           │  │  │  + Provider dropdown + Submit       │  │  │
│           │  │  └────────────────────────────────────┘  │  │
│           │  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Comportement initial :**
- Textarea centré verticalement et horizontalement
- Titre et description au-dessus du textarea
- Transition fluide vers le layout split après soumission

**Comportement après soumission :**
- Textarea se déplace en bas avec animation `slide-in-from-bottom`
- Explications apparaissent en haut avec animation `slide-in-from-left`
- Section gauche prend 100% de la largeur (pas de section droite)

---

## Phase 1 : Architecture et Structure de Base (30 min)

### Étape 1.1 : Créer la page Next.js

**Fichier :** `src/app/network-troubleshooting/page.tsx`

```typescript
import NetworkTroubleshooting from '@/components/NetworkTroubleshooting';
import SharedLayout from '@/components/SharedLayout';

export default function NetworkTroubleshootingPage() {
  return (
    <SharedLayout>
      <NetworkTroubleshooting />
    </SharedLayout>
  );
}
```

### Étape 1.2 : Ajouter l'entrée dans le Sidebar

**Fichier :** `src/components/SidebarMenu.tsx`

Ajouter un nouvel élément de menu :
```typescript
{
  id: 'network-troubleshooting',
  label: 'Network Troubleshooting',
  path: '/network-troubleshooting',
  icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
  ),
}
```

### Étape 1.3 : Créer le composant de base

**Fichier :** `src/components/NetworkTroubleshooting.tsx`

Structure initiale :
```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { AIProvider } from '@/types';
import { useSidebar } from '@/contexts/SidebarContext';
import MarkdownRenderer from './MarkdownRenderer';

export default function NetworkTroubleshooting() {
  // États similaires au SQLOptimizer mais sans section droite
  const [description, setDescription] = useState('');
  const [troubleshootingResponse, setTroubleshootingResponse] = useState<string | null>(null);
  const [helpfulResponse, setHelpfulResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openai');
  const [error, setError] = useState<string | null>(null);
  const [isValidationMessage, setIsValidationMessage] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { collapseSidebar } = useSidebar();

  // ... reste de l'implémentation
}
```

---

## Phase 2 : Implémentation Backend (45 min)

### Étape 2.1 : Créer l'API Route

**Fichier :** `src/app/api/network-troubleshooting/route.ts`

Structure similaire à `/api/optimize-sql/route.ts` :
- Validation de la requête (70% de pertinence réseau)
- Génération de réponse de dépannage (streaming)
- Génération de réponse utile si validation échoue
- Gestion des limites de tokens

### Étape 2.2 : Ajouter les fonctions OpenAI

**Fichier :** `src/lib/openai.ts`

Fonctions à ajouter :
1. `validateNetworkTroubleshootingRequest(description: string)`
   - Vérifie si la requête est à 70% liée au dépannage réseau
   - Retourne `{ isValid: boolean, message?: string }`

2. `generateNetworkTroubleshootingStream(description: string)`
   - Génère une réponse de dépannage réseau en streaming
   - Format markdown avec explications, commandes, solutions
   - Limite de tokens : **À CONFIRMER**

3. `generateHelpfulResponseStreamForNetwork(description: string)`
   - Génère une réponse utile si la requête n'est pas valide
   - Informe l'utilisateur que l'outil est dédié au dépannage réseau

**Prompt système pour la génération :**
```
You are an expert network and system administrator specializing in network troubleshooting.
When a user describes a network problem, provide:
1. Diagnostic of the issue
2. Step-by-step troubleshooting commands (ping, traceroute, nslookup, etc.)
3. Explanations of what each command does
4. Recommended solutions
5. Best practices

Format your response in Markdown with:
- Headers for sections
- Code blocks for commands
- Bullet points for steps
- Clear explanations

Return ONLY the troubleshooting guide in Markdown format, no additional text.
```

### Étape 2.3 : Ajouter les fonctions Gemini

**Fichier :** `src/lib/gemini.ts`

Mêmes fonctions que pour OpenAI, adaptées à l'API Gemini :
- `validateNetworkTroubleshootingRequest`
- `generateNetworkTroubleshootingStream`
- `generateHelpfulResponseStreamForNetwork`

---

## Phase 3 : Interface Utilisateur (60 min)

### Étape 3.1 : Implémenter le layout initial (centré)

**Comportement :**
- Textarea centré verticalement et horizontalement
- Titre "Network Troubleshooting Assistant" au-dessus
- Description sous le titre
- Provider dropdown + Submit button dans le footer du textarea

**Style :**
- Cohérent avec SQLOptimizer (même design de textarea)
- Hauteur du textarea : ~200-250px (ajustable)

### Étape 3.2 : Implémenter la transition après soumission

**Animation :**
1. Fade-out du layout centré (`animate-slide-out-center`)
2. Après 400ms, afficher le nouveau layout
3. Textarea se déplace en bas avec `animate-slide-in-from-bottom`
4. Section d'explications apparaît en haut avec `animate-slide-in-from-left`

### Étape 3.3 : Implémenter l'affichage des explications

**Comportement :**
- Section scrollable en haut (flex-1)
- Utiliser `MarkdownRenderer` pour interpréter le markdown
- Afficher un loader pendant la génération
- Gérer les erreurs avec des messages appropriés

### Étape 3.4 : Implémenter le streaming

**Comportement :**
- Streamer la réponse en temps réel
- Accumuler les chunks dans `troubleshootingResponse`
- Mettre à jour l'affichage à chaque chunk
- Gérer les réponses utiles (validation échouée)

### Étape 3.5 : Implémenter la gestion des erreurs

**Types d'erreurs :**
- Erreurs de validation (message bleu, `isValidationMessage = true`)
- Erreurs de génération (message rouge)
- Limite de tokens atteinte (message bleu avec information)

---

## Phase 4 : Animations et Polissage (30 min)

### Étape 4.1 : Ajouter les animations CSS

**Fichier :** `src/app/globals.css`

Vérifier que les animations suivantes existent :
- `slide-in-from-left`
- `slide-in-from-bottom`
- `slide-out-center`

Si elles n'existent pas, les ajouter.

### Étape 4.2 : Ajouter le collapse/expand (optionnel)

**Comportement :**
- Bouton pour masquer/afficher le textarea
- Permet de voir les explications en plein écran
- Style cohérent avec SQLOptimizer

### Étape 4.3 : Nettoyer le textarea après soumission

**Comportement :**
- Vider le textarea après avoir cliqué sur Submit
- Permettre une nouvelle requête immédiatement

---

## Phase 5 : Tests et Validation (30 min)

### Étape 5.1 : Tester les cas d'usage

**Cas à tester :**
1. Requête valide (problème réseau)
2. Requête invalide (pas liée au réseau)
3. Requête vide
4. Limite de tokens atteinte
5. Erreur API
6. Changement de provider (OpenAI ↔ Gemini)

### Étape 5.2 : Vérifier la cohérence visuelle

**Points à vérifier :**
- Couleurs cohérentes avec les autres outils
- Espacements et padding
- Responsive design
- Animations fluides

---

## Résumé des Fichiers à Créer/Modifier

### Nouveaux fichiers :
1. `src/app/network-troubleshooting/page.tsx`
2. `src/components/NetworkTroubleshooting.tsx`
3. `src/app/api/network-troubleshooting/route.ts`

### Fichiers à modifier :
1. `src/components/SidebarMenu.tsx` - Ajouter l'entrée du menu
2. `src/lib/openai.ts` - Ajouter les 3 fonctions
3. `src/lib/gemini.ts` - Ajouter les 3 fonctions
4. `src/app/globals.css` - Vérifier/ajouter les animations (si nécessaire)

---

## Estimation Totale

- **Phase 1** : 30 minutes
- **Phase 2** : 45 minutes
- **Phase 3** : 60 minutes
- **Phase 4** : 30 minutes
- **Phase 5** : 30 minutes

**Total : ~3 heures 15 minutes**

---

## Prochaines Étapes

1. **Attendre les clarifications** sur les questions ci-dessus
2. Une fois les clarifications reçues, commencer l'implémentation
3. Suivre le plan étape par étape
4. Tester chaque phase avant de passer à la suivante

---

## Notes Importantes

- L'interface doit être **identique** au SQL Optimizer mais **sans la section droite (30%)**
- Utiliser les mêmes styles et composants réutilisables
- Respecter le pattern de validation (70% de pertinence)
- Implémenter le streaming pour une meilleure UX
- Gérer les erreurs de manière cohérente avec les autres outils

