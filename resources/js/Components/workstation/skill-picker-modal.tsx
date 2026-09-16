import {
    Tab,
    TabGroup,
    TabList,
    TabPanel,
    TabPanels,
} from '@headlessui/react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { cn } from '@/lib/utils';
import type { ResumeSkill, SkillLibraryGroup } from '@/types';

function skillKey(category: string, name: string): string {
    return `${category}|${name}`;
}

/**
 * Categorized picker over the seeded LibrarySkill catalogue (Indeed's
 * 120-skill guide) — search, browse by soft/hard subcategory, toggle chips.
 * Design doc turn 4, option 4a.
 */
export function SkillPickerModal({
    open,
    onOpenChange,
    library,
    skills,
    onAdd,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    library: SkillLibraryGroup[];
    skills: ResumeSkill[];
    onAdd: (skills: ResumeSkill[]) => void;
}) {
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<string | null>(null);
    const [pending, setPending] = useState<Set<string>>(new Set());

    const already = useMemo(
        () => new Set(skills.map((skill) => skillKey(skill.category, skill.name))),
        [skills],
    );

    function reset() {
        setQuery('');
        setCategory(null);
        setPending(new Set());
    }

    function close() {
        reset();
        onOpenChange(false);
    }

    function toggle(cat: string, name: string) {
        const key = skillKey(cat, name);

        if (already.has(key)) {
            return;
        }

        setPending((current) => {
            const next = new Set(current);

            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }

            return next;
        });
    }

    function confirm() {
        const chosen: ResumeSkill[] = [];

        for (const group of library) {
            for (const name of group.skills) {
                if (pending.has(skillKey(group.category, name))) {
                    chosen.push({ category: group.category, name });
                }
            }
        }

        onAdd(chosen);
        close();
    }

    function groupsForKind(kind: 'soft' | 'hard'): SkillLibraryGroup[] {
        return library.filter((group) => group.kind === kind);
    }

    function renderTab(kind: 'soft' | 'hard') {
        const groups = groupsForKind(kind);
        const activeCategory = groups.find((g) => g.category === category) ?? groups[0];

        const visibleGroups = query.trim() === ''
            ? (activeCategory ? [activeCategory] : [])
            : groups
                  .map((group) => ({
                      ...group,
                      skills: group.skills.filter((name) =>
                          name.toLowerCase().includes(query.trim().toLowerCase()),
                      ),
                  }))
                  .filter((group) => group.skills.length > 0);

        return (
            <div className="flex flex-1 min-h-0">
                {query.trim() === '' && (
                    <div className="flex w-44 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-border p-2.5">
                        {groups.map((group) => (
                            <button
                                key={group.category}
                                type="button"
                                onClick={() => setCategory(group.category)}
                                className={cn(
                                    'rounded-lg px-2.5 py-2 text-left text-xs font-semibold',
                                    (activeCategory?.category ?? '') === group.category
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-muted-foreground hover:bg-muted',
                                )}
                            >
                                {group.category}
                            </button>
                        ))}
                    </div>
                )}
                <div className="flex-1 overflow-y-auto p-4">
                    {visibleGroups.map((group) => (
                        <div key={group.category} className="mb-5 last:mb-0">
                            <p className="mb-2 text-xs font-bold tracking-wide text-muted-foreground/70 uppercase">
                                {group.category} skills
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {group.skills.map((name) => {
                                    const key = skillKey(group.category, name);
                                    const added = already.has(key);
                                    const selected = pending.has(key);

                                    return (
                                        <button
                                            key={name}
                                            type="button"
                                            disabled={added}
                                            onClick={() => toggle(group.category, name)}
                                            className={cn(
                                                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold',
                                                added
                                                    ? 'cursor-not-allowed border border-border bg-muted text-muted-foreground/70'
                                                    : selected
                                                      ? 'bg-primary text-white'
                                                      : 'border border-border text-foreground hover:border-primary/40',
                                            )}
                                        >
                                            {added ? '✓' : selected ? '✓' : '+'} {name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    {visibleGroups.length === 0 && (
                        <p className="text-sm text-muted-foreground">No skills match "{query}".</p>
                    )}
                </div>
            </div>
        );
    }

    const totalSkills = library.reduce((sum, group) => sum + group.skills.length, 0);

    return (
        <Dialog open={open} onOpenChange={(next) => !next && close()}>
            <DialogContent className="flex max-h-[85dvh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
                <DialogHeader className="gap-1 border-b px-5 py-4 text-left">
                    <DialogTitle className="text-sm font-bold">Add skills</DialogTitle>
                    <DialogDescription className="text-xs">
                        {totalSkills} skills from Indeed's resume guide, organized by category
                    </DialogDescription>
                </DialogHeader>
                <div className="flex h-[560px] min-h-0 flex-1 flex-col">
                <div className="px-6 pt-3.5">
                    <div className="relative">
                        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search skills…"
                            className="pl-9"
                        />
                    </div>
                </div>

                <TabGroup className="flex min-h-0 flex-1 flex-col">
                    <TabList className="flex gap-4 border-b border-border px-6 pt-3.5">
                        <Tab className="border-b-2 border-transparent pb-2.5 text-xs font-bold text-muted-foreground outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 data-selected:border-primary data-selected:text-primary">
                            Soft skills
                        </Tab>
                        <Tab className="border-b-2 border-transparent pb-2.5 text-xs font-bold text-muted-foreground outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 data-selected:border-primary data-selected:text-primary">
                            Hard skills
                        </Tab>
                    </TabList>
                    <TabPanels className="flex min-h-0 flex-1">
                        <TabPanel className="flex min-h-0 flex-1">{renderTab('soft')}</TabPanel>
                        <TabPanel className="flex min-h-0 flex-1">{renderTab('hard')}</TabPanel>
                    </TabPanels>
                </TabGroup>
                </div>
                <DialogFooter className="flex-row items-center justify-between border-t px-5 py-3">
                    <span className="text-xs font-medium text-muted-foreground">
                        {pending.size} skill{pending.size === 1 ? '' : 's'} added
                    </span>
                    <div className="flex gap-2.5">
                        <Button variant="secondary" onClick={close}>
                            Cancel
                        </Button>
                        <Button disabled={pending.size === 0} onClick={confirm}>
                            Add to resume
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
