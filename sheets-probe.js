#!/usr/bin/env node
/**
 * sheets-probe.js — Tour de Contrôle MaydAI
 *
 * Vérifie que la route Next.js pourra LIRE et ÉCRIRE dans le Google Sheet.
 * S'authentifie exactement comme la route : mêmes variables d'environnement.
 *
 * À placer à la racine du projet Next.js (là où se trouve .env.local).
 * Lancement :   node sheets-probe.js
 *
 * N'installe rien, ne modifie rien de durable : il écrit "test" dans la
 * cellule Z1000 puis l'efface immédiatement.
 */

const fs = require('fs');
const path = require('path');

const SHEET_ID =
  process.argv[2] || '1Yt__l-zTArJqw1ab9Hx5cL94mu4nVABo70FahukmZmg';

/* --- Lecture de .env.local, sans dépendance dotenv --------------------- */
function loadEnvLocal() {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) {
    console.error('✘ .env.local introuvable dans', process.cwd());
    console.error('  Lance ce script depuis la racine de ton projet Next.js.');
    process.exit(1);
  }
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}

/* --- Sonde ------------------------------------------------------------- */
(async () => {
  loadEnvLocal();

  let google;
  try {
    ({ google } = require('googleapis'));
  } catch {
    console.error("✘ Module 'googleapis' absent. Lance : npm install googleapis");
    process.exit(1);
  }

  const email =
    process.env.GOOGLE_DRIVE_CLIENT_EMAIL ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (
    process.env.GOOGLE_DRIVE_PRIVATE_KEY ||
    process.env.GOOGLE_PRIVATE_KEY ||
    ''
  ).replace(/\\n/g, '\n');

  if (!email || !key) {
    console.error('✘ GOOGLE_DRIVE_CLIENT_EMAIL ou GOOGLE_DRIVE_PRIVATE_KEY absente de .env.local');
    process.exit(1);
  }

  console.log('Compte de service :', email);
  console.log('Projet GCP        :', email.split('@')[1].split('.')[0]);
  console.log('Sheet ciblé       :', SHEET_ID);
  console.log(
    'Variable .env     :',
    process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID
      ? process.env.GOOGLE_SHEETS_CONTROL_TOWER_ID === SHEET_ID
        ? 'GOOGLE_SHEETS_CONTROL_TOWER_ID présente et identique ✔'
        : '⚠ GOOGLE_SHEETS_CONTROL_TOWER_ID présente mais DIFFÉRENTE de l’ID testé'
      : '⚠ GOOGLE_SHEETS_CONTROL_TOWER_ID absente de .env.local'
  );
  console.log('');

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // 1. Lecture
  let meta;
  try {
    meta = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
      fields: 'properties.title,sheets.properties(title,index)',
    });
    console.log('✔ Lecture OK :', meta.data.properties.title);
    meta.data.sheets
      .sort((a, b) => a.properties.index - b.properties.index)
      .forEach((s, i) =>
        console.log(
          `   onglet ${i} : ${s.properties.title}${i === 0 ? '   ← celui que la route exportera' : ''}`
        )
      );
  } catch (e) {
    console.log('✘ Lecture ÉCHOUÉE :', e.code, e.errors?.[0]?.reason || '');
    console.log('  ', e.message?.split('\n')[0]);
    console.log('\n  403 SERVICE_DISABLED       → API Sheets pas activée sur le projet');
    console.log('  403 caller does not have.. → Sheet pas partagé avec le compte ci-dessus');
    console.log('  404                        → mauvais ID de Sheet');
    process.exit(1);
  }

  // 2. Écriture
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'Z1000',
      valueInputOption: 'RAW',
      requestBody: { values: [['test']] },
    });
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEET_ID,
      range: 'Z1000',
    });
    console.log('\n✔ Écriture OK — le compte de service est bien Éditeur');
    console.log('  Tout est en place, tu peux relancer l’import.');
  } catch (e) {
    console.log('\n✘ Écriture ÉCHOUÉE :', e.code, e.errors?.[0]?.reason || '');
    console.log('  ', e.message?.split('\n')[0]);
    console.log(
      '\n  La lecture passe mais pas l’écriture : le Sheet est partagé en Lecteur.'
    );
    console.log('  Repasse le compte de service en Éditeur dans le bouton Partager.');
  }
})();
