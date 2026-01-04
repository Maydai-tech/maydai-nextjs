# Tests E2E - Configuration

## Vue d'ensemble

Les tests E2E (End-to-End) sont executes automatiquement via GitHub Actions sur les branches `dev` et `preprod`. Ils utilisent **Playwright** avec Chromium.

## Declenchement

Le workflow s'execute :
- A chaque push sur `dev` ou `preprod`
- A chaque pull request vers `preprod` ou `main`
- Manuellement via l'onglet Actions de GitHub

## Configuration

| Fichier | Description |
|---------|-------------|
| `.github/workflows/e2e-tests.yml` | Workflow GitHub Actions |
| `playwright.config.ts` | Configuration Playwright |
| `e2e/` | Dossier contenant les tests |

## Rapports

Apres chaque execution :
1. **Artifact GitHub** : rapport conserve 7 jours dans l'onglet Actions
2. **Serveur OVH** : rapport HTML accessible a `http://57.130.47.254:8080/{run_id}/`
3. **Notification Slack** : resume des resultats avec lien vers le rapport

Les rapports sur le serveur OVH sont **supprimes automatiquement apres 24h** (cron job).

## Secrets requis

| Secret | Description |
|--------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cle anonyme Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Cle service Supabase |
| `SLACK_WEBHOOK_URL` | Webhook Slack pour notifications |
| `OVH_SSH_KEY` | Cle SSH (base64) pour deployer les rapports |
| `OPENAI_API_KEY` | (optionnel) Pour les features IA |
| `STRIPE_SECRET_KEY` | (optionnel) Pour les features Stripe |

## Serveur OVH

- **IP** : 57.130.47.254
- **Utilisateur** : ubuntu
- **Repertoire des rapports** : `/var/www/e2e-reports/`
- **Port nginx** : 8080
- **Cron de nettoyage** : tous les jours a minuit (supprime les rapports > 24h)

## Lancer les tests en local

```bash
# Installer les navigateurs
npx playwright install chromium

# Lancer les tests
npx playwright test

# Voir le rapport
npx playwright show-report
```
