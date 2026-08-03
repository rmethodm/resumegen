import { ShareResumeModal } from 'resumegen';

const share = {
  id: 1,
  url: 'https://resumegen.test/r/abc123xyz',
  allow_download: true,
  require_email: false,
  require_password: false,
  password: null,
  expires_at: null,
};

export function Open() {
  return (
    <ShareResumeModal open={true} onOpenChange={() => {}} resumeId={1} share={share} />
  );
}
