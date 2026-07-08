import PublicLayout from '@/Layouts/PublicLayout';
import { Head } from '@inertiajs/react';

type LinkExpiredReason = 'expired' | 'deactivated' | 'view_limit';

const COPY: Record<LinkExpiredReason, { title: string; body: string }> = {
    expired: {
        title: 'This link has expired',
        body: 'The person who shared this resume set an expiry date and it has passed.',
    },
    deactivated: {
        title: 'This link has been deactivated',
        body: 'The person who shared this resume has turned off this link.',
    },
    view_limit: {
        title: 'This link has reached its view limit',
        body: 'This shared resume has already been viewed the maximum number of times allowed.',
    },
};

export default function LinkExpired({ reason }: { reason: LinkExpiredReason }) {
    const { title, body } = COPY[reason];

    return (
        <PublicLayout>
            <Head title="Link unavailable" />
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center max-w-md px-6">
                    <div className="text-5xl mb-6">🔒</div>
                    <h1 className="text-2xl font-semibold text-gray-800 mb-3">{title}</h1>
                    <p className="text-gray-500 text-sm leading-relaxed">{body}</p>
                    <p className="text-gray-400 text-xs mt-4">
                        If you believe this is an error, contact the person who sent you this link.
                    </p>
                </div>
            </div>
        </PublicLayout>
    );
}
