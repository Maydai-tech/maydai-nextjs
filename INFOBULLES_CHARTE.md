# Charte des Infobulles MaydAI

## Vue d'ensemble

Ce document définit les règles de design et d'édition pour toutes les infobulles de l'application MaydAI. Les infobulles permettent de fournir des informations contextuelles sans surcharger l'interface.

## Types d'Infobulles

### 1. Infobulles de Questions
Affichées à côté du titre d'une question pour expliquer sa finalité ou son contexte.

### 2. Infobulles de Réponses
Affichées à côté des options de réponse pour clarifier le sens d'une option spécifique.

## Spécifications Techniques

### Limites de Caractères

| Type | Contenu Court (Hover) | Contenu Complet (Modal) | Seuil Modal |
|------|----------------------|-------------------------|-------------|
| Questions | 100 caractères max | 300 caractères max | > 200 caractères |
| Réponses | 100 caractères max | 300 caractères max | > 200 caractères |

**Règle importante** : Si le contenu total fait moins de 200 caractères, aucune modal n'est affichée. Seul le hover est utilisé.

### Dimensions

| Type | Largeur Minimum | Largeur Maximum | Retour à la ligne |
|------|----------------|----------------|-------------------|
| Questions | 450px | 600px | Automatique (adaptative) |
| Réponses | 350px | 500px | Automatique (adaptative) |
| Mobile (< 640px) | - | 90vw (max 400px) | Automatique |

**Note** : Les largeurs sont adaptatives entre min et max selon le contenu, garantissant une lisibilité optimale pour ~100 caractères sur une ligne.

### Typographie

| Contexte | Taille de police |
|----------|------------------|
| Hover (tooltip preview) | 14px (`text-sm`) |
| Modal (détails complets) | 14px (`text-sm`) |

### Positionnement

#### Infobulles de Questions
- **Position** : En dessous du titre de la question
- **Alignement** : Centré par rapport à l'icône

#### Infobulles de Réponses
- **Mode Auto** : Position calculée automatiquement
  - Si l'élément est dans la moitié gauche de l'écran → affichage à **droite**
  - Si l'élément est dans la moitié droite de l'écran → affichage à **gauche**
- **Réponses en une colonne** : Toujours à droite
- **Réponses en deux colonnes** : 
  - Colonne gauche → tooltip à droite
  - Colonne droite → tooltip à gauche

### Comportement Interactif

#### Desktop (≥ 640px)
1. **Hover** : Affiche un aperçu du contenu court
2. **Clic** : Ouvre la modal avec le contenu complet (si > 200 caractères)

#### Mobile/Tablette (< 640px)
- **Pas de hover** : L'interaction hover est désactivée
- **Clic uniquement** : Ouvre directement la modal (si > 200 caractères)

### Style Visuel

| Élément | Valeur |
|---------|--------|
| Couleur principale | `#0080A3` (bleu MaydAI) |
| Icône | `HelpCircle` de Lucide |
| Taille de l'icône | 14px (`h-3.5 w-3.5`) |
| Background icône | `bg-[#0080A3]/10` |
| Background icône hover | `bg-[#0080A3]/20` |

## Utilisation du Composant

### Import

```tsx
import Tooltip from '@/components/Tooltip'
```

### Props

```typescript
interface TooltipProps {
  title: string              // Titre affiché dans la modal
  shortContent: string       // Contenu affiché au hover (max 100 caractères)
  fullContent?: string       // Contenu complet (optionnel, max 300 caractères)
  icon?: string             // Emoji ou icône (défaut : '💡')
  type?: 'question' | 'answer'  // Type d'infobulle (défaut : 'question')
  position?: 'left' | 'right' | 'bottom' | 'auto'  // Position (défaut : 'auto')
  rank?: number             // Classement mondial (optionnel, pour partenaires)
}
```

### Exemples d'Utilisation

#### Infobulle de Question

```tsx
<h2 className="text-xl font-semibold">
  Quelle est votre finalité principale ?
  <Tooltip
    title="Finalité du système"
    shortContent="La finalité décrit l'objectif principal pour lequel votre système IA est conçu."
    fullContent="Selon l'IA Act, la finalité est l'objectif pour lequel le système d'IA est utilisé, comprenant le contexte et les conditions spécifiques d'utilisation prévues. Une définition claire permet d'évaluer correctement les risques."
    icon="🎯"
    type="question"
  />
</h2>
```

#### Infobulle de Réponse

```tsx
<label className="flex items-start p-4 border rounded-lg">
  <input type="radio" name="autonomy" value="autonomous" />
  <div className="flex items-center flex-1">
    <span>Système autonome</span>
    <Tooltip
      title="Système autonome"
      shortContent="Un système qui prend des décisions sans intervention humaine directe."
      fullContent="Un système d'IA autonome est capable de fonctionner et de prendre des décisions de manière indépendante, sans supervision humaine constante. Le niveau d'autonomie impacte directement l'évaluation des risques selon l'IA Act."
      icon="🤖"
      type="answer"
      position="auto"
    />
  </div>
</label>
```

## Règles Éditoriales

### Contenu Court (Hover)

✅ **À faire** :
- Rester concis (idéalement 50-80 caractères)
- Utiliser un langage simple et direct
- Donner une définition claire et immédiate
- Éviter les phrases complexes

❌ **À éviter** :
- Dépasser 100 caractères
- Utiliser du jargon technique sans explication
- Faire des phrases à rallonge
- Répéter le texte de la question/réponse

### Contenu Complet (Modal)

✅ **À faire** :
- Fournir le contexte légal ou technique
- Expliquer l'impact sur l'évaluation
- Donner des exemples concrets si pertinent
- Rester dans la limite de 300 caractères

❌ **À éviter** :
- Écrire des paragraphes longs et denses
- Citer intégralement la loi (résumer)
- Inclure des informations non pertinentes
- Dépasser 300 caractères

### Tone & Voice

- **Ton** : Professionnel mais accessible
- **Voix** : Pédagogique et aidante
- **Perspective** : Expliquer "pourquoi c'est important"
- **Style** : Phrases courtes, vocabulaire précis

## Exemples de Bon et Mauvais Contenu

### ✅ Bon Exemple

**Contenu court** : "Système fonctionnant sans supervision humaine constante."

**Contenu complet** : "Un système autonome prend des décisions seul. Selon l'IA Act, plus un système est autonome, plus les exigences de transparence et de surveillance sont élevées."

**Pourquoi c'est bon** :
- Court est < 80 caractères
- Complet est < 300 caractères
- Définition claire
- Contexte légal mentionné
- Impact expliqué

### ❌ Mauvais Exemple

**Contenu court** : "Un système autonome est un système qui fonctionne de manière indépendante sans avoir besoin d'une supervision humaine directe à chaque étape."

**Contenu complet** : "Selon l'article 3, paragraphe 1, du règlement européen sur l'intelligence artificielle (IA Act), un système d'IA autonome est défini comme un système basé sur une machine qui, pour des objectifs explicites ou implicites, déduit, à partir des données d'entrée qu'il reçoit, comment générer des sorties telles que des prédictions, du contenu, des recommandations ou des décisions qui peuvent influencer des environnements physiques ou virtuels..."

**Pourquoi c'est mauvais** :
- Court dépasse 100 caractères
- Complet dépasse largement 300 caractères
- Citation trop littérale de la loi
- Trop technique et indigeste
- Pas assez actionnable

## Checklist de Validation

Avant d'ajouter une nouvelle infobulle, vérifier :

- [ ] Le contenu court fait moins de 100 caractères
- [ ] Le contenu complet fait moins de 300 caractères (si présent)
- [ ] Le type (`question` ou `answer`) est correct
- [ ] Le `title` est clair et descriptif
- [ ] L'icône est pertinente (émoji approprié)
- [ ] Le contenu est rédigé en français correct
- [ ] Le ton est professionnel mais accessible
- [ ] L'information apporte une vraie valeur ajoutée
- [ ] La position est appropriée pour le contexte

## Maintenance

### Ajout d'une Nouvelle Infobulle

Pour ajouter une infobulle sur une **option de réponse** :

1. Localiser le fichier de définition des questions (ex: `lib/questions-data.ts`)
2. Ajouter la propriété `tooltip` à l'option concernée :

```typescript
{
  code: 'E4.N8.Q10.A',
  label: 'Système autonome',
  tooltip: {
    title: 'Système autonome',
    shortContent: 'Système fonctionnant sans supervision humaine.',
    fullContent: 'Un système autonome prend des décisions seul. Plus il est autonome, plus les exigences de transparence sont élevées.',
    icon: '🤖'
  }
}
```

3. Le composant `QuestionRenderer` détectera automatiquement la présence du tooltip

### Modification du Type `QuestionOption`

Si nécessaire, mettre à jour le type TypeScript :

```typescript
// app/usecases/[id]/types/usecase.ts
export interface QuestionOption {
  code: string
  label: string
  score_impact?: number
  category_impacts?: Record<string, number>
  is_eliminatory?: boolean
  unique_answer?: boolean
  tooltip?: {
    title: string
    shortContent: string
    fullContent?: string
    icon?: string
  }
}
```

## Architecture Technique

### Fichiers Concernés

| Fichier | Rôle |
|---------|------|
| `components/Tooltip.tsx` | Composant principal unifié et réutilisable |
| `components/QuestionTooltip.tsx` | **DÉPRÉCIÉ** - Remplacé par `Tooltip.tsx` |
| `components/PartnerTooltip.tsx` | **DÉPRÉCIÉ** - Remplacé par `Tooltip.tsx` |
| `app/usecases/new/page.tsx` | Utilisation pour les questions et partenaires |
| `app/usecases/[id]/components/evaluation/QuestionRenderer.tsx` | Support des infobulles sur les réponses |

### Logique de Positionnement

Le composant utilise :
- `useRef` pour accéder à la position DOM de l'élément
- `getBoundingClientRect()` pour calculer la position relative
- Détection automatique de la moitié d'écran pour le mode `auto`

### Responsive

- Breakpoint : `640px` (Tailwind `sm`)
- Mobile : Désactivation du hover, modal uniquement
- Desktop : Hover + modal

## Support et Questions

Pour toute question concernant l'utilisation ou la modification de cette charte, contacter l'équipe technique.

---

**Version** : 1.0  
**Date de création** : Octobre 2025  
**Dernière mise à jour** : Octobre 2025  
**Auteurs** : Équipe MaydAI

