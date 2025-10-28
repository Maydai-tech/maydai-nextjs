# Plan d'Action - Fonctionnalité Dossiers

## Vue d'ensemble
Chaque usecase aura un dossier de conformité composé de 7 documents obligatoires pour l'IA Act.

## Les 7 Documents Requis

1. **Instructions Système et Prompts** (texte libre)
2. **Documentation Technique** (fichier PDF/DOCX/MD)
3. **Responsable Surveillance Humaine** (formulaire : nom, rôle, email)
4. **Marquage de Transparence IA** (texte + image optionnelle)
5. **Plan de Gestion des Risques** (fichier PDF/DOCX/XLSX)
6. **Procédure Qualité des Données** (fichier PDF/DOCX)
7. **Plan de Surveillance Continue** (fichier PDF/DOCX)

## Étapes d'implémentation

### 1. Base de données
- Créer table `dossiers` (un par usecase)
- Créer table `dossier_documents` (7 documents par dossier)
- Configurer RLS : accès uniquement via propriété du usecase

### 2. Types TypeScript
- Définir types `Dossier`, `DossierDocument`, `DocumentType`
- Créer interface `DocumentConfig` pour configuration

### 3. Configuration des documents
- Fichier listant les 7 types avec labels, help text, type d'input

### 4. Storage Supabase
- Créer bucket `dossier-files`
- Organisation : `{usecase_id}/{document_type}/{filename}`
- RLS basé sur propriété usecase

### 5. Actions serveur
- Récupérer/créer dossier
- Mettre à jour document
- Uploader fichier

### 6. Composants inputs
- Input texte (textarea)
- Input fichier (drag-and-drop)
- Input formulaire (3 champs)
- Input mixte (texte + image)

### 7. Composants UI principaux
- Header avec badge de statut
- Carte document (affiche label, help, input adapté)

### 8. Page dossier
- Remplacer `app/dashboard/[id]/dossiers/DashboardDossiersPage.tsx`
- Charger dossier et 7 documents
- Grille de 7 cartes
- Bouton sauvegarder global

### 9. Logique métier
- Calcul du statut : incomplet/complet/validé
- Basé sur remplissage des 7 documents

## Ordre d'implémentation

1. Base de données (migrations + RLS)
2. Types TypeScript
3. Configuration documents
4. Storage Supabase
5. Actions serveur
6. Composants inputs
7. Composants carte + header
8. Page principale
9. Tests manuels
