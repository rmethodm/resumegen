import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import type { SkillGroup, SkillNarrative } from '../../lib/resumeApi';

type SkillsSectionProps = {
    skills: string[] | null;
    skillsGroups: SkillGroup[] | null;
    skillNarratives: SkillNarrative[] | null;
    onSave: (data: { skills?: string[]; skills_groups?: SkillGroup[]; skill_narratives?: SkillNarrative[] }) => void;
};

export default function SkillsSection({ skills, skillsGroups, skillNarratives, onSave }: SkillsSectionProps) {
    const [newSkill, setNewSkill] = useState('');
    const [draft, setDraft] = useState<Record<string, string>>({});
    const flatSkills = skills ?? [];
    const groups = skillsGroups ?? [];
    const narratives = skillNarratives ?? [];

    const addSkill = () => {
        const trimmed = newSkill.trim();
        if (!trimmed) {
            return;
        }
        onSave({ skills: [...flatSkills, trimmed] });
        setNewSkill('');
    };

    const removeSkill = (skill: string) => {
        onSave({ skills: flatSkills.filter((s) => s !== skill) });
    };

    const groupCategoryValue = (id: string | undefined, currentCategory: string): string => {
        const draftKey = `${id}:category`;
        return draftKey in draft ? draft[draftKey] : currentCategory;
    };

    const handleGroupCategoryChange = (id: string | undefined, category: string) => {
        setDraft((prev) => ({ ...prev, [`${id}:category`]: category }));
    };

    const handleGroupCategoryBlur = (id: string | undefined) => {
        const draftKey = `${id}:category`;
        if (!(draftKey in draft)) {
            return;
        }
        onSave({ skills_groups: groups.map((g) => (g.id === id ? { ...g, category: draft[draftKey] } : g)) });
    };

    const narrativeNameValue = (id: string, currentName: string): string => {
        const draftKey = `${id}:name`;
        return draftKey in draft ? draft[draftKey] : currentName;
    };

    const handleNarrativeNameChange = (id: string, name: string) => {
        setDraft((prev) => ({ ...prev, [`${id}:name`]: name }));
    };

    const handleNarrativeNameBlur = (id: string) => {
        const draftKey = `${id}:name`;
        if (!(draftKey in draft)) {
            return;
        }
        onSave({ skill_narratives: narratives.map((n) => (n.id === id ? { ...n, name: draft[draftKey] } : n)) });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.chipsRow}>
                {flatSkills.map((skill) => (
                    <TouchableOpacity key={skill} style={styles.chip} onPress={() => removeSkill(skill)}>
                        <Text>{skill}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <TextInput
                style={styles.input}
                placeholder="Add a skill"
                value={newSkill}
                onChangeText={setNewSkill}
                onSubmitEditing={addSkill}
            />

            {groups.length > 0 && (
                <>
                    <Text style={styles.label}>Skill groups</Text>
                    {groups.map((group) => (
                        <TextInput
                            key={group.id}
                            style={styles.input}
                            value={groupCategoryValue(group.id, group.category)}
                            onChangeText={(text) => handleGroupCategoryChange(group.id, text)}
                            onBlur={() => handleGroupCategoryBlur(group.id)}
                        />
                    ))}
                </>
            )}

            {narratives.length > 0 && (
                <>
                    <Text style={styles.label}>Skill narratives</Text>
                    {narratives.map((narrative) => (
                        <TextInput
                            key={narrative.id}
                            style={styles.input}
                            value={narrativeNameValue(narrative.id, narrative.name)}
                            onChangeText={(text) => handleNarrativeNameChange(narrative.id, text)}
                            onBlur={() => handleNarrativeNameBlur(narrative.id)}
                        />
                    ))}
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginVertical: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
    label: { marginTop: 8, marginBottom: 4, color: '#444' },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    chip: { borderWidth: 1, borderColor: '#ddd', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8, marginBottom: 8 },
    input: { borderBottomWidth: 1, borderColor: '#ddd', paddingVertical: 6, marginBottom: 6 },
});
