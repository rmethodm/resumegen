import { InputLabel } from 'resumegen';

export function Default() {
  return <InputLabel htmlFor="email" value="Email address" />;
}

export function Required() {
  return (
    <div className="flex items-center gap-0.5">
      <InputLabel htmlFor="name" value="Full name" />
      <span className="text-red-500 text-sm">*</span>
    </div>
  );
}

export function WithInput() {
  return (
    <div className="flex flex-col gap-1">
      <InputLabel htmlFor="company" value="Company" />
      <input
        id="company"
        type="text"
        placeholder="Acme Corp"
        className="rounded-lg border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
      />
    </div>
  );
}
