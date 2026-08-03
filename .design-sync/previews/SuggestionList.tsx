import { SuggestionList } from 'resumegen';

const suggestions = [
  {
    experience: 0,
    bullet: 1,
    message: 'This bullet describes a duty rather than a result.',
    rewrite: 'Cut deployment time 40% by migrating CI to parallel test shards.',
  },
  {
    experience: null,
    bullet: null,
    message: 'Your summary is missing — recruiters scan it first.',
    rewrite: null,
  },
];

export function WithSuggestions() {
  return <SuggestionList suggestions={suggestions} stale={false} onApply={() => {}} />;
}

export function Stale() {
  return <SuggestionList suggestions={suggestions} stale={true} onApply={() => {}} />;
}

export function Empty() {
  return <SuggestionList suggestions={[]} stale={false} onApply={() => {}} />;
}
