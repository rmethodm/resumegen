import { Alert } from 'react-native';

const TIER_LABELS: Record<string, string> = {
    starter: 'Starter',
    pro: 'Pro',
    agency: 'Agency',
};

export function showUpgradeAlert(feature: string, requiredTier: string): void {
    const tierLabel = TIER_LABELS[requiredTier] ?? requiredTier;

    Alert.alert(
        'Upgrade required',
        `This feature requires the ${tierLabel} plan. Upgrade from the web app to continue.`,
    );
}
