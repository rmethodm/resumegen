import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import PhotoSection from '../PhotoSection';
import * as ImagePicker from 'expo-image-picker';
import * as resumeApi from '../../../lib/resumeApi';

jest.mock('expo-image-picker');
jest.mock('../../../lib/resumeApi');

describe('PhotoSection', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders a placeholder and an "Add photo" action when there is no photo', async () => {
        await render(<PhotoSection resumeId={1} photoUrl={null} onPhotoChange={jest.fn()} />);

        expect(screen.getByText('Add photo')).toBeTruthy();
    });

    it('uploads the picked image and calls onPhotoChange with the returned url', async () => {
        (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
            canceled: false,
            assets: [{ uri: 'file:///tmp/photo.jpg' }],
        });
        (resumeApi.uploadResumePhoto as jest.Mock).mockResolvedValue({ photo_url: 'https://example.test/photo.jpg' });

        const onPhotoChange = jest.fn();
        await render(<PhotoSection resumeId={1} photoUrl={null} onPhotoChange={onPhotoChange} />);

        await fireEvent.press(screen.getByText('Add photo'));

        await waitFor(() => expect(onPhotoChange).toHaveBeenCalledWith('https://example.test/photo.jpg'));
        expect(resumeApi.uploadResumePhoto).toHaveBeenCalledWith(1, 'file:///tmp/photo.jpg');
    });

    it('does nothing if the picker is cancelled', async () => {
        (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: null });

        const onPhotoChange = jest.fn();
        await render(<PhotoSection resumeId={1} photoUrl={null} onPhotoChange={onPhotoChange} />);

        await fireEvent.press(screen.getByText('Add photo'));

        await waitFor(() => expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled());
        expect(resumeApi.uploadResumePhoto).not.toHaveBeenCalled();
        expect(onPhotoChange).not.toHaveBeenCalled();
    });

    it('deletes the photo when Remove is pressed', async () => {
        (resumeApi.deleteResumePhoto as jest.Mock).mockResolvedValue({ photo_url: null });

        const onPhotoChange = jest.fn();
        await render(<PhotoSection resumeId={1} photoUrl="https://example.test/photo.jpg" onPhotoChange={onPhotoChange} />);

        await fireEvent.press(screen.getByText('Remove photo'));

        await waitFor(() => expect(onPhotoChange).toHaveBeenCalledWith(null));
        expect(resumeApi.deleteResumePhoto).toHaveBeenCalledWith(1);
    });
});
