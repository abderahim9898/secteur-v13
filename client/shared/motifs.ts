export const initialMotifTranslations: Record<string, string> = {
  fin_contrat: 'Fin de contrat',
  demission: 'Démission',
  licenciement: 'Licenciement',
  mutation: 'Mutation',
  retraite: 'Retraite',
  opportunite_salariale: 'Opportunité salariale',
  absences_frequentes: 'Absences fréquentes',
  comportement: 'Comportement',
  salaire: 'Raisons salariales',
  depart_volontaire: 'Départ volontaire',
  horaires_nocturnes: 'Horaires nocturnes',
  adaptation_difficile: 'Adaptation difficile',
  etudes: 'Étudiant',
  heures_insuffisantes: 'Heures insuffisantes',
  distance: 'Distance',
  indiscipline: 'Indiscipline',
  balance: 'Difficulté avec la balance',
  maladie: 'Maladie',
  respect_voisins: 'Respect des voisins',
  nature_travail: 'Nature du travail',
  sante: 'Santé',
  securite: 'Sécurité',
  rendement: 'Rendement',
  problemes_personnels: 'Problèmes personnels',
  caporal: 'Raison de caporal',
  refus_poste: 'Refus de poste',
  rejet_selection: 'Rejet lors de la sélection',
  repos_temporaire: 'Repos temporaire',
  secteur_insatisfaisant: 'Secteur insatisfaisant',
  pas_reponse: 'Pas de réponse',
  conditions_secteur: 'Conditions du secteur',
  raisons_personnelles: 'Raisons personnelles',
  autre: 'Autre',
  none: 'Non spécifié'
};

export const getMotifLabel = (motif: string): string => {
  if (!motif) return 'Non spécifié';
  return initialMotifTranslations[motif] || motif || 'Non spécifié';
};
