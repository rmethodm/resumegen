import { Badge } from 'resumegen';

export function Variants() {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  );
}
