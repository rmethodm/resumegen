import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, Button, StyleSheet } from 'react-native';
import { getCoverLetter, updateCoverLetter, generateCoverLetter } from '../lib/coverLetterApi';
import type { CoverLetterDetail, CoverLetterTemplateKey } from '../lib/coverLetterApi';
import { listResumes } from '../lib/resumeApi';
import type { ResumeSummary } from '../lib/resumeApi';
import { ApiError } from '../lib/api';
import { showUpgradeAlert } from '../lib/upgradeAlert';

const TEMPLATE_KEYS: CoverLetterTemplateKey[] = ['standard', 'modern', 'career_change', 'new_grad', 'referral'];

export default function CoverLetterEditScreen({ route }: any) {
    const { letterId } = route.params as { letterId: number };
    const [letter, setLetter] = useState<CoverLetterDetail | null>(null);
    const [error, setError] = useState(false);
    const [name, setName] = useState('');
    const [templateKey, setTemplateKey] = useState<CoverLetterTemplateKey>('standard');
    const [resumeId, setResumeId] = useState<number | null>(null);
    const [resumes, setResumes] = useState<ResumeSummary[]>([]);
    const [body, setBody] = useState('');
    const [tone, setTone] = useState<'formal' | 'warm' | 'brief'>('formal');
    const [jobDescription, setJobDescription] = useState('');
    const [remaining, setRemaining] = useState<number | null>(null);
    const [generating, setGenerating] = useState(false);
    const [generateError, setGenerateError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setError(false);
        try {
            const data = await getCoverLetter(letterId);
            setLetter(data);
            setName(data.name);
            setTemplateKey(data.template_key);
            setResumeId(data.resume_id);
            setBody(data.body);
            setResumes(await listResumes());
        } catch {
            setError(true);
        }
    }, [letterId]);

    useEffect(() => {
        load();
    }, [load]);

    const saveName = async () => {
        await updateCoverLetter(letterId, { name });
    };

    const saveTemplate = async (key: CoverLetterTemplateKey) => {
        setTemplateKey(key);
        await updateCoverLetter(letterId, { template_key: key });
    };

    const saveResume = async (id: number | null) => {
        setResumeId(id);
        await updateCoverLetter(letterId, { resume_id: id });
    };

    const saveBody = async () => {
        await updateCoverLetter(letterId, { body });
    };

    const generate = async () => {
        setGenerating(true);
        setGenerateError(null);
        try {
            const result = await generateCoverLetter(letterId, {
                tone,
                job_description: jobDescription || undefined,
            });
            setBody(result.body);
            setRemaining(result.remaining);
        } catch (e) {
            if (e instanceof ApiError && e.status === 402) {
                showUpgradeAlert('cover_letter_generate', 'starter');
            } else if (e instanceof ApiError && e.status === 422) {
                setGenerateError("Couldn't generate — try adjusting your input.");
            } else {
                setGenerateError('AI is temporarily unavailable. Try again.');
            }
        } finally {
            setGenerating(false);
        }
    };

    if (error) {
        return (
            <View style={styles.center}>
                <Text>Couldn't load this cover letter.</Text>
                <Button title="Retry" onPress={load} />
            </View>
        );
    }

    if (!letter) {
        return (
            <View style={styles.center}>
                <Text>Loading…</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <TextInput
                style={styles.input}
                placeholder="Letter name"
                value={name}
                onChangeText={setName}
                onBlur={saveName}
            />
            <Text style={styles.label}>Template</Text>
            <View style={styles.row}>
                {TEMPLATE_KEYS.map((key) => (
                    <Text
                        key={key}
                        style={[styles.chip, templateKey === key && styles.chipActive]}
                        onPress={() => saveTemplate(key)}
                    >
                        {key}
                    </Text>
                ))}
            </View>
            <Text style={styles.label}>Linked resume</Text>
            <View style={styles.row}>
                <Text
                    style={[styles.chip, resumeId === null && styles.chipActive]}
                    onPress={() => saveResume(null)}
                >
                    None
                </Text>
                {resumes.map((r) => (
                    <Text
                        key={r.id}
                        style={[styles.chip, resumeId === r.id && styles.chipActive]}
                        onPress={() => saveResume(r.id)}
                    >
                        {r.name}
                    </Text>
                ))}
            </View>
            <Text style={styles.label}>Tone</Text>
            <View style={styles.row}>
                {(['formal', 'warm', 'brief'] as const).map((t) => (
                    <Text
                        key={t}
                        style={[styles.chip, tone === t && styles.chipActive]}
                        onPress={() => setTone(t)}
                    >
                        {t}
                    </Text>
                ))}
            </View>
            <TextInput
                style={styles.multilineInput}
                placeholder="Job description (optional)"
                multiline
                value={jobDescription}
                onChangeText={setJobDescription}
            />
            <Button title={generating ? 'Generating…' : 'Generate with AI'} onPress={generate} disabled={generating} />
            {generateError && <Text style={styles.error}>{generateError}</Text>}
            {remaining !== null && <Text style={styles.remaining}>{remaining} generations remaining</Text>}
            <TextInput
                style={styles.bodyInput}
                multiline
                value={body}
                onChangeText={setBody}
                onBlur={saveBody}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    label: { marginBottom: 4, color: '#444' },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 12 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    chip: { borderWidth: 1, borderColor: '#ddd', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8, marginBottom: 8 },
    chipActive: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
    multilineInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, minHeight: 80, textAlignVertical: 'top', marginBottom: 12 },
    bodyInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, minHeight: 300, textAlignVertical: 'top', marginTop: 12 },
    remaining: { color: '#888', marginTop: 8 },
    error: { color: 'red', marginTop: 8 },
});
