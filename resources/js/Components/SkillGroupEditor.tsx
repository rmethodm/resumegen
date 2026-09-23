import { useId, useRef, useState } from 'react';
import { XIcon } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
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
                <div key={`${uid}-${idx}`} className="rounded-md border border-border bg-muted p-3">
                    <div className="mb-2 flex items-center gap-2">
                        <Input
                            type="text"
                            value={group.category}
                            onChange={(e) => updateCategory(idx, e.target.value)}
                            onBlur={onBlur}
                            placeholder="Category (e.g. Frontend)"
                            maxLength={60}
                            className="h-auto flex-1 px-2 py-1 text-xs font-medium"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeGroup(idx)}
                            className="size-7 shrink-0 text-muted-foreground/70 hover:text-destructive"
                        >
                            <XIcon />
                        </Button>
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
                <div key={`${uid}-draft-${draft.id}`} className="rounded-md border border-border bg-muted p-3">
                    <div className="mb-2 flex items-center gap-2">
                        <Input
                            type="text"
                            value={draft.category}
                            onChange={(e) => updateDraftCategory(draft.id, e.target.value)}
                            placeholder="Category (e.g. Frontend)"
                            maxLength={60}
                            className="h-auto flex-1 px-2 py-1 text-xs font-medium"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDraft(draft.id)}
                            className="size-7 shrink-0 text-muted-foreground/70 hover:text-destructive"
                        >
                            <XIcon />
                        </Button>
                    </div>
                    <TagInput
                        tags={[]}
                        onChange={(items) => promoteDraft(draft.id, items)}
                        placeholder="Add skill…"
                        autocompleteEndpoint="job-skills"
                    />
                </div>
            ))}
            <Button
                type="button"
                variant="outline"
                onClick={addGroup}
                className="border-dashed border-primary py-1.5 text-xs text-primary hover:bg-primary/10 hover:text-primary"
            >
                + Add category
            </Button>
        </div>
    );
}
