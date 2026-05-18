# Monitoring : historique des purges Docker + refonte layout disque

**Date** : 2026-05-04
**Auteur** : Hugo Faye (avec assistance Claude)
**Statut** : Approuvé pour implémentation

## Contexte

La page `/admin/monitoring` est revenue en ligne (fix nginx-host fait le 2026-05-04). Deux améliorations demandées :

1. **Historique des purges Docker** : afficher chaque purge hebdomadaire (cron dim 3h UTC) avec date et GB libérés. Pas de log existant — il faut créer le mécanisme.
2. **Layout disque** : remplacer les 3 barres empilées (total / utilisé / libre) par une stacked bar horizontale unique avec légende, plus dense visuellement.

## Architecture

### Vue d'ensemble

```
[ cron root, dim 3h UTC ]
       │
       ▼
docker-cleanup.sh (wrapper)
       │ écrit
       ▼
/var/www/monitoring/docker-purges.json  ◄────  /var/www/monitoring/disk.json (existant)
       │
       │ servi par nginx-host:8080 (e2e-reports)
       ▼
Caddy:80 ──► /monitoring/*
       │
       │ fetch
       ▼
app/api/admin/monitoring/route.ts (action=disk)
       │
       │ retourne { disk, diskError, email, purges, purgesError }
       ▼
app/admin/monitoring/AdminMonitoringPage.tsx
       │
       └─► refonte bloc disque + nouvelle section "Historique des purges"
```

### Composant 1 — Wrapper de purge serveur

**Fichier** : `/usr/local/bin/docker-cleanup.sh` (chmod 755, owner root)

**Responsabilités** :
- Capturer espace libre `df -B1 /` avant
- Lancer `docker system prune -f --filter "until=168h"` et capturer stdout (avec `2>&1`)
- Lancer `docker builder prune -f --filter "until=168h"` et capturer stdout
- Parser `Total reclaimed space: X.XGB` dans chaque output (fonction `to_bytes` qui gère B, KB, MB, GB, TB et la valeur littérale `0B`)
- Capturer espace libre `df -B1 /` après
- Construire l'entrée JSON
- Charger l'array existant depuis `/var/www/monitoring/docker-purges.json` (ou `[]` si absent), y ajouter l'entrée, tronquer à **30 entrées max** (les plus récentes)
- Écrire en atomique : tmp file + `mv -f`

**Format d'une entrée** :
```json
{
  "ranAt": "2026-05-04T13:50:00Z",
  "systemPruneReclaimedBytes": 1234567890,
  "builderPruneReclaimedBytes": 9876543210,
  "totalReclaimedBytes": 11111111100,
  "diskFreeBeforeBytes": 10312345678,
  "diskFreeAfterBytes": 21423456789,
  "exitCode": 0,
  "errorMessage": null
}
```

**Gestion d'erreur** : si une commande docker échoue, on log quand même l'entrée avec `exitCode != 0` et `errorMessage` rempli. Pas de `set -e` strict — on veut toujours produire une trace.

**Crontab** :
- Retirer du crontab ubuntu : `0 3 * * 0 docker system prune -f --filter "until=168h" && docker builder prune -f --filter "until=168h" >> /var/log/docker-cleanup.log 2>&1` (le `>> /var/log/...` foirait silencieusement de toute façon)
- Ajouter au crontab root : `0 3 * * 0 /usr/local/bin/docker-cleanup.sh`

**Premier run** : `sudo /usr/local/bin/docker-cleanup.sh` immédiatement après installation pour avoir un point de données dans l'UI sans attendre dimanche.

### Composant 2 — API Next.js

**Fichier** : `app/api/admin/monitoring/route.ts`

**Modification** :
- Nouvelle fonction `getProductionDockerPurges()` calquée sur `getProductionEmailStatus()` — fetch `http://57.130.47.254/monitoring/docker-purges.json`, parse, retourne array typé. URL overridable via `MONITORING_PROD_DOCKER_PURGES_JSON_URL` (default `http://57.130.47.254/monitoring/docker-purges.json`).
- Type retour :
  ```ts
  type DockerPurge = {
    ranAt: string
    systemPruneReclaimedBytes: number
    builderPruneReclaimedBytes: number
    totalReclaimedBytes: number
    diskFreeBeforeBytes: number
    diskFreeAfterBytes: number
    exitCode: number
    errorMessage: string | null
  }
  ```
- Dans `case 'disk'` : ajouter `purges` et `purgesError` au payload renvoyé. `purgesError` est `string | null`, sur le même modèle que `diskError`. Catch silencieux si erreur (le bloc principal de la page reste utilisable même si purges down).

**Intentionnellement** : pas d'action `purges` séparée. La page consomme tout dans un seul fetch (`?action=disk`). Réduit la latence et la complexité côté composant.

### Composant 3 — UI

**Fichier** : `app/admin/monitoring/AdminMonitoringPage.tsx`

**Refonte du bloc "Occupation disque serveur prod"** :

Layout `lg:grid-cols-3` conservé. Colonne 1 : donut (inchangé). Colonnes 2-3 : remplacer les 3 mini-barres par :

```
Total: 50,9 Go                 Dernière mise à jour : 4 mai 2026 à 13h45
┌─────────────────────────────────────────────────────────────────┐
│███████████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░│
└─────────────────────────────────────────────────────────────────┘
 ● Utilisé 41,2 Go (82%)            ● Libre 9,6 Go (18%)
```

Détails :
- Une seule `div.h-3.bg-gray-100.rounded-full` qui contient deux segments — `flex` row avec largeur proportionnelle (utilisé / libre).
- Couleur du segment **utilisé** suit la sémantique existante du donut : `bg-emerald-500` si `usePercent < 70`, `bg-orange-500` si `70 ≤ usePercent < 85`, `bg-red-600` si `usePercent ≥ 85`. Réutilise la logique de `usageRingClass` (extraite en helper `usageBarClass()`).
- Couleur du segment **libre** : `bg-gray-200` (neutre, ne distrait pas de l'info principale). La pastille de la légende "Libre" reprend cette couleur.
- Pastille "Utilisé" dans la légende reprend la couleur du segment utilisé (sémantique cohérente).
- Total au-dessus de la barre, gros texte gris-900 (`text-base font-semibold`).
- Légende sous la barre : deux items en flex row, chaque item = pastille colorée (`w-2 h-2 rounded-full`) + label + valeur Go + parenthèses pourcentage.
- Conserver `coherenceNote` (note de cohérence quand le total a été recalculé) tel quel.

Format chiffres : `formatGo(value)` réutilise `sanitizeToNumber` existant + `toFixed(1)` + suffixe `Go`. Virgule décimale française.

**Nouvelle section "Historique des purges Docker"** placée **après** la grille des 4 cartes existantes, avant la fermeture du conteneur principal.

Structure :
```jsx
<section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
  <div className="flex items-start justify-between gap-4">
    <h2 className="text-lg font-semibold text-gray-900">Historique des purges Docker</h2>
    <p className="text-xs text-gray-400">Prochaine purge : dim 10 mai à 05h00</p>
  </div>

  {/* Header KPI */}
  <p className="mt-2 text-sm text-gray-600">
    {totalReclaimedGo} Go libérés au total · {purges.length} purge{purges.length > 1 ? 's' : ''} enregistrée{purges.length > 1 ? 's' : ''}
  </p>

  {/* Empty state */}
  {purges.length === 0 && (
    <p className="mt-4 text-sm text-gray-500">Pas encore d'historique. La première purge a lieu dimanche prochain à 03h00 UTC.</p>
  )}

  {/* Table */}
  {purges.length > 0 && (
    <table className="mt-4 w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase text-gray-500">
          <th className="py-2">Date</th>
          <th className="py-2 text-right">Récupéré</th>
          <th className="py-2 text-right hidden md:table-cell">Détail</th>
          <th className="py-2 text-right hidden lg:table-cell">Avant → Après (libre)</th>
        </tr>
      </thead>
      <tbody>
        {purges.map(p => (
          <tr key={p.ranAt} className="border-t border-gray-100">
            <td className="py-2 text-gray-700">{formatDateFr(p.ranAt)}</td>
            <td className="py-2 text-right font-medium">{formatGo(p.totalReclaimedBytes)}</td>
            <td className="py-2 text-right text-gray-500 hidden md:table-cell">
              system: {formatGo(p.systemPruneReclaimedBytes)} · builder: {formatGo(p.builderPruneReclaimedBytes)}
            </td>
            <td className="py-2 text-right text-gray-500 hidden lg:table-cell">
              {formatGo(p.diskFreeBeforeBytes)} → {formatGo(p.diskFreeAfterBytes)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )}

  {/* Error fallback */}
  {purgesError && (
    <p className="mt-3 text-xs text-amber-700">{purgesError}</p>
  )}
</section>
```

**Helpers** :
- `formatGo(bytes: number): string` — divise par 10^9, 1 décimale, virgule fr, suffixe ` Go`. `0 Go` si bytes < 50_000_000 pour éviter `0,0 Go` parasites.
- `formatDateFr(iso: string)` — réutilise `formatUpdatedAtFr` déjà présent dans le fichier.
- `nextPurgeFr()` — calcule le prochain dimanche 03:00 UTC (depuis `new Date()`), formate en heure de Paris : `dim 10 mai à 05h00` (gère CEST/CET automatiquement via `Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', ... })`).

**Tri** : array trié par `ranAt` desc (plus récent en haut). Tri côté composant (le serveur push en append, donc l'ordre stocké est ascendant).

### Composant 4 — Tests

**Tests unitaires (Jest, `app/api/admin/monitoring/__tests__/parsing.test.ts`)** — nouvelle suite :

Le route handler n'a pas de tests aujourd'hui. On ne teste pas le handler entier (trop de I/O), mais on extrait les fonctions pures :

1. **Parser docker output** (côté Next.js, pour le formatage GB) : extraire `formatGo(bytes)` dans un util et tester :
   - `formatGo(0)` → `"0 Go"`
   - `formatGo(1_500_000_000)` → `"1,5 Go"`
   - `formatGo(50_900_000_000)` → `"50,9 Go"`
2. **`nextPurgeFr()`** : tester avec date fixe (mock `Date`) que le calcul du prochain dimanche est correct (week-end, semaine, samedi 23h59, dimanche 02h59, dimanche 03h00 → dim suivant).

Pas de tests sur le wrapper bash (hors du repo, on peut le smoke-tester manuellement après déploiement).

## Plan de déploiement

1. **Local (repo)** : implémenter route.ts + composant + tests, créer la PR `dev`.
2. **Serveur prod (SSH)** : créer `/usr/local/bin/docker-cleanup.sh`, déplacer le cron, lancer manuellement le premier run.
3. **Vérifier** : `curl http://57.130.47.254/monitoring/docker-purges.json` renvoie un array d'au moins 1 entrée.
4. **Merger la PR**, attendre déploiement Vercel, recharger la page.
5. **Vérifier UI** : stacked bar visible, table d'historique avec 1 entrée, "prochaine purge dim XX mai à 05h00".

## Risques et mitigations

| Risque | Mitigation |
|--------|------------|
| `docker system prune` consomme CPU/IO et impacte un build/login en cours | Le premier run sera lancé depuis SSH avec `time ... 2>&1 \| tee` pour observer. Si gros impact, on tue la commande (Ctrl-C) — l'historique aura juste une entrée avec `exitCode != 0`. |
| Format de l'output docker change entre versions | Le parser doit être tolérant (regex sur `Total reclaimed space:\s+([\d.]+)\s*([KMGT]?B)`). Si parse échoue, on logge `reclaimedBytes: 0` + `errorMessage: "parse failed"`. |
| Le fichier `docker-purges.json` corrompu (par ex. crash du serveur pendant l'écriture) | Atomic write avec tmp + `mv -f`. Si le JSON est invalide, le wrapper repart d'un array vide (la première run après corruption perd l'historique mais le wrapper continue à fonctionner). |
| `purges` est `null` au premier render (pas d'historique encore) | Empty state explicite, pas d'erreur. |

## Hors scope

Volontairement non traités dans ce spec :
- **Auth de la route `/api/admin/monitoring`** : actuellement publique, devrait être admin-only. Ticket séparé.
- **Filtres / pagination des purges** : 30 entrées suffisent (presque 6 mois). Si besoin futur d'une vue plus longue, on stockera dans Supabase.
- **Alertes si purge échoue** : le `disk-alert-email.py` existant ne couvre pas ça. Ticket séparé.
- **Historisation de l'occupation disque** : on n'historise pas `disk.json`. Si demandé plus tard → table Supabase + cron Vercel.

## Critères d'acceptation

- [ ] `curl http://57.130.47.254/monitoring/docker-purges.json` renvoie un array JSON valide.
- [ ] L'API Next.js `/api/admin/monitoring?action=disk` renvoie `purges` (array) et `purgesError` (string|null).
- [ ] Sur https://www.maydai.io/admin/monitoring, le bloc "Occupation disque" affiche une stacked bar unique avec total / utilisé+légende / libre+légende.
- [ ] Une nouvelle section "Historique des purges Docker" est présente avec au minimum 1 entrée (le premier run manuel) et la "prochaine purge" calculée correctement en heure de Paris.
- [ ] Tests Jest ajoutés pour `formatGo` et `nextPurgeFr` passent.
- [ ] Aucun test existant ne casse.
