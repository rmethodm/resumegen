import AutocompleteInput from '@/Components/AutocompleteInput';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { keywordsFor } from '@/lib/resume-analysis';
import { cn } from '@/lib/utils';

/**
 * Thin Edit-tab target controls. Job description paste lives on Optimize only
 * so the same JD field is not entered twice.
 */
export function TargetRoleBar({
    targetRole,
    onChange,
    targetCompany,
    onTargetCompanyChange,
    hasJobDescription = false,
    onOpenOptimize,
    className,
}: {
    targetRole: string;
    onChange: (targetRole: string) => void;
    targetCompany: string;
    onTargetCompanyChange: (targetCompany: string) => void;
    /** True when a JD is already saved — show a jump chip to Optimize. */
    hasJobDescription?: boolean;
    onOpenOptimize?: () => void;
    className?: string;
}) {
    const familyKeywords = keywordsFor(targetRole);
    const recognized = familyKeywords.length > 0;

    return (
        <div
            className={cn(
                'rounded-xl border border-surface-border border-l-[3px] border-l-brand bg-white px-3 py-2.5 sm:px-4',
                className,
            )}
        >
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:gap-3">
                <div className="min-w-0 flex-1">
                    <label
                        htmlFor="field-target-role-bar"
                        className="mb-1 block text-xs font-medium text-ink-muted"
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
                <div className="min-w-0 sm:w-52">
                    <Label
                        htmlFor="field-target-company"
                        className="mb-1 block text-xs font-medium text-ink-muted"
                    >
                        Target company
                    </Label>
                    <Input
                        id="field-target-company"
                        name="target_company"
                        value={targetCompany}
                        maxLength={255}
                        placeholder="Optional"
                        className="h-9"
                        onChange={(event) =>
                            onTargetCompanyChange(event.target.value)
                        }
                    />
                </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="text-xs leading-snug text-ink-muted">
                    {targetRole.trim() === ''
                        ? 'Sets the Keywords score band. Not printed on the resume.'
                        : recognized
                          ? 'Role family recognized — keyword chips update in the score strip.'
                          : 'Tip: include design, engineer, data, product, or market.'}
                </p>
                {onOpenOptimize && (
                    <button
                        type="button"
                        onClick={onOpenOptimize}
                        className="focus-ring rounded-sm text-xs font-semibold text-brand hover:underline"
                    >
                        {hasJobDescription
                            ? 'Job description on Optimize →'
                            : 'Paste job description on Optimize →'}
                    </button>
                )}
            </div>
        </div>
    );
}
