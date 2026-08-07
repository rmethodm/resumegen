import AutocompleteInput from '@/Components/AutocompleteInput';
import { keywordsFor } from '@/lib/resume-analysis';
import { cn } from '@/lib/utils';

/**
 * Always-visible target role control under the workstation header so scoring
 * context is never buried inside a collapsed Contact section.
 */
export function TargetRoleBar({
    targetRole,
    onChange,
    className,
}: {
    targetRole: string;
    onChange: (targetRole: string) => void;
    className?: string;
}) {
    const familyKeywords = keywordsFor(targetRole);
    const recognized = familyKeywords.length > 0;

    return (
        <div
            className={cn(
                'rounded-lg border border-border-subtle bg-surface-raised px-3 py-2.5 sm:px-4',
                className,
            )}
        >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                <div className="min-w-0 flex-1">
                    <label
                        htmlFor="field-target-role-bar"
                        className="mb-1 block text-[11px] font-medium text-text-tertiary"
                    >
                        Target role
                    </label>
                    <AutocompleteInput
                        id="field-target-role-bar"
                        endpoint="job-roles"
                        value={targetRole}
                        allowCreate={false}
                        placeholder="e.g. Senior Software Engineer"
                        className="h-9 w-full rounded-md border border-border-default bg-surface-card px-3 text-sm text-text-primary shadow-sm focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/30"
                        onChange={onChange}
                    />
                </div>
                <p className="shrink-0 pb-1 text-[11px] leading-snug text-text-secondary sm:max-w-[14rem]">
                    {targetRole.trim() === ''
                        ? 'Sets the Keywords score band. Not printed on the resume.'
                        : recognized
                          ? 'Role family recognized — keyword chips update in the rail.'
                          : 'Tip: include design, engineer, data, product, or market.'}
                </p>
            </div>
        </div>
    );
}
