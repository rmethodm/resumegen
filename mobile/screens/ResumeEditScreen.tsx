import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Button, StyleSheet } from 'react-native';
import { getResume, updateResume } from '../lib/resumeApi';
import type { ResumeDetail, ResumeFields } from '../lib/resumeApi';
import BasicsSection from './resume-edit/BasicsSection';
import TemplateSection from './resume-edit/TemplateSection';
import ExperienceSection from './resume-edit/ExperienceSection';
import EducationSection from './resume-edit/EducationSection';
import CertificationsSection from './resume-edit/CertificationsSection';
import ProjectsSection from './resume-edit/ProjectsSection';
import SkillsSection from './resume-edit/SkillsSection';
import CustomSectionsSection from './resume-edit/CustomSectionsSection';
import SectionOrderSection from './resume-edit/SectionOrderSection';
import PhotoSection from './resume-edit/PhotoSection';

export default function ResumeEditScreen({ route }: any) {
    const { resumeId } = route.params as { resumeId: number };
    const [resume, setResume] = useState<ResumeDetail | null>(null);
    const [error, setError] = useState(false);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);

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

    const save = async (data: Partial<ResumeFields>) => {
        const updated = await updateResume(resumeId, data);
        setResume(updated);
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
            <BasicsSection resume={resume} onSave={save} />
            <TemplateSection resume={resume} onSave={save} />
            <PhotoSection resumeId={resumeId} photoUrl={photoUrl} onPhotoChange={setPhotoUrl} />
            <ExperienceSection items={resume.experience} onSave={(experience) => save({ experience })} />
            <EducationSection items={resume.education} onSave={(education) => save({ education })} />
            <CertificationsSection items={resume.certifications} onSave={(certifications) => save({ certifications })} />
            <ProjectsSection items={resume.projects} onSave={(projects) => save({ projects })} />
            <SkillsSection
                skills={resume.skills}
                skillsGroups={resume.skills_groups}
                skillNarratives={resume.skill_narratives}
                onSave={save}
            />
            <CustomSectionsSection items={resume.custom_sections} onSave={(custom_sections) => save({ custom_sections })} />
            <SectionOrderSection sectionOrder={resume.section_order} onSave={(section_order) => save({ section_order })} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
