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
                'rounded-lg border border-surface-border border-l-[3px] border-l-brand bg-white px-3 py-2.5 sm:px-4',
                className,
            )}
        >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
                <div className="min-w-0 flex-1">
                    <label
                        htmlFor="field-target-role-bar"
                        className="mb-1 block text-[11px] font-semibold tracking-[0.06em] text-ink-faint uppercase"
                    >
                        Target role
                    </label>
                    <AutocompleteInput
                        id="field-target-role-bar"
                        endpoint="job-roles"
                        value={targetRole}
                        allowCreate={false}
                        placeholder="e.g. Senior Software Engineer"
                        className="h-9 w-full rounded-md border border-surface-border bg-white px-3 text-sm shadow-sm transition-[border-color,box-shadow] duration-soft ease-soft focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                        onChange={onChange}
                    />
                </div>
                <p className="shrink-0 pb-1 text-[11px] leading-snug text-ink-muted sm:max-w-[15rem]">
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
