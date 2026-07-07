import React from 'react';
import CardListEditor from '../../components/CardListEditor';
import type { CertEntry } from '../../lib/resumeApi';

type CertificationsSectionProps = {
    items: CertEntry[] | null;
    onSave: (items: CertEntry[]) => void;
};

export default function CertificationsSection({ items, onSave }: CertificationsSectionProps) {
    return (
        <CardListEditor<CertEntry>
            title="Certifications"
            items={items ?? []}
            fields={[
                { key: 'name', label: 'Name' },
                { key: 'issuer', label: 'Issuer' },
                { key: 'date', label: 'Date' },
                { key: 'expiration', label: 'Expiration' },
                { key: 'credential_id', label: 'Credential ID' },
            ]}
            emptyItem={{ name: '', issuer: '', date: '', expiration: '', credential_id: '' }}
            onChange={onSave}
        />
    );
}
