import { router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { JobsShell } from '@/Components/jobs/jobs-shell';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

type PoolEntry = {
    id: number;
    job_listing_id: number;
    title: string;
    company: string;
    location: string | null;
    job_url: string;
    resume_id: number;
    resume_title: string;
};

export default function JobPool({ entries }: { entries: PoolEntry[] }) {
    function remove(entry: PoolEntry) {
        router.delete(route('job-pool.destroy', entry.id), { preserveScroll: true });
    }

    return (
        <AuthenticatedLayout>
            <JobsShell active="pool">
                <ul className="divide-y divide-border">
                    {entries.map((entry) => (
                        <li key={entry.id} className="flex items-center justify-between gap-4 py-4">
                            <div className="min-w-0">
                                <a
                                    href={entry.job_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="truncate text-sm font-semibold text-foreground hover:underline"
                                >
                                    {entry.title}
                                </a>
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                    {entry.company}
                                    {entry.location ? ` · ${entry.location}` : ''} · Resume: {entry.resume_title}
                                </p>
                            </div>
                            <Button type="button" variant="outline" onClick={() => remove(entry)}>
                                Remove
                            </Button>
                        </li>
                    ))}
                    {entries.length === 0 && (
                        <li className="py-8 text-center text-sm text-muted-foreground">
                            You haven't added any jobs to your pool yet.
                        </li>
                    )}
                </ul>
            </JobsShell>
        </AuthenticatedLayout>
    );
}
