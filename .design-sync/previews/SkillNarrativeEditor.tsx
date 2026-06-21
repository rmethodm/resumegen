import { SkillNarrativeEditor } from 'resumegen';
import { useState } from 'react';

export function Populated() {
  const [narratives, setNarratives] = useState([
    {
      id: '1',
      name: 'Technical Leadership',
      bullets: [
        'Architected microservices migration reducing deployment time by 60%',
        'Established engineering standards adopted across 4 product teams',
      ],
    },
    {
      id: '2',
      name: 'Cross-functional Collaboration',
      bullets: [
        'Partnered with design and product to ship 12 features in Q3',
      ],
    },
  ]);
  return (
    <div className="w-full max-w-lg">
      <SkillNarrativeEditor narratives={narratives} onChange={setNarratives} />
    </div>
  );
}

export function Empty() {
  const [narratives, setNarratives] = useState([
    { id: '1', name: '', bullets: [''] },
  ]);
  return (
    <div className="w-full max-w-lg">
      <SkillNarrativeEditor narratives={narratives} onChange={setNarratives} />
    </div>
  );
}
