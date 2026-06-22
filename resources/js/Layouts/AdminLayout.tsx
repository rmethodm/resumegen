import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Link } from '@inertiajs/react';
import { type ReactNode } from 'react';

const safeRoute = (name: string, fallback: string): string => {
    try {
        return route(name);
    } catch {
        return fallback;
    }
};

const NAV = [
    { label: 'Dashboard', href: safeRoute('admin.dashboard', '/admin'),               pattern: 'admin.dashboard' },
    { label: 'Users',     href: safeRoute('admin.users.index', '/admin/users'),        pattern: 'admin.users.*' },
    { label: 'Orgs',      href: safeRoute('admin.organizations.index', '/admin/orgs'), pattern: 'admin.organizations.*' },
    { label: 'Messages',  href: safeRoute('admin.messages.index', '/admin/messages'),  pattern: 'admin.messages.*' },
    { label: 'Job Titles',href: safeRoute('admin.job-titles.index', '/admin/job-titles'), pattern: 'admin.job-titles.*' },
    { label: 'AI Usage',  href: safeRoute('admin.ai.overview', '/admin/ai'),           pattern: 'admin.ai.*' },
    { label: 'Revenue',   href: safeRoute('admin.revenue.index', '/admin/revenue'),     pattern: 'admin.revenue.*' },
    { label: 'Growth',    href: safeRoute('admin.growth.index', '/admin/growth'),       pattern: 'admin.growth.*' },
    { label: 'Content',   href: safeRoute('admin.content.index', '/admin/content'),     pattern: 'admin.content.*' },
    { label: 'Audit Log', href: safeRoute('admin.audit.index', '/admin/audit'),        pattern: 'admin.audit.*' },
    { label: 'Ops',       href: safeRoute('admin.ops.index', '/admin/ops'),            pattern: 'admin.ops.*' },
    { label: 'Career',    href: safeRoute('admin.career.index', '/admin/career'),      pattern: 'admin.career.*' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <AuthenticatedLayout>
            <div className="border-b border-[#eeeef5] bg-white">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <nav className="flex gap-1 overflow-x-auto py-2">
                        {NAV.map(item => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                                    route().current(item.pattern)
                                        ? 'bg-[#4f46e5] text-white'
                                        : 'text-[#71717a] hover:bg-[#f5f5fb] hover:text-[#0f0f1a]'
                                }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>
            <main>{children}</main>
        </AuthenticatedLayout>
    );
}
