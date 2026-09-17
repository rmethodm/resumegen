import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FillPanel } from '@/components/FillPanel';
import { InsertChips } from '@/components/InsertChips';
import { ScreeningQuestions } from '@/components/ScreeningQuestions';
import { JdMatchBadge } from '@/components/JdMatchBadge';
import { useResumes } from '@/hooks/useResumes';

interface ReadyViewProps {
    resumes: ReturnType<typeof useResumes>;
}

export function ReadyView({ resumes }: ReadyViewProps) {
    const [tab, setTab] = useState('fill');

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2 rounded-full bg-success" /> Connected{resumes.user?.email ? ` · ${resumes.user.email}` : ''}
            </div>

            {resumes.errorMessage && (
                <Alert variant="destructive">
                    <AlertDescription>{resumes.errorMessage}</AlertDescription>
                </Alert>
            )}

            <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="w-full">
                    <TabsTrigger value="fill">Fill</TabsTrigger>
                    <TabsTrigger value="track">Track</TabsTrigger>
                    <TabsTrigger value="help">Help</TabsTrigger>
                </TabsList>

                <TabsContent value="fill" className="flex flex-col gap-4">
                    <FillPanel resumes={resumes} />
                    <InsertChips profile={resumes.profile} />
                    <ScreeningQuestions profile={resumes.profile} resumeId={resumes.selectedResumeId} />
                    <JdMatchBadge profile={resumes.profile} />
                </TabsContent>

                <TabsContent value="track" className="flex flex-col gap-4">
                    <div data-testid="track-tab-stub" />
                </TabsContent>

                <TabsContent value="help">
                    <div data-testid="help-tab-stub" />
                </TabsContent>
            </Tabs>
        </div>
    );
}
