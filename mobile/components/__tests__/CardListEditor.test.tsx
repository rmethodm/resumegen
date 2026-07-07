import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import CardListEditor from '../CardListEditor';

type Item = { id: string; title: string; notes: string };

const fields = [
    { key: 'title', label: 'Title' },
    { key: 'notes', label: 'Notes', multiline: true },
];

describe('CardListEditor', () => {
    it('renders each item\'s fields', async () => {
        await render(
            <CardListEditor<Item>
                title="Experience"
                items={[{ id: '1', title: 'Engineer', notes: 'Did things' }]}
                fields={fields}
                emptyItem={{ title: '', notes: '' }}
                onChange={jest.fn()}
            />,
        );

        expect(screen.getByDisplayValue('Engineer')).toBeTruthy();
        expect(screen.getByDisplayValue('Did things')).toBeTruthy();
    });

    it('adds a new item with a generated id when Add is pressed', async () => {
        const onChange = jest.fn();
        await render(
            <CardListEditor<Item>
                title="Experience"
                items={[]}
                fields={fields}
                emptyItem={{ title: '', notes: '' }}
                onChange={onChange}
            />,
        );

        await fireEvent.press(screen.getByText('Add Experience'));

        expect(onChange).toHaveBeenCalledTimes(1);
        const [newItems] = onChange.mock.calls[0];
        expect(newItems).toHaveLength(1);
        expect(newItems[0]).toMatchObject({ title: '', notes: '' });
        expect(typeof newItems[0].id).toBe('string');
    });

    it('removes an item when its delete button is pressed', async () => {
        const onChange = jest.fn();
        await render(
            <CardListEditor<Item>
                title="Experience"
                items={[{ id: '1', title: 'Engineer', notes: '' }]}
                fields={fields}
                emptyItem={{ title: '', notes: '' }}
                onChange={onChange}
            />,
        );

        await fireEvent.press(screen.getByText('Delete'));

        expect(onChange).toHaveBeenCalledWith([]);
    });

    it('calls onChange with the updated field value on blur', async () => {
        const onChange = jest.fn();
        await render(
            <CardListEditor<Item>
                title="Experience"
                items={[{ id: '1', title: 'Engineer', notes: '' }]}
                fields={fields}
                emptyItem={{ title: '', notes: '' }}
                onChange={onChange}
            />,
        );

        const titleInput = screen.getByDisplayValue('Engineer');
        await fireEvent.changeText(titleInput, 'Senior Engineer');
        await fireEvent(titleInput, 'blur');

        expect(onChange).toHaveBeenCalledWith([{ id: '1', title: 'Senior Engineer', notes: '' }]);
    });
});
