import { BulletEditor } from 'resumegen';
import { useState } from 'react';

export function WithBullets() {
  const [bullets, setBullets] = useState([
    'Led cross-functional team of 8 engineers to deliver $2M revenue feature on schedule',
    'Reduced API latency by 40% through caching strategy and query optimization',
    'Mentored 3 junior engineers, improving team velocity by 25%',
  ]);
  return (
    <div className="w-full max-w-lg">
      <BulletEditor bullets={bullets} onChange={setBullets} />
    </div>
  );
}

export function Empty() {
  const [bullets, setBullets] = useState(['']);
  return (
    <div className="w-full max-w-lg">
      <BulletEditor bullets={bullets} onChange={setBullets} />
    </div>
  );
}
