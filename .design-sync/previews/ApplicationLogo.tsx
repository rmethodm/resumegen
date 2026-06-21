import { ApplicationLogo } from 'resumegen';

export function Default() {
  return (
    <div className="flex items-center gap-3 p-4">
      <ApplicationLogo className="h-9 w-auto" />
    </div>
  );
}

export function Large() {
  return (
    <div className="flex items-center gap-3 p-4">
      <ApplicationLogo className="h-16 w-auto" />
    </div>
  );
}
