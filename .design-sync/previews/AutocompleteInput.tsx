import { AutocompleteInput } from 'resumegen';
import { useState } from 'react';

export function JobRole() {
  const [value, setValue] = useState('Software Engineer');
  return (
    <div className="w-72">
      <AutocompleteInput
        endpoint="job-roles"
        value={value}
        onChange={setValue}
        placeholder="Search job roles…"
      />
    </div>
  );
}

export function Empty() {
  const [value, setValue] = useState('');
  return (
    <div className="w-72">
      <AutocompleteInput
        endpoint="job-titles"
        value={value}
        onChange={setValue}
        placeholder="Search job titles…"
      />
    </div>
  );
}
