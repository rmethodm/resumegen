import { SkillPickerModal } from 'resumegen';

const library = [
  { kind: 'hard' as const, category: 'Languages', skills: ['Go', 'TypeScript', 'Python', 'Rust'] },
  { kind: 'hard' as const, category: 'Infrastructure', skills: ['Postgres', 'Kafka', 'Docker'] },
  { kind: 'soft' as const, category: 'Leadership', skills: ['Mentoring', 'Cross-team collaboration'] },
];

const skills = [{ category: 'Languages', name: 'Go' }];

export function Open() {
  return (
    <SkillPickerModal
      open={true}
      onOpenChange={() => {}}
      library={library}
      skills={skills}
      onAdd={() => {}}
    />
  );
}
