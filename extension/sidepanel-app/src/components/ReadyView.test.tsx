import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReadyView } from './ReadyView';
import { useResumes } from '@/hooks/useResumes';

function baseResumes(): ReturnType<typeof useResumes> {
    return {
        status: 'ready',
        groups: [],
        user: { email: 'jane@example.com' },
        selectedGroupId: null,
        selectedResumeId: null,
        profile: null,
        errorMessage: '',
        load: vi.fn(),
        selectGroup: vi.fn(),
        selectResume: vi.fn(),
    };
}

describe('ReadyView', () => {
    it('switches to the Help tab and shows help content', () => {
        render(<ReadyView resumes={baseResumes()} />);

        fireEvent.mouseDown(screen.getByRole('tab', { name: 'Help' }), { button: 0 });

        expect(screen.getByText('How filling works')).toBeInTheDocument();
    });
});
