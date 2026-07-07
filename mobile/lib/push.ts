import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiFetch } from './api';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export async function registerForPushNotifications(): Promise<string | null> {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;

    if (status !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        status = requested.status;
    }

    if (status !== 'granted') {
        return null;
    }

    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync();

    await apiFetch('/api/push-tokens', {
        method: 'POST',
        body: JSON.stringify({ expo_push_token: expoPushToken, platform: Platform.OS === 'ios' ? 'ios' : 'android' }),
    });

    return expoPushToken;
}

export async function unregisterPushToken(expoPushToken: string): Promise<void> {
    await apiFetch('/api/push-tokens', {
        method: 'DELETE',
        body: JSON.stringify({ expo_push_token: expoPushToken }),
    });
}
