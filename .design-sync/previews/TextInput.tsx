import { TextInput } from 'resumegen';

export function Default() {
  return <TextInput type="text" placeholder="Enter your email" />;
}

export function WithValue() {
  return <TextInput type="text" defaultValue="jane.smith@example.com" />;
}

export function Password() {
  return <TextInput type="password" defaultValue="supersecret" />;
}

export function Disabled() {
  return <TextInput type="text" defaultValue="readonly@example.com" disabled />;
}
