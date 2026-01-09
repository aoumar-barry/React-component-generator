# Unit Test Generator

## Description

Générateur de tests unitaires pour différents langages de programmation avec détection automatique de langage.

## Contexte

**Problème résolu :** Écrire des tests unitaires est souvent fastidieux et répétitif. Les développeurs doivent connaître les frameworks de tests spécifiques à chaque langage et suivre les conventions appropriées. Cet outil automatise cette tâche en détectant automatiquement le langage du code fourni et en générant des tests unitaires complets avec le framework approprié, réduisant ainsi le temps de développement et améliorant la couverture de tests.

## Technique Utilisée

**Approche :** **Two-Step Zero-shot avec Persona et Instructions Spécifiques**

**Étape 1 - Détection de Langage :**
- **Zero-shot** : Aucun exemple fourni, le modèle analyse directement le code
- **Persona** : "You are a code language detector" - Rôle spécialisé pour l'analyse
- **Temperature basse (0.1)** : Pour une détection précise et reproductible
- **Format JSON structuré** : Retour standardisé avec langage, framework et nom d'affichage

**Étape 2 - Génération de Tests :**
- **Zero-shot** : Génération directe sans exemples
- **Persona** : "You are an expert in writing unit tests" - Expertise en tests
- **Instructions spécifiques par framework** : Chaque framework (Jest, pytest, JUnit 5, etc.) a ses propres instructions détaillées
- **Contexte dynamique** : Le langage et framework détectés sont injectés dans le prompt

**Pourquoi cette approche :**
- La détection en deux étapes garantit la précision (meilleure que la détection par patterns)
- Les instructions spécifiques par framework assurent des tests conformes aux conventions
- Zero-shot est suffisant car les modèles modernes comprennent bien les patterns de tests
- La température basse pour la détection évite les erreurs de classification

## Évolution

**Version 1.0 (Initiale)**
- Détection de langage par patterns (regex)
- Génération basique de tests
- Support limité de langages

**Version 2.0 (Détection par IA)**
- Remplacement de la détection par patterns par une détection par IA
- Processus en deux étapes : détection puis génération
- Amélioration significative de la précision de détection
- Support de 6 langages avec frameworks appropriés

**Version 3.0 (Améliorations UX)**
- Affichage de la détection de langage en temps réel
- Suppression de la détection preview (affichage uniquement après réponse du modèle)
- Correction des problèmes d'hydratation React
- Interface cohérente avec les autres outils

## Exemples

### Exemple 1 : Fonction JavaScript

**Input :**
```javascript
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
```

**Output (Détection) :**
```json
{
  "language": "javascript",
  "framework": "Jest",
  "displayName": "JavaScript (Jest)"
}
```

**Output (Tests) :**
```javascript
import { calculateTotal } from './calculator';

describe('calculateTotal', () => {
  it('should return 0 for empty array', () => {
    expect(calculateTotal([])).toBe(0);
  });

  it('should calculate total for single item', () => {
    const items = [{ price: 10, quantity: 2 }];
    expect(calculateTotal(items)).toBe(20);
  });

  it('should calculate total for multiple items', () => {
    const items = [
      { price: 10, quantity: 2 },
      { price: 5, quantity: 3 }
    ];
    expect(calculateTotal(items)).toBe(35);
  });

  it('should handle zero price', () => {
    const items = [{ price: 0, quantity: 5 }];
    expect(calculateTotal(items)).toBe(0);
  });
});
```

### Exemple 2 : Classe Python

**Input :**
```python
class Calculator:
    def add(self, a, b):
        return a + b
    
    def divide(self, a, b):
        if b == 0:
            raise ValueError("Cannot divide by zero")
        return a / b
```

**Output (Détection) :**
```json
{
  "language": "python",
  "framework": "pytest",
  "displayName": "Python (pytest)"
}
```

**Output (Tests) :**
```python
import pytest
from calculator import Calculator

def test_add():
    calc = Calculator()
    assert calc.add(2, 3) == 5
    assert calc.add(-1, 1) == 0
    assert calc.add(0, 0) == 0

def test_divide():
    calc = Calculator()
    assert calc.divide(10, 2) == 5
    assert calc.divide(9, 3) == 3

def test_divide_by_zero():
    calc = Calculator()
    with pytest.raises(ValueError, match="Cannot divide by zero"):
        calc.divide(10, 0)
```

### Exemple 3 : Fonction Go

**Input :**
```go
package utils

func Max(a, b int) int {
    if a > b {
        return a
    }
    return b
}
```

**Output (Détection) :**
```json
{
  "language": "go",
  "framework": "Testing",
  "displayName": "Go (Testing)"
}
```

**Output (Tests) :**
```go
package utils

import "testing"

func TestMax(t *testing.T) {
    tests := []struct {
        name string
        a    int
        b    int
        want int
    }{
        {"a greater than b", 5, 3, 5},
        {"b greater than a", 2, 8, 8},
        {"equal values", 4, 4, 4},
        {"negative numbers", -5, -2, -2},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            if got := Max(tt.a, tt.b); got != tt.want {
                t.Errorf("Max(%d, %d) = %d, want %d", tt.a, tt.b, got, tt.want)
            }
        })
    }
}
```

## Limites

L'outil ne peut pas :
- Générer des tests d'intégration ou des tests end-to-end (seulement tests unitaires)
- Tester du code nécessitant des mocks complexes de services externes
- Générer des tests pour du code nécessitant une configuration spécifique non fournie
- Détecter des langages non supportés (seulement 6 langages : JS/TS, Python, Java, C#, Go, Ruby)
- Générer des tests de plus de 1000 tokens (limite de sécurité)
- Analyser du code de plus de 1000 caractères pour la détection (tronqué)
- Générer des tests pour du code avec des dépendances externes non spécifiées

## Langages et Frameworks Supportés

- **JavaScript/TypeScript** : Jest
- **Python** : pytest
- **Java** : JUnit 5
- **C#** : xUnit
- **Go** : Testing package
- **Ruby** : RSpec

## Utilisation

1. Coller le code à tester dans le champ de saisie
2. Sélectionner le fournisseur IA (OpenAI ou Gemini)
3. Cliquer sur générer
4. Le langage est détecté automatiquement
5. Les tests unitaires sont générés en streaming

## API

**Endpoint :** `/api/generate-unit-tests`

**Méthode :** POST

**Body :**
```json
{
  "code": "string",
  "provider": "openai" | "gemini"
}
```
