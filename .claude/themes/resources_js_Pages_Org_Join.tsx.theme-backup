import { router, usePage } from '@inertiajs/react';

type Props = {
    orgName: string;
    recruiterName: string;
    token: string;
};

export default function Join({ orgName, recruiterName, token }: Props) {
    const { auth } = usePage().props;
    const isAuthenticated = !!auth.user;

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#f5f5fb]">
            <div className="w-full max-w-md rounded-2xl border border-[#e8e8f0] bg-white p-8 shadow-sm">
                <div className="mb-6 flex justify-center">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#7c3aed]" />
                </div>
                <h1 className="mb-2 text-center text-xl font-bold text-[#0f0f1a]">
                    You're invited to join {orgName}
                </h1>
                <p className="mb-8 text-center text-sm text-[#6b7280]">
                    <strong>{recruiterName}</strong> has invited you to their recruiting workspace on Resumegen. Accept to let them view your resumes and leave guidance notes.
                </p>

                {isAuthenticated ? (
                    <button
                        type="button"
                        onClick={() => router.post(route('org.join.store', token))}
                        className="w-full rounded-lg bg-[#4f46e5] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4338ca]"
                    >
                        Accept & Join {orgName}
                    </button>
                ) : (
                    <div className="space-y-3">
                        <a
                            href={route('login')}
                            className="block w-full rounded-lg bg-[#4f46e5] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#4338ca]"
                        >
                            Sign in to accept
                        </a>
                        <a
                            href={route('register')}
                            className="block w-full rounded-lg border border-[#e8e8f0] px-4 py-3 text-center text-sm font-semibold text-[#23232d] hover:bg-[#f5f5fb]"
                        >
                            Create an account
                        </a>
                        <p className="text-center text-xs text-[#a0a0b0]">
                            After signing in, return to this link to accept the invitation.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
