import { TagInput } from 'resumegen';
import { useState } from 'react';

export function WithTags() {
  const [tags, setTags] = useState(['React', 'TypeScript', 'GraphQL', 'Node.js']);
  return (
    <div className="w-72">
      <TagInput tags={tags} onChange={setTags} placeholder="Add skill…" />
    </div>
  );
}

export function Empty() {
  const [tags, setTags] = useState<string[]>([]);
  return (
    <div className="w-72">
      <TagInput tags={tags} onChange={setTags} placeholder="Add skill…" />
    </div>
  );
}
