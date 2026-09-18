import type { ReactNode } from 'react';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { JdMatchCard } from '@/Components/workstation/jd-match-card';
import { OptimizeChecklist } from '@/Components/workstation/optimize-checklist';
import { AiCritiquePanel } from '@/Components/workstation/ai-critique-panel';
import type { AiCredits, ResumeDraft, ResumeSectionKey } from '@/types';

/**
 * Optimize hub: paste JD → wording overlap → review terms in context.
 * Plain-text ATS view stays below (passed as children).
 */
export function OptimizePanel({
    draft,
    onChange,
    resumeId,
    aiCredits,
    onJump,
    children,
    saveReady = true,
}: {
    draft: ResumeDraft;
    onChange: (draft: ResumeDraft) => void;
    resumeId: number;
    aiCredits: AiCredits | null;
    onJump: (section: ResumeSectionKey) => void;
    children?: ReactNode;
    saveReady?: boolean;
}) {
    const jd = draft.target_job_description ?? '';

    return (
        <div className="flex flex-col gap-4">
            <JdMatchCard draft={draft} onChange={onChange} />

            <OptimizeChecklist draft={draft} onJump={onJump} />

            <AiCritiquePanel
                saveReady={saveReady}
                resumeId={resumeId}
                jd={jd}
                initialSuggestions={draft.ai_review ?? null}
                initialGeneratedAt={draft.ai_review_generated_at ?? null}
                initialPreset={draft.ai_review_preset ?? null}
                credits={aiCredits}
                onJump={onJump}
                onResult={({ suggestions, generatedAt, preset }) =>
                    onChange({
                        ...draft,
                        ai_review: suggestions,
                        ai_review_generated_at: generatedAt,
                        ai_review_preset: preset,
                    })
                }
            />

            {children}
        </div>
    );
}

/** Compact plain-text block used under Optimize. */
export function AtsPlainTextBlock({
    plainText,
}: {
    plainText: string;
}) {
    return (
        <Card className="gap-0 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 className="text-sm font-bold text-foreground">
                        ATS plain text
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        What a simple text parser would see — single column, no
                        layout chrome.
                    </p>
                </div>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                        navigator.clipboard.writeText(plainText).catch(() => undefined);
                    }}
                >
                    Copy all
                </Button>
            </div>
            <pre className="max-h-[50dvh] overflow-auto rounded-md border border-border bg-muted p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground">
                {plainText}
            </pre>
        </Card>
    );
}
