import { SecondaryButton } from 'resumegen';

export function Default() {
  return <SecondaryButton>Cancel</SecondaryButton>;
}

export function Disabled() {
  return <SecondaryButton disabled>Cancel</SecondaryButton>;
}

export function Long() {
  return <SecondaryButton>View All Resumes</SecondaryButton>;
}
