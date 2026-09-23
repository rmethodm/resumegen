import AutocompleteInput from '@/Components/AutocompleteInput';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { keywordsFor } from '@/lib/resume-analysis';
import { cn } from '@/lib/utils';

/** Thin target-role/company controls, shown on the Optimize tab above the JD paste field. */
export function TargetRoleBar({
    targetRole,
    onChange,
    targetCompany,
    onTargetCompanyChange,
    className,
}: {
    targetRole: string;
    onChange: (targetRole: string) => void;
    targetCompany: string;
    onTargetCompanyChange: (targetCompany: string) => void;
    className?: string;
}) {
    const familyKeywords = keywordsFor(targetRole);
    const recognized = familyKeywords.length > 0;

    return (
        <div
            className={cn(
                'rounded-xl border border-border border-l-[3px] border-l-primary bg-card px-3 py-2.5 sm:px-4',
                className,
            )}
        >
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:gap-3">
                <div className="min-w-0 flex-1">
                    <Label
                        htmlFor="field-target-role-bar"
                        className="mb-1 block text-xs font-medium text-muted-foreground"
                    >
                        Target role
                    </Label>
                    <AutocompleteInput
                        id="field-target-role-bar"
                        endpoint="job-roles"
                        value={targetRole}
                        allowCreate={false}
                        placeholder="e.g. Senior Software Engineer"
                        className="h-9"
                        onChange={onChange}
                    />
                </div>
                <div className="min-w-0 sm:w-52">
                    <Label
                        htmlFor="field-target-company"
                        className="mb-1 block text-xs font-medium text-muted-foreground"
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
                <p className="text-xs leading-snug text-muted-foreground">
                    {targetRole.trim() === ''
                        ? 'Sets the Keywords score band. Not printed on the resume.'
                        : recognized
                          ? 'Role family recognized — keyword chips update below.'
                          : 'Tip: include design, engineer, data, product, or market.'}
                </p>
            </div>
        </div>
    );
}
