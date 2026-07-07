import { login } from '../authApi';
import * as api from '../api';

jest.mock('../api');

describe('login', () => {
    it('stores the token and returns the user on success', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({
            token: 'abc123',
            user: { id: 1, name: 'Ada', email: 'ada@example.com', is_pro: false, plan_tier: 'free', has_completed_onboarding: true },
        });

        const user = await login('ada@example.com', 'password');

        expect(api.apiFetch).toHaveBeenCalledWith('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: 'ada@example.com', password: 'password' }),
        });
        expect(user.name).toBe('Ada');
    });
});
