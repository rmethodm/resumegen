import { Link } from '@inertiajs/react';
import { ArrowUpRight, Check, Download, FileCheck2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/Components/ui/card';
import { Separator } from '@/Components/ui/separator';
import type { ExportCheck } from '@/lib/export-checklist';
import type { LinkedApplication } from '@/types';

export function ApplicationReview({ application, checks, saved, onDownload, onFix }: {
    application: LinkedApplication | null;
    checks: ExportCheck[];
    saved: boolean;
    onDownload: (format: 'pdf' | 'docx') => void;
    onFix: (check: ExportCheck) => void;
}) {
    let employerUrl: string | null = null;
    try {
        const parsed = new URL(application?.job_url ?? '');
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') employerUrl = parsed.href;
    } catch { /* Missing or invalid job links are handled by the tracker. */ }
    const blockers = checks.filter(check => check.severity === 'error');
    const warnings = checks.filter(check => check.severity === 'warn');
    return <Card className="gap-5">
        <CardHeader>
            <CardTitle>One final look.</CardTitle>
            <CardDescription>Review your document, then submit on the employer’s site.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
            <section className="flex flex-col gap-3" aria-label="Resume checks">
                <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-medium">Resume checks</h3><Badge variant={blockers.length ? 'destructive' : 'secondary'}>{blockers.length ? `${blockers.length} to fix` : 'No blocking issues'}</Badge></div>
                {[...blockers, ...warnings].map(check => <Button key={check.id} variant="ghost" className="h-auto justify-start whitespace-normal px-0 text-left" onClick={() => onFix(check)} disabled={!check.section && !check.fieldId}>{check.label}<ArrowUpRight data-icon="inline-end" /></Button>)}
                {!blockers.length && !warnings.length && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="size-4" />Your document checks are complete.</p>}
            </section>
            <Separator />
            <section className="flex flex-col gap-3"><h3 className="text-sm font-medium">1. Take the right resume</h3><p className="text-sm leading-6 text-muted-foreground">Download this version for your application.</p><div className="flex flex-wrap gap-2"><Button disabled={!saved || blockers.length > 0} onClick={() => onDownload('pdf')}><Download data-icon="inline-start" />Download PDF</Button><Button variant="outline" disabled={!saved || blockers.length > 0} onClick={() => onDownload('docx')}>DOCX</Button></div>{!saved && <p role="status" className="text-xs text-muted-foreground">Wait for your changes to save before downloading.</p>}</section>
            <Separator />
            <section className="flex flex-col gap-3"><h3 className="text-sm font-medium">2. Submit your application</h3><p className="text-sm leading-6 text-muted-foreground">Fill the employer’s form yourself or use the Chrome extension. You review the form and click Submit.</p>{employerUrl ? <Button asChild variant="outline"><a href={employerUrl} target="_blank" rel="noopener noreferrer">Open employer’s site<ArrowUpRight data-icon="inline-end" /></a></Button> : <p className="text-xs text-muted-foreground">{application ? 'Add the employer’s URL in your application details.' : 'Choose a job to connect this resume to an application.'}</p>}</section>
            <Separator />
            <section className="flex flex-col gap-3"><h3 className="text-sm font-medium">3. Track what happens next</h3><p className="text-sm leading-6 text-muted-foreground">After you submit, record your status, follow-up date, and notes in Applications.</p><Button asChild variant="outline"><Link href={application ? route('job-applications.index', { highlight: application.id }) : route('jobs.browse')}><FileCheck2 data-icon="inline-start" />{application ? 'Open application tracker' : 'Find a job'}</Link></Button></section>
            <Alert><AlertDescription>Opening the employer’s site or downloading a resume does not mark an application as submitted.</AlertDescription></Alert>
        </CardContent>
    </Card>;
}
