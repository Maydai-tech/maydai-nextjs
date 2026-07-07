/**
 * Fonctions utilitaires pour la gestion des statuts d'entreprise et niveaux de risque
 * Conformes à l'AI Act (Règlement UE 2024/1689)
 */

/**
 * Convertit le statut d'entreprise en libellé lisible
 */
export const getCompanyStatusLabel = (status?: string): string => {
  switch (status) {
    case 'utilisateur':
      return 'Utilisateur (Déployeur)'
    case 'fabriquant_produits':
      return 'Fabricant de Produits'
    case 'fabriquant_systemes':
      return 'Fabricant de Systèmes'
    case 'distributeur':
      return 'Distributeur'
    case 'importateur':
      return 'Importateur'
    case 'fournisseur':
      return 'Fournisseur'
    case 'mandataire':
      return 'Mandataire (Représentant autorisé)'
    case 'deployeur':
      return 'Déployeur'
    case 'unknown':
    default:
      return 'Non déterminé'
  }
}

/**
 * Obtient la définition du statut d'entreprise selon l'AI Act
 * Version complète et conforme au règlement
 */
export const getCompanyStatusDefinition = (status?: string): string => {
  switch (status) {
    case 'utilisateur':
      return 'Toute personne physique ou morale, autorité publique, agence ou autre organisme qui utilise un système d\'IA sous sa propre autorité, sauf si ce système est utilisé dans le cadre d\'une activité personnelle et non professionnelle.'
    case 'fabriquant_produits':
      return 'Il s\'agit d\'un fabricant qui met sur le marché européen un système d\'IA avec son propre produit et sous sa propre marque. Si un système d\'IA à haut risque constitue un composant de sécurité d\'un produit couvert par la législation d\'harmonisation de l\'Union, le fabricant de ce produit est considéré comme le fournisseur du système d\'IA à haut risque.'
    case 'fabriquant_systemes':
      return 'Entité qui développe et met sur le marché un système d\'IA autonome. Responsable de la conformité du système selon les exigences de l\'AI Act.'
    case 'distributeur':
      return 'Une personne physique ou morale faisant partie de la chaîne d\'approvisionnement, autre que le fournisseur ou l\'importateur, qui met un système d\'IA à disposition sur le marché de l\'Union.'
    case 'importateur':
      return 'Une personne physique ou morale située ou établie dans l\'Union qui met sur le marché un système d\'IA portant le nom ou la marque d\'une personne physique ou morale établie dans un pays tiers.'
    case 'fournisseur':
      return 'Une personne physique ou morale, une autorité publique, une agence ou tout autre organisme qui développe (ou fait développer) un système d\'IA ou un modèle d\'IA à usage général et le met sur le marché ou le met en service sous son propre nom ou sa propre marque, que ce soit à titre onéreux ou gratuit.'
    case 'mandataire':
      return 'Une personne physique ou morale située ou établie dans l\'Union qui a reçu et accepté un mandat écrit d\'un fournisseur de système d\'IA ou de modèle d\'IA à usage général pour s\'acquitter en son nom des obligations et des procédures établies par le règlement.'
    case 'deployeur':
      return 'Entité qui utilise un système d\'IA à haut risque dans le cadre de son activité professionnelle. Responsable de l\'utilisation conforme selon les exigences de l\'AI Act.'
    case 'unknown':
    default:
      return 'Impossible de déterminer le statut d\'entreprise basé sur les réponses actuelles.'
  }
}

/**
 * Convertit le niveau de risque en libellé lisible
 */
export const getRiskLevelLabel = (riskLevel: string): string => {
  switch (riskLevel) {
    case 'unacceptable':
      return 'Inacceptable'
    case 'high':
      return 'Élevé'
    case 'limited':
      return 'Limité'
    case 'minimal':
      return 'Minimal'
    default:
      return 'Non déterminé'
  }
}

/**
 * Obtient la justification détaillée du niveau de risque selon l'AI Act
 */
export const getRiskLevelJustification = (riskLevel: string): string => {
  switch (riskLevel) {
    case 'unacceptable':
      return 'Le système est potentiellement interdit en vertu de l\'Article 5 de l\'AI Act. Les pratiques interdites incluent la manipulation subliminale, l\'exploitation des vulnérabilités, la notation sociale, l\'évaluation des risques criminels basée sur le profilage, le raclage non ciblé d\'images faciales, la reconnaissance des émotions sur le lieu de travail/établissements d\'enseignement (sauf médical/sécurité), et l\'identification biométrique à distance en temps réel dans les espaces publics (sauf exceptions strictes). L\'interdiction de ces systèmes a pris effet le 2 février 2025.'
    case 'high':
      return 'Le système tombe dans l\'une des catégories listées à l\'Annexe III de l\'AI Act ou est un composant de sécurité d\'un produit réglementé. Cela inclut par exemple l\'IA dans les infrastructures critiques, l\'éducation, l\'emploi, l\'accès aux services essentiels, l\'application de la loi, la migration, l\'asile, le contrôle aux frontières et l\'administration de la justice. Ces systèmes sont soumis à des exigences strictes (évaluation et atténuation des risques, qualité des données, journalisation, documentation, transparence, contrôle humain, robustesse, cybersécurité, précision).'
    case 'limited':
      return 'Les systèmes d\'IA à risque limité sont ceux pour lesquels il existe un besoin spécifique de transparence. La justification principale de cette classification est d\'assurer que les utilisateurs soient informés lorsqu\'ils interagissent avec une IA, en particulier s\'il existe un risque manifeste de manipulation. Cela inclut les applications comme les chatbots, où les utilisateurs doivent savoir qu\'ils communiquent avec une machine pour prendre des décisions éclairées. Cette catégorie englobe également les systèmes d\'IA générative qui produisent des contenus synthétiques (audio, images, vidéo ou texte) ; les fournisseurs doivent s\'assurer que ces contenus sont marqués de manière lisible par machine et identifiables comme étant générés ou manipulés par une IA. De même, les déployeurs de systèmes de reconnaissance des émotions ou de catégorisation biométrique doivent informer les personnes exposées de leur fonctionnement, et ceux qui utilisent l\'IA pour générer des hyper trucages doivent clairement indiquer que le contenu a été créé ou manipulé par une IA. Ces exigences de transparence visent à préserver la confiance et à lutter contre les risques de manipulation, de tromperie et de désinformation.'
    case 'minimal':
      return 'La vaste majorité des systèmes d\'IA tombent dans cette catégorie, considérée comme présentant un risque minimal, voire nul. Ces systèmes sont généralement utilisés à condition de respecter la législation existante et ne sont soumis à aucune obligation légale supplémentaire spécifique à l\'AI Act. La justification est que ces applications ne posent pas de risques significatifs pour la santé, la sécurité ou les droits fondamentaux des personnes. Les fournisseurs de ces systèmes sont néanmoins encouragés à appliquer volontairement les exigences relatives à une "IA digne de confiance" et à adhérer à des codes de conduite volontaires. Cette approche vise à promouvoir une utilisation éthique et responsable de l\'IA sans entraver l\'innovation, offrant ainsi un avantage concurrentiel aux entreprises qui respectent ces bonnes pratiques. Des exemples typiques incluent les jeux vidéo basés sur l\'IA ou les filtres anti-spam.'
    default:
      return 'Impossible de déterminer la justification du niveau de risque.'
  }
}
