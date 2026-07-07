import { Alert } from 'react-native';
import { showUpgradeAlert } from '../upgradeAlert';

jest.mock('react-native', () => ({
    Alert: { alert: jest.fn() },
}));

describe('showUpgradeAlert', () => {
    it('shows an alert naming the feature and required tier', () => {
        showUpgradeAlert('cover_letter_generate', 'starter');

        expect(Alert.alert).toHaveBeenCalledWith(
            'Upgrade required',
            expect.stringContaining('starter'),
        );
    });
});
