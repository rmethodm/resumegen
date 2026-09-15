import { router } from '@inertiajs/react';
import { useState } from 'react';

export default function ApplyWizardPreferenceForm({ prefersApplyWizard }: { prefersApplyWizard: boolean }) {
    const [checked, setChecked] = useState(prefersApplyWizard);

    function toggle(next: boolean) {
        setChecked(next);
        router.patch(route('apply-wizard.preference'), { prefers_apply_wizard: next }, { preserveScroll: true });
    }

    return (
        <section>
            <header>
                <h2 className="text-lg font-medium text-gray-900">Add job wizard</h2>
                <p className="mt-1 text-sm text-gray-600">
                    Walk through job, resume, and description one step at a time. Turn off to use the quick form.
                </p>
            </header>
            <label className="mt-4 flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => toggle(e.target.checked)}
                    className="rounded-sm border-gray-300 text-brand focus:ring-brand"
                />
                Use the step-by-step wizard when I click "Add job"
            </label>
        </section>
    );
}
