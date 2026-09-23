import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { templateLabels } from '@/lib/resume-templates';
import { templateThumbStyles } from '@/lib/template-thumb-styles';
import { cn } from '@/lib/utils';
import type { ResumeTemplateKey } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

/**
 * Preview PNGs for retired/aliased keys map onto the files still in
 * public/images/templates (ats-plain → ats, minimalist → minimal).
 */
const templatePreviewSrc: Record<ResumeTemplateKey, string> = {
    'ats-plain': '/images/templates/ats.png',
    classic: '/images/templates/classic.png',
    modern: '/images/templates/modern.png',
    minimalist: '/images/templates/minimal.png',
};

const templateDescriptions: Record<ResumeTemplateKey, string> = {
    'ats-plain': 'Clean, single-column layout that scans cleanly in applicant tracking systems.',
    classic: 'Centered serif presentation for traditional industries and formal applications.',
    modern: 'Sans-serif layout with a colored accent — clear hierarchy and contemporary feel.',
    minimalist: 'Sparse type and quiet chrome when less visual noise is the goal.',
};

type ComingSoonFormat = { name: string; url: string };

export default function ResumesIndex({
    templates,
    comingSoon,
}: {
    templates: ResumeTemplateKey[];
    comingSoon: ComingSoonFormat[];
}) {
    const [creating, setCreating] = useState<ResumeTemplateKey | null>(null);

    const sorted = [...templates].sort((a, b) =>
        templateLabels[a].localeCompare(templateLabels[b]),
    );

    function useTemplate(key: ResumeTemplateKey) {
        if (creating !== null) {
            return;
        }

        router.post(
            route('resumes.store'),
            { template: key },
            {
                onStart: () => setCreating(key),
                onFinish: () => setCreating(null),
            },
        );
    }

    return (
        <AuthenticatedLayout>
            <Head title="Resume types" />

            <div className="py-6 sm:py-8">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-5">
                        <Card className="gap-0 p-5 sm:p-6">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground/70">
                                Resumes
                            </p>
                            <h1 className="mt-1 text-lg font-bold tracking-tight text-foreground">
                                Available resume types
                            </h1>
                            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                                Pick a template to start a new resume. Your existing resumes stay on
                                the Dashboard; you can change the template later in the editor.
                            </p>
                        </Card>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {sorted.map((key) => {
                                const style = templateThumbStyles[key];
                                const busy = creating === key;

                                return (
                                    <Card
                                        key={key}
                                        className="gap-0 flex h-full flex-col p-3"
                                    >
                                        <div
                                            className="relative aspect-8.5/11 w-full overflow-hidden rounded-md border border-border bg-card shadow-xs"
                                            style={{
                                                borderLeft: style.pageAccent
                                                    ? `3px solid ${style.pageAccent}`
                                                    : undefined,
                                            }}
                                        >
                                            <img
                                                src={templatePreviewSrc[key]}
                                                alt=""
                                                loading="lazy"
                                                className="h-full w-full object-cover object-top"
                                            />
                                        </div>
                                        <div className="mt-3 flex flex-1 flex-col gap-2">
                                            <div>
                                                <h2 className="text-sm font-bold text-foreground">
                                                    {templateLabels[key]}
                                                </h2>
                                                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                                    {templateDescriptions[key]}
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                className={cn('mt-auto w-full')}
                                                disabled={creating !== null}
                                                onClick={() => useTemplate(key)}
                                            >
                                                {busy ? 'Creating…' : 'Use this template'}
                                            </Button>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>

                        {comingSoon.length > 0 && (
                            <div className="flex flex-col gap-3">
                                <h2 className="text-sm font-bold text-foreground">More formats</h2>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    {comingSoon.map((format) => (
                                        <Card
                                            key={format.name}
                                            className="gap-0 flex h-full flex-col p-3"
                                        >
                                            <div className="relative aspect-8.5/11 w-full overflow-hidden rounded-md border border-border bg-card shadow-xs">
                                                <img
                                                    src={format.url}
                                                    alt=""
                                                    loading="lazy"
                                                    className="h-full w-full object-cover object-top"
                                                />
                                            </div>
                                            <div className="mt-3 flex flex-1 flex-col gap-2">
                                                <Button
                                                    type="button"
                                                    className="mt-auto w-full"
                                                    disabled
                                                >
                                                    Coming Soon
                                                </Button>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
