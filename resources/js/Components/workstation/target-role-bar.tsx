import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import AutocompleteInput from '@/Components/AutocompleteInput';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { keywordsFor } from '@/lib/resume-analysis';
import { cn } from '@/lib/utils';

/**
 * Always-visible target role control under the workstation header so scoring
 * context is never buried inside Contact. Optional company / JD notes live
 * behind a disclosure — dashboard-only, not printed on the resume.
 */
export function TargetRoleBar({
    targetRole,
    onChange,
    targetCompany,
    onTargetCompanyChange,
    targetJobDescription,
    onTargetJobDescriptionChange,
    className,
}: {
    targetRole: string;
    onChange: (targetRole: string) => void;
    targetCompany: string;
    onTargetCompanyChange: (targetCompany: string) => void;
    targetJobDescription: string;
    onTargetJobDescriptionChange: (value: string) => void;
    className?: string;
}) {
    const familyKeywords = keywordsFor(targetRole);
    const recognized = familyKeywords.length > 0;
    const hasVersionMeta =
        targetCompany.trim() !== '' || targetJobDescription.trim() !== '';
    const [versionOpen, setVersionOpen] = useState(hasVersionMeta);

    return (
        <div
            className={cn(
                'rounded-lg border border-surface-border border-l-[3px] border-l-brand bg-white px-3 py-2.5 sm:px-4',
                className,
            )}
        >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
                <div className="min-w-0 flex-1">
                    <label
                        htmlFor="field-target-role-bar"
                        className="mb-1 block text-xs font-semibold tracking-[0.06em] text-ink-faint uppercase"
                    >
                        Target role
                    </label>
                    <AutocompleteInput
                        id="field-target-role-bar"
                        endpoint="job-roles"
                        value={targetRole}
                        allowCreate={false}
                        placeholder="e.g. Senior Software Engineer"
                        className="h-9 w-full rounded-md border border-surface-border bg-white px-3 text-sm shadow-xs transition-[border-color,box-shadow] duration-soft ease-soft focus-visible:border-brand focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-brand"
                        onChange={onChange}
                    />
                </div>
                <p className="shrink-0 pb-1 text-xs leading-snug text-ink-muted sm:max-w-60">
                    {targetRole.trim() === ''
                        ? 'Sets the Keywords score band. Not printed on the resume.'
                        : recognized
                          ? 'Role family recognized — keyword chips update in the rail.'
                          : 'Tip: include design, engineer, data, product, or market.'}
                </p>
            </div>

            <div className="mt-2 border-t border-surface-border/80 pt-2">
                <button
                    type="button"
                    aria-expanded={versionOpen}
                    aria-controls="target-version-details"
                    onClick={() => setVersionOpen((open) => !open)}
                    className="focus-ring flex items-center gap-1 rounded-sm text-xs font-semibold text-ink-muted hover:text-ink"
                >
                    <ChevronDownIcon
                        className={cn(
                            'size-3.5 transition-transform duration-soft ease-soft',
                            !versionOpen && '-rotate-90',
                        )}
                    />
                    Version details
                    {hasVersionMeta && !versionOpen ? (
                        <span className="ml-1 font-normal text-ink-faint">
                            (
                            {joinMetaHint(targetCompany, targetJobDescription)})
                        </span>
                    ) : null}
                </button>
                {versionOpen ? (
                    <div
                        id="target-version-details"
                        className="mt-2 flex flex-col gap-2.5"
                    >
                        <p className="text-xs leading-relaxed text-ink-muted">
                            Optional labels for this resume version — not
                            printed on the PDF or DOCX.
                        </p>
                        <div className="flex flex-col gap-1.5">
                            <Label
                                htmlFor="field-target-company"
                                className="text-xs"
                            >
                                Target company
                            </Label>
                            <Input
                                id="field-target-company"
                                name="target_company"
                                value={targetCompany}
                                maxLength={255}
                                placeholder="e.g. Acme Corp — dashboard label only"
                                onChange={(event) =>
                                    onTargetCompanyChange(event.target.value)
                                }
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label
                                htmlFor="field-target-job-description"
                                className="text-xs"
                            >
                                Job description notes
                            </Label>
                            <Textarea
                                id="field-target-job-description"
                                name="target_job_description"
                                rows={3}
                                value={targetJobDescription}
                                maxLength={10000}
                                placeholder="Paste key requirements you are matching…"
                                onChange={(event) =>
                                    onTargetJobDescriptionChange(
                                        event.target.value,
                                    )
                                }
                            />
                            <p className="text-xs text-ink-faint">
                                {targetJobDescription.length} / 10000 characters
                            </p>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function joinMetaHint(company: string, notes: string): string {
    if (company.trim() !== '') {
        return company.trim();
    }

    return `${notes.trim().slice(0, 28)}${notes.trim().length > 28 ? '…' : ''}`;
}
