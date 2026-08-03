import { ScoreGauge } from 'resumegen';

export function VeryGood() {
  return <ScoreGauge score={82} />;
}

export function NeedsWork() {
  return <ScoreGauge score={31} />;
}

export function NoScore() {
  return <ScoreGauge score={null} />;
}
