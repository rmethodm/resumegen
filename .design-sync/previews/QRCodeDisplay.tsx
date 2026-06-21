import { QRCodeDisplay } from 'resumegen';

export function Default() {
  return <QRCodeDisplay url="https://resumegen.app/share/abc123xyz" size={128} />;
}

export function Large() {
  return <QRCodeDisplay url="https://resumegen.app/share/abc123xyz" size={200} />;
}
