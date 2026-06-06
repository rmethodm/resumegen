import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

export default function MessagesIndex() {
    return (
        <AuthenticatedLayout>
            <Head title="Messages" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                    <div className="mb-6">
                        <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Messages</h1>
                        <p className="mt-1 text-sm text-[#a0a0b0]">Questions submitted through your shared resume links</p>
                    </div>

                    <div className="flex flex-col items-center justify-center rounded-xl border border-[#eeeef5] bg-white py-20 shadow-[0_1px_3px_rgba(79,70,229,0.05)]">
                        <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-emerald-50 p-4">
                            <ChatBubbleLeftRightIcon className="h-8 w-8 text-emerald-500" />
                        </div>
                        <p className="text-sm font-semibold text-[#0f0f1a]">No messages yet</p>
                        <p className="mt-1 text-sm text-[#a0a0b0]">Share a resume link to start receiving questions.</p>
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
