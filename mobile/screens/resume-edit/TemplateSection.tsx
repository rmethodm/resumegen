import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ResumeDetail, ResumeFields, ResumeTemplate } from '../../lib/resumeApi';

type TemplateSectionProps = {
    resume: ResumeDetail;
    onSave: (data: Partial<ResumeFields>) => void;
};

const TEMPLATES: ResumeTemplate[] = [
    'classic', 'modern', 'minimal', 'minimal-ruled', 'executive', 'ats', 'skills-first', 'academic', 'bold',
];

const ACCENT_COLORS = [
    '#4f46e5', '#1e3a5f', '#475569', '#166534', '#7f1d1d', '#1f2937', '#0f766e', '#78716c',
];

export default function TemplateSection({ resume, onSave }: TemplateSectionProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Template &amp; appearance</Text>
            <View style={styles.row}>
                {TEMPLATES.map((template) => (
                    <TouchableOpacity
                        key={template}
                        style={[styles.chip, resume.template === template && styles.chipActive]}
                        onPress={() => onSave({ template })}
                    >
                        <Text>{template}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <Text style={styles.label}>Accent color</Text>
            <View style={styles.row}>
                {ACCENT_COLORS.map((color) => (
                    <TouchableOpacity
                        key={color}
                        testID={`accent-color-${color}`}
                        style={[styles.swatch, { backgroundColor: color }, resume.accent_color === color && styles.swatchActive]}
                        onPress={() => onSave({ accent_color: color })}
                    />
                ))}
            </View>
            <Text style={styles.label}>Font family</Text>
            <View style={styles.row}>
                {(['sans', 'serif', 'mono'] as const).map((font) => (
                    <TouchableOpacity
                        key={font}
                        style={[styles.chip, resume.font_family === font && styles.chipActive]}
                        onPress={() => onSave({ font_family: font })}
                    >
                        <Text>{font}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginVertical: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
    label: { marginTop: 8, marginBottom: 4, color: '#444' },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { borderWidth: 1, borderColor: '#ddd', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8, marginBottom: 8 },
    chipActive: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
    swatch: { width: 28, height: 28, borderRadius: 14, marginRight: 8, marginBottom: 8, borderWidth: 2, borderColor: 'transparent' },
    swatchActive: { borderColor: '#111' },
});
