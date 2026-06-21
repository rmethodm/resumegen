import { PrimaryButton } from 'resumegen';

export function Default() {
  return <PrimaryButton>Save Changes</PrimaryButton>;
}

export function Disabled() {
  return <PrimaryButton disabled>Save Changes</PrimaryButton>;
}

export function Long() {
  return <PrimaryButton>Generate AI Resume</PrimaryButton>;
}
