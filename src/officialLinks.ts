/**
 * Official UMass Boston pages only. We do not embed hours or dates here —
 * those belong on umb.edu so they stay accurate when the university updates them.
 */
export type OfficialLink = { label: string; href: string; note: string };

export const OFFICIAL_UMB_LINKS: OfficialLink[] = [
  {
    label: 'ACES — Appointments & drop-ins',
    href: 'https://aces.umb.edu/appointments/',
    note: 'Current drop-in and appointment information (see that page for schedules).',
  },
  {
    label: 'Advising by college / major',
    href: 'https://aces.umb.edu/resources/advising-for-all-declared-majors-cm-60-credits/',
    note: 'Links to school and college advising offices.',
  },
  {
    label: 'CSM — Student Success Center (meet with an advisor)',
    href: 'https://www.umb.edu/science-mathematics/student-success-center/meet-with-your-advisor/',
    note: 'College of Science & Mathematics advising and SSC information.',
  },
  {
    label: 'Office of the Registrar',
    href: 'https://www.umb.edu/registrar/',
    note: 'Registration, records, and academic calendar.',
  },
  {
    label: 'International Student & Scholar Services (ISSS)',
    href: 'https://www.umb.edu/academics/global/isss',
    note: 'Immigration and international student support.',
  },
  {
    label: 'Financial Aid',
    href: 'https://www.umb.edu/financial-aid',
    note: 'Aid, verification, and related policies.',
  },
  {
    label: 'One Stop',
    href: 'https://www.umb.edu/onestop',
    note: 'Campus Center hub for common student services.',
  },
];
