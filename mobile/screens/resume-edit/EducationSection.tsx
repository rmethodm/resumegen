import React from 'react';
import CardListEditor from '../../components/CardListEditor';
import type { EducationEntry } from '../../lib/resumeApi';

type EducationSectionProps = {
    items: EducationEntry[] | null;
    onSave: (items: EducationEntry[]) => void;
};

export default function EducationSection({ items, onSave }: EducationSectionProps) {
    return (
        <CardListEditor<EducationEntry>
            title="Education"
            items={items ?? []}
            fields={[
                { key: 'school', label: 'School' },
                { key: 'degree', label: 'Degree' },
                { key: 'field', label: 'Field of study' },
                { key: 'grad_year', label: 'Graduation year' },
            ]}
            emptyItem={{ school: '', degree: '', field: '', grad_year: '' }}
            onChange={onSave}
        />
    );
}
