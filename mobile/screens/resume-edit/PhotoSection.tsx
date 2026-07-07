import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadResumePhoto, deleteResumePhoto } from '../../lib/resumeApi';

type PhotoSectionProps = {
    resumeId: number;
    photoUrl: string | null;
    onPhotoChange: (url: string | null) => void;
};

export default function PhotoSection({ resumeId, photoUrl, onPhotoChange }: PhotoSectionProps) {
    const [busy, setBusy] = useState(false);

    const pickAndUpload = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
        });

        if (result.canceled || !result.assets?.length) {
            return;
        }

        setBusy(true);
        try {
            const { photo_url } = await uploadResumePhoto(resumeId, result.assets[0].uri);
            onPhotoChange(photo_url);
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        setBusy(true);
        try {
            await deleteResumePhoto(resumeId);
            onPhotoChange(null);
        } finally {
            setBusy(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Photo</Text>
            {photoUrl ? (
                <>
                    <Image source={{ uri: photoUrl }} style={styles.photo} />
                    <TouchableOpacity onPress={remove} disabled={busy}>
                        <Text style={styles.deleteText}>Remove photo</Text>
                    </TouchableOpacity>
                </>
            ) : (
                <TouchableOpacity onPress={pickAndUpload} disabled={busy}>
                    <Text style={styles.addText}>Add photo</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginVertical: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
    photo: { width: 100, height: 100, borderRadius: 50, marginBottom: 8 },
    deleteText: { color: 'red' },
    addText: { color: '#4f46e5', fontWeight: '600' },
});
