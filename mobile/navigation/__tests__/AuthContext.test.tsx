import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../AuthContext';
import * as authApi from '../../lib/authApi';
import * as auth from '../../lib/auth';
import * as push from '../../lib/push';

jest.mock('../../lib/authApi');
jest.mock('../../lib/auth');
jest.mock('../../lib/push');
jest.mock('../../lib/api', () => ({
    setUnauthorizedHandler: jest.fn(),
}));

const user = {
    id: 1,
    name: 'Jane',
    email: 'jane@example.com',
    is_pro: false,
    plan_tier: 'free',
    has_completed_onboarding: true,
};

let loginError: string | null = null;

function Probe() {
    const { user: currentUser, loading, login } = useAuth();

    if (loading) {
        return <Text>loading</Text>;
    }

    return (
        <>
            <Text>{currentUser ? `user:${currentUser.email}` : 'user:none'}</Text>
            <Text
                onPress={() => {
                    login('jane@example.com', 'password').catch((error) => {
                        loginError = error?.message ?? 'error';
                    });
                }}
            >
                do-login
            </Text>
        </>
    );
}

describe('AuthContext push-registration failures', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        loginError = null;
    });

    it('keeps the restored session when push registration fails during launch restore', async () => {
        (auth.getToken as jest.Mock).mockResolvedValue('a-token');
        (authApi.fetchMe as jest.Mock).mockResolvedValue(user);
        (push.registerForPushNotifications as jest.Mock).mockRejectedValue(new Error('no project id'));

        render(
            <AuthProvider>
                <Probe />
            </AuthProvider>,
        );

        await waitFor(() => expect(screen.getByText('user:jane@example.com')).toBeTruthy());
    });

    it('does not reject login when push registration fails after a successful login', async () => {
        (auth.getToken as jest.Mock).mockResolvedValue(null);
        (authApi.login as jest.Mock).mockResolvedValue(user);
        (push.registerForPushNotifications as jest.Mock).mockRejectedValue(new Error('network error'));

        render(
            <AuthProvider>
                <Probe />
            </AuthProvider>,
        );

        await waitFor(() => expect(screen.getByText('user:none')).toBeTruthy());

        screen.getByText('do-login').props.onPress();

        await waitFor(() => expect(screen.getByText('user:jane@example.com')).toBeTruthy());
        expect(loginError).toBeNull();
    });
});
