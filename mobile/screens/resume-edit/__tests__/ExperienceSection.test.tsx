import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ExperienceSection from '../ExperienceSection';

describe('ExperienceSection', () => {
    it('renders existing entries and adds a new one', async () => {
        const onSave = jest.fn();
        await render(
            <ExperienceSection
                items={[{ id: '1', company: 'Acme', title: 'Engineer', start_date: '', end_date: '', current: false, bullets: '' }]}
                onSave={onSave}
            />,
        );

        expect(screen.getByDisplayValue('Acme')).toBeTruthy();

        await fireEvent.press(screen.getByText('Add Experience'));

        expect(onSave).toHaveBeenCalledTimes(1);
        expect(onSave.mock.calls[0][0]).toHaveLength(2);
    });

    it('treats a null items prop as an empty list', async () => {
        await render(<ExperienceSection items={null} onSave={jest.fn()} />);

        expect(screen.getByText('Add Experience')).toBeTruthy();
    });
});
