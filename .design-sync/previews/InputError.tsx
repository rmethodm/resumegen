import { InputError } from 'resumegen';

export function Short() {
  return <InputError message="This field is required." />;
}

export function Long() {
  return <InputError message="The email address you entered is already associated with another account." />;
}
