import PublicLayout from '@/Layouts/PublicLayout';
import { Head } from '@inertiajs/react';

interface ResumeEntry {
    id: number;
    name: string;
    template: string;
    share_url: string | null;
}

interface Owner {
    name: string;
    headline: string | null;
    bio: string | null;
}

interface Props {
    owner: Owner;
    resumes: ResumeEntry[];
}

export default function PortfolioShow({ owner, resumes }: Props) {
    return (
        <PublicLayout>
            <Head title={`${owner.name}'s Portfolio`} />
            <div className="mx-auto max-w-2xl px-4 py-16">
                <h1 className="text-3xl font-bold text-gray-900">{owner.name}</h1>
                {owner.headline && <p className="mt-2 text-lg text-gray-600">{owner.headline}</p>}
                {owner.bio && <p className="mt-4 text-sm text-gray-500">{owner.bio}</p>}
                <div className="mt-8 space-y-3">
                    {resumes.map((resume) => (
                        <div key={resume.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4">
                            <div>
                                <p className="font-medium text-gray-900">{resume.name}</p>
                                <p className="mt-0.5 text-xs capitalize text-gray-400">{resume.template} template</p>
                            </div>
                            {resume.share_url && (
                                <a href={resume.share_url} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                                    View Resume
                                </a>
                            )}
                        </div>
                    ))}
                    {resumes.length === 0 && <p className="text-sm text-gray-400">No public resumes yet.</p>}
                </div>
            </div>
        </PublicLayout>
    );
}
