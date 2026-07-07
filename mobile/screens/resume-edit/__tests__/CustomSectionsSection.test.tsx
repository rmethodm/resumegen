import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import CustomSectionsSection from '../CustomSectionsSection';

describe('CustomSectionsSection', () => {
    it('renders each custom section\'s name and its entries', async () => {
        await render(
            <CustomSectionsSection
                items={[{
                    id: 'cs1',
                    name: 'Volunteering',
                    entries: [{ id: 'e1', title: 'Red Cross', subtitle: '', start_date: '', end_date: null, description: '', bullets: [] }],
                }]}
                onSave={jest.fn()}
            />,
        );

        expect(screen.getByDisplayValue('Volunteering')).toBeTruthy();
        expect(screen.getByDisplayValue('Red Cross')).toBeTruthy();
    });

    it('adds a new blank custom section', async () => {
        const onSave = jest.fn();
        await render(<CustomSectionsSection items={[]} onSave={onSave} />);

        await fireEvent.press(screen.getByText('Add custom section'));

        expect(onSave).toHaveBeenCalledTimes(1);
        const [sections] = onSave.mock.calls[0];
        expect(sections).toHaveLength(1);
        expect(sections[0]).toMatchObject({ name: '', entries: [] });
    });

    it('treats a null items prop as an empty list', async () => {
        await render(<CustomSectionsSection items={null} onSave={jest.fn()} />);

        expect(screen.getByText('Add custom section')).toBeTruthy();
    });
});
