import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import CertificationsSection from '../CertificationsSection';

describe('CertificationsSection', () => {
    it('renders existing entries and adds a new one', async () => {
        const onSave = jest.fn();
        await render(
            <CertificationsSection
                items={[{ id: '1', name: 'AWS Cert', issuer: 'Amazon', date: '', expiration: '', credential_id: '' }]}
                onSave={onSave}
            />,
        );

        expect(screen.getByDisplayValue('AWS Cert')).toBeTruthy();

        await fireEvent.press(screen.getByText('Add Certifications'));

        expect(onSave).toHaveBeenCalledTimes(1);
        expect(onSave.mock.calls[0][0]).toHaveLength(2);
    });

    it('treats a null items prop as an empty list', async () => {
        await render(<CertificationsSection items={null} onSave={jest.fn()} />);

        expect(screen.getByText('Add Certifications')).toBeTruthy();
    });
});
