import { DangerButton } from 'resumegen';

export function Default() {
  return <DangerButton>Delete Account</DangerButton>;
}

export function Disabled() {
  return <DangerButton disabled>Delete Account</DangerButton>;
}

export function Short() {
  return <DangerButton>Remove</DangerButton>;
}
