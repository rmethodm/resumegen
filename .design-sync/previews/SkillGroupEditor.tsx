import { SkillGroupEditor } from 'resumegen';
import { useState } from 'react';

export function Populated() {
  const [groups, setGroups] = useState([
    { category: 'Frontend', items: ['React', 'TypeScript', 'Tailwind CSS', 'Next.js'] },
    { category: 'Backend', items: ['Laravel', 'PostgreSQL', 'Redis'] },
  ]);
  return (
    <div className="w-full max-w-lg">
      <SkillGroupEditor groups={groups} onChange={setGroups} />
    </div>
  );
}

export function Empty() {
  const [groups, setGroups] = useState([{ category: '', items: [] }]);
  return (
    <div className="w-full max-w-lg">
      <SkillGroupEditor groups={groups} onChange={setGroups} />
    </div>
  );
}
