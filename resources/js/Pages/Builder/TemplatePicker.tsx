import { BrandMark } from '@/Components/BrandMark';
import { Button } from '@/Components/ui/button';
import { Shell } from '@/Components/ui/shell';
import { templateLabels } from '@/lib/resume-templates';
import { templateThumbStyles } from '@/lib/template-thumb-styles';
import { cn } from '@/lib/utils';
import type { ResumeTemplateKey } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

/**
 * Builder subdomain landing page: pick one of the four templates and a
 * guest resume is created immediately — no account, no login. The server
 * hands off to the main host's /w/{token} bookmark link afterwards.
 */
export default function TemplatePicker({
    templates,
}: {
    templates: ResumeTemplateKey[];
}) {
    const [creating, setCreating] = useState<ResumeTemplateKey | null>(null);

    function useTemplate(key: ResumeTemplateKey) {
        if (creating !== null) {
            return;
        }

        router.post(
            '/start',
            { template: key },
            {
                onStart: () => setCreating(key),
                onFinish: () => setCreating(null),
            },
        );
    }

    return (
        <div className="min-h-screen bg-surface py-10">
            <Head title="Choose a template" />

            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col items-center gap-3 text-center">
                        <BrandMark />
                        <h1 className="text-2xl font-bold tracking-tight text-ink">
                            Pick a template to start your resume
                        </h1>
                        <p className="max-w-xl text-sm text-ink-muted">
                            No sign-up needed. Choose a style and you&apos;ll be
                            editing in seconds — you can change the template at
                            any time.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {templates.map((key) => {
                            const style = templateThumbStyles[key];
                            const busy = creating === key;

                            return (
                                <Shell key={key} className="flex flex-col">
                                    <div className="flex h-full flex-col p-4">
                                        <div
                                            className={cn(
                                                'h-36 rounded-md border border-surface-border',
                                                style,
                                            )}
                                        />
                                        <p className="mt-3 text-sm font-semibold text-ink">
                                            {templateLabels[key]}
                                        </p>
                                        <Button
                                            className="mt-3"
                                            disabled={creating !== null}
                                            onClick={() => useTemplate(key)}
                                        >
                                            {busy
                                                ? 'Creating…'
                                                : 'Use this template'}
                                        </Button>
                                    </div>
                                </Shell>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
