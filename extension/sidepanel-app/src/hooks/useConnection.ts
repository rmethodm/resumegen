import { useCallback, useEffect, useState } from 'react';
import { sendMessage } from '@/lib/chrome-messaging';

export type ConnectionStatus = 'checking' | 'connected' | 'disconnected';

export function useConnection() {
    const [status, setStatus] = useState<ConnectionStatus>('checking');

    const check = useCallback(async () => {
        setStatus('checking');
        const config = await sendMessage<{ token: string }>('GET_CONFIG');
        setStatus(config?.token ? 'connected' : 'disconnected');
    }, []);

    useEffect(() => {
        check();
    }, [check]);

    return { status, recheck: check };
}
