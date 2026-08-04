import { useId, useRef, useState } from 'react';
import TagInput from '@/Components/TagInput';
import type { SkillGroup } from '@/types';

interface Props {
    groups: SkillGroup[];
    onChange: (groups: SkillGroup[]) => void;
    onBlur?: () => void;
}

/** A category typed via "+ Add category" that has no skills yet, so it has
 * nothing to persist to `resume.skills` — see `promoteDraft`. */
interface Draft {
    id: number;
    category: string;
}

export default function SkillGroupEditor({ groups, onChange, onBlur }: Props) {
    const uid = useId();
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const nextDraftId = useRef(0);

    const updateCategory = (idx: number, category: string) => {
        onChange(groups.map((g, i) => (i === idx ? { ...g, category } : g)));
    };

    const updateItems = (idx: number, items: string[]) => {
        onChange(groups.map((g, i) => (i === idx ? { ...g, items } : g)));
    };

    const removeGroup = (idx: number) => onChange(groups.filter((_, i) => i !== idx));

    const addGroup = () => setDrafts((d) => [...d, { id: nextDraftId.current++, category: '' }]);

    const updateDraftCategory = (id: number, category: string) =>
        setDrafts((d) => d.map((g) => (g.id === id ? { ...g, category } : g)));

    const removeDraft = (id: number) => setDrafts((d) => d.filter((g) => g.id !== id));

    /** A draft only becomes a real, saved skill group once it has its first
     * item — an empty category has nothing to write to `resume.skills`. */
    const promoteDraft = (id: number, items: string[]) => {
        const draft = drafts.find((g) => g.id === id);

        if (!draft || items.length === 0) {
            return;
        }

        onChange([...groups, { category: draft.category, items }]);
        removeDraft(id);
    };

    return (
        <div className="flex flex-col gap-3">
            {groups.map((group, idx) => (
                <div key={`${uid}-${idx}`} className="rounded-md border border-gray-200 bg-gray-50 p-3">
                    <div className="mb-2 flex items-center gap-2">
                        <input
                            type="text"
                            value={group.category}
                            onChange={(e) => updateCategory(idx, e.target.value)}
                            onBlur={onBlur}
                            placeholder="Category (e.g. Frontend)"
                            className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                            type="button"
                            onClick={() => removeGroup(idx)}
                            className="text-gray-400 hover:text-red-500 text-xs leading-none"
                        >
                            ✕
                        </button>
                    </div>
                    <TagInput
                        tags={group.items}
                        onChange={(items) => updateItems(idx, items)}
                        onBlur={onBlur}
                        placeholder="Add skill…"
                        autocompleteEndpoint="job-skills"
                    />
                </div>
            ))}
            {drafts.map((draft) => (
                <div key={`${uid}-draft-${draft.id}`} className="rounded-md border border-gray-200 bg-gray-50 p-3">
                    <div className="mb-2 flex items-center gap-2">
                        <input
                            type="text"
                            value={draft.category}
                            onChange={(e) => updateDraftCategory(draft.id, e.target.value)}
                            placeholder="Category (e.g. Frontend)"
                            className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                            type="button"
                            onClick={() => removeDraft(draft.id)}
                            className="text-gray-400 hover:text-red-500 text-xs leading-none"
                        >
                            ✕
                        </button>
                    </div>
                    <TagInput
                        tags={[]}
                        onChange={(items) => promoteDraft(draft.id, items)}
                        placeholder="Add skill…"
                        autocompleteEndpoint="job-skills"
                    />
                </div>
            ))}
            <button
                type="button"
                onClick={addGroup}
                className="rounded-md border border-dashed border-indigo-300 py-1.5 text-xs text-indigo-600 hover:border-indigo-500 hover:bg-indigo-50"
            >
                + Add category
            </button>
        </div>
    );
}
