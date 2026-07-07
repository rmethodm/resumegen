import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Button, StyleSheet } from 'react-native';
import { listResumes } from '../lib/resumeApi';
import type { ResumeSummary } from '../lib/resumeApi';
import { useAuth } from '../navigation/AuthContext';

export default function ResumeListScreen({ navigation }: any) {
    const { logout } = useAuth();
    const [resumes, setResumes] = useState<ResumeSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        setError(false);
        try {
            setResumes(await listResumes());
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
                <Text>Couldn't load your resumes.</Text>
                <Button title="Retry" onPress={load} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Button title="Activity" onPress={() => navigation.navigate('Activity')} />
                <Button title="Cover Letters" onPress={() => navigation.navigate('CoverLetters')} />
                <Button title="Resignation Letters" onPress={() => navigation.navigate('ResignationLetters')} />
                <Button title="Log out" onPress={logout} />
            </View>
            <FlatList
                data={resumes}
                keyExtractor={(item) => String(item.id)}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
                ListEmptyComponent={!loading ? <Text style={styles.empty}>No resumes yet.</Text> : null}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => navigation.navigate('ResumeDetail', { resumeId: item.id })}
                    >
                        <Text style={styles.name}>{item.name}</Text>
                        <Text style={styles.meta}>{item.template}</Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
    row: { padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
    name: { fontSize: 16, fontWeight: '600' },
    meta: { color: '#888', marginTop: 4 },
    empty: { textAlign: 'center', marginTop: 32, color: '#888' },
});
