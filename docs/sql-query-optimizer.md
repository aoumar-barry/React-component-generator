# SQL Query Optimizer

## Description

Optimiseur de requêtes SQL avec explications détaillées des optimisations appliquées.

## Contexte

**Problème résolu :** Les requêtes SQL non optimisées peuvent causer des problèmes de performance majeurs dans les applications, notamment avec de grandes bases de données. Les développeurs doivent connaître les techniques d'optimisation SQL (index, JOIN optimisés, sous-requêtes, etc.) et comprendre pourquoi certaines optimisations sont meilleures. Cet outil automatise l'optimisation et fournit des explications détaillées, aidant les développeurs à apprendre et à améliorer leurs requêtes SQL.

## Technique Utilisée

**Approche :** **Two-Step Zero-shot avec Persona et Chain-of-Thought (CoT) implicite**

**Étape 1 - Optimisation :**
- **Zero-shot** : Génération directe de la requête optimisée sans exemples
- **Persona** : "You are a SQL optimization expert" - Expertise en optimisation SQL
- **Instructions ciblées** : Focus sur index, performance, meilleures pratiques, stratégies JOIN
- **Contraintes strictes** : Retour uniquement de la requête SQL (pas d'explications)

**Étape 2 - Explications :**
- **Zero-shot** : Génération d'explications sans exemples
- **Persona** : "You are a SQL optimization expert" - Même expertise pour expliquer
- **CoT implicite** : Le modèle compare et explique les changements (processus de raisonnement)
- **Format markdown structuré** : Headers, bullet points, code blocks pour clarté

**Pourquoi cette approche :**
- La séparation en deux étapes permet d'obtenir d'abord la solution optimisée, puis l'explication
- Les instructions ciblées garantissent des optimisations pertinentes (index, JOIN, etc.)
- Le format markdown facilite la lecture des explications
- Zero-shot est suffisant car les modèles comprennent bien les patterns SQL

## Évolution

**Version 1.0 (Initiale)**
- Optimisation basique de requêtes SQL
- Pas d'explications détaillées
- Interface simple

**Version 2.0 (Layout et Explications)**
- Ajout d'un layout split (70% gauche / 30% droite)
- Génération d'explications markdown en streaming
- Affichage de la requête originale et optimisée
- Transitions fluides entre les états

**Version 3.0 (Améliorations UX)**
- Textarea centré initialement, puis déplacé en bas après soumission
- Requête originale affichée dans les explications (copiable)
- Bouton collapse/expand pour agrandir le panneau de requêtes
- Scrollbars modernes et élégantes
- Nettoyage automatique du textarea après soumission

**Version 4.0 (Corrections)**
- Correction des problèmes de streaming
- Amélioration des transitions (mouvement progressif au lieu de fade)
- Correction des erreurs de build pour la production
- Optimisation des performances

## Exemples

### Exemple 1 : Requête avec Sous-requête Non Optimisée

**Input :**
```sql
SELECT * FROM users 
WHERE id IN (
  SELECT user_id FROM orders 
  WHERE total > 1000
);
```

**Output (Requête Optimisée) :**
```sql
SELECT u.* FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE o.total > 1000
GROUP BY u.id;
```

**Output (Explications) :**
```markdown
## Optimisations Appliquées

### Remplacement de IN par JOIN
- **Avant** : Sous-requête avec `IN`
- **Après** : `INNER JOIN` direct
- **Bénéfice** : Meilleure performance, utilisation d'index sur la clé étrangère

### Ajout de GROUP BY
- **Raison** : Évite les doublons si un utilisateur a plusieurs commandes > 1000
- **Impact** : Garantit l'unicité des résultats

### Performance
- **Amélioration estimée** : 40-60% plus rapide sur grandes tables
- **Utilisation d'index** : Le JOIN peut utiliser l'index sur `orders.user_id`
```

### Exemple 2 : Requête avec SELECT *

**Input :**
```sql
SELECT * FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.price > 50
ORDER BY p.created_at DESC;
```

**Output (Requête Optimisée) :**
```sql
SELECT 
  p.id,
  p.name,
  p.price,
  p.created_at,
  c.name AS category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.price > 50
ORDER BY p.created_at DESC
LIMIT 100;
```

**Output (Explications) :**
```markdown
## Optimisations Appliquées

### Remplacement de SELECT *
- **Avant** : `SELECT *` récupère toutes les colonnes
- **Après** : Sélection explicite des colonnes nécessaires
- **Bénéfice** : Réduction de la bande passante et amélioration des performances

### Ajout de LIMIT
- **Raison** : Évite de charger trop de données en mémoire
- **Impact** : Meilleure performance et expérience utilisateur

### Index Recommandés
- Index sur `products.price` pour le WHERE
- Index sur `products.created_at` pour le ORDER BY
- Index sur `products.category_id` pour le JOIN
```

### Exemple 3 : Requête avec Fonction dans WHERE

**Input :**
```sql
SELECT * FROM users 
WHERE YEAR(created_at) = 2024;
```

**Output (Requête Optimisée) :**
```sql
SELECT * FROM users 
WHERE created_at >= '2024-01-01' 
  AND created_at < '2025-01-01';
```

**Output (Explications) :**
```markdown
## Optimisations Appliquées

### Élimination de la Fonction dans WHERE
- **Avant** : `YEAR(created_at)` empêche l'utilisation d'index
- **Après** : Comparaison de plage de dates
- **Bénéfice** : L'index sur `created_at` peut être utilisé efficacement

### Performance
- **Amélioration estimée** : 70-90% plus rapide avec index
- **Utilisation d'index** : Range scan sur `created_at` au lieu de full table scan
```

## Limites

L'outil ne peut pas :
- Optimiser des requêtes pour des SGBD spécifiques avec syntaxe propriétaire non standard
- Prendre en compte les index existants dans la base de données (optimisations génériques)
- Optimiser des requêtes avec des fonctions personnalisées ou des procédures stockées
- Générer des requêtes de plus de 1500 tokens (limite de sécurité)
- Optimiser des requêtes nécessitant une connaissance du schéma complet de la base
- Prendre en compte les statistiques de la base de données (cardinalité, distribution)
- Optimiser des requêtes avec des vues complexes ou des CTE récursives

## Fonctionnalités

- Optimisation de requêtes SQL
- Explications markdown en streaming
- Affichage de la requête originale et optimisée
- Support OpenAI (GPT-4o-mini) et Gemini
- Validation des requêtes (70% de pertinence)
- Limite de sécurité : 1500 tokens

## Utilisation

1. Coller la requête SQL à optimiser dans le champ de saisie
2. Sélectionner le fournisseur IA (OpenAI ou Gemini)
3. Cliquer sur optimiser (Ctrl+Enter)
4. La requête optimisée apparaît à droite en streaming
5. Les explications apparaissent à gauche en markdown
6. Copier les requêtes avec le bouton de copie

## Layout

- **Gauche (70%)** : Explications markdown + Requête originale (copiable) + Textarea
- **Droite (30%)** : Requête optimisée (streaming)

## API

**Endpoint :** `/api/optimize-sql`

**Méthode :** POST

**Body :**
```json
{
  "query": "string",
  "provider": "openai" | "gemini",
  "mode": "optimize" | "explain"
}
```
