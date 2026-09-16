import { useState, type ReactNode } from 'react';
import {
    ChevronDownIcon,
    DownloadIcon,
    EyeIcon,
    GripVerticalIcon,
    NotebookPenIcon,
    RedoIcon,
    UndoIcon,
} from 'lucide-react';
import { Navbar } from '@/shadcn-demo/components/navbar';
import { SectionFields } from '@/shadcn-demo/components/section-fields';
import { ResumePreview } from '@/shadcn-demo/components/resume-preview';
import { OptimizePanel } from '@/shadcn-demo/components/optimize-panel';
import { SidePanel } from '@/shadcn-demo/components/side-panel';
import { Button } from '@/shadcn-demo/components/ui/button';
import { Badge } from '@/shadcn-demo/components/ui/badge';
import { Card } from '@/shadcn-demo/components/ui/card';
import { Input } from '@/shadcn-demo/components/ui/input';
import { Select } from '@/shadcn-demo/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shadcn-demo/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/shadcn-demo/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/shadcn-demo/components/ui/alert';
import { cn } from '@/shadcn-demo/lib/utils';
import {
    OPTIONAL_SECTIONS,
    SAMPLE_RESUME,
    SECTION_LABELS,
    type ResumeDraft,
    type SectionKey,
} from '@/shadcn-demo/types';

const ALL_SECTIONS: SectionKey[] = [
    'contact',
    'summary',
    'experience',
    'education',
    'skills',
    'projects',
    'certificates',
];

export default function App() {
    const [history, setHistory] = useState<ResumeDraft[]>([SAMPLE_RESUME]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const draft = history[historyIndex];

    const [tab, setTab] = useState<'Edit' | 'Optimize'>('Edit');
    const [collapsed, setCollapsed] = useState<SectionKey[]>([]);
    const [dragging, setDragging] = useState<SectionKey | null>(null);
    const [sideOpen, setSideOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [exportedToast, setExportedToast] = useState(false);
    const [zoom, setZoom] = useState(1);

    function commit(next: ResumeDraft) {
        const trimmed = history.slice(0, historyIndex + 1);
        setHistory([...trimmed, next]);
        setHistoryIndex(trimmed.length);
    }

    function undo() {
        setHistoryIndex((i) => Math.max(0, i - 1));
    }

    function redo() {
        setHistoryIndex((i) => Math.min(history.length - 1, i + 1));
    }

    function toggleCollapsed(section: SectionKey) {
        setCollapsed((current) =>
            current.includes(section)
                ? current.filter((s) => s !== section)
                : [...current, section],
        );
    }

    function hideSection(section: SectionKey) {
        commit({
            ...draft,
            section_order: draft.section_order.filter((s) => s !== section),
        });
    }

    function showSection(section: SectionKey) {
        commit({ ...draft, section_order: [...draft.section_order, section] });
    }

    function moveSection(from: SectionKey, to: SectionKey) {
        if (from === to) return;
        const order = [...draft.section_order];
        order.splice(order.indexOf(from), 1);
        order.splice(order.indexOf(to), 0, from);
        commit({ ...draft, section_order: order });
    }

    const hiddenOptionalSections = OPTIONAL_SECTIONS.filter(
        (s) => !draft.section_order.includes(s),
    );

    return (
        <div className="min-h-dvh bg-background">
            <Navbar />

            <main className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-6">
                <Alert>
                    <EyeIcon />
                    <AlertTitle>This is a static demo</AlertTitle>
                    <AlertDescription>
                        Nothing here saves to the database — it's a shadcn/ui recreation of the
                        Workstation for visual review only.
                    </AlertDescription>
                </Alert>

                <Card className="gap-0 overflow-hidden py-0">
                    <div className="flex flex-wrap items-center gap-3 border-b p-3">
                        <span className="text-base font-bold">{draft.full_name}'s resume</span>
                        <Badge variant="success">Saved</Badge>

                        <div className="ml-auto flex flex-wrap items-center gap-2">
                            <Button variant="outline" size="icon" onClick={undo} disabled={historyIndex === 0}>
                                <UndoIcon />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={redo}
                                disabled={historyIndex === history.length - 1}
                            >
                                <RedoIcon />
                            </Button>

                            <Button variant="outline" onClick={() => setSideOpen(true)}>
                                <NotebookPenIcon />
                                Notes & checkpoints
                            </Button>

                            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <DownloadIcon />
                                        Download
                                        <ChevronDownIcon className="opacity-70" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Download resume</DialogTitle>
                                        <DialogDescription>
                                            Demo only — no file is actually generated.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setExportOpen(false);
                                                setExportedToast(true);
                                                window.setTimeout(() => setExportedToast(false), 2000);
                                            }}
                                        >
                                            PDF
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                setExportOpen(false);
                                                setExportedToast(true);
                                                window.setTimeout(() => setExportedToast(false), 2000);
                                            }}
                                        >
                                            DOCX
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 border-b bg-muted/40 px-3 py-2">
                        <FormatField label="Template">
                            <Select
                                value={draft.template}
                                onChange={(e) =>
                                    commit({ ...draft, template: e.target.value as ResumeDraft['template'] })
                                }
                            >
                                <option value="ats-plain">ATS Plain</option>
                                <option value="classic">Classic Serif</option>
                                <option value="modern">Modern Sans</option>
                                <option value="minimalist">Minimalist</option>
                            </Select>
                        </FormatField>

                        <FormatField label="Density">
                            <Select
                                value={draft.density}
                                onChange={(e) =>
                                    commit({ ...draft, density: e.target.value as ResumeDraft['density'] })
                                }
                            >
                                <option value="compact">Compact</option>
                                <option value="balanced">Balanced</option>
                                <option value="spacious">Spacious</option>
                            </Select>
                        </FormatField>

                        <FormatField label="Font">
                            <Select
                                value={draft.font}
                                onChange={(e) =>
                                    commit({ ...draft, font: e.target.value as ResumeDraft['font'] })
                                }
                            >
                                <option value="inter">Inter</option>
                                <option value="arial">Arial</option>
                                <option value="georgia">Georgia</option>
                            </Select>
                        </FormatField>

                        <FormatField label="Zoom" className="ml-auto w-32">
                            <Select
                                value={String(zoom)}
                                onChange={(e) => setZoom(Number(e.target.value))}
                            >
                                <option value="0.75">75%</option>
                                <option value="1">100%</option>
                                <option value="1.25">125%</option>
                            </Select>
                        </FormatField>
                    </div>

                    <div className="p-3">
                        <Input
                            placeholder="Target role or job description…"
                            className="bg-background"
                        />
                    </div>
                </Card>

                {exportedToast && (
                    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md border bg-foreground px-4 py-2 text-sm text-background shadow-lg">
                        Demo export — nothing was downloaded.
                    </div>
                )}

                <Tabs value={tab} onValueChange={(v) => setTab(v as 'Edit' | 'Optimize')}>
                    <TabsList>
                        <TabsTrigger value="Edit">Edit</TabsTrigger>
                        <TabsTrigger value="Optimize">Optimize</TabsTrigger>
                    </TabsList>

                    <TabsContent value="Edit">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div className="flex flex-col gap-3">
                                {draft.section_order.map((section) => {
                                    const isCollapsed = collapsed.includes(section);

                                    return (
                                        <Card
                                            key={section}
                                            draggable
                                            onDragStart={() => setDragging(section)}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={() => {
                                                if (dragging) moveSection(dragging, section);
                                                setDragging(null);
                                            }}
                                            className={cn(
                                                'gap-0 overflow-hidden py-0',
                                                dragging === section && 'opacity-50',
                                            )}
                                        >
                                            <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
                                                <GripVerticalIcon className="size-4 shrink-0 cursor-grab text-muted-foreground" />
                                                <button
                                                    type="button"
                                                    onClick={() => toggleCollapsed(section)}
                                                    className="flex items-center gap-1.5 text-sm font-semibold"
                                                >
                                                    <ChevronDownIcon
                                                        className={cn(
                                                            'size-3.5 transition-transform',
                                                            isCollapsed && '-rotate-90',
                                                        )}
                                                    />
                                                    {SECTION_LABELS[section]}
                                                </button>

                                                {OPTIONAL_SECTIONS.includes(section) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="ml-auto text-muted-foreground"
                                                        onClick={() => hideSection(section)}
                                                    >
                                                        Hide
                                                    </Button>
                                                )}
                                            </div>

                                            {!isCollapsed && (
                                                <div className="p-4">
                                                    <SectionFields
                                                        section={section}
                                                        draft={draft}
                                                        onChange={commit}
                                                    />
                                                </div>
                                            )}
                                        </Card>
                                    );
                                })}

                                {hiddenOptionalSections.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {hiddenOptionalSections.map((section) => (
                                            <Button
                                                key={section}
                                                variant="outline"
                                                size="sm"
                                                onClick={() => showSection(section)}
                                            >
                                                + Add {SECTION_LABELS[section]}
                                            </Button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="lg:sticky lg:top-20 lg:self-start">
                                <ResumePreview draft={draft} zoom={zoom} />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="Optimize">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <OptimizePanel draft={draft} />
                            <div className="lg:sticky lg:top-20 lg:self-start">
                                <ResumePreview draft={draft} zoom={zoom} />
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>

            <SidePanel open={sideOpen} onOpenChange={setSideOpen} />
        </div>
    );
}

function FormatField({
    label,
    children,
    className,
}: {
    label: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex w-40 flex-col gap-1', className)}>
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            {children}
        </div>
    );
}
