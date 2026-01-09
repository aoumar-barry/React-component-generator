# Dockerfile Generator

## Description

Générateur de Dockerfiles optimisés pour tous types d'applications.

## Contexte

**Problème résolu :** Créer des Dockerfiles optimisés nécessite une connaissance approfondie des meilleures pratiques Docker (multi-stage builds, sécurité, gestion des couches, cache, etc.). Les développeurs peuvent créer des Dockerfiles fonctionnels mais non optimisés, ce qui entraîne des images plus lourdes, des builds plus lents et des problèmes de sécurité. Cet outil automatise la génération de Dockerfiles optimisés à partir d'une simple description d'application, garantissant des images efficaces et sécurisées.

## Technique Utilisée

**Approche :** **Zero-shot avec Persona et Instructions Structurées**

- **Persona** : "You are a Docker and containerization expert" - Expertise en Docker et containerisation
- **Zero-shot** : Génération directe sans exemples fournis
- **Instructions structurées** : Liste claire des optimisations à appliquer (multi-stage builds, images minimales, sécurité, etc.)
- **Contraintes strictes** : Retour uniquement du Dockerfile (pas d'explications, pas de markdown)
- **Validation préalable** : Seuil de pertinence de 70% pour filtrer les requêtes non pertinentes

**Pourquoi cette approche :**
- La persona garantit l'application des meilleures pratiques Docker
- Zero-shot est suffisant car les modèles comprennent bien les patterns Docker
- Les instructions structurées assurent la cohérence des optimisations
- La limite de 200 tokens force la concision (Dockerfiles peuvent être courts mais efficaces)

## Évolution

**Version 1.0 (Initiale)**
- Génération basique de Dockerfiles
- Support de tous types d'applications
- Optimisations essentielles (multi-stage quand bénéfique, sécurité, cache)
- Limite de 200 tokens (plus restrictive que les autres outils)

**Version 2.0 (Corrections Interface)**
- Correction du problème d'affichage de la sidebar droite
- Amélioration du layout et des transitions
- Interface cohérente avec les autres outils

**Version 3.0 (Améliorations UX)**
- Bouton collapse/expand pour agrandir le panneau de code
- Nettoyage automatique du textarea après soumission
- Guide d'attention avec animation
- Gestion d'erreurs robuste

## Exemples

### Exemple 1 : Application Node.js

**Input :**
```
A Node.js application with Express, needs to run on port 3000
```

**Output :**
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
COPY --from=builder /app/node_modules ./node_modules
COPY . .
USER nodejs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
CMD ["node", "index.js"]
```

### Exemple 2 : Application Python Django

**Input :**
```
Python Django application with PostgreSQL database
```

**Output :**
```dockerfile
FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
RUN groupadd -r django && useradd -r -g django django
COPY --from=builder /root/.local /home/django/.local
COPY . .
ENV PATH=/home/django/.local/bin:$PATH
USER django
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

### Exemple 3 : Application Go

**Input :**
```
Go application that compiles to a single binary
```

**Output :**
```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/main .

FROM alpine:latest
RUN apk --no-cache add ca-certificates && \
    addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /root/
COPY --from=builder /app/main .
USER appuser
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1
CMD ["./main"]
```

## Limites

L'outil ne peut pas :
- Générer des fichiers supplémentaires (.dockerignore, docker-compose.yml)
- Prendre en compte des configurations spécifiques non mentionnées dans la description
- Générer des Dockerfiles de plus de 200 tokens (limite de sécurité)
- Générer des Dockerfiles pour des applications nécessitant des dépendances système complexes non spécifiées
- Optimiser pour des architectures spécifiques (ARM, etc.) sans indication
- Générer des Dockerfiles avec des secrets ou des configurations sensibles (recommandations de sécurité seulement)

## Fonctionnalités

- Génération de Dockerfiles optimisés
- Support de tous types d'applications (Node.js, Python, Java, Go, etc.)
- Optimisations : multi-stage builds, sécurité, cache
- Support OpenAI (GPT-4o-mini) et Gemini
- Validation des requêtes (70% de pertinence)
- Limite de sécurité : 200 tokens

## Utilisation

1. Décrire l'application pour laquelle générer un Dockerfile
2. Sélectionner le fournisseur IA (OpenAI ou Gemini)
3. Cliquer sur générer
4. Le Dockerfile optimisé apparaît en streaming
5. Copier le Dockerfile avec le bouton de copie

## Optimisations Appliquées

- Multi-stage builds (quand bénéfique)
- Images de base minimales (alpine, distroless)
- Utilisateur non-root
- Health checks
- Optimisation des couches de cache
- Bonnes pratiques de sécurité

## API

**Endpoint :** `/api/generate-dockerfile`

**Méthode :** POST

**Body :**
```json
{
  "description": "string",
  "provider": "openai" | "gemini"
}
```
