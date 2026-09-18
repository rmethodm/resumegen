import React, { useState, useId } from "react";
import { createRoot } from "react-dom/client";
import "../../../css/app.css";
import {
    ArrowLeft,
    ArrowRight,
    BriefcaseBusiness,
    Check,
    ChevronRight,
    FileText,
    History,
    LayoutDashboard,
    MapPin,
    Plus,
    Sparkles,
    ExternalLink,
    Download,
    ShieldCheck,
} from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Badge } from "@/Components/ui/badge";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Textarea } from "@/Components/ui/textarea";
import { Select } from "@/Components/ui/select";
import { Separator } from "@/Components/ui/separator";
import { Switch } from "@/Components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/Components/ui/tabs";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/Components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/Components/ui/alert";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/Components/ui/dialog";
import {
    Sidebar,
    SidebarProvider,
    SidebarHeader,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarTrigger,
    useSidebar,
} from "@/Components/ui/sidebar";
import { Toaster } from "@/Components/ui/sonner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { findEvidence, type Draft } from "./round-two-data";
import {
    listings,
    bases,
    prepare,
    editDraft,
    applyReviewed,
    confirmSubmission,
    sampleSuggestions,
    stages,
    type Application,
    type Listing,
    type Stage,
} from "./application-flow-data";

type Page = "Jobs" | "Resumes" | "Applications" | "Workspace";
function Field({
    label,
    value,
    onChange,
    multiline = false,
    type = "text",
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    multiline?: boolean;
    type?: string;
}) {
    const id = useId();
    return (
        <div className="flex flex-col gap-2">
            <Label htmlFor={id}>{label}</Label>
            {multiline ? (
                <Textarea
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    rows={5}
                />
            ) : (
                <Input
                    id={id}
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            )}
        </div>
    );
}
function Paper({ draft }: { draft: Draft }) {
    return (
        <article
            aria-label="Resume preview"
            className="mx-auto flex w-full max-w-[680px] flex-col gap-6 border bg-background p-6 shadow-lg sm:p-10"
        >
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                    Jordan Rivera
                </h2>
                <p className="mt-1 text-sm">{draft.headline}</p>
                <p className="mt-2 break-words text-xs text-muted-foreground">
                    {draft.email} · Austin, TX · jordanrivera.design
                </p>
            </div>
            <Separator />
            <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest">
                    Profile
                </h3>
                <p className="whitespace-pre-wrap text-sm leading-6">
                    {draft.summary}
                </p>
            </section>
            <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest">
                    Experience
                </h3>
                <p className="text-sm font-medium">
                    Senior Product Designer · Northwind Labs
                </p>
                <p className="mb-3 text-xs text-muted-foreground">
                    2021–Present · Austin, TX
                </p>
                <ul className="flex list-disc flex-col gap-2 pl-4 text-sm leading-6">
                    {draft.experience
                        .split("\n")
                        .filter(Boolean)
                        .map((line, i) => (
                            <li key={i}>{line}</li>
                        ))}
                </ul>
            </section>
            <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest">
                    Skills
                </h3>
                <p className="text-sm leading-6">{draft.skills}</p>
            </section>
        </article>
    );
}
function Navigation({ page, go }: { page: Page; go: (page: Page) => void }) {
    const { setOpenMobile } = useSidebar();
    return (
        <Sidebar variant="sidebar" collapsible="offcanvas">
            <SidebarHeader className="p-5">
                <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <BriefcaseBusiness className="size-4" />
                    </div>
                    <span className="font-semibold tracking-tight">
                        resumegen
                    </span>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Your job search</SidebarGroupLabel>
                    <SidebarMenu>
                        {(
                            [
                                { name: "Jobs", icon: BriefcaseBusiness },
                                { name: "Resumes", icon: FileText },
                                { name: "Applications", icon: LayoutDashboard },
                            ] as const
                        ).map(({ name, icon: Icon }) => (
                            <SidebarMenuItem key={name}>
                                <SidebarMenuButton
                                    isActive={
                                        page === name ||
                                        (name === "Jobs" &&
                                            page === "Workspace")
                                    }
                                    onClick={() => {
                                        go(name);
                                        setOpenMobile(false);
                                    }}
                                >
                                    <Icon />
                                    <span>{name}</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="p-4">
                <Button variant="ghost" asChild>
                    <a href="./round-two.html">
                        <ArrowLeft data-icon="inline-start" />
                        Earlier concepts
                    </a>
                </Button>
                <Separator />
                <div className="flex items-center gap-3 py-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        JR
                    </div>
                    <div>
                        <p className="text-sm font-medium">Jordan Rivera</p>
                        <p className="text-xs text-muted-foreground">
                            Personal workspace
                        </p>
                    </div>
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
function App() {
    const [page, setPage] = useState<Page>("Jobs");
    const [jobs, setJobs] = useState(listings);
    const [baseResumes, setBaseResumes] = useState(bases);
    const [apps, setApps] = useState<Application[]>([]);
    const [selectedJob, setSelectedJob] = useState("harbor");
    const [activeId, setActiveId] = useState("");
    const [baseId, setBaseId] = useState(bases[0].id);
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState("all");
    const [credits, setCredits] = useState(true);
    const [editorTab, setEditorTab] = useState("edit");
    const [dialog, setDialog] = useState<
        "start" | "add" | "ai" | "handoff" | "confirm" | "base" | null
    >(null);
    const [basePreview, setBasePreview] = useState(bases[0]);
    const [form, setForm] = useState({
        company: "",
        role: "",
        url: "",
        description: "",
        requirements: "",
    });
    const [error, setError] = useState("");
    const job = jobs.find((j) => j.id === selectedJob) ?? jobs[0];
    const current = apps.find((a) => a.id === activeId);
    const existing = apps.find((a) => a.job.id === job.id);
    const preparation = apps.filter((a) => !a.submitted);
    const submitted = apps.filter((a) => a.submitted);
    const update = (change: (app: Application) => Application) =>
        setApps((all) => all.map((a) => (a.id === activeId ? change(a) : a)));
    const openApp = (app: Application) => {
        setActiveId(app.id);
        setPage("Workspace");
        setEditorTab(app.submitted ? "preview" : "edit");
    };
    const openJob = () => {
        if (existing) openApp(existing);
        else {
            setBaseId(baseResumes[0].id);
            setDialog("start");
        }
    };
    const start = () => {
        const next = prepare(
            apps,
            job,
            baseResumes.find((b) => b.id === baseId)!,
        );
        setApps(next);
        openApp(next.find((a) => a.job.id === job.id)!);
        setDialog(null);
    };
    const download = () => {
        if (!current) return;
        const d = current.submitted?.resume ?? current.draft;
        const url = URL.createObjectURL(
            new Blob(
                [
                    `Jordan Rivera\n${d.headline}\n${d.email}\n\n${d.summary}\n\nEXPERIENCE\n${d.experience}\n\nSKILLS\n${d.skills}`,
                ],
                { type: "text/plain" },
            ),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = `${current.job.company}-resume-preview.txt`;
        link.click();
        URL.revokeObjectURL(url);
        toast("Text preview downloaded. Production export would offer PDF.");
    };
    const addJob = () => {
        if (
            !form.company.trim() ||
            !form.role.trim() ||
            !form.description.trim()
        ) {
            setError("Enter a company, job title, and description.");
            return;
        }
        let url: URL;
        try {
            url = new URL(form.url);
            if (!["https:", "http:"].includes(url.protocol)) throw Error();
        } catch {
            setError("Enter a complete http or https job URL.");
            return;
        }
        if (jobs.some((j) => j.url === url.href && j.source === "Manual")) {
            setError("This job URL is already in your list.");
            return;
        }
        const next: Listing = {
            id: crypto.randomUUID(),
            company: form.company.trim(),
            role: form.role.trim(),
            description: form.description.trim(),
            url: url.href,
            requirements: [
                ...new Set(
                    form.requirements
                        .split(",")
                        .map((s) => s.trim().toLowerCase())
                        .filter(Boolean),
                ),
            ],
            location: "Location not specified",
            remote: false,
            source: "Manual",
            stage: "Saved",
        };
        setJobs((all) => [next, ...all]);
        setSelectedJob(next.id);
        setQuery("");
        setFilter("all");
        setDialog(null);
        setForm({
            company: "",
            role: "",
            url: "",
            description: "",
            requirements: "",
        });
        toast("Job added to this preview");
    };
    const visibleJobs = jobs.filter(
        (j) =>
            `${j.role} ${j.company} ${j.location}`
                .toLowerCase()
                .includes(query.toLowerCase()) &&
            (filter === "all" ||
                (filter === "remote" ? j.remote : j.source === "Manual")),
    );
    const evidence = current ? findEvidence(current.draft, current.job) : [];
    const pending =
        current?.suggestions.filter((s) => s.decision === "pending").length ??
        0;
    return (
        <SidebarProvider
            style={{ "--sidebar-width": "13rem" } as React.CSSProperties}
        >
            <Navigation page={page === "Workspace" && current?.submitted ? "Applications" : page} go={setPage} />
            <main className="min-w-0 flex-1 bg-background">
                <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b px-4 py-3 md:px-7">
                    <div className="flex items-center gap-2">
                        <SidebarTrigger />
                        <span className="text-sm text-muted-foreground">
                            Your workspace
                        </span>
                        <ChevronRight className="size-3 text-muted-foreground" />
                        <span className="text-sm font-medium">
                            {page === "Workspace"
                                ? current?.submitted ? "Application details" : "Prepare application"
                                : page}
                        </span>
                    </div>
                    <Badge variant="outline">
                        Interactive concept · resets on reload
                    </Badge>
                </header>
                {page === "Jobs" && (
                    <div className="mx-auto flex max-w-[1450px] flex-col gap-7 p-4 md:p-8">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                                    Find your next move
                                </p>
                                <h1 className="text-3xl font-semibold tracking-tight">
                                    A good application starts here.
                                </h1>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Find a role. Bring your most relevant
                                    experience forward.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setError("");
                                    setDialog("add");
                                }}
                            >
                                <Plus data-icon="inline-start" />
                                Add a job
                            </Button>
                        </div>
                        {preparation.length > 0 && (
                            <section className="flex flex-col gap-3">
                                <h2 className="text-sm font-semibold">
                                    Continue preparing · {preparation.length}
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {preparation.map((a) => (
                                        <Button
                                            key={a.id}
                                            variant="outline"
                                            onClick={() => openApp(a)}
                                        >
                                            {a.job.company}
                                            <Badge variant="secondary">
                                                {a.status}
                                            </Badge>
                                            <ArrowRight data-icon="inline-end" />
                                        </Button>
                                    ))}
                                </div>
                            </section>
                        )}
                        <div className="flex flex-wrap gap-3">
                            <Input
                                aria-label="Search jobs"
                                placeholder="Search job title, company, or location…"
                                className="max-w-lg"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                            <Select
                                aria-label="Filter jobs"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            >
                                <option value="all">All jobs</option>
                                <option value="remote">Remote</option>
                                <option value="manual">Added by me</option>
                            </Select>
                        </div>
                        <div className="grid items-start gap-6 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.4fr)]">
                            <section
                                aria-label="Job listings"
                                className="overflow-hidden rounded-xl border"
                            >
                                <div className="border-b bg-muted/30 px-5 py-3 text-xs text-muted-foreground">
                                    {visibleJobs.length} opportunities · sample
                                    imported jobs
                                </div>
                                {visibleJobs.map((j) => (
                                    <div
                                        key={j.id}
                                        className={cn(
                                            "border-b p-5 last:border-0",
                                            selectedJob === j.id &&
                                                "bg-muted/50",
                                        )}
                                    >
                                        <div className="mb-3 flex items-center justify-between gap-2">
                                            <p className="text-sm font-medium">
                                                {j.company}
                                            </p>
                                            <Badge variant="outline">
                                                {j.source}
                                            </Badge>
                                        </div>
                                        <Button
                                            variant="link"
                                            className="h-auto justify-start whitespace-normal p-0 text-left"
                                            onClick={() => setSelectedJob(j.id)}
                                        >
                                            {j.role}
                                        </Button>
                                        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                                            <MapPin className="size-3" />
                                            {j.location}
                                        </p>
                                        {apps.some((a) => a.id === j.id) && (
                                            <p className="mt-3 text-xs font-medium">
                                                {
                                                    apps.find(
                                                        (a) => a.id === j.id,
                                                    )?.status
                                                }
                                            </p>
                                        )}
                                    </div>
                                ))}
                                {!visibleJobs.length && (
                                    <p className="p-6 text-sm text-muted-foreground">
                                        No jobs match. Try another search or add
                                        a job.
                                    </p>
                                )}
                            </section>
                            <Card className="lg:sticky lg:top-6">
                                <CardHeader>
                                    <div className="mb-3 flex items-center gap-3">
                                        <div className="flex size-11 items-center justify-center rounded-lg border text-lg font-semibold">
                                            {job.company.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">
                                                {job.company}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {job.location}
                                            </p>
                                        </div>
                                    </div>
                                    <CardTitle>{job.role}</CardTitle>
                                    <CardDescription>
                                        A focused application, built from your
                                        experience.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-6">
                                    <Separator />
                                    <section>
                                        <h2 className="mb-3 text-sm font-semibold">
                                            About the role
                                        </h2>
                                        <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                                            {job.description}
                                        </p>
                                    </section>
                                    <section>
                                        <h2 className="mb-3 text-sm font-semibold">
                                            What they’re looking for
                                        </h2>
                                        <div className="flex flex-wrap gap-2">
                                            {job.requirements.map((r) => (
                                                <Badge
                                                    variant="secondary"
                                                    key={r}
                                                >
                                                    {r}
                                                </Badge>
                                            ))}
                                        </div>
                                        {!job.requirements.length && (
                                            <p className="text-sm text-muted-foreground">
                                                Review the description for
                                                requirements.
                                            </p>
                                        )}
                                    </section>
                                    <Separator />
                                    <p className="text-sm text-muted-foreground">
                                        Choose a base resume, then make a
                                        separate copy for this role. Edit it
                                        yourself or review AI suggestions.
                                    </p>
                                </CardContent>
                                <CardFooter>
                                    <Button
                                        className="w-full"
                                        onClick={openJob}
                                    >
                                        {existing
                                            ? existing.submitted
                                                ? "View application"
                                                : "Continue application"
                                            : "Prepare application"}
                                        <ArrowRight data-icon="inline-end" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                )}
                {page === "Workspace" && current && (
                    <div className="flex flex-col gap-6 p-4 md:p-7">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        setPage(
                                            current.submitted
                                                ? "Applications"
                                                : "Jobs",
                                        )
                                    }
                                >
                                    <ArrowLeft data-icon="inline-start" />
                                    {current.submitted
                                        ? "Applications"
                                        : "Jobs"}
                                </Button>
                                <h1 className="mt-3 text-2xl font-semibold tracking-tight">
                                    {current.job.role}
                                </h1>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {current.job.company} ·{" "}
                                    {current.job.location}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary">
                                    {current.status}
                                </Badge>
                                {!current.submitted && (
                                    <Button
                                        disabled={
                                            current.suggestions.length > 0
                                        }
                                        onClick={() => {
                                            if (current.status === "Ready")
                                                setDialog("handoff");
                                            else {
                                                update((a) => ({
                                                    ...a,
                                                    status: "Ready",
                                                }));
                                                setEditorTab("preview");
                                                toast(
                                                    "Ready for your final review",
                                                );
                                            }
                                        }}
                                    >
                                        {current.status === "Ready"
                                            ? "Apply on company site"
                                            : "Ready to apply"}
                                        <ArrowRight data-icon="inline-end" />
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-y py-3">
                            <p className="flex items-center gap-2 text-xs text-muted-foreground">
                                <FileText className="size-4" />
                                Based on{" "}
                                {
                                    baseResumes.find(
                                        (b) => b.id === current.baseId,
                                    )?.name
                                }
                                <span>·</span>
                                {current.submitted
                                    ? "Submitted copy preserved"
                                    : "Changes kept in this preview"}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={download}
                                >
                                    <Download data-icon="inline-start" />
                                    Download text preview
                                </Button>
                                {current.checkpoint && !current.submitted && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            update((a) => ({
                                                ...a,
                                                draft: { ...a.checkpoint! },
                                                checkpoint: undefined,
                                                suggestions: [],
                                                status: "Preparing",
                                                events: [
                                                    ...a.events,
                                                    "Restored before AI changes",
                                                ],
                                            }));
                                            toast(
                                                "Restored your previous wording",
                                            );
                                        }}
                                    >
                                        <History data-icon="inline-start" />
                                        Undo AI changes
                                    </Button>
                                )}
                            </div>
                        </div>
                        {current.submitted ? (
                            <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_320px]">
                                <div className="bg-muted/40 p-4 md:p-8">
                                    <Paper draft={current.submitted.resume} />
                                </div>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            Application activity
                                        </CardTitle>
                                        <CardDescription>
                                            Submitted{" "}
                                            {new Date(
                                                current.submitted.at,
                                            ).toLocaleDateString()}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-5">
                                        <Label htmlFor="application-stage">
                                            Stage
                                        </Label>
                                        <Select
                                            id="application-stage"
                                            value={current.status}
                                            onChange={(e) =>
                                                update((a) => ({
                                                    ...a,
                                                    status: e.target
                                                        .value as Stage,
                                                    events: [
                                                        ...a.events,
                                                        `Moved to ${e.target.value}`,
                                                    ],
                                                }))
                                            }
                                        >
                                            {stages.map((s) => (
                                                <option key={s}>{s}</option>
                                            ))}
                                        </Select>
                                        <Field
                                            label="Private notes"
                                            multiline
                                            value={current.notes}
                                            onChange={(v) =>
                                                update((a) => ({
                                                    ...a,
                                                    notes: v,
                                                }))
                                            }
                                        />
                                        <Field
                                            label="Follow-up date"
                                            type="date"
                                            value={current.followUp}
                                            onChange={(v) =>
                                                update((a) => ({
                                                    ...a,
                                                    followUp: v,
                                                }))
                                            }
                                        />
                                        <Separator />
                                        <ul className="flex flex-col gap-3 text-xs text-muted-foreground">
                                            {current.events.map((e, i) => (
                                                <li key={i}>• {e}</li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
                                <Tabs
                                    value={editorTab}
                                    onValueChange={setEditorTab}
                                    className="min-w-0"
                                >
                                    <TabsList>
                                        <TabsTrigger value="edit">
                                            Edit resume
                                        </TabsTrigger>
                                        <TabsTrigger value="preview">
                                            Preview
                                        </TabsTrigger>
                                        <TabsTrigger value="review">
                                            AI review
                                            {current.suggestions.length > 0
                                                ? ` (${current.suggestions.length})`
                                                : ""}
                                        </TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="edit">
                                        <div className="grid items-start gap-6 lg:grid-cols-2">
                                            <div className="flex flex-col gap-5 rounded-xl border p-5">
                                                {(
                                                    [
                                                        "headline",
                                                        "email",
                                                        "summary",
                                                        "experience",
                                                        "skills",
                                                    ] as const
                                                ).map((key) => (
                                                    <Field
                                                        key={key}
                                                        label={
                                                            {
                                                                headline:
                                                                    "Headline",
                                                                email: "Email",
                                                                summary:
                                                                    "Professional summary",
                                                                experience:
                                                                    "Experience · one bullet per line",
                                                                skills: "Skills",
                                                            }[key]
                                                        }
                                                        multiline={[
                                                            "summary",
                                                            "experience",
                                                            "skills",
                                                        ].includes(key)}
                                                        value={
                                                            current.draft[key]
                                                        }
                                                        onChange={(v) =>
                                                            update((a) =>
                                                                editDraft(
                                                                    a,
                                                                    key,
                                                                    v,
                                                                ),
                                                            )
                                                        }
                                                    />
                                                ))}
                                            </div>
                                            <div className="hidden bg-muted/40 p-4 lg:block">
                                                <Paper draft={current.draft} />
                                            </div>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="preview">
                                        <div className="bg-muted/40 p-3 sm:p-7">
                                            <Paper draft={current.draft} />
                                        </div>
                                        {current.status === "Ready" && (
                                            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                                                <p className="text-sm text-muted-foreground">
                                                    Already submitted on the
                                                    employer’s site?
                                                </p>
                                                <Button
                                                    variant="outline"
                                                    onClick={() =>
                                                        setDialog("confirm")
                                                    }
                                                >
                                                    Confirm submission
                                                </Button>
                                            </div>
                                        )}
                                    </TabsContent>
                                    <TabsContent value="review">
                                        <div className="flex flex-col gap-5">
                                            {current.suggestions.length ? (
                                                <>
                                                    <Alert>
                                                        <ShieldCheck />
                                                        <AlertTitle>
                                                            Your resume hasn’t
                                                            changed yet.
                                                        </AlertTitle>
                                                        <AlertDescription>
                                                            Review every
                                                            suggestion, then
                                                            apply the ones you
                                                            accepted. Editing
                                                            manually clears
                                                            these suggestions.
                                                        </AlertDescription>
                                                    </Alert>
                                                    {current.suggestions.map(
                                                        (s, i) => (
                                                            <Card key={i}>
                                                                <CardHeader>
                                                                    <CardTitle>
                                                                        {s.field ===
                                                                        "summary"
                                                                            ? "Professional summary"
                                                                            : "Experience order"}
                                                                    </CardTitle>
                                                                    <CardDescription>
                                                                        {
                                                                            s.reason
                                                                        }
                                                                    </CardDescription>
                                                                </CardHeader>
                                                                <CardContent className="grid gap-5 md:grid-cols-2">
                                                                    <div>
                                                                        <p className="mb-2 text-xs font-semibold text-muted-foreground">
                                                                            CURRENT
                                                                        </p>
                                                                        <p className="whitespace-pre-wrap text-sm leading-6">
                                                                            {
                                                                                s.before
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="mb-2 text-xs font-semibold">
                                                                            PROPOSED
                                                                        </p>
                                                                        <p className="whitespace-pre-wrap text-sm leading-6">
                                                                            {
                                                                                s.after
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                </CardContent>
                                                                <CardFooter className="gap-2">
                                                                    <Button
                                                                        variant={
                                                                            s.decision ===
                                                                            "accept"
                                                                                ? "default"
                                                                                : "outline"
                                                                        }
                                                                        size="sm"
                                                                        onClick={() =>
                                                                            update(
                                                                                (
                                                                                    a,
                                                                                ) => ({
                                                                                    ...a,
                                                                                    suggestions:
                                                                                        a.suggestions.map(
                                                                                            (
                                                                                                x,
                                                                                                n,
                                                                                            ) =>
                                                                                                n ===
                                                                                                i
                                                                                                    ? {
                                                                                                          ...x,
                                                                                                          decision:
                                                                                                              "accept",
                                                                                                      }
                                                                                                    : x,
                                                                                        ),
                                                                                }),
                                                                            )
                                                                        }
                                                                    >
                                                                        Accept{" "}
                                                                        {
                                                                            s.field
                                                                        }
                                                                    </Button>
                                                                    <Button
                                                                        variant={
                                                                            s.decision ===
                                                                            "reject"
                                                                                ? "secondary"
                                                                                : "ghost"
                                                                        }
                                                                        size="sm"
                                                                        onClick={() =>
                                                                            update(
                                                                                (
                                                                                    a,
                                                                                ) => ({
                                                                                    ...a,
                                                                                    suggestions:
                                                                                        a.suggestions.map(
                                                                                            (
                                                                                                x,
                                                                                                n,
                                                                                            ) =>
                                                                                                n ===
                                                                                                i
                                                                                                    ? {
                                                                                                          ...x,
                                                                                                          decision:
                                                                                                              "reject",
                                                                                                      }
                                                                                                    : x,
                                                                                        ),
                                                                                }),
                                                                            )
                                                                        }
                                                                    >
                                                                        Keep
                                                                        original{" "}
                                                                        {
                                                                            s.field
                                                                        }
                                                                    </Button>
                                                                </CardFooter>
                                                            </Card>
                                                        ),
                                                    )}
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <Button
                                                            disabled={
                                                                pending > 0
                                                            }
                                                            onClick={() => {
                                                                update(
                                                                    applyReviewed,
                                                                );
                                                                setEditorTab(
                                                                    "preview",
                                                                );
                                                                toast(
                                                                    "Review completed. Your base resume is unchanged.",
                                                                );
                                                            }}
                                                        >
                                                            Apply accepted
                                                            changes
                                                        </Button>
                                                        <p className="text-xs text-muted-foreground">
                                                            {pending
                                                                ? `${pending} decisions remaining`
                                                                : "A checkpoint will be saved before applying."}
                                                        </p>
                                                    </div>
                                                </>
                                            ) : (
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle>
                                                            You’re in control of
                                                            every change.
                                                        </CardTitle>
                                                        <CardDescription>
                                                            AI proposes edits.
                                                            You decide what
                                                            belongs in your
                                                            resume.
                                                        </CardDescription>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <p className="text-sm text-muted-foreground">
                                                            This prototype uses
                                                            sample suggestions
                                                            drawn from your
                                                            existing text.
                                                        </p>
                                                    </CardContent>
                                                    <CardFooter>
                                                        <Button
                                                            disabled={!credits}
                                                            onClick={() =>
                                                                setDialog("ai")
                                                            }
                                                        >
                                                            <Sparkles data-icon="inline-start" />
                                                            Review sample AI
                                                            suggestions
                                                        </Button>
                                                    </CardFooter>
                                                </Card>
                                            )}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                                <aside className="flex flex-col gap-5 xl:sticky xl:top-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>For this role</CardTitle>
                                            <CardDescription>
                                                {current.job.company}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex flex-col gap-5">
                                            <p className="text-sm leading-6 text-muted-foreground">
                                                {current.job.description}
                                            </p>
                                            <Separator />
                                            <h3 className="text-sm font-medium">
                                                Requirement evidence
                                            </h3>
                                            {evidence.map((r) => (
                                                <div key={r.term}>
                                                    <p className="flex items-center justify-between gap-2 text-sm">
                                                        <span>{r.term}</span>
                                                        {r.found ? (
                                                            <Check
                                                                aria-label="Found in resume"
                                                                className="size-4"
                                                            />
                                                        ) : (
                                                            <Badge variant="outline">
                                                                Review
                                                            </Badge>
                                                        )}
                                                    </p>
                                                    {r.found ? (
                                                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                            {r.quote}
                                                        </p>
                                                    ) : (
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            Add relevant
                                                            experience only if
                                                            you have it.
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                            <p className="text-xs leading-5 text-muted-foreground">
                                                Exact phrase evidence, not an
                                                ATS or hiring score.
                                            </p>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>
                                                Make your experience count.
                                            </CardTitle>
                                            <CardDescription>
                                                {credits
                                                    ? "Get suggestions, then review and apply."
                                                    : "Manual editing is always available."}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardFooter>
                                            <Button
                                                variant="outline"
                                                className="w-full"
                                                disabled={
                                                    !credits ||
                                                    current.suggestions.length >
                                                        0
                                                }
                                                onClick={() => setDialog("ai")}
                                            >
                                                <Sparkles data-icon="inline-start" />
                                                {credits
                                                    ? "Tailor with AI"
                                                    : "No AI credits"}
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                        <Label htmlFor="credits">
                                            Preview: AI credits available
                                        </Label>
                                        <Switch
                                            id="credits"
                                            checked={credits}
                                            onCheckedChange={setCredits}
                                        />
                                    </div>
                                </aside>
                            </div>
                        )}
                    </div>
                )}
                {page === "Resumes" && (
                    <div className="mx-auto flex max-w-5xl flex-col gap-7 p-4 md:p-8">
                        <div>
                            <h1 className="text-3xl font-semibold tracking-tight">
                                Your starting points.
                            </h1>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Keep a base for each direction. Every
                                application gets its own tailored copy.
                            </p>
                        </div>
                        <h2 className="text-sm font-semibold">Base resumes</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            {baseResumes.map((b) => (
                                <Card key={b.id}>
                                    <CardHeader>
                                        <CardTitle>{b.name}</CardTitle>
                                        <CardDescription>
                                            {b.headline}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm leading-6 text-muted-foreground">
                                            {b.summary}
                                        </p>
                                    </CardContent>
                                    <CardFooter className="gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setBasePreview(b);
                                                setDialog("base");
                                            }}
                                        >
                                            View base
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                setBaseResumes((all) => [
                                                    ...all,
                                                    {
                                                        ...b,
                                                        id: crypto.randomUUID(),
                                                        name: `${b.name} · Copy`,
                                                    },
                                                ]);
                                                toast("Base resume copied");
                                            }}
                                        >
                                            Duplicate base
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                        <Separator />
                        <h2 className="text-sm font-semibold">
                            Job-specific resumes · {apps.length}
                        </h2>
                        {!apps.length ? (
                            <p className="text-sm text-muted-foreground">
                                Choose a job to create your first tailored
                                resume.
                            </p>
                        ) : (
                            apps.map((a) => (
                                <div
                                    key={a.id}
                                    className="flex flex-wrap items-center justify-between gap-3 border-b pb-4"
                                >
                                    <div>
                                        <p className="text-sm font-medium">
                                            {a.draft.name}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {a.submitted
                                                ? "Submitted copy preserved"
                                                : "Independent working copy"}
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() => openApp(a)}
                                    >
                                        Open resume
                                        <ArrowRight data-icon="inline-end" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                )}
                {page === "Applications" && (
                    <div className="flex flex-col gap-7 p-4 md:p-8">
                        <div>
                            <h1 className="text-3xl font-semibold tracking-tight">
                                Keep your next move in sight.
                            </h1>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {submitted.length} submitted applications.
                                Notes, next steps, and the exact resume you
                                sent.
                            </p>
                        </div>
                        {!submitted.length && (
                            <Alert>
                                <BriefcaseBusiness />
                                <AlertTitle>
                                    Your applications will appear here.
                                </AlertTitle>
                                <AlertDescription>
                                    Prepare a resume from Jobs, submit it
                                    yourself, then confirm submission.
                                    <Button
                                        variant="link"
                                        className="p-0"
                                        onClick={() => setPage("Jobs")}
                                    >
                                        Find a job
                                        <ArrowRight data-icon="inline-end" />
                                    </Button>
                                </AlertDescription>
                            </Alert>
                        )}
                        <div className="flex gap-4 overflow-x-auto pb-5">
                            {stages.map((stage) => (
                                <section
                                    key={stage}
                                    className="min-h-72 w-64 shrink-0 rounded-xl border bg-muted/30 p-3"
                                >
                                    <h2 className="mb-4 flex items-center justify-between px-1 text-sm font-semibold">
                                        {stage}
                                        <Badge variant="secondary">
                                            {
                                                submitted.filter(
                                                    (a) => a.status === stage,
                                                ).length
                                            }
                                        </Badge>
                                    </h2>
                                    <div className="flex flex-col gap-3">
                                        {submitted
                                            .filter((a) => a.status === stage)
                                            .map((a) => (
                                                <Card key={a.id}>
                                                    <CardHeader>
                                                        <CardTitle>
                                                            {a.job.company}
                                                        </CardTitle>
                                                        <CardDescription>
                                                            {a.job.role}
                                                        </CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="flex flex-col gap-3">
                                                        <p className="text-xs text-muted-foreground">
                                                            Submitted{" "}
                                                            {new Date(
                                                                a.submitted!.at,
                                                            ).toLocaleDateString()}
                                                        </p>
                                                        {a.followUp && (
                                                            <Badge variant="outline">
                                                                Follow up{" "}
                                                                {a.followUp}
                                                            </Badge>
                                                        )}
                                                        {a.notes && (
                                                            <p className="line-clamp-3 text-sm">
                                                                {a.notes}
                                                            </p>
                                                        )}
                                                        <Select
                                                            aria-label={`Stage for ${a.job.company}`}
                                                            value={a.status}
                                                            onChange={(e) =>
                                                                setApps((all) =>
                                                                    all.map(
                                                                        (x) =>
                                                                            x.id ===
                                                                            a.id
                                                                                ? {
                                                                                      ...x,
                                                                                      status: e
                                                                                          .target
                                                                                          .value as Stage,
                                                                                      events: [
                                                                                          ...x.events,
                                                                                          `Moved to ${e.target.value}`,
                                                                                      ],
                                                                                  }
                                                                                : x,
                                                                    ),
                                                                )
                                                            }
                                                        >
                                                            {stages.map((s) => (
                                                                <option key={s}>
                                                                    {s}
                                                                </option>
                                                            ))}
                                                        </Select>
                                                    </CardContent>
                                                    <CardFooter>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                openApp(a)
                                                            }
                                                        >
                                                            Notes & submitted
                                                            resume
                                                        </Button>
                                                    </CardFooter>
                                                </Card>
                                            ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    </div>
                )}
            </main>
            <Dialog
                open={dialog !== null}
                onOpenChange={(open) => {
                    if (!open) setDialog(null);
                }}
            >
                <DialogContent
                    className={cn(
                        "max-h-[90vh] overflow-y-auto",
                        dialog === "base" && "sm:max-w-3xl",
                    )}
                >
                    {dialog === "start" && (
                        <>
                            <DialogHeader>
                                <DialogTitle>
                                    Start with the right resume.
                                </DialogTitle>
                                <DialogDescription>
                                    {job.role} at {job.company}. We’ll make an
                                    independent copy for this job.
                                </DialogDescription>
                            </DialogHeader>
                            <Label htmlFor="base-choice">Base resume</Label>
                            <Select
                                id="base-choice"
                                value={baseId}
                                onChange={(e) => setBaseId(e.target.value)}
                            >
                                {baseResumes.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name}
                                    </option>
                                ))}
                            </Select>
                            <p className="text-sm leading-6 text-muted-foreground">
                                {
                                    baseResumes.find((b) => b.id === baseId)
                                        ?.summary
                                }
                            </p>
                            <DialogFooter>
                                <Button onClick={start}>
                                    Create tailored resume
                                    <ArrowRight data-icon="inline-end" />
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                    {dialog === "add" && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Add a job</DialogTitle>
                                <DialogDescription>
                                    Paste the posting details. It follows the
                                    same preparation flow as an imported job.
                                </DialogDescription>
                            </DialogHeader>
                            <form
                                className="flex flex-col gap-4"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    addJob();
                                }}
                            >
                                {(
                                    [
                                        "company",
                                        "role",
                                        "url",
                                        "description",
                                        "requirements",
                                    ] as const
                                ).map((key) => (
                                    <Field
                                        key={key}
                                        label={
                                            {
                                                company: "Company",
                                                role: "Job title",
                                                url: "Job URL",
                                                description: "Job description",
                                                requirements:
                                                    "Requirement phrases · comma separated (optional)",
                                            }[key]
                                        }
                                        multiline={key === "description"}
                                        value={form[key]}
                                        onChange={(v) =>
                                            setForm((f) => ({ ...f, [key]: v }))
                                        }
                                    />
                                ))}
                                {error && (
                                    <p
                                        role="alert"
                                        className="text-sm text-destructive"
                                    >
                                        {error}
                                    </p>
                                )}
                                <DialogFooter>
                                    <Button type="submit">Add job</Button>
                                </DialogFooter>
                            </form>
                        </>
                    )}
                    {dialog === "ai" && current && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Tailor with AI</DialogTitle>
                                <DialogDescription>
                                    Suggestions first. Your approval before any
                                    changes.
                                </DialogDescription>
                            </DialogHeader>
                            <Alert>
                                <Sparkles />
                                <AlertTitle>
                                    Preview mode · no credits charged
                                </AlertTitle>
                                <AlertDescription>
                                    This demonstrates the review flow with
                                    sample edits. Production would show the
                                    actual credit cost before generation.
                                </AlertDescription>
                            </Alert>
                            <p className="text-sm text-muted-foreground">
                                Your base resume stays intact. Accepted changes
                                get a restorable checkpoint.
                            </p>
                            <DialogFooter>
                                <Button
                                    disabled={!credits}
                                    onClick={() => {
                                        const suggestions = sampleSuggestions(
                                            current.draft,
                                        );
                                        update((a) => ({
                                            ...a,
                                            suggestions,
                                            status: "Preparing",
                                        }));
                                        setDialog(null);
                                        setEditorTab("review");
                                        if (!suggestions.length)
                                            toast(
                                                "No sample reorder suggestions available for this text",
                                            );
                                    }}
                                >
                                    Generate sample suggestions
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                    {dialog === "handoff" && current && (
                        <>
                            <DialogHeader>
                                <DialogTitle>
                                    Take your application to{" "}
                                    {current.job.company}.
                                </DialogTitle>
                                <DialogDescription>
                                    You control the final submission on the
                                    employer’s site.
                                </DialogDescription>
                            </DialogHeader>
                            <ol className="flex list-decimal flex-col gap-4 pl-5 text-sm leading-6">
                                <li>Use your tailored resume for this role.</li>
                                <li>
                                    Fill the application manually or with the
                                    Chrome extension.
                                </li>
                                <li>
                                    Review the employer’s form and click Submit
                                    yourself.
                                </li>
                            </ol>
                            {current.job.source === "Imported" ? (
                                <Alert>
                                    <AlertTitle>
                                        Sample employer handoff
                                    </AlertTitle>
                                    <AlertDescription>
                                        This fictional job has no application
                                        page. Use “I’ve submitted” to try
                                        tracking.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <Button variant="outline" asChild>
                                    <a
                                        href={current.job.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Open employer’s application
                                        <ExternalLink data-icon="inline-end" />
                                    </a>
                                </Button>
                            )}
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setDialog(null)}
                                >
                                    Not submitted yet
                                </Button>
                                <Button onClick={() => setDialog("confirm")}>
                                    I’ve submitted
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                    {dialog === "confirm" && current && (
                        <>
                            <DialogHeader>
                                <DialogTitle>
                                    Confirm your submission
                                </DialogTitle>
                                <DialogDescription>
                                    Did you submit your application to{" "}
                                    {current.job.company} using this tailored
                                    resume?
                                </DialogDescription>
                            </DialogHeader>
                            <p className="text-sm leading-6 text-muted-foreground">
                                We’ll preserve this resume and move the
                                application to Applied. Opening a link or
                                filling a form never does this automatically.
                            </p>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setDialog(null)}
                                >
                                    Not yet
                                </Button>
                                <Button
                                    onClick={() => {
                                        update((a) =>
                                            confirmSubmission(
                                                a,
                                                new Date().toISOString(),
                                            ),
                                        );
                                        setDialog(null);
                                        setPage("Applications");
                                        toast("Application added to Applied");
                                    }}
                                >
                                    Yes, mark as applied
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                    {dialog === "base" && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{basePreview.name}</DialogTitle>
                                <DialogDescription>
                                    Base resume · tailoring a job never changes
                                    this document.
                                </DialogDescription>
                            </DialogHeader>
                            <Paper draft={basePreview} />
                        </>
                    )}
                </DialogContent>
            </Dialog>
            <Toaster />
        </SidebarProvider>
    );
}
createRoot(document.getElementById("root")!).render(<App />);
