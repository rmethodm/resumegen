import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import type { ResumeDetail, ResumeFields, Contact } from '../../lib/resumeApi';

type BasicsSectionProps = {
    resume: ResumeDetail;
    onSave: (data: Partial<ResumeFields>) => void;
};

export default function BasicsSection({ resume, onSave }: BasicsSectionProps) {
    const [name, setName] = useState(resume.name);
    const [summary, setSummary] = useState(resume.summary ?? '');
    const [contact, setContact] = useState<Contact>(
        resume.contact ?? { full_name: '', email: '', phone: '', location: '', linkedin: '', website: '' },
    );

    const contactField = (key: keyof Contact, label: string) => (
        <TextInput
            key={key}
            style={styles.input}
            placeholder={label}
            value={contact[key]}
            onChangeText={(text) => setContact((prev) => ({ ...prev, [key]: text }))}
            onBlur={() => onSave({ contact })}
        />
    );

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Basics</Text>
            <TextInput
                style={styles.input}
                placeholder="Resume name"
                value={name}
                onChangeText={setName}
                onBlur={() => onSave({ name })}
            />
            {contactField('full_name', 'Full name')}
            {contactField('email', 'Email')}
            {contactField('phone', 'Phone')}
            {contactField('location', 'Location')}
            {contactField('linkedin', 'LinkedIn')}
            {contactField('website', 'Website')}
            <TextInput
                style={styles.multilineInput}
                placeholder="Summary"
                multiline
                value={summary}
                onChangeText={setSummary}
                onBlur={() => onSave({ summary })}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginVertical: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
    input: { borderBottomWidth: 1, borderColor: '#ddd', paddingVertical: 6, marginBottom: 6 },
    multilineInput: { borderBottomWidth: 1, borderColor: '#ddd', paddingVertical: 6, marginBottom: 6, minHeight: 80, textAlignVertical: 'top' },
});
