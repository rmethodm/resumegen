import { ScoreDial } from 'resumegen';

export function Strong() {
  return <ScoreDial score={92} />;
}

export function Fair() {
  return <ScoreDial score={58} />;
}

export function NoScore() {
  return <ScoreDial score={null} />;
}
