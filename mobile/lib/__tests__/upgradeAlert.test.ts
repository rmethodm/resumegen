import { Alert } from 'react-native';
import { showUpgradeAlert } from '../upgradeAlert';

describe('showUpgradeAlert', () => {
    it('shows an alert naming the feature and required tier', () => {
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

        showUpgradeAlert('cover_letter_generate', 'starter');

        expect(alertSpy).toHaveBeenCalledWith(
            'Upgrade required',
            expect.stringContaining('Starter'),
        );

        alertSpy.mockRestore();
    });
});
