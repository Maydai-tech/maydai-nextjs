# Guide d'installation - Connexion MCP Supabase OVH

Guide simple pour configurer l'accès au serveur MCP Supabase hébergé sur OVH.

## Prérequis

- Un Mac (ce guide est pour macOS)
- Le mot de passe du serveur OVH (Hugo te le donnera)

## Étape 1 : Ouvrir le Terminal

1. Appuie sur `Cmd + Espace` pour ouvrir Spotlight
2. Tape "Terminal" et appuie sur Entrée

## Étape 2 : Créer une clé SSH (si pas déjà fait)

Dans le Terminal, copie-colle cette commande et appuie sur Entrée :

```bash
ls ~/.ssh/id_ed25519.pub
```

**Si tu vois un message d'erreur** "No such file or directory", tu dois créer une clé :

```bash
ssh-keygen -t ed25519
```

- Appuie sur Entrée 3 fois (accepte les valeurs par défaut, pas besoin de mot de passe)

## Étape 3 : Envoyer ta clé publique à Hugo

Copie ta clé avec cette commande :

```bash
cat ~/.ssh/id_ed25519.pub | pbcopy
```

Envoie le contenu (Cmd+V) à Hugo par Slack/email. Il l'ajoutera au serveur.

## Étape 4 : Tester la connexion

Une fois que Hugo confirme avoir ajouté ta clé, teste la connexion :

```bash
ssh ubuntu@57.130.47.254
```

Tu devrais voir un message de bienvenue du serveur. Tape `exit` pour te déconnecter.

## Étape 5 : Lancer le tunnel pour Claude Code

Chaque fois que tu veux utiliser le MCP Supabase avec Claude Code, lance cette commande **dans un Terminal séparé** (et laisse-le ouvert) :

```bash
ssh -L 8080:localhost:8000 ubuntu@57.130.47.254
```

⚠️ **Important** : Ce Terminal doit rester ouvert pendant que tu utilises Claude Code.

## Étape 6 : Configurer Claude Code

Ouvre le fichier de configuration Claude Code :

```bash
code ~/.claude/claude_desktop_config.json
```

Ou si tu n'as pas VS Code :

```bash
open -e ~/.claude/claude_desktop_config.json
```

Ajoute ou modifie la configuration pour inclure le MCP Supabase (Hugo te donnera la config exacte).

## Résumé des commandes quotidiennes

Chaque jour, pour utiliser le MCP :

1. Ouvre un Terminal
2. Lance : `ssh -L 8080:localhost:8000 ubuntu@57.130.47.254`
3. Laisse ce Terminal ouvert
4. Utilise Claude Code normalement

---

## Section Admin (Hugo uniquement)

### Ajouter une clé publique d'un utilisateur

Quand un utilisateur t'envoie sa clé publique SSH :

1. Connecte-toi au serveur OVH :

```bash
ssh ubuntu@57.130.47.254
```

2. Ouvre le fichier des clés autorisées :

```bash
nano ~/.ssh/authorized_keys
```

3. Ajoute la clé publique de l'utilisateur sur une nouvelle ligne à la fin du fichier

4. Sauvegarde et quitte :
   - `Ctrl + O` puis `Entrée` pour sauvegarder
   - `Ctrl + X` pour quitter

5. Confirme à l'utilisateur qu'il peut tester la connexion (étape 4 du guide)

---

## Dépannage

### "Connection refused" ou "Connection timed out"

- Vérifie ta connexion internet
- Vérifie que le serveur OVH est en ligne (contacte Hugo)

### "Permission denied (publickey)"

- Ta clé SSH n'a pas été ajoutée au serveur
- Refais l'étape 3 et contacte Hugo

### Le MCP ne fonctionne pas dans Claude Code

- Vérifie que le Terminal avec la commande SSH est toujours ouvert
- Relance la commande SSH si besoin
