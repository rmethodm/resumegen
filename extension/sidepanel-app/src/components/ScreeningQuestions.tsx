import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { sendMessage } from '@/lib/chrome-messaging';
import type { FillProfile, Question } from '@/lib/types';

interface ScreeningQuestionsProps {
    profile: FillProfile | null;
    resumeId: number | null;
}

export function ScreeningQuestions({ profile, resumeId }: ScreeningQuestionsProps) {
    const [scanning, setScanning] = useState(false);
    const [questions, setQuestions] = useState<Question[]>([]);

    async function scan() {
        if (!profile) {
            toast.warning('Select a resume first.');
            return;
        }
        setScanning(true);
        const result = await sendMessage<{ questions?: Array<{ id: string; question: string }> }>('DETECT_QUESTIONS', { profile });
        setScanning(false);

        if (!result.ok) {
            toast.warning(result.message || 'Could not scan this page.');
            return;
        }

        const found = (result.questions || []).map((q) => ({ ...q, draft: null, drafting: false, saved: false }));
        setQuestions(found);
        if (found.length === 0) {
            toast.warning('No free-text questions found on this page.');
        }
    }

    async function draft(id: string) {
        const question = questions.find((q) => q.id === id);
        setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, drafting: true } : q)));

        const result = await sendMessage<{ data?: Question['draft'] }>('DRAFT_QA_ANSWER', {
            question: question?.question,
            resumeId,
        });

        if (!result.ok) {
            if (result.status === 402) {
                toast.warning('Not enough AI credits for a draft.');
                if (confirm('Buy more AI credits now?')) {
                    sendMessage('OPEN_APP', { path: '/billing/credits' });
                }
            } else if (result.status === 429) {
                toast.error('AI drafting is currently blocked on your account.');
            } else {
                toast.warning(result.body?.message || result.message || 'Could not draft an answer.');
            }
            setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, drafting: false } : q)));
            return;
        }

        setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, drafting: false, draft: result.data ?? null, saved: false } : q)));
    }

    async function insertDraft(id: string) {
        const question = questions.find((q) => q.id === id);
        if (!question?.draft) {
            return;
        }
        const result = await sendMessage('INSERT_QA_DRAFT', { id, text: question.draft.answer });
        if (!result.ok) {
            toast.warning(result.message || 'Re-scan the page and try again.');
            return;
        }
        toast.success('Inserted the draft into the field.');
    }

    async function saveToQaBank(id: string) {
        const question = questions.find((q) => q.id === id);
        if (!question?.draft) {
            return;
        }
        const result = await sendMessage('SAVE_QA_BANK_ENTRY', { question: question.question, answer: question.draft.answer });
        if (!result.ok) {
            toast.warning(result.message || 'Could not save to your Q&A bank.');
            return;
        }
        setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, saved: true } : q)));
        toast.success('Saved to your Q&A bank.');
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="text-xs font-medium text-muted-foreground">Screening questions</div>
            <Button variant="secondary" className="w-full" onClick={scan} disabled={scanning}>
                {scanning ? 'Scanning…' : 'Scan for questions'}
            </Button>
            <p className="text-xs text-muted-foreground">
                Finds free-text questions on this page. You review every draft before it&apos;s inserted.
            </p>
            <div className="flex flex-col gap-2">
                {questions.map((q) => (
                    <div key={q.id} className="rounded-md border p-2 text-sm">
                        <p>{q.question}</p>
                        {q.draft && (
                            <>
                                <div className="mt-1 rounded bg-muted p-2 text-xs">{q.draft.answer}</div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {q.draft.source === 'qa_bank' ? 'From your Q&A bank' : `Drafted with AI · ${q.draft.credits_remaining ?? 0} credits left`}
                                </p>
                            </>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                            <Button variant="secondary" size="sm" onClick={() => draft(q.id)} disabled={q.drafting}>
                                {q.drafting ? 'Drafting…' : q.draft ? 'Redraft' : 'Draft'}
                            </Button>
                            {q.draft && (
                                <Button variant="secondary" size="sm" onClick={() => insertDraft(q.id)}>
                                    Insert
                                </Button>
                            )}
                            {q.draft && q.draft.source === 'ai' && !q.saved && (
                                <Button variant="link" size="sm" onClick={() => saveToQaBank(q.id)}>
                                    Save to Q&A bank
                                </Button>
                            )}
                            {q.saved && <span className="text-xs text-muted-foreground">Saved to Q&A bank</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
