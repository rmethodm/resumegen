import { Textarea } from 'resumegen';

export function Default() {
  return <Textarea placeholder="Write a short professional summary…" style={{ width: '260px' }} />;
}

export function WithValue() {
  return (
    <Textarea
      style={{ width: '260px' }}
      defaultValue="Backend engineer with 6 years shipping high-throughput payment systems."
    />
  );
}
