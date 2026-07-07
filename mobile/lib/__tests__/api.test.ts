import { apiFetch, ApiError, setUnauthorizedHandler, handleUnauthorizedResponse } from '../api';
import { setToken, getToken } from '../auth';

jest.mock('../config', () => ({ API_BASE_URL: 'https://api.test' }));

describe('apiFetch', () => {
    beforeEach(() => {
        // @ts-expect-error test override
        global.fetch = jest.fn();
    });

    it('attaches the bearer token when present', async () => {
        await setToken('secret-token');
        // @ts-expect-error test override
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ hello: 'world' }),
        });

        const result = await apiFetch<{ hello: string }>('/api/ping');

        expect(result).toEqual({ hello: 'world' });
        // @ts-expect-error test override
        const [, options] = global.fetch.mock.calls[0];
        expect(options.headers.Authorization).toBe('Bearer secret-token');
    });

    it('clears the token and calls the unauthorized handler on 401', async () => {
        await setToken('secret-token');
        const handler = jest.fn();
        setUnauthorizedHandler(handler);
        // @ts-expect-error test override
        global.fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });

        await expect(apiFetch('/api/resumes')).rejects.toThrow(ApiError);

        expect(handler).toHaveBeenCalled();
        expect(await getToken()).toBeNull();
    });

    it('handleUnauthorizedResponse clears the token and calls the handler', async () => {
        await setToken('secret-token');
        const handler = jest.fn();
        setUnauthorizedHandler(handler);

        await handleUnauthorizedResponse();

        expect(handler).toHaveBeenCalled();
        expect(await getToken()).toBeNull();
    });

    it('throws ApiError with the message from a non-2xx JSON body', async () => {
        // @ts-expect-error test override
        global.fetch.mockResolvedValue({
            ok: false,
            status: 422,
            json: async () => ({ message: 'Validation failed' }),
        });

        await expect(apiFetch('/api/resumes')).rejects.toMatchObject({
            status: 422,
            message: 'Validation failed',
        });
    });
});
