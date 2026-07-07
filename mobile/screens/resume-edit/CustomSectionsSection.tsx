import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import CardListEditor from '../../components/CardListEditor';
import type { CustomSection, CustomSectionEntry } from '../../lib/resumeApi';

type CustomSectionsSectionProps = {
    items: CustomSection[] | null;
    onSave: (items: CustomSection[]) => void;
};

let idCounter = 0;
function generateId(): string {
    idCounter += 1;

    return `custom-${idCounter}-${Math.round(performance.now())}`;
}

export default function CustomSectionsSection({ items, onSave }: CustomSectionsSectionProps) {
    const sections = items ?? [];
    const [draft, setDraft] = useState<Record<string, string>>({});

    const addSection = () => {
        onSave([...sections, { id: generateId(), name: '', entries: [] }]);
    };

    const sectionNameValue = (sectionId: string, currentName: string): string => {
        const draftKey = `${sectionId}:name`;
        return draftKey in draft ? draft[draftKey] : currentName;
    };

    const handleSectionNameChange = (sectionId: string, text: string) => {
        setDraft((prev) => ({ ...prev, [`${sectionId}:name`]: text }));
    };

    const handleSectionNameBlur = (sectionId: string) => {
        const draftKey = `${sectionId}:name`;
        if (!(draftKey in draft)) {
            return;
        }
        const updated = sections.map((s) => (s.id === sectionId ? { ...s, name: draft[draftKey] } : s));
        onSave(updated);
    };

    const updateEntries = (id: string, entries: CustomSectionEntry[]) => {
        onSave(sections.map((s) => (s.id === id ? { ...s, entries } : s)));
    };

    const removeSection = (id: string) => {
        onSave(sections.filter((s) => s.id !== id));
    };

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Custom sections</Text>
            {sections.map((section) => (
                <View key={section.id} style={styles.block}>
                    <TextInput
                        style={styles.input}
                        placeholder="Section name"
                        value={sectionNameValue(section.id, section.name)}
                        onChangeText={(text) => handleSectionNameChange(section.id, text)}
                        onBlur={() => handleSectionNameBlur(section.id)}
                    />
                    <CardListEditor<CustomSectionEntry>
                        title={section.name || 'Entries'}
                        items={section.entries}
                        fields={[
                            { key: 'title', label: 'Title' },
                            { key: 'subtitle', label: 'Subtitle' },
                            { key: 'start_date', label: 'Start date' },
                            { key: 'end_date', label: 'End date' },
                            { key: 'description', label: 'Description', multiline: true },
                        ]}
                        emptyItem={{ title: '', subtitle: '', start_date: '', end_date: null, description: '', bullets: [] }}
                        onChange={(entries) => updateEntries(section.id, entries)}
                    />
                    <TouchableOpacity onPress={() => removeSection(section.id)}>
                        <Text style={styles.deleteText}>Delete section</Text>
                    </TouchableOpacity>
                </View>
            ))}
            <TouchableOpacity onPress={addSection}>
                <Text style={styles.addText}>Add custom section</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginVertical: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
    block: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, marginBottom: 12 },
    input: { borderBottomWidth: 1, borderColor: '#ddd', paddingVertical: 6, marginBottom: 6 },
    deleteText: { color: 'red', marginTop: 4 },
    addText: { color: '#4f46e5', fontWeight: '600', marginTop: 4 },
});
