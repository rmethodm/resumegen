import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useForm } from '@inertiajs/react';

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({ name: '' });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('org.store'));
    };

    return (
        <AuthenticatedLayout>
            <div className="mx-auto max-w-lg px-4 py-12">
                <h1 className="mb-2 text-2xl font-bold text-[#0f0f1a]">Create your workspace</h1>
                <p className="mb-8 text-sm text-[#6b7280]">Give your org a name — candidates will see this when they accept your invite.</p>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-[#23232d]">
                            Workspace name
                        </label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={e => setData('name', e.target.value)}
                            placeholder="Acme Recruiting"
                            maxLength={150}
                            className="w-full rounded-lg border border-[#e8e8f0] px-3 py-2 text-sm focus:border-[#4f46e5] focus:outline-none"
                        />
                        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full rounded-lg bg-[#4f46e5] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4338ca] disabled:opacity-50"
                    >
                        Create workspace
                    </button>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
