import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, SectionList, Button, StyleSheet } from 'react-native';
import { fetchActivity } from '../lib/activityApi';
import type { ActivityFeed, ActivityThread } from '../lib/activityApi';

export default function ActivityScreen() {
    const [feed, setFeed] = useState<ActivityFeed | null>(null);
    const [error, setError] = useState(false);
    const [expandedThreadId, setExpandedThreadId] = useState<number | null>(null);

    const load = useCallback(async () => {
        setError(false);
        try {
            setFeed(await fetchActivity());
        } catch {
            setError(true);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    if (error) {
        return (
            <View style={styles.center}>
                <Text>Couldn't load activity.</Text>
                <Button title="Retry" onPress={load} />
            </View>
        );
    }

    if (!feed) {
        return (
            <View style={styles.center}>
                <Text>Loading…</Text>
            </View>
        );
    }

    const sections = [
        { title: `Messages (${feed.unread_count} unread)`, data: feed.threads },
        { title: 'Recent activity', data: feed.events },
    ];

    return (
        <SectionList
            sections={sections as any}
            keyExtractor={(item: any, index) => String(item.id ?? index)}
            renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
            renderItem={({ item, section }) => {
                if (section.title.startsWith('Messages')) {
                    const thread = item as ActivityThread;
                    const expanded = expandedThreadId === thread.id;

                    return (
                        <View style={styles.row}>
                            <Text
                                style={[styles.threadHeader, !thread.is_read && styles.unread]}
                                onPress={() => setExpandedThreadId(expanded ? null : thread.id)}
                            >
                                {thread.sender_name} — {thread.resume_name}
                            </Text>
                            {expanded &&
                                thread.messages.map((m) => (
                                    <Text key={m.id} style={styles.message}>
                                        {m.is_owner ? 'You: ' : ''}
                                        {m.body}
                                    </Text>
                                ))}
                        </View>
                    );
                }

                return (
                    <View style={styles.row}>
                        <Text>
                            {item.type === 'pdf_download' ? 'PDF downloaded' : 'Resume viewed'} — {item.resume_name}
                        </Text>
                    </View>
                );
            }}
        />
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    sectionHeader: { fontWeight: '700', padding: 12, backgroundColor: '#f5f5f5' },
    row: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
    threadHeader: { fontSize: 15 },
    unread: { fontWeight: '700' },
    message: { marginTop: 6, marginLeft: 8, color: '#444' },
});
