import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

type BillingProps = PageProps<{
    plan: 'free' | 'pro';
    resumeCount: number;
    resumeLimit: number | null;
    limitReached: boolean;
}>;

export default function BillingIndex() {
    const { plan, resumeCount, resumeLimit, limitReached } = usePage<BillingProps>().props;

    return (
        <AuthenticatedLayout>
            <Head title="Billing" />

            <div className="py-12">
                <div className="max-w-3xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    <div className="bg-white shadow sm:rounded-lg p-6">
                        <h1 className="text-xl font-semibold text-gray-900 mb-4">Billing &amp; Plan</h1>

                        {limitReached && (
                            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm">
                                You've reached the free plan limit of {resumeLimit} resumes. Upgrade to Pro for unlimited resumes.
                            </div>
                        )}

                        <div className="mb-6">
                            <p className="text-sm text-gray-600">Current plan</p>
                            <p className="text-lg font-medium text-gray-900 capitalize">{plan}</p>
                        </div>

                        <div className="mb-6">
                            <p className="text-sm text-gray-600">Resumes</p>
                            <p className="text-gray-900">
                                {resumeCount}{resumeLimit !== null ? ` / ${resumeLimit}` : ''}
                            </p>
                        </div>

                        {plan === 'free' && (
                            <div className="mt-6 space-y-3">
                                <h2 className="font-medium text-gray-900">Upgrade to Pro</h2>
                                <div className="flex gap-3">
                                    <form method="POST" action={route('billing.checkout')}>
                                        <input type="hidden" name="_token" value="" />
                                        <input type="hidden" name="interval" value="monthly" />
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
                                        >
                                            Monthly
                                        </button>
                                    </form>
                                    <form method="POST" action={route('billing.checkout')}>
                                        <input type="hidden" name="_token" value="" />
                                        <input type="hidden" name="interval" value="yearly" />
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
                                        >
                                            Yearly
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {plan === 'pro' && (
                            <div className="mt-6">
                                <a
                                    href={route('billing.portal')}
                                    className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 text-sm"
                                >
                                    Manage Subscription
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
