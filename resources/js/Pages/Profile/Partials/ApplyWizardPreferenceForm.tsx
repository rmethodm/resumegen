import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Checkbox } from '@/Components/ui/checkbox';
import { Label } from '@/Components/ui/label';

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
            <Label className="mt-4 font-normal">
                <Checkbox
                    checked={checked}
                    onCheckedChange={(next) => toggle(next === true)}
                />
                Use the step-by-step wizard when I click "Add job"
            </Label>
        </section>
    );
}
