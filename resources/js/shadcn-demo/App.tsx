import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
    ChevronDownIcon,
    CopyIcon,
    DownloadIcon,
    EyeIcon,
    GripVerticalIcon,
    LayoutDashboardIcon,
    NotebookPenIcon,
    RedoIcon,
    RefreshCwIcon,
    RotateCcwIcon,
    Share2Icon,
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
import { Slider } from '@/shadcn-demo/components/ui/slider';
import { Switch } from '@/shadcn-demo/components/ui/switch';
import { Skeleton } from '@/shadcn-demo/components/ui/skeleton';
import { Toaster } from '@/shadcn-demo/components/ui/sonner';
import { ToggleGroup, ToggleGroupItem } from '@/shadcn-demo/components/ui/toggle-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shadcn-demo/components/ui/tabs';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/shadcn-demo/components/ui/breadcrumb';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shadcn-demo/components/ui/tooltip';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/shadcn-demo/components/ui/hover-card';
import { Popover, PopoverContent, PopoverTrigger } from '@/shadcn-demo/components/ui/popover';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/shadcn-demo/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/shadcn-demo/components/ui/alert-dialog';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
    CommandInput,
    CommandSeparator,
} from '@/shadcn-demo/components/ui/command';
import { Alert, AlertDescription, AlertTitle } from '@/shadcn-demo/components/ui/alert';
import { cn } from '@/shadcn-demo/lib/utils';
import {
    OPTIONAL_SECTIONS,
    SAMPLE_RESUME,
    SECTION_LABELS,
    type ResumeDraft,
    type SectionKey,
} from '@/shadcn-demo/types';

export default function App() {
    const [history, setHistory] = useState<ResumeDraft[]>([SAMPLE_RESUME]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const draft = history[historyIndex];

    const [tab, setTab] = useState<'Edit' | 'Optimize'>('Edit');
    const [collapsed, setCollapsed] = useState<SectionKey[]>([]);
    const [dragging, setDragging] = useState<SectionKey | null>(null);
    const [sideOpen, setSideOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [commandOpen, setCommandOpen] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [autoSave, setAutoSave] = useState(true);
    const [pageSize, setPageSize] = useState<'letter' | 'a4'>('letter');
    const [previewLoading, setPreviewLoading] = useState(true);

    useEffect(() => {
        const timer = window.setTimeout(() => setPreviewLoading(false), 600);
        return () => window.clearTimeout(timer);
    }, []);

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setCommandOpen((open) => !open);
            }
        }
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

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

    function resetToSample() {
        setHistory([SAMPLE_RESUME]);
        setHistoryIndex(0);
        toast.success('Reset to sample data');
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

    function download(format: 'PDF' | 'DOCX') {
        setExportOpen(false);
        toast.success(`${format} downloaded`, { description: 'Demo only — no file was generated.' });
    }

    function runCommand(action: () => void) {
        setCommandOpen(false);
        action();
    }

    const hiddenOptionalSections = OPTIONAL_SECTIONS.filter(
        (s) => !draft.section_order.includes(s),
    );

    return (
        <div className="min-h-dvh bg-background">
            <Toaster position="bottom-center" />
            <Navbar onOpenCommand={() => setCommandOpen(true)} />

            <CommandDialog open={commandOpen} onOpenChange={setCommandOpen} title="Quick actions">
                <CommandInput placeholder="Type a command…" />
                <CommandList>
                    <CommandEmpty>No results.</CommandEmpty>
                    <CommandGroup heading="Navigate">
                        <CommandItem onSelect={() => runCommand(() => setTab('Edit'))}>
                            Go to Edit tab
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => setTab('Optimize'))}>
                            Go to Optimize tab
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => setSideOpen(true))}>
                            Open notes & checkpoints
                        </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Actions">
                        <CommandItem disabled={historyIndex === 0} onSelect={() => runCommand(undo)}>
                            Undo
                        </CommandItem>
                        <CommandItem
                            disabled={historyIndex === history.length - 1}
                            onSelect={() => runCommand(redo)}
                        >
                            Redo
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => setExportOpen(true))}>
                            Download resume
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>

            <main className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-6">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/">
                                <span className="flex items-center gap-1">
                                    <LayoutDashboardIcon className="size-3.5" />
                                    Dashboard
                                </span>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/">Resumes</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{draft.full_name}'s resume</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

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

                        <HoverCard>
                            <HoverCardTrigger asChild>
                                <Badge variant={autoSave ? 'success' : 'secondary'}>
                                    {autoSave ? 'Saved' : 'Autosave off'}
                                </Badge>
                            </HoverCardTrigger>
                            <HoverCardContent className="text-sm">
                                {autoSave
                                    ? 'Last saved just now. In the real Workstation this debounces every field change.'
                                    : 'Autosave is paused for this demo toggle — nothing persists either way.'}
                            </HoverCardContent>
                        </HoverCard>

                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Switch checked={autoSave} onCheckedChange={setAutoSave} id="autosave" />
                            <label htmlFor="autosave">Autosave</label>
                        </div>

                        <div className="ml-auto flex flex-wrap items-center gap-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={undo}
                                        disabled={historyIndex === 0}
                                    >
                                        <UndoIcon />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Undo</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={redo}
                                        disabled={historyIndex === history.length - 1}
                                    >
                                        <RedoIcon />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Redo</TooltipContent>
                            </Tooltip>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline">
                                        <Share2Icon />
                                        Share
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="flex flex-col gap-2">
                                    <p className="text-sm font-medium">Public share link</p>
                                    <div className="flex items-center gap-2">
                                        <Input readOnly value="resumegen.app/r/demo-a1b2c3" className="text-xs" />
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={() => {
                                                navigator.clipboard?.writeText('resumegen.app/r/demo-a1b2c3');
                                                toast.success('Link copied');
                                            }}
                                        >
                                            <CopyIcon />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Demo link — copying it won't lead anywhere.
                                    </p>
                                </PopoverContent>
                            </Popover>

                            <Button variant="outline" onClick={() => setSideOpen(true)}>
                                <NotebookPenIcon />
                                Notes & checkpoints
                            </Button>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="icon">
                                        <RotateCcwIcon />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Reset to sample data?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This discards every edit you've made in this demo session and
                                            restores the original Jordan Rivera sample resume.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={resetToSample}>Reset</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

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
                                        <Button variant="outline" onClick={() => download('PDF')}>
                                            PDF
                                        </Button>
                                        <Button onClick={() => download('DOCX')}>DOCX</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 border-b bg-muted/40 px-3 py-2">
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

                        <FormatField label="Page size">
                            <ToggleGroup
                                type="single"
                                variant="outline"
                                size="sm"
                                value={pageSize}
                                onValueChange={(v) => v && setPageSize(v as 'letter' | 'a4')}
                            >
                                <ToggleGroupItem value="letter">Letter</ToggleGroupItem>
                                <ToggleGroupItem value="a4">A4</ToggleGroupItem>
                            </ToggleGroup>
                        </FormatField>

                        <FormatField label={`Zoom — ${Math.round(zoom * 100)}%`} className="ml-auto w-40">
                            <Slider
                                min={0.5}
                                max={1.5}
                                step={0.05}
                                value={[zoom]}
                                onValueChange={([v]) => setZoom(v)}
                            />
                        </FormatField>
                    </div>

                    <div className="p-3">
                        <Input
                            placeholder="Target role or job description…"
                            className="bg-background"
                        />
                    </div>
                </Card>

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
                                {previewLoading ? (
                                    <PreviewSkeleton />
                                ) : (
                                    <ResumePreview draft={draft} zoom={zoom} />
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="Optimize">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <OptimizePanel draft={draft} />
                            <div className="lg:sticky lg:top-20 lg:self-start">
                                {previewLoading ? (
                                    <PreviewSkeleton />
                                ) : (
                                    <ResumePreview draft={draft} zoom={zoom} />
                                )}
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

function PreviewSkeleton() {
    return (
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <RefreshCwIcon className="size-3.5 animate-spin" />
                Rendering preview…
            </div>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-4 h-4 w-1/4" />
            <Skeleton className="h-24 w-full" />
        </div>
    );
}
