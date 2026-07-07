import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import ActivityScreen from '../ActivityScreen';
import * as activityApi from '../../lib/activityApi';

jest.mock('../../lib/activityApi');

const FEED = {
    unread_count: 1,
    threads: [
        {
            id: 42,
            sender_name: 'Jane',
            resume_name: 'Product Manager CV',
            is_read: false,
            messages: [{ id: 1, is_owner: false, body: 'Loved your resume!' }],
        },
    ],
    events: [],
};

describe('ActivityScreen', () => {
    it('auto-expands the thread named in route params', async () => {
        (activityApi.fetchActivity as jest.Mock).mockResolvedValue(FEED);

        render(<ActivityScreen route={{ params: { threadId: 42 } }} />);

        await waitFor(() => expect(screen.getByText('Loved your resume!')).toBeTruthy());
    });

    it('renders collapsed when opened without a threadId param', async () => {
        (activityApi.fetchActivity as jest.Mock).mockResolvedValue(FEED);

        render(<ActivityScreen />);

        await waitFor(() => expect(screen.getByText('Jane — Product Manager CV')).toBeTruthy());
        expect(screen.queryByText('Loved your resume!')).toBeNull();
    });
});
