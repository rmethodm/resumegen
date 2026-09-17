import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/Components/ui/sheet';
import { AtsPlainTextBlock, OptimizePanel } from '@/Components/workstation/optimize-panel';
import { ScoreRingTrio } from '@/Components/workstation/score-ring-trio';
import { TargetRoleBar } from '@/Components/workstation/target-role-bar';
import type { AiCredits, ResumeDraft, ResumeSectionKey } from '@/types';

/** Overlay layout mode: the full Optimize stack in a side sheet, so the
 *  form stays mounted (and its scroll/edit state intact) behind it. */
export function OptimizeSheet({
    open,
    onOpenChange,
    draft,
    onChange,
    resumeId,
    aiCredits,
    onJump,
    plainText,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    draft: ResumeDraft;
    onChange: (draft: ResumeDraft) => void;
    resumeId: number;
    aiCredits: AiCredits | null;
    onJump: (section: ResumeSectionKey) => void;
    plainText: string;
}) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full max-w-xl gap-4 overflow-y-auto sm:max-w-xl">
                <SheetHeader>
                    <SheetTitle>Optimize</SheetTitle>
                </SheetHeader>

                <ScoreRingTrio resume={draft} jd={draft.target_job_description ?? ''} />

                <TargetRoleBar
                    targetRole={draft.target_role}
                    targetCompany={draft.target_company ?? ''}
                    onChange={(target_role) => onChange({ ...draft, target_role })}
                    onTargetCompanyChange={(target_company) =>
                        onChange({ ...draft, target_company })
                    }
                />

                <OptimizePanel
                    draft={draft}
                    onChange={onChange}
                    resumeId={resumeId}
                    aiCredits={aiCredits}
                    onJump={onJump}
                >
                    <AtsPlainTextBlock plainText={plainText} />
                </OptimizePanel>
            </SheetContent>
        </Sheet>
    );
}
