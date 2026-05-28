import PublicLayout from '@/Layouts/PublicLayout';
import { Head } from '@inertiajs/react';

export default function LinkExpired({ reason }: { reason: 'expired' | 'deactivated' }) {
    return (
        <PublicLayout>
            <Head title="Link unavailable" />
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center max-w-md px-6">
                    <div className="text-5xl mb-6">🔒</div>
                    <h1 className="text-2xl font-semibold text-gray-800 mb-3">
                        {reason === 'expired' ? 'This link has expired' : 'This link has been deactivated'}
                    </h1>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        {reason === 'expired'
                            ? 'The person who shared this resume set an expiry date and it has passed.'
                            : 'The person who shared this resume has turned off this link.'}
                    </p>
                    <p className="text-gray-400 text-xs mt-4">
                        If you believe this is an error, contact the person who sent you this link.
                    </p>
                </div>
            </div>
        </PublicLayout>
    );
}
