import type { SkillNarrative } from '@/types';

interface Props {
    narratives: SkillNarrative[];
    onChange: (narratives: SkillNarrative[]) => void;
    onBlur?: () => void;
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const emptyNarrative = (): SkillNarrative => ({
    id: uid(),
    name: '',
    bullets: [''],
});

export default function SkillNarrativeEditor({ narratives, onChange, onBlur }: Props) {
    const updateName = (idx: number, name: string) =>
        onChange(narratives.map((n, i) => (i === idx ? { ...n, name } : n)));

    const updateBullets = (idx: number, raw: string) =>
        onChange(narratives.map((n, i) => (i === idx ? { ...n, bullets: raw.split('\n') } : n)));

    const remove = (idx: number) => onChange(narratives.filter((_, i) => i !== idx));

    const add = () => onChange([...narratives, emptyNarrative()]);

    return (
        <div className="flex flex-col gap-3">
            {narratives.map((n, idx) => (
                <div key={n.id} className="rounded-md border border-gray-200 bg-gray-50 p-3">
                    <div className="mb-2 flex items-center gap-2">
                        <input
                            type="text"
                            value={n.name}
                            onChange={(e) => updateName(idx, e.target.value)}
                            onBlur={onBlur}
                            placeholder="Skill name (e.g. Proactive Communication)"
                            className="flex-1 rounded-sm border border-gray-300 bg-white px-2 py-1 text-xs font-semibold focus:border-brand focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand/25"
                        />
                        <button
                            type="button"
                            onClick={() => remove(idx)}
                            className="-m-2 shrink-0 p-2.5 text-xs leading-none text-ink-faint hover:text-danger"
                        >
                            ✕
                        </button>
                    </div>
                    <textarea
                        value={n.bullets.join('\n')}
                        onChange={(e) => updateBullets(idx, e.target.value)}
                        onBlur={onBlur}
                        rows={3}
                        placeholder={'One bullet per line\nDemonstrated ability to…\nProficient in…'}
                        className="w-full rounded-sm border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-brand focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand/25 resize-none"
                    />
                    <p className="mt-0.5 text-[10px] text-ink-faint">One bullet point per line</p>
                </div>
            ))}
            <button
                type="button"
                onClick={add}
                className="rounded-md border border-dashed border-brand py-1.5 text-xs text-brand hover:border-brand hover:bg-brand-subtle"
            >
                + Add skill
            </button>
        </div>
    );
}
