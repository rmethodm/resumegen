import { Input } from 'resumegen';

export function Default() {
  return <Input type="text" placeholder="Search job titles…" />;
}

export function WithValue() {
  return <Input type="email" defaultValue="jane.smith@example.com" />;
}

export function Disabled() {
  return <Input type="text" defaultValue="Locked" disabled />;
}
