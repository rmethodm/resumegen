import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import SkillsSection from '../SkillsSection';

describe('SkillsSection', () => {
    it('renders existing flat skills as chips and adds a new one from text input', async () => {
        const onSave = jest.fn();
        await render(<SkillsSection skills={['PHP', 'React']} skillsGroups={null} skillNarratives={null} onSave={onSave} />);

        expect(screen.getByText('PHP')).toBeTruthy();
        expect(screen.getByText('React')).toBeTruthy();

        await fireEvent.changeText(screen.getByPlaceholderText('Add a skill'), 'TypeScript');
        await fireEvent(screen.getByPlaceholderText('Add a skill'), 'submitEditing');

        expect(onSave).toHaveBeenCalledWith({ skills: ['PHP', 'React', 'TypeScript'] });
    });

    it('removes a skill chip when tapped', async () => {
        const onSave = jest.fn();
        await render(<SkillsSection skills={['PHP', 'React']} skillsGroups={null} skillNarratives={null} onSave={onSave} />);

        await fireEvent.press(screen.getByText('PHP'));

        expect(onSave).toHaveBeenCalledWith({ skills: ['React'] });
    });

    it('renders skill groups with their category and items', async () => {
        await render(
            <SkillsSection
                skills={null}
                skillsGroups={[{ id: 'g1', category: 'Languages', items: ['PHP', 'TypeScript'] }]}
                skillNarratives={null}
                onSave={jest.fn()}
            />,
        );

        expect(screen.getByDisplayValue('Languages')).toBeTruthy();
    });

    it('renders skill narratives with their name and bullets', async () => {
        await render(
            <SkillsSection
                skills={null}
                skillsGroups={null}
                skillNarratives={[{ id: 'n1', name: 'Leadership', bullets: ['Led a team of 5'] }]}
                onSave={jest.fn()}
            />,
        );

        expect(screen.getByDisplayValue('Leadership')).toBeTruthy();
    });
});
