# Rapport E2E — [TODO] - Instructions Système (ID 8.2)

> Source : `Rapport E2E — [TODO] - Instructions Système.docx` (Downloads)  
> Spec : `e2e/todo-system-prompt.spec.ts`  
> Synchroniser avec la base Notion « Tests E2E MaydAI ».

---

Dernière mise à jour : mai 2026 — 1 test UI + scoreChange à 0 sans malus seedé
0. Nomenclature et identification des tests
Niveau
Libellé exact dans le code
Nomenclature Notion
[TODO] - Instructions Système
Bloc describe Playwright
[TODO] - Instructions Système (ID 8.2)
Test unique
[TODO] - Instructions Système — [UI] saisie textarea + piège score (scoreChange nul) @SystemPrompt @UI @Tier1
Convention :
[TODO] : domaine todo conformité (/dashboard/[id]/todo-list), actions correctives post-questionnaire.
Instructions Système : sous-fiche Notion — saisie des prompts / instructions (doc_type system_prompt), distinct de :
[TODO] - Registre Centralisé (ID 8.1) — preuve registre + récupération malus ;
MAYDAI_RISK_MANAGEMENT — plan de gestion des risques (risk_management, upload fichier) ;
Cas inacceptable — même system_prompt mais flux urgence + stopping_proof.
[UI] + @UI : parcours navigateur réel (auth + todo-list + page dossier textarea).
@SystemPrompt : tag Playwright dédié au filtrage (évite les pièges regex des crochets).
@Tier1 : chemin critique conformité (action n°2 du flux standard hors registre).
ID 8.2 : identifiant produit / QA.
Filtrage Playwright recommandé :
# Fichier complet (1 test, mode serial)
npx playwright test e2e/todo-system-prompt.spec.ts
# Tag dédié (recommandé)
npx playwright test e2e/todo-system-prompt.spec.ts -g "@SystemPrompt"
# Tier 1 uniquement
npx playwright test e2e/todo-system-prompt.spec.ts -g "@Tier1"
# Libellé complet (crochets échappés)
npx playwright test e2e/todo-system-prompt.spec.ts -g '\[TODO\] - Instructions Système'
⚠️ Piège filtre : -g "[TODO]" sans échappement → No tests found (regex Playwright).
1. Synthèse exécutive
Élément
Détail
Objectif global
Valider le flux todo Instructions système : cas terminé → todo-list → page dossier → saisie textarea → POST avec form_data.system_instructions → document complete → scoreChange présent avec pointsGained à 0.
Nombre de tests
1 (test.describe.configure({ mode: 'serial' }))
Nomenclature Notion
[TODO] - Instructions Système
Nomenclature Playwright
[TODO] - Instructions Système (ID 8.2)
Tags
@SystemPrompt, @UI, @Tier1
Durée indicative
~20–45 s (navigation + POST + assertions DB)
Résultat attendu
1 passed
Prérequis environnement :
Prérequis
Couvert
App sur http://localhost:3000 (ou PLAYWRIGHT_BASE_URL)
✅
.env.local : NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
✅
Utilisateur owner sur la société (user_companies + added_by)
✅ (seed beforeAll)
Cas d’usage status: completed, path_mode: long, V3
✅ (seed + update)
Bucket Storage dossiers
⚪ Non requis pour ce test (textarea uniquement ; upload .txt hors périmètre)
Ce que ce test ne couvre pas :
Récupération de malus sur E5.N9.Q3 — le malus est lié à todo_action: risk_management, pas system_prompt (voir §5).
Upload fichier .txt / .md via PUT .../system_prompt/upload.
Cas inacceptable (risk_level: unacceptable + deployment_date) — autre ordre de todos et badges priorité.
Bonus catalogue dossier_direct_bonus_raw_points: 3 — non branché sur l’API POST actuelle.
Parcours questionnaire UI pour saisir E5.N9.Q3 → [USE_CASE] - PL : Évaluation complète.
2. Finalité du test — ce que nous garantissons
2.1 — [TODO] - Instructions Système — [UI] saisie textarea + piège score (scoreChange nul)
Finalité métier (ID 8.2) : un utilisateur voit la todo « Définir les instructions système & prompts » sur un cas terminé (hors cas inacceptable). Il ouvre le dossier, colle les instructions système, enregistre : le document passe à complété, le texte est persisté en JSONB, et le score ne bouge pas — comportement attendu documenté comme piège du score.
Zone validée
Détail
Navigation
/dashboard/{companyId}/todo-list — heading « Todo conformité »
Dépliage
« Actions à mener » → clic ligne todo → Compléter le document
Redirection
/dashboard/{id}/dossiers/{usecaseId}?doc=system_prompt
Saisie
Textarea « Instructions système » dans #section-system_prompt
Réseau
POST .../system_prompt — JSON { formData, status }
Payload
formData.system_instructions = texte saisi, status: 'complete'
Piège score
body.scoreChange.pointsGained == 0 ; score_base / score_final inchangés
DB preuve
dossier_documents : doc_type: system_prompt, status: complete, JSONB OK
UI
Badge « Complété » visible sur la section dossier
Question questionnaire liée (catalogue vs implémentation) :
Élément
Valeur
Question (rapport / slot quick_win_3)
E5.N9.Q3 — mesures d’atténuation / instructions système
Malus possible
E5.N9.Q3.A — Non (score_impact -4, technical_robustness)
todo_action dans questions-with-scores.json
system_prompt
Action dossier testée
system_prompt (MAYDAI_SYSTEM_INSTRUCTIONS)
3. Architecture du spec
flowchart TB
  subgraph setup [beforeAll — Supabase service role]
    U[auth.admin.createUser]
    C1[companies — profil]
    C2[companies — société test]
    P[profiles + current_company_id]
    UC[user_companies owner ×2 + added_by]
    UC2[seedV2Usecase path long]
    UP[update usecase completed + scores]
    UU[user_usecases owner]
  end
  subgraph T1 ["Test — [TODO] Instructions Système"]
    A1[authenticateUser]
    G1[goto /dashboard/id/todo-list]
    E1[expand Actions à mener]
    E2[expand todo system_prompt]
    N1[click Compléter le document]
    F1[fill textarea Instructions système]
    W1[waitForResponse POST system_prompt]
    D1[assert scoreChange null + DB scores inchangés]
    D2[assert dossier_documents form_data]
    UI1[assert section Complété]
  end
  setup --> T1
  T1 --> CLEAN[afterAll cleanupTestData]
Fichiers impliqués :
Rôle
Chemin
Spec E2E
e2e/todo-system-prompt.spec.ts
Auth E2E
e2e/auth-helper.ts
Admin Supabase
e2e/_helpers/supabase-admin.ts
Seed use case
e2e/_helpers/seed-usecase.ts
Cleanup
e2e/_helpers/db-cleanup.ts
Page todo-list
app/dashboard/[id]/todo-list/TodoListPage.tsx
Action todo générique
app/dashboard/[id]/todo-list/components/ToDoAction.tsx
Page dossier
app/dashboard/[id]/dossiers/[usecaseId]/DossierDetailPage.tsx
API formulaire
app/api/dossiers/[usecaseId]/[docType]/route.ts (POST)
API upload (hors test)
app/api/dossiers/[usecaseId]/[docType]/upload/route.ts (PUT)
Sync score (non invoqué ici)
lib/todo-action-sync.ts
Catalogue actions
lib/canonical-actions.ts (MAYDAI_SYSTEM_INSTRUCTIONS, system_prompt)
Questions / scores
app/usecases/[id]/data/questions-with-scores.json (E5.N9.Q3)
4. Données de test (seed)
Table / champ
Valeur E2E
Raison
usecases.status
completed
Affiche la section « Actions à mener » (flux standard)
usecases.path_mode
long
Aligné produit V3 long
usecases.questionnaire_version
3
V3
usecases.score_base
80
Score stable pour prouver l’absence de delta
usecases.score_final
≈ 53,33
(80 + 0×2,5) / 150 × 100
usecases.score_model
0
Simplifie les calculs E2E
usecase_responses (E5.N9.Q3)
E5.N9.Q3.B (Oui) seedé en beforeAll
Évite un sync null→B ; scores alignés via calculate-score avant le test UI
Après POST attendu :
Champ
Avant
Après
score_base
80
80 (inchangé)
score_final
≈ 53,33
≈ 53,33 (inchangé)
dossier_documents (system_prompt)
absent ou incomplet
status: complete, form_data.system_instructions = texte E2E
Réponse JSON scoreChange
—
objet avec pointsGained: 0
5. Difficultés rencontrées et solutions
#
Symptôme
Cause racine
Solution finale
R1
Tentative de calquer le test 8.1 (attendre scoreChange.pointsGained > 0)
registry_proof a todo_action: registry_proof sur E5.N9.Q7 ; system_prompt n’a aucune question avec todo_action: system_prompt
Spec 8.2 documente explicitement le piège : expect(body.scoreChange.pointsGained == 0).toBe(true) + scores DB inchangés
R2
Audit : questionnaire_links: ['E5.N9.Q3'] sur MAYDAI_SYSTEM_INSTRUCTIONS mais pas de sync score
Dans questions-with-scores.json, E5.N9.Q3 porte todo_action: "risk_management"
Ne pas seeder de malus E5.N9.Q3.A pour « récupérer » via cette todo — récupération = doc risk_management, pas textarea
R3
getPotentialPoints('system_prompt') → 0 en todo-list
getTodoActionMappings('system_prompt') retourne []
Badge todo « Validé » (pas « +N pt à récupérer ») — ne pas assert « pt récupérés »
R4
dossier_direct_bonus_raw_points: 3 dans le catalogue
Bonus non implémenté dans POST /dossiers/.../route.ts (seul le sync malus questionnaire existe ailleurs)
Test n’attend aucun bonus ; backlog produit si alignement catalogue/API souhaité
R5
Pas de data-testid sur todo / textarea
Contrainte projet : pas de modification composants React
#todo-{usecaseId}-system_prompt, #section-system_prompt, getByRole, getByText, getByPlaceholder
R6
getByLabel(/Instructions système/) peut échouer
<label> sans htmlFor relié au <textarea>
getByLabel(...).or(getByPlaceholder(/Collez ici l'intégralité/i)) scopé sur #section-system_prompt
R7
Confusion modale vs page dossier (8.1)
Registre = RegistryToDoAction + modale upload ; Instructions = ToDoAction + navigation dossier
Clic « Compléter le document » + waitForURL avec doc=system_prompt
R8
Interception réseau : PUT vs POST
Textarea → POST /api/dossiers/{id}/system_prompt (JSON) ; fichier → PUT .../upload
waitForResponse filtre method() === 'POST' et URL contenant /system_prompt
R9
Plusieurs boutons « Enregistrer » sur la page dossier
Plusieurs sections conformité (8 types)
Clic bouton dans systemPromptSection uniquement
R10
Assertion « Action complétée » (pattern 8.1)
Texte « Document complété » dans ToDoAction après retour todo-list ; sur dossier = « ✓ Complété »
Assert systemPromptSection.getByText(/Complété/i) sur la page dossier
R11
Filtre -g "[TODO]" → No tests found
Crochets interprétés comme regex Playwright
Tag @SystemPrompt ou regex échappée \[TODO\] - Instructions Système
R12
request.postDataJSON() vide
Clic avant waitForResponse mal ordonné
saveResponsePromise avant le clic Enregistrer ; lecture payload sur saveResponse.request()
R13
FK cleanup dossier_documents
Même pattern que 8.1
Réutiliser cleanupTestData (suppression dossier_documents avant dossiers)
6. Contrat API — sauvegarde textarea
Élément
Détail
Route
POST /api/dossiers/{usecaseId}/system_prompt
Auth
Authorization: Bearer {access_token}
Body
application/json
Payload sortant (assertion E2E) :
{
  "formData": {
    "system_instructions": "Instructions système pour le test E2E de conformité AI Act."
  },
  "status": "complete"
}
Réponse succès :
{
  "ok": true,
  "scoreChange": { "pointsGained": 0 }
}
Assertions E2E retenues :
Assertion
Valeur attendue
response.ok()
true
body.ok
true
requestPayload.formData.system_instructions
Texte mocké E2E
requestPayload.status
'complete'
body.scoreChange
objet présent, pointsGained === 0
DB score_base
80 (inchangé)
DB score_final
≈ 53,33 (inchangé)
DB dossier_documents.form_data
{ "system_instructions": "<texte>" }
DB dossier_documents.status
complete
Route alternative (hors périmètre 8.2) :
Route
Usage
PUT /api/dossiers/{usecaseId}/system_prompt/upload
Fichier .txt / .md — sync score identique à 8.1 si mapping existait (ici non)
GET /api/dossiers/{usecaseId}/system_prompt
Lecture formData / status
Requêtes SQL utiles :
-- Schéma table preuves
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'dossier_documents'
ORDER BY ordinal_position;
-- Contenu instructions système pour un cas d’usage
SELECT
  dd.doc_type,
  dd.status,
  dd.form_data,
  dd.form_data->>'system_instructions' AS system_instructions_text,
  dd.updated_at
FROM dossier_documents dd
JOIN dossiers d ON d.id = dd.dossier_id
WHERE d.usecase_id = '<USECASE_ID>'
  AND dd.doc_type = 'system_prompt';
7. Ce qui fonctionne bien (points positifs)
Point
Détail
Pas de modification production
Aucun data-testid ajouté
Double vérité
Payload POST + lecture Supabase service role
Piège documenté
Le test échouerait si un futur dev branchait par erreur un scoreChange sur system_prompt sans mise à jour produit
Flux réaliste
Même parcours utilisateur que en prod (todo-list → dossier → Enregistrer)
Tag dédié
@SystemPrompt pour CI / Notion
Seed minimal
Pas de malus artificiel nécessaire pour la finalité 8.2
Séparation fiches
Distinct de 8.1 (registre + malus), risk_management, cas inacceptable
8. Référence technique UI — sélecteurs Playwright
8.1 Todo-list — Instructions système
Élément
Sélecteur / pattern
Route
/dashboard/{companyId}/todo-list
Titre page
getByRole('heading', { name: /Todo conformité/i })
Cas d’usage
getByRole('heading', { name: usecaseName, level: 3 })
Déplier actions
getByRole('button', { name: /Actions à mener/i })
Conteneur todo
#todo-{usecaseId}-system_prompt
Ligne todo
getByText(/Définir les instructions système/i) (clic pour déplier)
Ouvrir dossier
getByRole('button', { name: /Compléter le document/i })
8.2 Page dossier — textarea
Élément
Sélecteur / pattern
Route attendue
/dashboard/{companyId}/dossiers/{usecaseId}?doc=system_prompt
Section
#section-system_prompt
Textarea
section.getByLabel(/Instructions système/i).or(section.getByPlaceholder(/Collez ici l'intégralité/i))
Enregistrer
section.getByRole('button', { name: /Enregistrer|Modifier/i })
Statut succès
section.getByText(/Complété/i).first()
Titre section (standard)
Texte visible : 2. Instructions Système et Prompts Principaux
9. Comparaison avec le test voisin 8.1
Aspect
[TODO] - Registre Centralisé (8.1)
[TODO] - Instructions Système (8.2)
Composant todo
RegistryToDoAction + modale
ToDoAction générique
UI saisie
Upload PDF (Buffer)
Textarea + POST JSON
Route API
PUT .../registry_proof/upload
POST .../system_prompt
todo_action JSON
registry_proof sur E5.N9.Q7
Aucun sur system_prompt ; E5.N9.Q3 → risk_management
scoreChange
Présent (~5,33 sur score_final)
null (piège)
Badge todo points
« +N pt à récupérer » / « pt récupérés »
« Validé » (potentialPoints = 0)
Assert score DB
score_base +8
Inchangé
Reload page
Oui (score liste)
Non requis
10. Setup Supabase (beforeAll / afterAll)
Création (service role) :
Utilisateur e2e-system-prompt-{timestamp}@maydai-test.com
Société profil (ownerCompanyName)
Société test (companyName, tech_data / saas)
profiles avec current_company_id = société test
user_companies (owner) sur profil et société test, avec added_by: testUserId
seedV2Usecase → update completed + scores
user_usecases (owner)
Nettoyage : cleanupTestData sur use case (dossier_documents puis dossiers), puis société profil si distincte.
11. Critères de succès / checklist non-régression
Filtre recommandé : -g "@SystemPrompt"
npx playwright test e2e/todo-system-prompt.spec.ts → 1 passed
Navigation todo-list → dossier ?doc=system_prompt
POST .../system_prompt → 200, payload system_instructions + status: complete
Réponse : scoreChange.pointsGained === 0
DB : score_base / score_final inchangés
DB : dossier_documents complete + JSONB OK
UI section : Complété visible
Tag @SystemPrompt présent sur le test
12. Lacunes connues (backlog E2E / produit)
Priorité
Scénario
Fichier / action suggérée
Haute (produit)
Haute (produit)
Implémenter dossier_direct_bonus_raw_points: 3 sur POST system_prompt si voulu
route.ts
Moyenne
Upload .txt via PUT .../system_prompt/upload
Extension spec ou todo-system-prompt-upload.spec.ts
Moyenne
Seed E5.N9.Q3.A + assert qu’Instructions système ne récupère toujours pas le malus
Variante dans le même spec
Moyenne
Cas inacceptable — même textarea, badges priorité
Spec dédié ou variante seed
Basse
Page Object TodoSystemPromptPage
e2e/_pages/todo-system-prompt.page.ts
Basse
Entrée dans docs/e2e-tests-mapping-old-to-new.md
Ligne 🆕 ID 8.2
13. Bloc prêt à coller — page Notion « Tests E2E MaydAI »
Section Notion : [TODO] - Instructions Système
Champ
Valeur
Nomenclature
[TODO] - Instructions Système
ID produit
8.2
Fichier
e2e/todo-system-prompt.spec.ts
describe Playwright
[TODO] - Instructions Système (ID 8.2)
Statut
✅ Stabilisé (piège du score documenté)
Tags Playwright
@SystemPrompt, @UI, @Tier1
Durée
~20–45 s
Commande filtre
npx playwright test e2e/todo-system-prompt.spec.ts -g "@SystemPrompt"
Test rattaché :
#
Titre Playwright
Tags
1
[TODO] - Instructions Système — [UI] saisie textarea + piège score (scoreChange nul)
@SystemPrompt @UI @Tier1
Vérité DB
Colonnes / tables
Texte
dossier_documents.form_data.system_instructions
Statut
dossier_documents.status = complete
Score (piège)
usecases.score_base, usecases.score_final inchangés
Pièges connus :
Ne pas attendre scoreChange.pointsGained > 0 (contraire au produit actuel).
Malus E5.N9.Q3 ≠ récupération via cette todo → doc risk_management.
Badge todo « Validé », pas « pt récupérés ».
Filtrer avec @SystemPrompt, pas -g "[TODO]" seul.
Liens internes :
Rapport détaillé : docs/e2e-todo-system-prompt-rapport-notion.md (§15 + Annexe A)
Spec : e2e/todo-system-prompt.spec.ts
Fiche voisine : docs/e2e-todo-registry-proof-rapport-notion.md ([TODO] - Registre Centralisé, ID 8.1)
Cartographie : docs/e2e-tests-mapping-old-to-new.md
14. Chronologie de mise au point (mai 2026)
Étape
Action
1
Audit lecture seule (déclencheur E5.N9.Q3, UI textarea, API POST, piège todo_action)
2
Décision : test 8.2 affirme scoreChange nul (pas de copie aveugle 8.1)
3
Création e2e/todo-system-prompt.spec.ts (seed completed long, flux todo → dossier)
4
Nomenclature Notion [TODO] - Instructions Système alignée sur describe / titre test
5
Rédaction rapport Notion + Annexe A (script complet)
15. Script Playwright — exécution et maintenance
Action
Commande
Lancer le test (serial)
npx playwright test e2e/todo-system-prompt.spec.ts
Filtre tag dédié (recommandé)
npx playwright test e2e/todo-system-prompt.spec.ts -g "@SystemPrompt"
Filtre Tier 1
npx playwright test e2e/todo-system-prompt.spec.ts -g "@Tier1"
Filtre nomenclature (regex échappée)
npx playwright test e2e/todo-system-prompt.spec.ts -g '\[TODO\] - Instructions Système'
Navigateur visible
npx playwright test e2e/todo-system-prompt.spec.ts --headed
Rapport HTML Playwright
npx playwright show-report
Régénérer ce rapport (.docx)
npx @mohtasham/md-to-docx docs/e2e-todo-system-prompt-rapport-notion.md docs/e2e-todo-system-prompt-rapport-notion.docx
Source de vérité du script : e2e/todo-system-prompt.spec.ts (303 lignes).Page Object : aucun (sélecteurs inline dans le spec).Dépendances : e2e/auth-helper.ts, e2e/_helpers/supabase-admin.ts, e2e/_helpers/db-cleanup.ts, e2e/_helpers/seed-usecase.ts.
Structure du spec (résumé) :
Bloc
Rôle
Constantes
MOCK_SYSTEM_INSTRUCTIONS, scores initiaux stables
seedSystemPromptUsecase()
seedV2Usecase + update completed
beforeAll
User, 2 companies, profile, user_companies, seed use case
beforeEach
authenticateUser
Test unique
Todo-list → dossier → textarea → POST → assert piège score + DB + UI
afterAll
cleanupTestData
Annexe A — Script complet e2e/todo-system-prompt.spec.ts
Copie intégrée pour Notion / Google Docs. En cas de divergence, le fichier du dépôt fait foi.

---

## Annexe A

Script complet : voir `e2e/todo-system-prompt.spec.ts`.
