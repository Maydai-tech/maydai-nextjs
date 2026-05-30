# Refonte du workflow d'exécution des tests E2E — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer l'unique workflow E2E par 3 régimes — push preprod (non-bloquant), PR preprod→main (bloquant), nightly prod — partageant un workflow réutilisable, avec exclusion des tests à API payante hors nightly.

**Architecture:** Un reusable workflow `e2e-reusable.yml` (`workflow_call`) porte toute la logique (checkout au bon `ref`, install, run Playwright filtré par tags, parsing, rapport OVH, notif Slack, échec conditionnel). Trois callers minces le déclenchent avec des paramètres distincts. Un seul tag `@prod` est posé dans le code (4 specs critiques) ; `@nightly-only` est prévu mais non encore utilisé.

**Tech Stack:** GitHub Actions (`workflow_call`), Playwright 1.57 (`--grep` / `--grep-invert`, option `tag`), Node 22, pnpm 11.1.3, `slackapi/slack-github-action@v2.0.0`.

**Spec source:** `docs/superpowers/specs/2026-05-29-e2e-test-workflow-redesign-design.md`

**Règle projet importante:** Hugo lance les tests E2E lui-même. Les commandes de vérification de ce plan utilisent **uniquement** `playwright test --list` (collecte des tests, **aucune exécution**, **aucun serveur lancé**) et de la validation YAML. Aucune étape ne lance la suite E2E ni `npm run dev`.

---

## Structure des fichiers

| Fichier | Action | Responsabilité |
|---------|--------|----------------|
| `.github/workflows/e2e-reusable.yml` | Créer | Logique partagée appelée via `workflow_call`. |
| `.github/workflows/e2e-preprod.yml` | Créer | Caller : push sur `preprod`, non-bloquant, cible preprod. |
| `.github/workflows/e2e-main-gate.yml` | Créer | Caller : PR `preprod→main`, bloquant, cible preprod. |
| `.github/workflows/e2e-nightly.yml` | Créer | Caller : cron nocturne, cible prod, toute la suite. |
| `e2e/auth/signup.spec.ts` | Modifier | Ajouter tag `@prod` au `describe`. |
| `e2e/scoring/standard.spec.ts` | Modifier | Ajouter tag `@prod` au `describe`. |
| `e2e/usecase/lifecycle.spec.ts` | Modifier | Ajouter tag `@prod` au `describe`. |
| `e2e/account/deletion.spec.ts` | Modifier | Ajouter tag `@prod` au `describe`. |
| `.github/workflows/e2e-tests.yml` | Supprimer | Remplacé par les 4 fichiers ci-dessus. |

> **Action manuelle hors-code (Hugo, après merge) :** dans GitHub → Settings → Branch protection de `main`, retirer le check requis `e2e-tests` et ajouter `E2E (main-gate)` comme check requis. Vérifier aussi que `VERCEL_AUTOMATION_BYPASS_SECRET` est valide pour `preprod.maydai.io`.

---

## Task 1 : Tagger `@prod` les 4 specs critiques

**Files:**
- Modify: `e2e/auth/signup.spec.ts`
- Modify: `e2e/scoring/standard.spec.ts`
- Modify: `e2e/usecase/lifecycle.spec.ts`
- Modify: `e2e/account/deletion.spec.ts`

- [ ] **Step 1 : Vérifier l'état initial (aucun test taggé `@prod`)**

Run (collecte seulement, n'exécute rien, ne lance pas de serveur) :
```bash
npx playwright test --list --grep @prod 2>&1 | tail -5
```
Expected : `Total: 0 tests in 0 files` (ou équivalent « no tests found »). C'est le « test qui échoue » : aucun spec n'est encore taggé.

- [ ] **Step 2 : Repérer la ligne `test.describe` de premier niveau dans chaque spec**

Run :
```bash
grep -n "^test.describe(" e2e/auth/signup.spec.ts e2e/scoring/standard.spec.ts e2e/usecase/lifecycle.spec.ts e2e/account/deletion.spec.ts
```
Expected : une ligne `test.describe('...', () => {` par fichier (describe de premier niveau, sans option). Note : `test.describe.configure(...)` n'est PAS un describe à tagger — l'ignorer.

- [ ] **Step 3 : Ajouter le tag `@prod` au describe de premier niveau de chaque spec**

Transformer, dans chaque fichier, le describe de premier niveau de la forme :
```ts
test.describe('Titre existant', () => {
```
en :
```ts
test.describe('Titre existant', { tag: ['@prod'] }, () => {
```
Conserver le titre exact existant de chaque fichier ; n'ajouter que le 2e argument `{ tag: ['@prod'] }`. Ne toucher qu'au **premier** `test.describe(` de chaque fichier (le describe racine), pas aux describes imbriqués éventuels ni à `test.describe.configure`.

- [ ] **Step 4 : Vérifier que les 4 fichiers (et seulement eux) matchent `@prod`**

Run :
```bash
npx playwright test --list --grep @prod 2>&1 | grep -E "\.spec\.ts" | sed -E 's/.*(e2e\/[^:]+\.spec\.ts).*/\1/' | sort -u
```
Expected : exactement ces 4 chemins —
```
e2e/account/deletion.spec.ts
e2e/auth/signup.spec.ts
e2e/scoring/standard.spec.ts
e2e/usecase/lifecycle.spec.ts
```

- [ ] **Step 5 : Vérifier que l'exclusion `@nightly-only` ne retire encore rien (mécanisme prêt, aucun tag posé)**

Run :
```bash
A=$(npx playwright test --list 2>&1 | grep -c "\.spec\.ts")
B=$(npx playwright test --list --grep-invert @nightly-only 2>&1 | grep -c "\.spec\.ts")
echo "total=$A sans_nightly_only=$B"
```
Expected : `total` == `sans_nightly_only` (aucun test n'est `@nightly-only` aujourd'hui, donc l'exclusion ne change rien). C'est le comportement attendu décrit dans la spec §4.

- [ ] **Step 6 : Commit**

```bash
git add e2e/auth/signup.spec.ts e2e/scoring/standard.spec.ts e2e/usecase/lifecycle.spec.ts e2e/account/deletion.spec.ts
git commit -m "test(e2e): tag @prod sur les 4 specs critiques du gate main

signup, scoring/standard, usecase/lifecycle, account/deletion.
Sélectionnées par le régime bloquant PR preprod->main.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2 : Créer le reusable workflow `e2e-reusable.yml`

**Files:**
- Create: `.github/workflows/e2e-reusable.yml`

- [ ] **Step 1 : Créer le fichier avec ce contenu intégral**

```yaml
name: E2E Reusable

on:
  workflow_call:
    inputs:
      base_url:
        description: 'URL testée (PLAYWRIGHT_BASE_URL)'
        required: true
        type: string
      ref:
        description: 'Ref git à checkout (doit matcher le code déployé sur base_url)'
        required: true
        type: string
      use_bypass:
        description: 'Injecter le header x-vercel-protection-bypass (env protégé)'
        required: false
        type: boolean
        default: false
      grep_tag:
        description: 'Tag Playwright à inclure (--grep)'
        required: false
        type: string
        default: ''
      grep_invert:
        description: 'Tag Playwright à exclure (--grep-invert)'
        required: false
        type: string
        default: ''
      blocking:
        description: 'Faire échouer le job si des tests échouent'
        required: false
        type: boolean
        default: false
      regime_label:
        description: 'Libellé du régime (preprod / main-gate / nightly)'
        required: true
        type: string

permissions:
  contents: read

jobs:
  e2e:
    name: E2E (${{ inputs.regime_label }})
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          ref: ${{ inputs.ref }}

      - name: Resolve context
        id: ctx
        run: |
          echo "sha=$(git rev-parse HEAD)" >> "$GITHUB_OUTPUT"
          echo "short_sha=$(git rev-parse --short HEAD)" >> "$GITHUB_OUTPUT"

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install dependencies
        run: |
          corepack enable
          corepack prepare pnpm@11.1.3 --activate
          pnpm install --frozen-lockfile

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium

      - name: Run E2E tests
        id: e2e
        continue-on-error: true
        # ==============================================================================
        # WARNING: ARCHITECTURE RULE. Les tests injectent/suppriment des données via le
        # SERVICE_ROLE_KEY. La base Supabase est unique (préprod = prod). Les tests
        # créent des données identifiables (@maydai-test.com) et les nettoient par ID.
        # ==============================================================================
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          PLAYWRIGHT_BASE_URL: ${{ inputs.base_url }}
          VERCEL_AUTOMATION_BYPASS_SECRET: ${{ inputs.use_bypass && secrets.VERCEL_AUTOMATION_BYPASS_SECRET || '' }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
          GREP_TAG: ${{ inputs.grep_tag }}
          GREP_INVERT: ${{ inputs.grep_invert }}
        run: |
          ARGS=()
          if [ -n "$GREP_TAG" ]; then ARGS+=(--grep "$GREP_TAG"); fi
          if [ -n "$GREP_INVERT" ]; then ARGS+=(--grep-invert "$GREP_INVERT"); fi
          echo "Running: playwright test ${ARGS[*]}"
          pnpm exec playwright test "${ARGS[@]}"
          echo "Tests completed"

      - name: Parse test results
        if: always() && steps.e2e.outcome != 'skipped'
        id: parse-results
        run: |
          if [ -f test-results.json ]; then
            echo "Found test-results.json, parsing..."

            PASSED=$(cat test-results.json | jq '[.suites[].suites[]?.specs[]?.tests[]? | select(.status == "expected")] | length' 2>/dev/null || echo "0")
            FAILED=$(cat test-results.json | jq '[.suites[].suites[]?.specs[]?.tests[]? | select(.status == "unexpected")] | length' 2>/dev/null || echo "0")
            SKIPPED=$(cat test-results.json | jq '[.suites[].suites[]?.specs[]?.tests[]? | select(.status == "skipped")] | length' 2>/dev/null || echo "0")
            FLAKY=$(cat test-results.json | jq '[.suites[].suites[]?.specs[]?.tests[]? | select(.status == "flaky")] | length' 2>/dev/null || echo "0")

            if [ "$PASSED" = "0" ] && [ "$FAILED" = "0" ] && [ "$SKIPPED" = "0" ]; then
              PASSED=$(cat test-results.json | jq '[.suites[].specs[]?.tests[]? | select(.status == "expected")] | length' 2>/dev/null || echo "0")
              FAILED=$(cat test-results.json | jq '[.suites[].specs[]?.tests[]? | select(.status == "unexpected")] | length' 2>/dev/null || echo "0")
              SKIPPED=$(cat test-results.json | jq '[.suites[].specs[]?.tests[]? | select(.status == "skipped")] | length' 2>/dev/null || echo "0")
              FLAKY=$(cat test-results.json | jq '[.suites[].specs[]?.tests[]? | select(.status == "flaky")] | length' 2>/dev/null || echo "0")
            fi

            TEST_LIST=$(cat test-results.json | jq -r '
              def process_suite:
                .title as $suite |
                (.specs[]? |
                  .title as $spec |
                  .tests[]? |
                  if .status == "expected" then "✅ " + $spec
                  elif .status == "unexpected" then "❌ " + $spec
                  elif .status == "flaky" then "⚠️ " + $spec
                  else "⏭️ " + $spec
                  end
                ),
                (.suites[]? | process_suite);
              .suites[]? | process_suite
            ' 2>/dev/null | head -20 || echo "Could not parse test results")

            ERROR_DETAILS=$(cat test-results.json | jq -r '
              def get_errors:
                .title as $suite |
                (.specs[]? |
                  .title as $spec |
                  .file as $file |
                  .tests[]? |
                  select(.status == "unexpected") |
                  .results[]? |
                  select(.error) |
                  "• " + $spec + " | " + ($file | split("/") | last) + " | " + ((.error.message // "Unknown error") | gsub("\n"; " ") | gsub("\""; "") | .[0:200])
                ),
                (.suites[]? | get_errors);
              .suites[]? | get_errors
            ' 2>/dev/null | sort -u | head -10 || echo "")

            if [ -z "$ERROR_DETAILS" ]; then
              ERROR_DETAILS=$(cat test-results.json | jq -r '
                .suites[]?.specs[]? |
                .title as $spec |
                .file as $file |
                .tests[]? |
                select(.status == "unexpected") |
                .results[]? |
                select(.error) |
                "• " + $spec + " | " + ($file | split("/") | last) + " | " + ((.error.message // "Unknown error") | gsub("\n"; " ") | gsub("\""; "") | .[0:200])
              ' 2>/dev/null | sort -u | head -10 || echo "No error details available")
            fi

            FAILED_TESTS_SUMMARY=$(cat test-results.json | jq -r '
              def get_failed:
                (.specs[]? |
                  .title as $spec |
                  .file as $file |
                  .tests[]? |
                  select(.status == "unexpected") |
                  "• " + $spec + " (" + ($file | split("/") | last) + ")"
                ),
                (.suites[]? | get_failed);
              .suites[]? | get_failed
            ' 2>/dev/null | sort -u | head -15 || echo "")

            if [ -z "$FAILED_TESTS_SUMMARY" ]; then
              FAILED_TESTS_SUMMARY=$(cat test-results.json | jq -r '
                .suites[]?.specs[]? |
                .title as $spec |
                .file as $file |
                .tests[]? |
                select(.status == "unexpected") |
                "• " + $spec + " (" + ($file | split("/") | last) + ")"
              ' 2>/dev/null | sort -u | head -15 || echo "Aucun détail disponible")
            fi

            FAILED_FILES=$(cat test-results.json | jq -r '
              def get_failed_files:
                (.specs[]? |
                  .file as $file |
                  .tests[]? |
                  select(.status == "unexpected") |
                  $file
                ),
                (.suites[]? | get_failed_files);
              .suites[]? | get_failed_files
            ' 2>/dev/null | sort -u | tr '\n' ' ' || echo "")

            if [ -z "$FAILED_FILES" ]; then
              FAILED_FILES=$(cat test-results.json | jq -r '
                .suites[]?.specs[]? |
                .file as $file |
                .tests[]? |
                select(.status == "unexpected") |
                $file
              ' 2>/dev/null | sort -u | tr '\n' ' ' || echo "")
            fi

            echo "PASSED=$PASSED" >> $GITHUB_OUTPUT
            echo "FAILED=$FAILED" >> $GITHUB_OUTPUT
            echo "SKIPPED=$SKIPPED" >> $GITHUB_OUTPUT
            echo "FLAKY=$FLAKY" >> $GITHUB_OUTPUT
            echo "TEST_LIST<<EOF" >> $GITHUB_OUTPUT
            echo "$TEST_LIST" >> $GITHUB_OUTPUT
            echo "EOF" >> $GITHUB_OUTPUT
            echo "ERROR_DETAILS<<EOF" >> $GITHUB_OUTPUT
            echo "$ERROR_DETAILS" >> $GITHUB_OUTPUT
            echo "EOF" >> $GITHUB_OUTPUT
            echo "FAILED_TESTS_SUMMARY<<EOF" >> $GITHUB_OUTPUT
            echo "$FAILED_TESTS_SUMMARY" >> $GITHUB_OUTPUT
            echo "EOF" >> $GITHUB_OUTPUT
            echo "FAILED_FILES=$FAILED_FILES" >> $GITHUB_OUTPUT

            echo "Parsed: $PASSED passed, $FAILED failed, $SKIPPED skipped, $FLAKY flaky"
          else
            echo "No test-results.json found"
            echo "PASSED=0" >> $GITHUB_OUTPUT
            echo "FAILED=0" >> $GITHUB_OUTPUT
            echo "SKIPPED=0" >> $GITHUB_OUTPUT
            echo "FLAKY=0" >> $GITHUB_OUTPUT
            echo "TEST_LIST=No test results file found" >> $GITHUB_OUTPUT
            echo "ERROR_DETAILS=No test results file found" >> $GITHUB_OUTPUT
            echo "FAILED_TESTS_SUMMARY=No test results file found" >> $GITHUB_OUTPUT
            echo "FAILED_FILES=" >> $GITHUB_OUTPUT
          fi

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always() && steps.e2e.outcome != 'skipped'
        with:
          name: playwright-report-${{ inputs.regime_label }}
          path: |
            playwright-report/
            test-results/
            test-results.json
          retention-days: 7

      - name: Deploy report to OVH server
        if: always() && steps.e2e.outcome != 'skipped'
        env:
          OVH_SSH_KEY: ${{ secrets.OVH_SSH_KEY }}
        run: |
          if [ -z "$OVH_SSH_KEY" ]; then
            echo "OVH_SSH_KEY is not configured; skipping report deployment."
            exit 0
          fi

          if [ ! -d playwright-report ]; then
            echo "playwright-report directory not found; skipping report deployment."
            exit 0
          fi

          mkdir -p ~/.ssh
          echo "$OVH_SSH_KEY" | base64 -d > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh-keyscan -H 57.130.47.254 >> ~/.ssh/known_hosts
          ssh -i ~/.ssh/id_ed25519 ubuntu@57.130.47.254 "mkdir -p /var/www/e2e-reports/${{ github.run_id }}"
          rsync -avz -e "ssh -i ~/.ssh/id_ed25519" --delete ./playwright-report/ ubuntu@57.130.47.254:/var/www/e2e-reports/${{ github.run_id }}/

      - name: Build Slack success payload
        if: always() && steps.e2e.outcome == 'success'
        env:
          REGIME: ${{ inputs.regime_label }}
          TEST_LIST: ${{ steps.parse-results.outputs.TEST_LIST }}
          PASSED: ${{ steps.parse-results.outputs.PASSED }}
          FLAKY: ${{ steps.parse-results.outputs.FLAKY }}
          SKIPPED: ${{ steps.parse-results.outputs.SKIPPED }}
          BRANCH: ${{ github.ref_name }}
          AUTHOR: ${{ github.actor }}
          SHORT_SHA: ${{ steps.ctx.outputs.short_sha }}
          BASE_URL: ${{ inputs.base_url }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
          PR_TITLE: ${{ github.event.pull_request.title }}
          RUN_URL: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
          REPORT_URL: http://57.130.47.254:8080/${{ github.run_id }}/
        run: |
          PR_LINE="—"
          if [ -n "$PR_NUMBER" ]; then PR_LINE="#${PR_NUMBER} ${PR_TITLE}"; fi
          jq -n \
            --arg regime "$REGIME" \
            --arg branch "$BRANCH" \
            --arg author "$AUTHOR" \
            --arg short_sha "$SHORT_SHA" \
            --arg base_url "$BASE_URL" \
            --arg pr_line "$PR_LINE" \
            --arg passed "$PASSED" \
            --arg flaky "$FLAKY" \
            --arg skipped "$SKIPPED" \
            --arg test_list "$TEST_LIST" \
            --arg run_url "$RUN_URL" \
            --arg report_url "$REPORT_URL" \
            '{
              "blocks": [
                {"type": "header", "text": {"type": "plain_text", "text": ("✅ E2E [" + $regime + "] Passed"), "emoji": true}},
                {"type": "section", "fields": [
                  {"type": "mrkdwn", "text": ("*Régime:*\n" + $regime)},
                  {"type": "mrkdwn", "text": ("*Branche:*\n" + $branch)}
                ]},
                {"type": "section", "fields": [
                  {"type": "mrkdwn", "text": ("*Auteur:*\n" + $author)},
                  {"type": "mrkdwn", "text": ("*Commit:*\n`" + $short_sha + "`")}
                ]},
                {"type": "section", "fields": [
                  {"type": "mrkdwn", "text": ("*PR:*\n" + $pr_line)},
                  {"type": "mrkdwn", "text": ("*Cible:*\n<" + $base_url + "|" + $base_url + ">")}
                ]},
                {"type": "section", "text": {"type": "mrkdwn", "text": ("*Résultats:* ✅ " + $passed + " passed | ⚠️ " + $flaky + " flaky | ⏭️ " + $skipped + " skipped")}},
                {"type": "section", "text": {"type": "mrkdwn", "text": ("*Tests:*\n```" + $test_list + "```")}},
                {"type": "actions", "elements": [
                  {"type": "button", "text": {"type": "plain_text", "text": "View Run"}, "url": $run_url},
                  {"type": "button", "text": {"type": "plain_text", "text": "View Report"}, "url": $report_url}
                ]}
              ]
            }' > slack-success-payload.json

      - name: Notify Slack on Success
        if: always() && steps.e2e.outcome == 'success'
        uses: slackapi/slack-github-action@v2.0.0
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
          webhook-type: incoming-webhook
          payload-file-path: slack-success-payload.json

      - name: Build Slack failure payload
        if: always() && steps.e2e.outcome == 'failure'
        env:
          REGIME: ${{ inputs.regime_label }}
          FAILED_SUMMARY: ${{ steps.parse-results.outputs.FAILED_TESTS_SUMMARY }}
          ERROR_DETAILS: ${{ steps.parse-results.outputs.ERROR_DETAILS }}
          FAILED_FILES: ${{ steps.parse-results.outputs.FAILED_FILES }}
          PASSED: ${{ steps.parse-results.outputs.PASSED }}
          FAILED: ${{ steps.parse-results.outputs.FAILED }}
          FLAKY: ${{ steps.parse-results.outputs.FLAKY }}
          SKIPPED: ${{ steps.parse-results.outputs.SKIPPED }}
          BRANCH: ${{ github.ref_name }}
          AUTHOR: ${{ github.actor }}
          SHORT_SHA: ${{ steps.ctx.outputs.short_sha }}
          BASE_URL: ${{ inputs.base_url }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
          PR_TITLE: ${{ github.event.pull_request.title }}
          RUN_URL: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
          REPORT_URL: http://57.130.47.254:8080/${{ github.run_id }}/
        run: |
          PR_LINE="—"
          if [ -n "$PR_NUMBER" ]; then PR_LINE="#${PR_NUMBER} ${PR_TITLE}"; fi
          LOCAL_CMD="PLAYWRIGHT_BASE_URL=${BASE_URL} npx playwright test --ui ${FAILED_FILES}"
          CLEAN_ERRORS=$(echo "$ERROR_DETAILS" | sed 's/\x1b\[[0-9;]*m//g')
          jq -n \
            --arg regime "$REGIME" \
            --arg branch "$BRANCH" \
            --arg author "$AUTHOR" \
            --arg short_sha "$SHORT_SHA" \
            --arg base_url "$BASE_URL" \
            --arg pr_line "$PR_LINE" \
            --arg passed "$PASSED" \
            --arg failed "$FAILED" \
            --arg flaky "$FLAKY" \
            --arg skipped "$SKIPPED" \
            --arg failed_summary "$FAILED_SUMMARY" \
            --arg error_details "$CLEAN_ERRORS" \
            --arg local_cmd "$LOCAL_CMD" \
            --arg run_url "$RUN_URL" \
            --arg report_url "$REPORT_URL" \
            '{
              "blocks": [
                {"type": "section", "text": {"type": "mrkdwn", "text": "<!here>"}},
                {"type": "header", "text": {"type": "plain_text", "text": ("❌ E2E [" + $regime + "] Failed"), "emoji": true}},
                {"type": "section", "fields": [
                  {"type": "mrkdwn", "text": ("*Régime:*\n" + $regime)},
                  {"type": "mrkdwn", "text": ("*Branche:*\n" + $branch)}
                ]},
                {"type": "section", "fields": [
                  {"type": "mrkdwn", "text": ("*Auteur:*\n" + $author)},
                  {"type": "mrkdwn", "text": ("*Commit:*\n`" + $short_sha + "`")}
                ]},
                {"type": "section", "fields": [
                  {"type": "mrkdwn", "text": ("*PR:*\n" + $pr_line)},
                  {"type": "mrkdwn", "text": ("*Cible:*\n<" + $base_url + "|" + $base_url + ">")}
                ]},
                {"type": "section", "text": {"type": "mrkdwn", "text": ("*Résultats:* ✅ " + $passed + " | ❌ " + $failed + " | ⚠️ " + $flaky + " | ⏭️ " + $skipped)}},
                {"type": "divider"},
                {"type": "section", "text": {"type": "mrkdwn", "text": ("📋 *Tests échoués:*\n" + $failed_summary)}},
                {"type": "section", "text": {"type": "mrkdwn", "text": ("💻 *Lancer en local:*\n```" + $local_cmd + "```")}},
                {"type": "divider"},
                {"type": "section", "text": {"type": "mrkdwn", "text": ("🔍 *Erreurs:*\n```" + $error_details + "```")}},
                {"type": "actions", "elements": [
                  {"type": "button", "text": {"type": "plain_text", "text": "GitHub Actions"}, "url": $run_url},
                  {"type": "button", "text": {"type": "plain_text", "text": "Rapport HTML"}, "style": "danger", "url": $report_url}
                ]}
              ]
            }' > slack-payload.json

      - name: Notify Slack on Failure
        if: always() && steps.e2e.outcome == 'failure'
        uses: slackapi/slack-github-action@v2.0.0
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
          webhook-type: incoming-webhook
          payload-file-path: slack-payload.json

      - name: Fail if blocking and tests failed
        if: always() && inputs.blocking && steps.e2e.outcome == 'failure'
        run: |
          echo "Régime bloquant et tests en échec → échec du job."
          exit 1
```

- [ ] **Step 2 : Valider la syntaxe YAML**

Run :
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/e2e-reusable.yml')); print('YAML OK')"
```
Expected : `YAML OK` (aucune exception). Si `actionlint` est installé (`which actionlint`), lancer aussi `actionlint .github/workflows/e2e-reusable.yml` et corriger toute erreur signalée.

- [ ] **Step 3 : Commit**

```bash
git add .github/workflows/e2e-reusable.yml
git commit -m "ci: ajoute le reusable workflow e2e (run filtré + slack + rapport OVH)

workflow_call paramétré : base_url, ref, use_bypass, grep_tag,
grep_invert, blocking, regime_label. Sans attente preview Vercel.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 : Créer les 3 callers

**Files:**
- Create: `.github/workflows/e2e-preprod.yml`
- Create: `.github/workflows/e2e-main-gate.yml`
- Create: `.github/workflows/e2e-nightly.yml`

- [ ] **Step 1 : Créer `.github/workflows/e2e-preprod.yml`**

```yaml
name: E2E Preprod

on:
  push:
    branches: [preprod]
  workflow_dispatch:

jobs:
  e2e:
    uses: ./.github/workflows/e2e-reusable.yml
    with:
      base_url: 'https://preprod.maydai.io'
      ref: ${{ github.sha }}
      use_bypass: true
      grep_tag: ''
      grep_invert: '@nightly-only'
      blocking: false
      regime_label: preprod
    secrets: inherit
```

- [ ] **Step 2 : Créer `.github/workflows/e2e-main-gate.yml`**

```yaml
name: E2E Main Gate

on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened, ready_for_review]

jobs:
  e2e:
    if: github.event.pull_request.draft == false && github.event.pull_request.head.ref == 'preprod'
    uses: ./.github/workflows/e2e-reusable.yml
    with:
      base_url: 'https://preprod.maydai.io'
      ref: ${{ github.event.pull_request.head.sha }}
      use_bypass: true
      grep_tag: '@prod'
      grep_invert: '@nightly-only'
      blocking: true
      regime_label: main-gate
    secrets: inherit
```

- [ ] **Step 3 : Créer `.github/workflows/e2e-nightly.yml`**

```yaml
name: E2E Nightly

on:
  schedule:
    - cron: '0 3 * * *'
  workflow_dispatch:

jobs:
  e2e:
    uses: ./.github/workflows/e2e-reusable.yml
    with:
      base_url: 'https://maydai.io'
      ref: 'main'
      use_bypass: false
      grep_tag: ''
      grep_invert: ''
      blocking: false
      regime_label: nightly
    secrets: inherit
```

- [ ] **Step 4 : Valider la syntaxe YAML des 3 callers**

Run :
```bash
for f in e2e-preprod e2e-main-gate e2e-nightly; do
  python3 -c "import yaml; yaml.safe_load(open('.github/workflows/$f.yml')); print('$f OK')"
done
```
Expected :
```
e2e-preprod OK
e2e-main-gate OK
e2e-nightly OK
```
Si `actionlint` est dispo, lancer `actionlint .github/workflows/e2e-preprod.yml .github/workflows/e2e-main-gate.yml .github/workflows/e2e-nightly.yml` et corriger.

- [ ] **Step 5 : Commit**

```bash
git add .github/workflows/e2e-preprod.yml .github/workflows/e2e-main-gate.yml .github/workflows/e2e-nightly.yml
git commit -m "ci: 3 callers e2e (preprod push, main-gate bloquant, nightly prod)

- preprod: push sur preprod, tout sauf @nightly-only, non-bloquant
- main-gate: PR preprod->main, @prod uniquement, bloquant
- nightly: cron 03:00 UTC, toute la suite contre maydai.io

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 : Supprimer l'ancien workflow `e2e-tests.yml`

**Files:**
- Delete: `.github/workflows/e2e-tests.yml`

- [ ] **Step 1 : Confirmer qu'aucun autre fichier ne référence `e2e-tests.yml`**

Run :
```bash
grep -rn "e2e-tests.yml\|e2e-tests" .github/ README.md docs/ 2>/dev/null | grep -v "docs/superpowers" || echo "Aucune référence résiduelle (hors specs/plans)"
```
Expected : `Aucune référence résiduelle (hors specs/plans)` (les specs/plans peuvent le citer, c'est normal).

- [ ] **Step 2 : Supprimer le fichier**

Run :
```bash
git rm .github/workflows/e2e-tests.yml
```
Expected : `rm '.github/workflows/e2e-tests.yml'`.

- [ ] **Step 3 : Vérifier l'état final du dossier workflows**

Run :
```bash
ls .github/workflows/
```
Expected : exactement `e2e-main-gate.yml  e2e-nightly.yml  e2e-preprod.yml  e2e-reusable.yml` (et aucun `e2e-tests.yml`).

- [ ] **Step 4 : Commit**

```bash
git commit -m "ci: supprime e2e-tests.yml (remplacé par les 3 régimes)

push dev ne déclenche plus de tests. Logique migrée dans e2e-reusable.yml.
Action manuelle requise : MAJ branch protection main (check requis -> E2E (main-gate)).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5 : Vérification finale & poussée

- [ ] **Step 1 : Revue d'ensemble des fichiers de workflow**

Run :
```bash
echo "--- callers référencent bien le reusable ---"
grep -l "uses: ./.github/workflows/e2e-reusable.yml" .github/workflows/e2e-preprod.yml .github/workflows/e2e-main-gate.yml .github/workflows/e2e-nightly.yml
echo "--- inputs cohérents avec le reusable (base_url, ref, use_bypass, grep_tag, grep_invert, blocking, regime_label) ---"
grep -hE "base_url|ref:|use_bypass|grep_tag|grep_invert|blocking|regime_label" .github/workflows/e2e-preprod.yml .github/workflows/e2e-main-gate.yml .github/workflows/e2e-nightly.yml
```
Expected : les 3 fichiers listés ; chaque caller fournit les inputs requis (`base_url`, `ref`, `regime_label`) du reusable.

- [ ] **Step 2 : Confirmer que `@prod` matche toujours 4 specs (régression Task 1)**

Run :
```bash
npx playwright test --list --grep @prod 2>&1 | grep -c "\.spec\.ts"
```
Expected : `4`.

- [ ] **Step 3 : Pousser la branche (si Hugo le demande)**

> Ne pousser que sur demande explicite d'Hugo (cf. règles). La branche est `chore/e2e-test-workflow-redesign`.
```bash
git push -u origin chore/e2e-test-workflow-redesign
```

- [ ] **Step 4 : Rappels d'actions manuelles post-merge (Hugo)**

1. GitHub → Settings → Branches → règle de protection de `main` : retirer le check `e2e-tests`, ajouter `E2E (main-gate)` comme **required status check**.
2. Vérifier que `VERCEL_AUTOMATION_BYPASS_SECRET` autorise l'accès à `preprod.maydai.io`.
3. Déclencher `E2E Preprod` et `E2E Nightly` via **Run workflow** (`workflow_dispatch`) pour valider l'accès (bypass preprod / prod public) avant de compter dessus.
4. Ouvrir une PR de test `preprod → main` pour vérifier le gate bloquant + le filtre `@prod`.

---

## Notes de validation (self-review)

- **Couverture spec :** régime 1 (Task 3 `e2e-preprod.yml`), régime 2 (`e2e-main-gate.yml`), régime 3 (`e2e-nightly.yml`), reusable + suppression preview (Task 2), tags `@prod`/`@nightly-only` (Task 1 + inputs), suppression `e2e-tests.yml` (Task 4), bypass preprod (input `use_bypass`), notif Slack (Task 2), rapport OVH (Task 2). ✅
- **Cohérence des noms d'inputs :** `base_url`, `ref`, `use_bypass`, `grep_tag`, `grep_invert`, `blocking`, `regime_label` — identiques entre le reusable (Task 2) et les 3 callers (Task 3). ✅
- **Nom du job pour la branch protection :** le job s'appelle `E2E (main-gate)` (via `name: E2E (${{ inputs.regime_label }})` + `regime_label: main-gate`). C'est le check à exiger sur `main`. ✅
