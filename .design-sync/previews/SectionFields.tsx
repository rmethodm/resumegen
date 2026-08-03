import { SectionFields } from 'resumegen';

const resume = {
  title: 'Senior Backend Engineer',
  target_role: 'Senior Backend Engineer',
  full_name: 'Jane Smith',
  headline: 'Senior Backend Engineer',
  email: 'jane.smith@example.com',
  phone: '(415) 555-0142',
  location: 'San Francisco, CA',
  linkedin: 'linkedin.com/in/janesmith',
  website: 'janesmith.dev',
  summary: 'Backend engineer with 6 years shipping high-throughput payment systems.',
  template: 'modern' as const,
  font: 'inter' as const,
  density: 'balanced' as const,
  skills_layout: 'grouped' as const,
  section_order: ['contact', 'summary', 'experience', 'project', 'education', 'skills', 'certificate'] as const,
  experiences: [
    {
      title: 'Senior Backend Engineer',
      company: 'Acme Corp',
      start_date: 'Jan 2021',
      end_date: '',
      is_current: true,
      bullets: ['Migrated the billing pipeline to event-driven processing, cutting reconciliation errors 60%.'],
    },
  ],
  projects: [],
  education: [],
  certificates: [],
  skills: [
    { category: 'Languages', name: 'Go' },
    { category: 'Languages', name: 'TypeScript' },
  ],
};

const skillLibrary = [
  { kind: 'hard' as const, category: 'Languages', skills: ['Go', 'TypeScript', 'Python'] },
  { kind: 'soft' as const, category: 'Leadership', skills: ['Mentoring'] },
];

export function Experience() {
  return (
    <SectionFields
      resume={resume}
      section="experience"
      skillLibrary={skillLibrary}
      contactErrors={{ email: null, phone: null }}
      onChange={() => {}}
    />
  );
}

export function Skills() {
  return (
    <SectionFields
      resume={resume}
      section="skills"
      skillLibrary={skillLibrary}
      contactErrors={{ email: null, phone: null }}
      onChange={() => {}}
    />
  );
}
