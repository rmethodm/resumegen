import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import SectionOrderSection from '../SectionOrderSection';

describe('SectionOrderSection', () => {
    it('renders each section name in order', async () => {
        await render(
            <GestureHandlerRootView style={{ flex: 1 }}>
                <SectionOrderSection sectionOrder={['summary', 'experience', 'education']} onSave={jest.fn()} />
            </GestureHandlerRootView>,
        );

        expect(screen.getByText('summary')).toBeTruthy();
        expect(screen.getByText('experience')).toBeTruthy();
        expect(screen.getByText('education')).toBeTruthy();
    });

    it('treats a null sectionOrder as an empty list', async () => {
        await render(
            <GestureHandlerRootView style={{ flex: 1 }}>
                <SectionOrderSection sectionOrder={null} onSave={jest.fn()} />
            </GestureHandlerRootView>,
        );

        expect(screen.getByText('Section order')).toBeTruthy();
    });
});
