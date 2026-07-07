import { registerForPushNotifications, unregisterPushToken } from '../push';
import * as Notifications from 'expo-notifications';
import * as api from '../api';

jest.mock('expo-notifications', () => ({
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    getExpoPushTokenAsync: jest.fn(),
    setNotificationHandler: jest.fn(),
}));
jest.mock('../api');

describe('registerForPushNotifications', () => {
    it('returns null when permission is denied', async () => {
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
        (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

        const token = await registerForPushNotifications();

        expect(token).toBeNull();
    });

    it('registers the token with the backend when permission is granted', async () => {
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
        (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({ data: 'ExponentPushToken[xyz]' });
        (api.apiFetch as jest.Mock).mockResolvedValue({});

        const token = await registerForPushNotifications();

        expect(token).toBe('ExponentPushToken[xyz]');
        expect(api.apiFetch).toHaveBeenCalledWith('/api/push-tokens', {
            method: 'POST',
            body: JSON.stringify({ expo_push_token: 'ExponentPushToken[xyz]', platform: 'ios' }),
        });
    });
});

describe('unregisterPushToken', () => {
    it('calls the delete endpoint with the token', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({});

        await unregisterPushToken('ExponentPushToken[xyz]');

        expect(api.apiFetch).toHaveBeenCalledWith('/api/push-tokens', {
            method: 'DELETE',
            body: JSON.stringify({ expo_push_token: 'ExponentPushToken[xyz]' }),
        });
    });
});

describe('foreground notification handler', () => {
    it('registers a handler that shows alerts and sound but not a badge', async () => {
        expect(Notifications.setNotificationHandler).toHaveBeenCalledTimes(1);

        const [{ handleNotification }] = (Notifications.setNotificationHandler as jest.Mock).mock.calls[0];
        const behavior = await handleNotification();

        expect(behavior).toEqual({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
        });
    });
});
