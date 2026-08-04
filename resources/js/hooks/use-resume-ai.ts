import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';

export type AiStatus = {
    enabled: boolean;
    quotas: {
        bullet_rewrite: { cap: number; remaining: number };
        summary: { cap: number; remaining: number };
    };
};

type RewriteResult =
    | { ok: true; options: string[]; remaining: number }
    | { ok: false; message: string };

type SummaryResult =
    | { ok: true; summary: string; remaining: number }
    | { ok: false; message: string };

/**
 * Optional AI calls for bullet rewrite + summary.
 * Server returns 503 when AI_ENABLED is off — UI shows a quiet disabled state.
 */
export function useResumeAi(resumeId: number) {
    const [status, setStatus] = useState<AiStatus | null>(null);
    const [busy, setBusy] = useState(false);

    const refreshStatus = useCallback(async () => {
        try {
            const { data } = await axios.get<AiStatus>(route('ai.status'));
            setStatus(data);
        } catch {
            setStatus({
                enabled: false,
                quotas: {
                    bullet_rewrite: { cap: 0, remaining: 0 },
                    summary: { cap: 0, remaining: 0 },
                },
            });
        }
    }, []);

    useEffect(() => {
        void refreshStatus();
    }, [refreshStatus]);

    const rewriteBullet = useCallback(
        async (
            bullet: string,
            context: {
                target_role?: string;
                job_description?: string;
            } = {},
        ): Promise<RewriteResult> => {
            setBusy(true);
            try {
                const { data } = await axios.post<{
                    options: string[];
                    remaining: number;
                }>(route('resumes.ai.rewrite-bullet', resumeId), {
                    bullet,
                    ...context,
                });
                setStatus((current) =>
                    current
                        ? {
                              ...current,
                              quotas: {
                                  ...current.quotas,
                                  bullet_rewrite: {
                                      ...current.quotas.bullet_rewrite,
                                      remaining: data.remaining,
                                  },
                              },
                          }
                        : current,
                );

                return {
                    ok: true,
                    options: data.options,
                    remaining: data.remaining,
                };
            } catch (error) {
                return {
                    ok: false,
                    message: extractMessage(
                        error,
                        'Could not rewrite this bullet.',
                    ),
                };
            } finally {
                setBusy(false);
            }
        },
        [resumeId],
    );

    const generateSummary = useCallback(
        async (payload: {
            target_role?: string;
            headline?: string;
            summary?: string;
            job_description?: string;
            experience_context?: string;
        }): Promise<SummaryResult> => {
            setBusy(true);
            try {
                const { data } = await axios.post<{
                    summary: string;
                    remaining: number;
                }>(route('resumes.ai.summary', resumeId), payload);
                setStatus((current) =>
                    current
                        ? {
                              ...current,
                              quotas: {
                                  ...current.quotas,
                                  summary: {
                                      ...current.quotas.summary,
                                      remaining: data.remaining,
                                  },
                              },
                          }
                        : current,
                );

                return {
                    ok: true,
                    summary: data.summary,
                    remaining: data.remaining,
                };
            } catch (error) {
                return {
                    ok: false,
                    message: extractMessage(
                        error,
                        'Could not generate a summary.',
                    ),
                };
            } finally {
                setBusy(false);
            }
        },
        [resumeId],
    );

    return {
        status,
        busy,
        rewriteBullet,
        generateSummary,
        refreshStatus,
    };
}

function extractMessage(error: unknown, fallback: string): string {
    if (
        axios.isAxiosError(error) &&
        error.response?.data &&
        typeof error.response.data === 'object' &&
        'message' in error.response.data &&
        typeof (error.response.data as { message: unknown }).message ===
            'string'
    ) {
        return (error.response.data as { message: string }).message;
    }

    return fallback;
}
