const fs = require('fs');
const path = require('path');

// Charger les fichiers JSON
const creationPath = path.join(__dirname, '../app/usecases/new/creation-questions.json');
const questionsPath = path.join(__dirname, '../app/usecases/[id]/data/questions-with-scores.json');

const creationData = JSON.parse(fs.readFileSync(creationPath, 'utf-8'));
const questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'));

// Données attendues
const expected = [
  { question: "Date de déploiement passée ou prévue ?", category: "Question", text: "Cette question permet d'améliorer les recommandations de l'audit du cas d'usage IA." },
  { question: "Service en charge du cas d'usage IA ?", category: "Question", text: "Renseignez le service de l'entreprise responsable du suivi opérationnel du cas d'usage IA." },
  { question: "Partenaire technologique ?", category: "Question", text: "L'IA Act européen impose des obligations différentes selon votre rôle dans la chaîne de valeur de l'IA. Traçabilité & Risque : Pour chaque cas d'usage, vous devez documenter l'ensemble du système, y compris le modèle de fondation (GPAI - General Purpose AI) sur lequel il s'appuie. Obligations Partagées : Les fournisseurs de GPAI (comme Google, OpenAI, Mistral...) ont leurs propres obligations de transparence (documentation technique, instructions d'usage). Identifier votre partenaire permet à MaydAI de vous aider à centraliser la bonne documentation et à évaluer précisément les risques transférés de leur modèle vers votre cas d'usage." },
  { question: "Large Language Model (LLM)", category: "Réponse", text: "Modèles de langage génératifs capables de comprendre et générer du texte.", fullContent: "Les LLM sont entraînés sur d'immenses corpus de texte. Ils peuvent générer, traduire, résumer du contenu. L'IA Act classe ces modèles comme GPAI à usage général." },
  { question: "Vision par ordinateur", category: "Réponse", text: "IA capable d'analyser, comprendre et générer des images.", fullContent: "La vision par ordinateur permet l'analyse d'images, la détection d'objets, la reconnaissance faciale ou la génération d'images. Risques spécifiques selon l'usage." },
  { question: "Machine Learning", category: "Réponse", text: "Apprentissage automatique pour prédictions et classifications basées sur des données.", fullContent: "Le ML utilise des algorithmes pour apprendre des patterns dans les données et faire des prédictions. Applications variées : scoring, détection d'anomalies, etc." },
  { question: "Robotique", category: "Réponse", text: "La Robotique regroupe les systèmes physiques (robots, machines) qui utilisent l'IA pour fonctionner avec autonomie, interagir avec leur environnement et exécuter des tâches." },
  { question: "Logiciels métiers", category: "Réponse", text: "Applications professionnelles intégrant des fonctionnalités IA.", fullContent: "Logiciels d'entreprise enrichis par l'IA (CRM, ERP, outils créatifs). L'IA est un composant parmi d'autres fonctionnalités métier." },
  { question: "Apprentissage / e-learning", category: "Réponse", text: "Plateformes d'apprentissage utilisant l'IA pour personnaliser la formation.", fullContent: "L'IA adapte les parcours pédagogiques selon les profils et progressions des apprenants. Enjeux de transparence sur les décisions d'orientation." },
  { question: "Système autonome", category: "Réponse", text: "Système automatisé fonctionnant avec différents niveaux d'autonomie.", fullContent: "Un système automatisé conçu pour fonctionner avec différents niveaux d'autonomie, capable de déduire des sorties (prédictions, contenus) qui influencent les environnements physiques ou virtuels." },
  { question: "Produit", category: "Réponse", text: "Système IA intégré comme composant dans un produit physique ou logiciel.", fullContent: "Le système d'IA peut être intégré en tant que composant dans un produit (physique ou logiciel) soumis à la législation de l'UE." },
  { question: "Dans quels pays le cas d'usage est-il utilisé ?", category: "Question", text: "L'AI Act s'applique dans tous les États membres de l'UE. Il s'applique également aux cas d'usage IA utilisés par des acteurs établis dans un pays tiers si les résultats produits par le système sont destinées à être utilisés sur le territoire de l'UE." },
  { question: "Brève description du système IA ?", category: "Question", text: "Résumez votre système IA : objectif principal, fonction clé, utilisateurs cibles, contexte métier et technologie utilisée (type d'IA, modèle, fournisseur). Utilisez le bouton de génération automatique pour obtenir une première version, puis ajustez-la selon vos besoins." },
  { question: "Mon entreprise travaille dans le domaine de l'informatique et de l'IA", category: "Réponse", text: "Soit un Fournisseur qui développe l'IA et la met sur le marché, soit un importateur qui introduit l'IA d'un pays tiers dans l'UE, soit un distributeur qui la met à disposition, soit un mandataire qui représente le fournisseur non-UE pour la conformité." },
  { question: "Mon entreprise utilise des systèmes d'IA tiers", category: "Réponse", text: "Un déployeur (utilisateur) est une personne physique ou morale, une autorité publique, une entreprise ou un autre organisme qui utilise un système d'IA sous sa propre autorité. Il doit s'assurer d'utiliser les systèmes d'IA conformément à l'AI Act et de garantir un contrôle humain approprié." },
  { question: "Quelle phrase décrit le mieux votre situation ?", category: "Question", text: "Cette question permet de mieux comprendre vos attentes en termes de rédaction d'audit et de rapport." },
  { question: "Emploi, gestion des travailleurs et accès à l'emploi indépendant", category: "Réponse", text: "Ce domaine inclut les systèmes d'IA pour cibler des offres d'emploi, analyser et filtrer les candidatures, prendre des décisions affectant les conditions de travail, la promotion ou le licenciement, ou surveiller et évaluer les performances des employés. Exemple : logiciel de tri de CV." },
  { question: "Administration de la justice et processus démocratiques", category: "Réponse", text: "Systèmes d'IA destinés à être utilisés dans l'administration de la justice et les processus démocratiques. Cela comprend les solutions d'IA qui aident, par exemple, à préparer les décisions de justice." },
  { question: "Migration, asile et gestion des contrôles aux frontières", category: "Réponse", text: "Systèmes utilisés par les autorités pour évaluer un risque (sécurité, migration irrégulière ou santé) posé par une personne entrant sur le territoire d'un État membre, incluant l'examen des demandes d'asile, de visas et de titres de séjour." },
  { question: "Gestion et exploitation des infrastructures critiques", category: "Réponse", text: "Systèmes d'IA composants de sécurité d'infrastructures critiques (trafic routier, approvisionnement en eau, gaz, électricité). Leur défaillance pourrait mettre en danger la vie et la santé des citoyens." },
  { question: "Éducation et formation professionnelle", category: "Réponse", text: "Systèmes destinés à déterminer l'accès à l'éducation ou à la formation professionnelle. Cela englobe les outils pour évaluer les acquis d'apprentissage, orienter le processus d'apprentissage ou surveiller les comportements malhonnêtes." },
  { question: "Activités répressives (risque récidive, fiabilité preuves...)", category: "Réponse", text: "Systèmes utilisés dans la mesure où leur utilisation est autorisée par la loi : polygraphes ou outils similaires, systèmes évaluant la fiabilité des preuves lors d'enquêtes pénales, ou évaluation du risque de récidive (sans profilage uniquement)." },
  { question: "Identification Biométrique à Distance en Temps Réel dans les Espaces Publics", category: "Réponse", text: "Identification Biométrique à Distance L'IBAD en temps réel dans les espaces publics à des fins répressives est interdite, sauf exceptions très strictes et préalablement autorisées (ex: recherche de victimes spécifiques d'enlèvement ou prévention d'attaque terroriste imminente)." },
  { question: "Composant de sécurité dans des secteurs critiques (santé, transports, énergies, etc.)", category: "Réponse", text: "Composant de sécurité secteurs critiques Ces systèmes ne sont pas interdits, mais classés à Haut Risque. Ex: Composants de sécurité d'IA dans les transports ou la fourniture d'eau/gaz. Ils sont soumis à des obligations strictes (gestion des risques, robustesse)." },
  { question: "Question E4.N8.Q2", category: "Question", text: "Les données personnelles sont toute information relative à une personne physique identifiée ou identifiable (Règlement (UE) 2016/679). Si votre système d'IA les traite, il doit respecter les exigences de l'AI Act et le droit de l'Union sur la protection des données (RGPD)." },
  { question: "Question E4.N8.Q3", category: "Question", text: "L'IA peut générer des décisions qui influencent la vie des individus. Si ces décisions affectent les droits fondamentaux (emploi, crédit, justice), le système est considéré à Haut Risque et doit permettre une supervision humaine pour contester la décision." },
];

console.log('🔍 Vérification des tooltips...\n');

let allOk = true;
const differences = [];

function normalizeText(text) {
  return (text || '').trim().replace(/\s+/g, ' ');
}

function findInCreationData(questionText, category) {
  if (category === 'Question') {
    for (const [id, q] of Object.entries(creationData)) {
      if (normalizeText(q.question) === normalizeText(questionText)) {
        return { type: 'question', data: q, id };
      }
    }
  } else {
    for (const [id, q] of Object.entries(creationData)) {
      if (q.options && Array.isArray(q.options)) {
        for (const opt of q.options) {
          const label = typeof opt === 'string' ? opt : opt.label;
          if (label && normalizeText(label) === normalizeText(questionText)) {
            return { type: 'option', data: opt, questionId: id };
          }
        }
      }
    }
  }
  return null;
}

function findInQuestionsData(questionText, category) {
  if (category === 'Question') {
    for (const [id, q] of Object.entries(questionsData)) {
      if (normalizeText(q.question) === normalizeText(questionText)) {
        return { type: 'question', data: q, id };
      }
    }
  } else {
    for (const [id, q] of Object.entries(questionsData)) {
      if (q.options && Array.isArray(q.options)) {
        for (const opt of q.options) {
          if (normalizeText(opt.label) === normalizeText(questionText)) {
            return { type: 'option', data: opt, questionId: id };
          }
        }
      }
    }
  }
  return null;
}

for (const expectedItem of expected) {
  let found = findInCreationData(expectedItem.question, expectedItem.category);
  if (!found) {
    found = findInQuestionsData(expectedItem.question, expectedItem.category);
  }
  
  if (!found) {
    differences.push({
      question: expectedItem.question,
      category: expectedItem.category,
      status: 'NOT_FOUND',
      message: 'Non trouvé dans les fichiers'
    });
    allOk = false;
    continue;
  }
  
  const tooltip = found.type === 'question' ? found.data.tooltip : found.data.tooltip;
  
  if (!tooltip) {
    differences.push({
      question: expectedItem.question,
      category: expectedItem.category,
      status: 'NO_TOOLTIP',
      message: 'Tooltip absent'
    });
    allOk = false;
    continue;
  }
  
  const actualShort = normalizeText(tooltip.shortContent || '');
  const expectedShort = normalizeText(expectedItem.text);
  const actualFull = normalizeText(tooltip.fullContent || '');
  const expectedFull = normalizeText(expectedItem.fullContent || '');
  
  if (actualShort !== expectedShort) {
    differences.push({
      question: expectedItem.question,
      category: expectedItem.category,
      status: 'DIFFERENT_SHORT',
      expected: expectedShort,
      actual: actualShort,
      file: found.type === 'question' ? (found.id in creationData ? 'creation-questions.json' : 'questions-with-scores.json') : 'creation-questions.json'
    });
    allOk = false;
  }
  
  if (expectedItem.fullContent && actualFull !== expectedFull) {
    differences.push({
      question: expectedItem.question,
      category: expectedItem.category,
      status: 'DIFFERENT_FULL',
      expected: expectedFull,
      actual: actualFull,
      file: 'creation-questions.json'
    });
    allOk = false;
  }
}

if (allOk) {
  console.log('✅ Tous les tooltips sont à jour !');
} else {
  console.log(`❌ ${differences.length} différence(s) trouvée(s):\n`);
  differences.forEach((diff, idx) => {
    console.log(`${idx + 1}. "${diff.question}" (${diff.category})`);
    console.log(`   Statut: ${diff.status}`);
    if (diff.expected && diff.actual) {
      console.log(`   Attendu: ${diff.expected.substring(0, 100)}...`);
      console.log(`   Actuel:  ${diff.actual.substring(0, 100)}...`);
    } else {
      console.log(`   ${diff.message}`);
    }
    if (diff.file) {
      console.log(`   Fichier: ${diff.file}`);
    }
    console.log('');
  });
}

process.exit(allOk ? 0 : 1);







































