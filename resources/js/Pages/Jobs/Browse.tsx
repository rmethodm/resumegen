import { Link, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { AddToPoolDialog, ResumeOption } from '@/Components/jobs/add-to-pool-dialog';
import { JobsShell } from '@/Components/jobs/jobs-shell';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

type JobListingRow = {
    id: number;
    title: string;
    company: string;
    location: string | null;
    job_url: string;
};

type Paginated<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
};

// Laravel's paginator labels are "&laquo; Previous" / "Next &raquo;" / a page
// number — render them as plain text rather than dangerouslySetInnerHTML.
function paginationLabel(label: string): string {
    return label.replace('&laquo;', '«').replace('&raquo;', '»');
}

export default function BrowseJobs({
    listings,
    filters,
    resumes,
}: {
    listings: Paginated<JobListingRow>;
    filters: { q: string | null; location: string | null; company: string | null };
    resumes: ResumeOption[];
}) {
    const [q, setQ] = useState(filters.q ?? '');
    const [location, setLocation] = useState(filters.location ?? '');
    const [company, setCompany] = useState(filters.company ?? '');
    const [dialogListingId, setDialogListingId] = useState<number | null>(null);

    function submit(event: FormEvent) {
        event.preventDefault();
        router.get(
            route('jobs.browse'),
            { q: q || undefined, location: location || undefined, company: company || undefined },
            { preserveState: true, preserveScroll: true },
        );
    }

    return (
        <AuthenticatedLayout>
            <JobsShell active="browse">
                <form onSubmit={submit} className="grid gap-3 sm:grid-cols-4">
                    <Input
                        placeholder="Keyword"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        className="sm:col-span-2"
                    />
                    <Input
                        placeholder="Location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                    />
                    <Input
                        placeholder="Company"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                    />
                    <Button type="submit" className="sm:col-span-4 sm:w-fit">
                        Search
                    </Button>
                </form>

                <ul className="mt-6 divide-y divide-border">
                    {listings.data.map((listing) => (
                        <li key={listing.id} className="flex items-center justify-between gap-4 py-4">
                            <div className="min-w-0">
                                <a
                                    href={listing.job_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="truncate text-sm font-semibold text-foreground hover:underline"
                                >
                                    {listing.title}
                                </a>
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                    {listing.company}
                                    {listing.location ? ` · ${listing.location}` : ''}
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDialogListingId(listing.id)}
                            >
                                Add to pool
                            </Button>
                        </li>
                    ))}
                    {listings.data.length === 0 && (
                        <li className="py-8 text-center text-sm text-muted-foreground">
                            No listings match your search.
                        </li>
                    )}
                </ul>

                <div className="mt-4 flex flex-wrap gap-2">
                    {listings.links.map((link, index) => (
                        <Link
                            key={index}
                            href={link.url ?? '#'}
                            preserveScroll
                            className={
                                'rounded-md px-2.5 py-1 text-xs ' +
                                (link.active
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted') +
                                (link.url ? '' : ' pointer-events-none opacity-50')
                            }
                        >
                            {paginationLabel(link.label)}
                        </Link>
                    ))}
                </div>
            </JobsShell>

            <AddToPoolDialog
                open={dialogListingId !== null}
                onClose={() => setDialogListingId(null)}
                jobListingId={dialogListingId}
                resumes={resumes}
            />
        </AuthenticatedLayout>
    );
}
