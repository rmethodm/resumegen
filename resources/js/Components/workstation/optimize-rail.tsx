import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Textarea } from '@/Components/ui/textarea';
import { AiCritiquePanel } from '@/Components/workstation/ai-critique-panel';
import { jdKeywordOverlap } from '@/lib/jd-keyword-overlap';
import { analyzeResume } from '@/lib/resume-analysis';
import type { AiCredits, ResumeDraft, ResumeSectionKey } from '@/types';

/** Hybrid layout mode: a sticky rail next to the live preview showing a
 *  compact score summary, a JD popover, and the full AI critique panel. */
export function OptimizeRail({
    draft,
    onChange,
    resumeId,
    aiCredits,
    onJump,
}: {
    draft: ResumeDraft;
    onChange: (draft: ResumeDraft) => void;
    resumeId: number;
    aiCredits: AiCredits | null;
    onJump: (section: ResumeSectionKey) => void;
}) {
    const jd = draft.target_job_description ?? '';
    const analysis = analyzeResume(draft);
    const overlap = jdKeywordOverlap(draft, jd);

    return (
        <div className="flex flex-col gap-3">
            <Card className="gap-2 p-4">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-bold text-foreground">Score</h2>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button type="button" variant="outline" size="sm">
                                Target job
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-80">
                            <Textarea
                                rows={8}
                                value={jd}
                                placeholder="Paste the full job posting or key requirements…"
                                onChange={(event) =>
                                    onChange({
                                        ...draft,
                                        target_job_description: event.target.value,
                                    })
                                }
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="flex items-center gap-4 text-sm">
                    <span className="font-semibold text-foreground">
                        {analysis.score}/100 completeness
                    </span>
                    <span className="text-muted-foreground">
                        {overlap.total > 0
                            ? `${overlap.matched.length}/${overlap.total} JD terms`
                            : 'No JD pasted'}
                    </span>
                </div>
            </Card>

            <AiCritiquePanel
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
        </div>
    );
}
