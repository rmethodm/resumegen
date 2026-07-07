import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Button, StyleSheet, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getResume } from '../lib/resumeApi';
import type { ResumeDetail } from '../lib/resumeApi';
import { API_BASE_URL } from '../lib/config';
import { getToken } from '../lib/auth';
import { handleUnauthorizedResponse } from '../lib/api';

export default function ResumeDetailScreen({ route }: any) {
    const { resumeId } = route.params as { resumeId: number };
    const [resume, setResume] = useState<ResumeDetail | null>(null);
    const [error, setError] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [shareError, setShareError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setError(false);
        try {
            setResume(await getResume(resumeId));
        } catch {
            setError(true);
        }
    }, [resumeId]);

    useEffect(() => {
        load();
    }, [load]);

    const downloadAndShare = async () => {
        setSharing(true);
        setShareError(null);
        try {
            const token = await getToken();
            const destination = `${FileSystem.cacheDirectory}resume-${resumeId}.pdf`;
            const result = await FileSystem.downloadAsync(`${API_BASE_URL}/api/resumes/${resumeId}/pdf`, destination, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (result.status === 401) {
                await handleUnauthorizedResponse();
                return;
            }

            if (result.status !== 200) {
                throw new Error('Download failed');
            }

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(result.uri);
            } else {
                Alert.alert('Downloaded', `Saved to ${result.uri}`);
            }
        } catch {
            setShareError("Couldn't download the PDF. Try again.");
        } finally {
            setSharing(false);
        }
    };

    if (error) {
        return (
            <View style={styles.center}>
                <Text>Couldn't load this resume.</Text>
                <Button title="Retry" onPress={load} />
            </View>
        );
    }

    if (!resume) {
        return (
            <View style={styles.center}>
                <Text>Loading…</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>{resume.name}</Text>
            {resume.contact?.email && <Text style={styles.meta}>{resume.contact.email}</Text>}
            {resume.summary && <Text style={styles.summary}>{resume.summary}</Text>}
            <Text style={styles.sectionCount}>{(resume.experience ?? []).length} work experience entries</Text>
            <Text style={styles.sectionCount}>{(resume.education ?? []).length} education entries</Text>
            <Text style={styles.sectionCount}>{(resume.skills ?? []).length} skills listed</Text>
            {shareError && <Text style={styles.error}>{shareError}</Text>}
            <Button title={sharing ? 'Preparing…' : 'Download / Share PDF'} onPress={downloadAndShare} disabled={sharing} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 22, fontWeight: '700' },
    meta: { color: '#888', marginTop: 4 },
    summary: { marginTop: 12, lineHeight: 20 },
    sectionCount: { marginTop: 8, color: '#444' },
    error: { color: 'red', marginTop: 12 },
});
