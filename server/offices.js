/** @typedef {{ id: string; name: string; shortLabel: string }} Office */

/** @type {Office[]} */
export const OFFICES = [
  { id: 'csm', name: 'College of Science and Mathematics advising', shortLabel: 'CSM Advising' },
  { id: 'cm', name: 'College of Management advising', shortLabel: 'Management Advising' },
  { id: 'cla', name: 'College of Liberal Arts advising', shortLabel: 'Liberal Arts Advising' },
  { id: 'cnhs', name: 'College of Nursing and Health Sciences advising', shortLabel: 'Nursing & Health Sciences' },
  { id: 'cehd', name: 'College of Education and Human Development advising', shortLabel: 'Education & Human Dev.' },
  { id: 'undeclared', name: 'Undeclared / first-year advising', shortLabel: 'Undeclared / First-Year' },
  { id: 'international', name: 'International student advising', shortLabel: 'International Student' },
  { id: 'transfer', name: 'Transfer advising', shortLabel: 'Transfer Advising' },
  { id: 'registrar', name: 'Registrar / registration help', shortLabel: 'Registrar / Registration' },
  { id: 'financial_aid', name: 'Financial aid help', shortLabel: 'Financial Aid' },
];

export const VISIT_REASONS = [
  { id: 'registration_hold', label: 'Registration / hold removal' },
  { id: 'degree_planning', label: 'Degree planning / major path' },
  { id: 'general_question', label: 'General academic question' },
  { id: 'transfer_credit', label: 'Transfer credit / equivalency' },
  { id: 'schedule', label: 'Scheduling / permits' },
  { id: 'other', label: 'Other' },
];
