import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

interface Message {
    id: number;
    role: string;
    content: string;
    created_at: string;
}

interface Props {
    messages: Message[];
    canUseCareerCoach: boolean;
    remaining: number;
}

// Placeholder — full chat UI implemented in a follow-up task.
export default function Index({ messages, canUseCareerCoach, remaining }: Props) {
    return (
        <AuthenticatedLayout>
            <Head title="Career Coach" />

            <div className="mx-auto max-w-3xl px-4 py-12">
                <h1 className="text-2xl font-semibold text-gray-900">Career Coach</h1>
                {!canUseCareerCoach && (
                    <p className="mt-4 text-sm text-gray-600">Upgrade to Pro to use Career Coach.</p>
                )}
                {canUseCareerCoach && (
                    <p className="mt-4 text-sm text-gray-600">{remaining} AI generations remaining this month.</p>
                )}
                <ul className="mt-6 space-y-3">
                    {messages.map((message) => (
                        <li key={message.id} className="text-sm text-gray-800">
                            <span className="font-medium">{message.role}:</span> {message.content}
                        </li>
                    ))}
                </ul>
            </div>
        </AuthenticatedLayout>
    );
}
