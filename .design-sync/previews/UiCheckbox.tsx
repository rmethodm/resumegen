import { UiCheckbox } from 'resumegen';

export function Default() {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
      <UiCheckbox defaultChecked={false} />
      I currently work here
    </label>
  );
}

export function Checked() {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
      <UiCheckbox defaultChecked={true} />
      I currently work here
    </label>
  );
}

export function Disabled() {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
      <UiCheckbox disabled defaultChecked={true} />
      Locked field
    </label>
  );
}
