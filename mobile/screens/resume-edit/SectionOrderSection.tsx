import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';

type SectionOrderSectionProps = {
    sectionOrder: string[] | null;
    onSave: (order: string[]) => void;
};

export default function SectionOrderSection({ sectionOrder, onSave }: SectionOrderSectionProps) {
    const order = sectionOrder ?? [];

    const renderItem = ({ item, drag, isActive }: RenderItemParams<string>) => (
        <ScaleDecorator>
            <View style={[styles.row, isActive && styles.rowActive]} onTouchStart={drag}>
                <Text>{item}</Text>
            </View>
        </ScaleDecorator>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Section order</Text>
            <DraggableFlatList
                data={order}
                keyExtractor={(item) => item}
                renderItem={renderItem}
                onDragEnd={({ data }) => onSave(data)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginVertical: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
    row: { padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginBottom: 6, backgroundColor: '#fff' },
    rowActive: { backgroundColor: '#eef2ff' },
});
