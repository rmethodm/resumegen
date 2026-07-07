import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import EducationSection from '../EducationSection';

describe('EducationSection', () => {
    it('renders existing entries and adds a new one', async () => {
        const onSave = jest.fn();
        await render(
            <EducationSection
                items={[{ id: '1', school: 'State University', degree: 'BS', field: 'CS', grad_year: '2020' }]}
                onSave={onSave}
            />,
        );

        expect(screen.getByDisplayValue('State University')).toBeTruthy();

        await fireEvent.press(screen.getByText('Add Education'));

        expect(onSave).toHaveBeenCalledTimes(1);
        expect(onSave.mock.calls[0][0]).toHaveLength(2);
    });

    it('treats a null items prop as an empty list', async () => {
        await render(<EducationSection items={null} onSave={jest.fn()} />);

        expect(screen.getByText('Add Education')).toBeTruthy();
    });
});
