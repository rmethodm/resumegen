import React from 'react';
import CardListEditor from '../../components/CardListEditor';
import type { ExperienceEntry } from '../../lib/resumeApi';

type ExperienceSectionProps = {
    items: ExperienceEntry[] | null;
    onSave: (items: ExperienceEntry[]) => void;
};

export default function ExperienceSection({ items, onSave }: ExperienceSectionProps) {
    return (
        <CardListEditor<ExperienceEntry>
            title="Experience"
            items={items ?? []}
            fields={[
                { key: 'company', label: 'Company' },
                { key: 'title', label: 'Title' },
                { key: 'start_date', label: 'Start date' },
                { key: 'end_date', label: 'End date' },
                { key: 'bullets', label: 'Bullets', multiline: true },
            ]}
            emptyItem={{ company: '', title: '', start_date: '', end_date: '', current: false, bullets: '' }}
            onChange={onSave}
        />
    );
}
