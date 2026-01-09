# Network Troubleshooting Assistant

## Description

Assistant de dépannage réseau qui génère des guides complets avec commandes et explications.

## Contexte

**Problème résolu :** Résoudre les problèmes réseau nécessite une expertise approfondie en administration système et réseau. Les développeurs et administrateurs peuvent être confrontés à des problèmes complexes (connectivité, DNS, latence, configuration, etc.) sans savoir par où commencer. Cet outil génère des guides de dépannage complets avec des commandes exécutables et des explications détaillées, permettant de diagnostiquer et résoudre rapidement les problèmes réseau.

## Technique Utilisée

**Approche :** **Two-Step Zero-shot avec Persona et Extraction de Code**

**Étape 1 - Génération du Guide :**
- **Zero-shot** : Génération directe du guide sans exemples
- **Persona** : "You are a network and system administration expert" - Expertise en réseau et administration système
- **Instructions complètes** : Support de tous types de problèmes réseau, génération de diagnostics, commandes et solutions
- **Format markdown structuré** : Headers, listes, code blocks pour clarté

**Étape 2 - Extraction de Code (si détecté) :**
- **Zero-shot** : Extraction directe sans exemples
- **Persona** : "You are a code extraction assistant" - Spécialisé dans l'extraction
- **Instructions précises** : Extraction uniquement du code exécutable (commandes, scripts, configurations)
- **Temperature basse (0.3)** : Pour une extraction précise et reproductible
- **Détection automatique** : Le code est extrait seulement si des blocs de code sont détectés dans le guide

**Pourquoi cette approche :**
- La persona garantit des guides techniques précis et complets
- La séparation en deux étapes permet d'afficher d'abord le guide complet, puis d'extraire le code pour faciliter la copie
- La détection automatique évite les extractions inutiles
- Zero-shot est suffisant car les modèles comprennent bien les problèmes réseau et les commandes

## Évolution

**Version 1.0 (Initiale)**
- Génération de guides de dépannage réseau
- Support de tous types de problèmes réseau
- Layout 100% gauche (pas de section droite)
- Seuil de validation de 50% (plus permissif que les autres outils)

**Version 2.0 (Extraction de Code)**
- Détection automatique des blocs de code dans le guide
- Extraction automatique du code après génération du guide
- Affichage dynamique d'une section droite (30%) avec le code extrait
- Layout adaptatif : 100% gauche si pas de code, 70%/30% si code détecté

**Version 3.0 (Améliorations UX)**
- Bouton collapse/expand pour la section gauche
- Streaming du code extrait en temps réel
- Transitions fluides entre les états de layout
- Interface cohérente avec les autres outils

## Exemples

### Exemple 1 : Problème de Connectivité

**Input :**
```
I can't connect to a remote server at 192.168.1.100 on port 22
```

**Output (Guide) :**
```markdown
## Diagnostic de Connectivité

### Étape 1 : Vérifier la Connectivité de Base
Vérifiez si le serveur répond aux pings.

### Étape 2 : Tester le Port Spécifique
Testez si le port 22 (SSH) est accessible.

### Étape 3 : Vérifier le Pare-feu
Vérifiez les règles de pare-feu qui pourraient bloquer la connexion.

### Solutions Possibles
1. Vérifiez que le service SSH est en cours d'exécution sur le serveur
2. Vérifiez les règles de pare-feu (iptables, firewalld, ufw)
3. Vérifiez la configuration réseau (routing, gateway)
```

**Output (Code Extrait) :**
```bash
ping -c 4 192.168.1.100
nc -zv 192.168.1.100 22
telnet 192.168.1.100 22
sudo iptables -L -n | grep 22
sudo systemctl status sshd
```

### Exemple 2 : Problème DNS

**Input :**
```
DNS resolution is not working, can't resolve google.com
```

**Output (Guide) :**
```markdown
## Diagnostic DNS

### Étape 1 : Test de Résolution DNS
Testez la résolution DNS avec différentes méthodes.

### Étape 2 : Vérifier les Serveurs DNS
Vérifiez la configuration des serveurs DNS.

### Étape 3 : Vérifier la Connectivité
Assurez-vous que les serveurs DNS sont accessibles.

### Solutions
1. Vérifiez la configuration DNS dans /etc/resolv.conf
2. Testez avec différents serveurs DNS (8.8.8.8, 1.1.1.1)
3. Redémarrez le service de résolution DNS
```

**Output (Code Extrait) :**
```bash
nslookup google.com
dig google.com
host google.com
cat /etc/resolv.conf
ping -c 4 8.8.8.8
sudo systemctl restart systemd-resolved
```

### Exemple 3 : Problème de Latence

**Input :**
```
High latency when connecting to a remote API, response times are very slow
```

**Output (Guide) :**
```markdown
## Diagnostic de Latence

### Étape 1 : Mesurer la Latence
Utilisez traceroute pour identifier où se produit la latence.

### Étape 2 : Vérifier la Bande Passante
Testez la bande passante disponible.

### Étape 3 : Analyser le Trafic
Analysez le trafic réseau pour identifier les goulots d'étranglement.

### Solutions
1. Vérifiez la qualité de la connexion réseau
2. Identifiez les routeurs qui ajoutent de la latence
3. Vérifiez la charge du serveur distant
4. Considérez l'utilisation d'un CDN ou d'un proxy
```

**Output (Code Extrait) :**
```bash
ping -c 10 api.example.com
traceroute api.example.com
mtr api.example.com
curl -w "@-" -o /dev/null -s https://api.example.com <<'EOF'
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_starttransfer:  %{time_starttransfer}\n
time_total:  %{time_total}\n
EOF
netstat -i
iftop
```

## Limites

L'outil ne peut pas :
- Résoudre des problèmes nécessitant un accès physique à l'équipement réseau
- Générer des guides pour des problèmes spécifiques à des équipements réseau propriétaires non documentés
- Prendre en compte des configurations réseau complexes non mentionnées dans la description
- Générer des guides de plus de 2000 tokens (limite de sécurité)
- Générer des commandes pour des systèmes d'exploitation non spécifiés (assume Linux/Unix par défaut)
- Résoudre des problèmes nécessitant des privilèges root sans indication claire
- Générer des guides pour des problèmes de sécurité avancés nécessitant une expertise spécialisée

## Types de Problèmes Supportés

- Connectivité (ping, traceroute, DNS)
- Latence et performance
- Configuration réseau (IP, subnet, gateway)
- Ports et services
- Pare-feu et sécurité
- Tous les problèmes réseau

## Utilisation

1. Décrire le problème réseau ou coller une commande réseau
2. Sélectionner le fournisseur IA (OpenAI ou Gemini)
3. Cliquer sur dépanner (Ctrl+Enter)
4. Le guide de dépannage apparaît en streaming à gauche
5. Si du code est détecté, il apparaît automatiquement à droite (30%)
6. Copier les commandes avec le bouton de copie

## Layout

- **Sans code** : Section gauche 100% (guide de dépannage)
- **Avec code** : Section gauche 70% (guide) + Section droite 30% (code extrait)

## API

**Endpoint :** `/api/network-troubleshooting`

**Méthode :** POST

**Body :**
```json
{
  "description": "string",
  "provider": "openai" | "gemini",
  "mode": "troubleshoot" | "extract-code"
}
```
