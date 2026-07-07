import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export type CardField = { key: string; label: string; multiline?: boolean };

export type CardListEditorProps<T extends { id: string }> = {
    title: string;
    items: T[];
    fields: CardField[];
    emptyItem: Omit<T, 'id'>;
    onChange: (items: T[]) => void;
};

let idCounter = 0;
function generateId(): string {
    idCounter += 1;

    return `new-${idCounter}-${Math.round(performance.now())}`;
}

export default function CardListEditor<T extends { id: string }>({
    title,
    items,
    fields,
    emptyItem,
    onChange,
}: CardListEditorProps<T>) {
    const [draft, setDraft] = useState<Record<string, string>>({});

    const fieldValue = (item: T, key: string): string => {
        const draftKey = `${item.id}:${key}`;

        return draftKey in draft ? draft[draftKey] : String((item as Record<string, unknown>)[key] ?? '');
    };

    const handleChangeText = (item: T, key: string, text: string) => {
        setDraft((prev) => ({ ...prev, [`${item.id}:${key}`]: text }));
    };

    const handleBlur = (item: T, key: string) => {
        const draftKey = `${item.id}:${key}`;
        if (!(draftKey in draft)) {
            return;
        }
        const updated = items.map((i) => (i.id === item.id ? { ...i, [key]: draft[draftKey] } : i));
        onChange(updated);
    };

    const handleAdd = () => {
        onChange([...items, { ...(emptyItem as object), id: generateId() } as T]);
    };

    const handleDelete = (item: T) => {
        onChange(items.filter((i) => i.id !== item.id));
    };

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {items.map((item) => (
                <View key={item.id} style={styles.card}>
                    {fields.map((field) => (
                        <TextInput
                            key={field.key}
                            style={field.multiline ? styles.multilineInput : styles.input}
                            placeholder={field.label}
                            multiline={field.multiline}
                            value={fieldValue(item, field.key)}
                            onChangeText={(text) => handleChangeText(item, field.key, text)}
                            onBlur={() => handleBlur(item, field.key)}
                        />
                    ))}
                    <TouchableOpacity onPress={() => handleDelete(item)}>
                        <Text style={styles.deleteText}>Delete</Text>
                    </TouchableOpacity>
                </View>
            ))}
            <TouchableOpacity onPress={handleAdd}>
                <Text style={styles.addText}>Add {title}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginVertical: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
    card: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, marginBottom: 8 },
    input: { borderBottomWidth: 1, borderColor: '#ddd', paddingVertical: 6, marginBottom: 6 },
    multilineInput: { borderBottomWidth: 1, borderColor: '#ddd', paddingVertical: 6, marginBottom: 6, minHeight: 60, textAlignVertical: 'top' },
    deleteText: { color: 'red', marginTop: 4 },
    addText: { color: '#4f46e5', fontWeight: '600', marginTop: 4 },
});
