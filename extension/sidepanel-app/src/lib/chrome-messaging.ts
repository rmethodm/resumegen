export interface MessageResponse<T = Record<string, unknown>> {
    ok: boolean;
    reason?: string;
    status?: number;
    message?: string;
    error?: string;
    body?: { message?: string };
    data?: T extends { data: infer D } ? D : unknown;
}

export function sendMessage<TExtra extends Record<string, unknown> = Record<string, unknown>>(
    type: string,
    payload: Record<string, unknown> = {},
): Promise<MessageResponse & TExtra> {
    return chrome.runtime.sendMessage({ type, ...payload });
}
