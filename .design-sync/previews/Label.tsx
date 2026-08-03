import { Label, Input } from 'resumegen';

export function WithInput() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '220px' }}>
      <Label htmlFor="summary-preview">Summary</Label>
      <Input id="summary-preview" placeholder="A concise professional summary…" />
    </div>
  );
}
