import { Checkbox } from 'resumegen';

export function Unchecked() {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id="terms" name="terms" />
      <label htmlFor="terms" className="text-sm text-gray-700">
        I agree to the terms of service
      </label>
    </div>
  );
}

export function Checked() {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id="newsletter" name="newsletter" defaultChecked />
      <label htmlFor="newsletter" className="text-sm text-gray-700">
        Send me product updates
      </label>
    </div>
  );
}

export function Disabled() {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id="locked" name="locked" disabled defaultChecked />
      <label htmlFor="locked" className="text-sm text-gray-400">
        Required (cannot change)
      </label>
    </div>
  );
}
