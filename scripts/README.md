# Claude Issue Automation - Scripts MaydAI

Ce dossier contient l'automation pour traiter automatiquement les issues GitHub avec Claude Code.

## 🎯 Vue d'ensemble

Le script `claude-issue.sh` permet d'automatiser complètement le workflow :
1. **Récupérer une issue GitHub**
2. **Créer un worktree dédié**
3. **Lancer Claude Code pour traiter l'issue**
4. **Commiter les changements**
5. **Créer une Pull Request**

## ⚡ Usage rapide

```bash
# Traiter une issue
npm run claude:issue 123

# Ou directement
./scripts/claude-issue.sh 123

# Mode automatique (sans confirmations)
./scripts/claude-issue.sh 123 --auto

# Tester avant exécution
./scripts/claude-issue.sh 123 --dry-run
```

## 📋 Prérequis

### Outils requis
- **Git** : Gestion des branches et worktrees
- **GitHub CLI** (`gh`) : Récupération des issues et création des PR
- **Claude Code** : Traitement automatique de l'issue
- **Node.js/npm** : Optionnel, pour utiliser le script npm

### Installation des outils

```bash
# GitHub CLI
brew install gh
gh auth login

# Claude Code
npm install -g @anthropic-ai/claude-code

# Vérifier les installations
gh --version
claude --version
```

### Authentification

#### GitHub CLI
```bash
# GitHub CLI doit être authentifié
gh auth login
gh auth status
```

#### Claude Code
Le script détecte automatiquement votre méthode d'authentification Claude :

**Option 1 : Session interactive (recommandé)**
```bash
# Si vous êtes déjà connecté à Claude Code
claude
# Dans Claude, tapez: /login
```

**Option 2 : Token long-durée**
```bash
claude setup-token
```

**Option 3 : API Key (pour CI/CD)**
```bash
export ANTHROPIC_API_KEY="your_api_key_here"
```

⚡ **Le script fonctionne automatiquement si vous êtes connecté à Claude Code !**

#### Test de l'authentification
```bash
# Le script détecte automatiquement votre méthode d'auth
./scripts/claude-issue.sh 123 --dry-run --verbose

# Résultat typique si vous êtes connecté:
# [SUCCESS] Claude authentifié via session
# [INFO] Mode DRY-RUN activé...
```

## 🔧 Options disponibles

| Option | Description |
|--------|-------------|
| `--auto` | Mode automatique sans confirmation utilisateur |
| `--dry-run` | Affiche ce qui sera fait sans rien exécuter |
| `--verbose` | Logs détaillés pour debugging |
| `--no-worktree` | Travaille dans la branche courante (pas de worktree) |
| `--help` | Affiche l'aide |

## 📁 Structure des fichiers

```
scripts/
├── claude-issue.sh              # Script principal
├── lib/
│   ├── github-utils.sh          # Fonctions GitHub (issues, PR)
│   └── claude-utils.sh          # Fonctions Claude Code
├── templates/
│   └── claude-prompt.txt        # Template du prompt Claude
└── README.md                    # Cette documentation

logs/
└── claude-issue/                # Logs d'exécution
    ├── claude-issue-YYYYMMDD.log
    ├── prompt-YYYYMMDD-HHMMSS.txt
    └── claude-output-YYYYMMDD-HHMMSS.json
```

## 🔄 Workflow détaillé

### 1. Récupération de l'issue
- Utilise `gh issue view <number>` pour récupérer les détails
- Extrait titre, description, labels, assignés
- Vérifie que l'issue est ouverte

### 2. Préparation de l'environnement
- Génère un nom de branche : `issue-123-titre-de-l-issue`
- Crée un worktree dans `../issue-123/` (ou travaille sur place avec `--no-worktree`)
- Vérifie les conflits potentiels

### 3. Génération du prompt
- Utilise le template dans `templates/claude-prompt.txt`
- Remplace les variables : `{{ISSUE_NUMBER}}`, `{{ISSUE_TITLE}}`, `{{ISSUE_BODY}}`
- Ajoute le contexte du projet (CLAUDE.md)

### 4. Exécution Claude Code
```bash
claude \
  --print \
  --output-format json \
  --dangerously-skip-permissions \
  --max-turns 10 \
  "$(prompt généré)"
```

### 5. Commit et PR
- Vérifie que des changements ont été faits
- Commit automatique avec message standardisé
- Pousse la branche vers origin
- Crée la PR avec `gh pr create`
- Lie automatiquement la PR à l'issue

## 📝 Exemples d'utilisation

### Cas d'usage standard
```bash
# Traiter l'issue #456 avec confirmations
./scripts/claude-issue.sh 456

# Mode automatique pour CI/CD
./scripts/claude-issue.sh 456 --auto
```

### Debugging
```bash
# Voir ce qui va être fait
./scripts/claude-issue.sh 456 --dry-run --verbose

# Logs détaillés pendant l'exécution
./scripts/claude-issue.sh 456 --verbose
```

### Workflows spéciaux
```bash
# Travailler dans la branche courante (pas de worktree)
./scripts/claude-issue.sh 456 --no-worktree

# Via npm (plus court)
npm run claude:issue 456
```

## 🚨 Gestion des erreurs

### Erreurs communes

1. **Issue non trouvée**
   ```
   ERROR: L'issue #123 n'existe pas ou n'est pas accessible
   ```
   → Vérifier le numéro d'issue et l'authentification GitHub

2. **Authentification Claude échouée**
   ```
   ERROR: Claude Code n'est pas correctement authentifié
   ```
   → Le script propose automatiquement les solutions d'authentification

3. **Modifications non commitées**
   ```
   WARNING: Des modifications non commitées ont été détectées
   ```
   → Commiter ou stasher les changements, ou utiliser `--no-worktree`

4. **Branche existe déjà**
   ```
   WARNING: La branche issue-123-titre existe déjà
   ```
   → Le script demande confirmation pour continuer

### Récupération automatique

En cas d'erreur :
- Les worktrees temporaires sont automatiquement nettoyés
- Les logs sont sauvegardés dans `logs/claude-issue/`
- Le script propose de supprimer les artefacts créés

## 🔧 Configuration avancée

### Personnaliser le prompt

Éditez `scripts/templates/claude-prompt.txt` pour :
- Ajouter des instructions spécifiques au projet
- Modifier le format du prompt
- Inclure plus de contexte

### Variables de template disponibles
- `{{ISSUE_NUMBER}}` : Numéro de l'issue
- `{{ISSUE_TITLE}}` : Titre de l'issue
- `{{ISSUE_BODY}}` : Description complète
- `{{ISSUE_URL}}` : URL de l'issue sur GitHub

### Modifier les conventions de nommage

Dans `lib/github-utils.sh`, fonction `generate_branch_name()` :
```bash
# Changer le préfixe des branches
echo "feature-${issue_number}-${clean_title}"  # au lieu de "issue-"
```

## 📊 Logs et monitoring

### Types de logs
- **Logs principaux** : `logs/claude-issue/claude-issue-YYYYMMDD.log`
- **Prompts sauvés** : `logs/claude-issue/prompt-YYYYMMDD-HHMMSS.txt` (mode verbose)
- **Sorties Claude** : `logs/claude-issue/claude-output-YYYYMMDD-HHMMSS.json` (mode verbose)

### Niveaux de logs
- `ERROR` : Erreurs bloquantes
- `WARNING` : Avertissements
- `SUCCESS` : Opérations réussies
- `INFO` : Informations générales
- `DEBUG` : Détails (mode verbose uniquement)

## 🔒 Sécurité

### Bonnes pratiques
- **API Keys** : Toujours utiliser des variables d'environnement
- **Permissions** : Le script utilise `--dangerously-skip-permissions` pour l'automation
- **Isolation** : Les worktrees isolent les changements
- **Revue** : Toujours vérifier les changements avant de merger la PR

### Isolation des changements
- Chaque issue est traitée dans un worktree isolé
- Pas d'impact sur la branche de travail principale
- Nettoyage automatique en cas d'erreur

## 🚀 Intégration CI/CD

### GitHub Actions
```yaml
name: Auto-process issues
on:
  issues:
    types: [labeled]

jobs:
  auto-process:
    if: contains(github.event.issue.labels.*.name, 'auto-claude')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Claude
        run: npm install -g @anthropic-ai/claude-code
      - name: Process issue
        run: ./scripts/claude-issue.sh ${{ github.event.issue.number }} --auto
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Hooks Git
Ajoutez dans `.git/hooks/post-receive` pour traiter automatiquement les issues mentionnées dans les commits.

## 🛠️ Développement et contribution

### Tester les modifications
```bash
# Vérifier la syntaxe
bash -n scripts/claude-issue.sh
bash -n scripts/lib/*.sh

# Tester en dry-run
./scripts/claude-issue.sh 123 --dry-run --verbose
```

### Structure des fonctions
- `claude-issue.sh` : Orchestration principale
- `github-utils.sh` : Interactions avec GitHub (issues, PR, branches)
- `claude-utils.sh` : Exécution et parsing de Claude Code

### Ajouter de nouvelles fonctionnalités
1. Modifier le script principal pour ajouter des options
2. Implémenter la logique dans les fichiers lib/
3. Tester avec `--dry-run`
4. Mettre à jour cette documentation

---

**💡 Tip** : Commencez toujours par `--dry-run` pour voir ce qui va être fait avant l'exécution réelle !