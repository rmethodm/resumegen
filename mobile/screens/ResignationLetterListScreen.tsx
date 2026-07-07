import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Button, StyleSheet } from 'react-native';
import { listResignationLetters } from '../lib/resignationLetterApi';
import type { ResignationLetterSummary } from '../lib/resignationLetterApi';

export default function ResignationLetterListScreen({ navigation }: any) {
    const [letters, setLetters] = useState<ResignationLetterSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        setError(false);
        try {
            setLetters(await listResignationLetters());
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    if (error) {
        return (
            <View style={styles.center}>
                <Text>Couldn't load your resignation letters.</Text>
                <Button title="Retry" onPress={load} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={letters}
                keyExtractor={(item) => String(item.id)}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
                ListEmptyComponent={!loading ? <Text style={styles.empty}>No resignation letters yet.</Text> : null}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => navigation.navigate('ResignationLetterEdit', { letterId: item.id })}
                    >
                        <Text style={styles.name}>{item.name}</Text>
                        <Text style={styles.meta}>{item.template_key}</Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    row: { padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
    name: { fontSize: 16, fontWeight: '600' },
    meta: { color: '#888', marginTop: 4 },
    empty: { textAlign: 'center', marginTop: 32, color: '#888' },
});
