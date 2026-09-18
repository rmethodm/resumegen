/** @vitest-environment happy-dom */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { AnchorHTMLAttributes } from 'react';
import { ApplicationReview } from './application-review';
vi.mock('@inertiajs/react', () => ({ Link: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} /> }));
const application = { id: 9, company: 'Example', role: 'Designer', status: 'saved' as const, job_url: 'https://example.com/careers' };
const onDownload = vi.fn();
const onFix = vi.fn();
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('route', (name: string) => `/${name}`); });
describe('application review', () => {
    it('waits for saved changes and blocking checks before allowing download', () => {
        const { rerender } = render(<ApplicationReview application={application} saved={false} checks={[]} onDownload={onDownload} onFix={onFix} />);
        expect(screen.getByRole('button', { name: 'Download PDF' })).toBeDisabled();
        rerender(<ApplicationReview application={application} saved checks={[{ id: 'email', label: 'Add email', severity: 'error', section: 'contact' }]} onDownload={onDownload} onFix={onFix} />);
        expect(screen.getByRole('button', { name: 'Download PDF' })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'Add email' }));
        expect(onFix).toHaveBeenCalledWith(expect.objectContaining({ section: 'contact' }));
        rerender(<ApplicationReview application={application} saved checks={[]} onDownload={onDownload} onFix={onFix} />);
        fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
        expect(onDownload).toHaveBeenCalledWith('pdf');
    });
    it('opens only an http employer link and keeps tracking a separate action', () => {
        const { rerender } = render(<ApplicationReview application={application} saved checks={[]} onDownload={onDownload} onFix={onFix} />);
        expect(screen.getByRole('link', { name: /Open employer/ })).toHaveAttribute('href', 'https://example.com/careers');
        expect(screen.getByRole('link', { name: /Open application tracker/ })).toHaveAttribute('href', '/job-applications.index');
        rerender(<ApplicationReview application={{ ...application, job_url: 'javascript:alert(1)' }} saved checks={[]} onDownload={onDownload} onFix={onFix} />);
        expect(screen.queryByRole('link', { name: /Open employer/ })).not.toBeInTheDocument();
    });
    it('offers job discovery for an unlinked resume', () => {
        render(<ApplicationReview application={null} saved checks={[]} onDownload={onDownload} onFix={onFix} />);
        expect(screen.getByRole('link', { name: 'Find a job' })).toHaveAttribute('href', '/jobs.browse');
        expect(screen.queryByRole('link', { name: /Open application tracker/ })).not.toBeInTheDocument();
    });
});
