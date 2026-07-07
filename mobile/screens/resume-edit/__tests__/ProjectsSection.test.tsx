import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ProjectsSection from '../ProjectsSection';

describe('ProjectsSection', () => {
    it('renders existing entries and adds a new one', async () => {
        const onSave = jest.fn();
        await render(
            <ProjectsSection
                items={[{ id: '1', name: 'Side Project', description: '', url: '', start_date: '', end_date: '', bullets: '' }]}
                onSave={onSave}
            />,
        );

        expect(screen.getByDisplayValue('Side Project')).toBeTruthy();

        await fireEvent.press(screen.getByText('Add Projects'));

        expect(onSave).toHaveBeenCalledTimes(1);
        expect(onSave.mock.calls[0][0]).toHaveLength(2);
    });

    it('treats a null items prop as an empty list', async () => {
        await render(<ProjectsSection items={null} onSave={jest.fn()} />);

        expect(screen.getByText('Add Projects')).toBeTruthy();
    });
});
