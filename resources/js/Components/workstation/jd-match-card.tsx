import { jdKeywordOverlap } from '@/lib/jd-keyword-overlap';
import { formatKeywordLabel } from '@/lib/resume-analysis';
import { Card } from '@/Components/ui/card';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import type { ResumeDraft } from '@/types';

/** Paste-a-JD + exact-wording keyword overlap. Shared by every Workstation
 *  layout mode that surfaces optimize content. */
export function JdMatchCard({
    draft,
    onChange,
}: {
    draft: ResumeDraft;
    onChange: (draft: ResumeDraft) => void;
}) {
    const jd = draft.target_job_description ?? '';
    const overlap = jdKeywordOverlap(draft, jd);

    return (
        <Card className="gap-0 p-4">
            <div className="mb-3">
                <h2 className="text-sm font-bold text-foreground">
                    Optimize for a job
                </h2>
                <p className="text-xs text-muted-foreground">
                    Compare the wording in a job posting with your resume.
                    This is a wording check, not an ATS score or hiring prediction.
                </p>
            </div>

            <div className="flex flex-col gap-1.5">
                <Label className="text-xs" htmlFor="field-optimize-jd">
                    Job description
                </Label>
                <Textarea
                    id="field-optimize-jd"
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
                <p className="text-xs text-muted-foreground">
                    <span className="tabular-nums">{jd.length} / 10000</span> characters
                </p>
            </div>

            {jd.trim() !== '' && (
                <div className="mt-4 rounded-md border border-border bg-muted p-3">
                    <p className="mb-3 text-xs text-muted-foreground">
                        {overlap.matched.length} of {overlap.total} posting terms appear in your included resume sections.
                        Exact wording only; synonyms and relevance are not assessed.
                    </p>

                    {overlap.total === 0 && (
                        <p className="text-xs text-muted-foreground">No usable terms found. Paste the job’s requirements to compare.</p>
                    )}

                    {overlap.missing.length > 0 && (
                        <div className="mb-3">
                            <p className="mb-1.5 text-xs font-semibold text-muted-foreground/70">
                                Not found — review in context
                            </p>
                            <p className="mb-2 text-xs text-muted-foreground">
                                Check the posting, then describe relevant experience in your own words.
                                These terms are not verified skills.
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {overlap.missing.slice(0, 32).map((term) => (
                                    <span
                                        key={term}
                                        className="inline-flex items-center gap-1 rounded-full border border-dashed border-warning/40 bg-white px-2.5 py-1 text-xs font-medium text-warning-text"
                                    >
                                        {formatKeywordLabel(term)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {overlap.matched.length > 0 && (
                        <div>
                            <p className="mb-1.5 text-xs font-semibold text-muted-foreground/70">
                                Present
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {overlap.matched.slice(0, 24).map((term) => (
                                    <span
                                        key={term}
                                        className="rounded-full border border-success/30 bg-success-subtle px-2.5 py-1 text-xs font-medium text-success-text"
                                    >
                                        {formatKeywordLabel(term)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {overlap.missing.length === 0 &&
                        overlap.total > 0 && (
                            <p className="text-xs font-medium text-success-text">
                                All scanned terms appear in the resume. Review
                                bullets next for impact and weak openings.
                            </p>
                        )}
                </div>
            )}
        </Card>
    );
}
