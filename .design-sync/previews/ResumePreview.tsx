import { ResumePreview } from 'resumegen';

const sample = {
  title: 'Senior Backend Engineer',
  target_role: 'Senior Backend Engineer',
  full_name: 'Jane Smith',
  headline: 'Senior Backend Engineer',
  email: 'jane.smith@example.com',
  phone: '(415) 555-0142',
  location: 'San Francisco, CA',
  linkedin: 'linkedin.com/in/janesmith',
  website: 'janesmith.dev',
  summary:
    'Backend engineer with 6 years shipping high-throughput payment systems. Led the migration of a monolith to event-driven services, cutting p99 latency 45%.',
  template: 'modern' as const,
  font: 'inter' as const,
  density: 'balanced' as const,
  skills_layout: 'grouped' as const,
  section_order: [
    'contact',
    'summary',
    'experience',
    'project',
    'education',
    'skills',
    'certificate',
  ] as const,
  experiences: [
    {
      title: 'Senior Backend Engineer',
      company: 'Acme Corp',
      start_date: 'Jan 2021',
      end_date: '',
      is_current: true,
      bullets: [
        'Migrated the billing pipeline to event-driven processing, cutting reconciliation errors 60%.',
        'Led a team of 4 engineers rebuilding the payments service on Go and Postgres.',
      ],
    },
    {
      title: 'Backend Engineer',
      company: 'Northwind Systems',
      start_date: 'Jun 2018',
      end_date: 'Dec 2020',
      is_current: false,
      bullets: ['Built the internal fraud-detection API, reducing chargebacks 22%.'],
    },
  ],
  projects: [
    {
      name: 'Open Source Rate Limiter',
      url: 'github.com/janesmith/ratelimit',
      start_date: '2022',
      end_date: '',
      description: 'A distributed token-bucket rate limiter used by 3 internal teams.',
      highlights: ['1.2k GitHub stars', 'Adopted by two other engineering orgs'],
    },
  ],
  education: [
    {
      school: 'University of Washington',
      degree: 'B.S.',
      field: 'Computer Science',
      graduation_year: '2018',
    },
  ],
  certificates: [
    {
      name: 'AWS Certified Solutions Architect',
      issuer: 'Amazon Web Services',
      obtained_at: '2022',
      expires_at: '2025',
      credential_id: 'AWS-123456',
    },
  ],
  skills: [
    { category: 'Languages', name: 'Go' },
    { category: 'Languages', name: 'TypeScript' },
    { category: 'Infrastructure', name: 'Postgres' },
    { category: 'Infrastructure', name: 'Kafka' },
  ],
};

export function Modern() {
  return <ResumePreview resume={sample} />;
}

export function Minimal() {
  return <ResumePreview resume={{ ...sample, template: 'minimal' }} />;
}

export function AtsPlain() {
  return <ResumePreview resume={{ ...sample, template: 'ats-plain', skills_layout: 'inline' }} />;
}
