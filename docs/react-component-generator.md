# React Component Generator

## Description

Générateur de composants React TypeScript à partir de descriptions en langage naturel.

## Contexte

**Problème résolu :** Les développeurs passent souvent beaucoup de temps à écrire des composants React répétitifs ou à rechercher des exemples de code. Cet outil permet de générer instantanément des composants React TypeScript prêts pour la production à partir d'une simple description textuelle, accélérant ainsi le développement et réduisant les erreurs de syntaxe.

## Technique Utilisée

**Approche :** **Zero-shot avec Persona**

- **Persona** : "You are an expert React developer" - Le modèle adopte le rôle d'un expert React pour générer du code de qualité
- **Zero-shot** : Aucun exemple n'est fourni dans le prompt, le modèle génère directement à partir des instructions
- **Instructions structurées** : Prompt système clair avec contraintes strictes (code uniquement, pas d'explications, pas de markdown)
- **Validation préalable** : Utilisation d'un prompt de validation séparé avec seuil de pertinence (70%) pour filtrer les requêtes non pertinentes

**Pourquoi cette approche :**
- La persona garantit un code de qualité professionnelle
- Zero-shot est suffisant car les modèles modernes (GPT-4o-mini, Gemini) ont une bonne compréhension de React
- Les instructions strictes évitent les réponses verbeuses et garantissent un code utilisable directement

## Évolution

**Version 1.0 (Initiale)**
- Génération basique de composants React
- Support OpenAI uniquement
- Pas de validation des requêtes
- Interface simple avec textarea

**Version 2.0 (Améliorations UX)**
- Ajout du streaming en temps réel
- Support Gemini en plus d'OpenAI
- Interface redesignée avec thème sombre
- Layout split (70% gauche / 30% droite) avec transitions fluides

**Version 3.0 (Sécurité et Validation)**
- Validation des requêtes par IA (70% de pertinence)
- Limite de sécurité (1000 tokens)
- Génération de réponses utiles pour requêtes invalides
- Messages d'erreur améliorés

**Version 4.0 (Optimisations)**
- Changement de modèle OpenAI vers GPT-4o-mini (plus économique)
- Amélioration des transitions et animations
- Bouton collapse/expand pour le panneau de code
- Nettoyage automatique du textarea après soumission

## Exemples

### Exemple 1 : Composant de Bouton Simple

**Input :**
```
A button component with primary and secondary variants, with loading state
```

**Output :**
```tsx
import React, { useState } from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function Button({ 
  variant = 'primary', 
  children, 
  onClick, 
  disabled = false,
  loading = false 
}: ButtonProps) {
  const baseStyles = 'px-4 py-2 rounded-lg font-medium transition-colors';
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300'
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
}
```

### Exemple 2 : Composant de Formulaire

**Input :**
```
A login form component with email and password fields, validation, and submit handler
```

**Output :**
```tsx
import React, { useState, FormEvent } from 'react';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
}

export default function LoginForm({ onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.includes('@')) {
      newErrors.email = 'Invalid email address';
    }
    if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(email, password);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        />
        {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
      </div>
      <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
        Login
      </button>
    </form>
  );
}
```

### Exemple 3 : Composant de Liste avec Recherche

**Input :**
```
A searchable list component that filters items as you type
```

**Output :**
```tsx
import React, { useState, useMemo } from 'react';

interface SearchableListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  getSearchableText: (item: T) => string;
  placeholder?: string;
}

export default function SearchableList<T>({ 
  items, 
  renderItem, 
  getSearchableText,
  placeholder = 'Search...'
}: SearchableListProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    return items.filter(item => 
      getSearchableText(item).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm, getSearchableText]);

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 border rounded-lg"
      />
      <div className="space-y-2">
        {filteredItems.map((item, index) => (
          <div key={index}>
            {renderItem(item)}
          </div>
        ))}
        {filteredItems.length === 0 && (
          <p className="text-gray-500 text-center py-4">No items found</p>
        )}
      </div>
    </div>
  );
}
```

## Limites

L'outil ne peut pas :
- Générer des composants avec des dépendances externes complexes non spécifiées
- Créer des composants nécessitant une configuration backend ou des API externes
- Générer des fichiers CSS séparés ou des fichiers de configuration
- Créer des composants avec des animations complexes sans bibliothèques spécifiques
- Générer du code backend, des APIs, ou du code serveur
- Répondre à des questions générales sur React (seulement générer du code)
- Générer des composants de plus de 1000 tokens (limite de sécurité)

## Fonctionnalités

- Génération de composants React/TypeScript prêts pour la production
- Support OpenAI (GPT-4o-mini) et Gemini
- Streaming en temps réel
- Validation des requêtes (70% de pertinence)
- Limite de sécurité : 1000 tokens

## Utilisation

1. Décrire le composant souhaité dans le champ de saisie
2. Sélectionner le fournisseur IA (OpenAI ou Gemini)
3. Cliquer sur générer
4. Le code apparaît en streaming dans le panneau de droite
5. Copier le code avec le bouton de copie

## API

**Endpoint :** `/api/generate`

**Méthode :** POST

**Body :**
```json
{
  "description": "string",
  "provider": "openai" | "gemini"
}
```
