import { router } from '@inertiajs/react';
import React, { useState } from 'react';

interface Props {
    onClose: () => void;
    personaDefaults?: { target_role: string | null; industry: string | null; years_experience: number | null };
}

export default function GenerateResumeModal({ onClose, personaDefaults }: Props) {
    const [form, setForm] = useState({
        target_role: personaDefaults?.target_role ?? '',
        years_experience: personaDefaults?.years_experience ?? 0,
        industry: personaDefaults?.industry ?? '',
        key_skills: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const skills = form.key_skills
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .slice(0, 10);

        router.post(
            route('builder.generate'),
            { ...form, years_experience: Number(form.years_experience), key_skills: skills },
            {
                onSuccess: () => onClose(),
                onError: (errors) => {
                    setError(Object.values(errors)[0] as string ?? 'Something went wrong.');
                },
                onFinish: () => setLoading(false),
            },
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">✨ Generate Resume</h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Target Role *</label>
                        <input
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            value={form.target_role}
                            onChange={e => setForm(p => ({ ...p, target_role: e.target.value }))}
                            placeholder="e.g. Senior Software Engineer"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Years of Experience</label>
                        <input
                            type="number"
                            min={0}
                            max={40}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            value={form.years_experience}
                            onChange={e => setForm(p => ({ ...p, years_experience: Number(e.target.value) }))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Industry *</label>
                        <input
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            value={form.industry}
                            onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}
                            placeholder="e.g. Technology, Finance, Healthcare"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Key Skills *</label>
                        <input
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            value={form.key_skills}
                            onChange={e => setForm(p => ({ ...p, key_skills: e.target.value }))}
                            placeholder="PHP, React, MySQL (comma-separated, up to 10)"
                        />
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Cancel</button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading ? 'Generating…' : 'Generate'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
