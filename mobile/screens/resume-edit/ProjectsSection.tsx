import React from 'react';
import CardListEditor from '../../components/CardListEditor';
import type { ProjectEntry } from '../../lib/resumeApi';

type ProjectsSectionProps = {
    items: ProjectEntry[] | null;
    onSave: (items: ProjectEntry[]) => void;
};

export default function ProjectsSection({ items, onSave }: ProjectsSectionProps) {
    return (
        <CardListEditor<ProjectEntry>
            title="Projects"
            items={items ?? []}
            fields={[
                { key: 'name', label: 'Name' },
                { key: 'description', label: 'Description', multiline: true },
                { key: 'url', label: 'URL' },
                { key: 'start_date', label: 'Start date' },
                { key: 'end_date', label: 'End date' },
                { key: 'bullets', label: 'Bullets', multiline: true },
            ]}
            emptyItem={{ name: '', description: '', url: '', start_date: '', end_date: '', bullets: '' }}
            onChange={onSave}
        />
    );
}
