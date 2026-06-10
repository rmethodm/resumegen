import { useId } from 'react';
import TagInput from '@/Components/TagInput';
import type { SkillGroup } from '@/types';

interface Props {
    groups: SkillGroup[];
    onChange: (groups: SkillGroup[]) => void;
    onBlur?: () => void;
}

export default function SkillGroupEditor({ groups, onChange, onBlur }: Props) {
    const uid = useId();

    const updateCategory = (idx: number, category: string) => {
        onChange(groups.map((g, i) => (i === idx ? { ...g, category } : g)));
    };

    const updateItems = (idx: number, items: string[]) => {
        onChange(groups.map((g, i) => (i === idx ? { ...g, items } : g)));
    };

    const addGroup = () => onChange([...groups, { category: '', items: [] }]);

    const removeGroup = (idx: number) => onChange(groups.filter((_, i) => i !== idx));

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
