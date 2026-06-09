import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';

interface Stats {
    users: number;
    organizations: number;
    unread_messages: number;
    referral_conversions: number;
    job_titles_count: number;
    ai_rates_count: number;
    published_articles: number;
}

const safeRoute = (name: string, fallback: string): string => {
    try {
        return route(name);
    } catch {
        return fallback;
    }
};

export default function AdminDashboard({ stats }: { stats: Stats }) {
    const cards = [
        { label: 'Users',               count: stats.users,                href: safeRoute('admin.users.index', '/admin/users'),             description: 'Registered accounts' },
        { label: 'Organizations',        count: stats.organizations,         href: safeRoute('admin.organizations.index', '/admin/orgs'),      description: 'Agency workspaces' },
        { label: 'Unread Messages',      count: stats.unread_messages,       href: safeRoute('admin.messages.index', '/admin/messages'),       description: 'Portfolio contact forms' },
        { label: 'Referral Conversions', count: stats.referral_conversions,  href: safeRoute('admin.referrals.index', '/admin/referrals'),     description: 'Upgrade events' },
        { label: 'Job Titles',           count: stats.job_titles_count,      href: safeRoute('admin.job-titles.index', '/admin/job-titles'),   description: 'Roles + title entries' },
        { label: 'AI Rates',             count: stats.ai_rates_count,        href: safeRoute('admin.ai-rates.index', '/admin/ai-rates'),       description: 'Model pricing rows' },
        { label: 'Published Articles',   count: stats.published_articles,    href: safeRoute('admin.career.index', '/admin/career'),           description: 'Career hub articles' },
    ];

    return (
        <AdminLayout>
            <Head title="Admin" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Admin</h1>
                    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {cards.map(card => (
                            <Link
                                key={card.label}
                                href={card.href}
                                className="rounded-xl border border-[#eeeef5] bg-white p-5 shadow-[0_1px_3px_rgba(79,70,229,0.05)] transition hover:border-[#4f46e5]/20 hover:shadow-md"
                            >
                                <p className="text-2xl font-extrabold text-[#4f46e5]">{card.count.toLocaleString()}</p>
                                <p className="mt-1 text-sm font-semibold text-[#0f0f1a]">{card.label}</p>
                                <p className="mt-0.5 text-xs text-[#a0a0b0]">{card.description}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
