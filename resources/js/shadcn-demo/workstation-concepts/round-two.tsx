import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "../../../css/app.css";
import {
    ArrowLeft,
    ArrowRight,
    Bookmark,
    BriefcaseBusiness,
    Check,
    CheckCheck,
    ChevronDown,
    CircleHelp,
    Copy,
    Download,
    FileText,
    GitBranch,
    History,
    ListChecks,
    MapPin,
    Plus,
    Search,
    ShieldCheck,
    Sparkles,
    X,
} from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Badge } from "@/Components/ui/badge";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/Components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/Components/ui/tabs";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Textarea } from "@/Components/ui/textarea";
import { Select } from "@/Components/ui/select";
import { Separator } from "@/Components/ui/separator";
import { Checkbox } from "@/Components/ui/checkbox";
import { Progress } from "@/Components/ui/progress";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/Components/ui/accordion";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/Components/ui/dialog";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/Components/ui/sheet";
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from "@/Components/ui/popover";
import {
    Command,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
} from "@/Components/ui/command";
import {
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from "@/Components/ui/table";
import { Alert, AlertDescription } from "@/Components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "@/Components/ui/toggle-group";
import { Toaster } from "@/Components/ui/sonner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    jobs as sampleJobs,
    drafts as sampleDrafts,
    directions,
    checklist,
    proposal,
    findEvidence,
    normalize,
    copyDraft,
    type Draft,
    type Job,
    type Stage,
} from "./round-two-data";

type Panel = "edit" | "evidence" | "history" | "notes" | "interview" | null;
function Paper({
    draft,
    compact = false,
}: {
    draft: Draft;
    compact?: boolean;
}) {
    return (
        <div
            className={cn(
                "min-w-0 bg-muted/60 p-4 sm:p-6",
                compact && "sm:p-4",
            )}
        >
            <article
                aria-label={`Resume preview: ${draft.name}`}
                className="mx-auto min-h-[600px] max-w-[680px] bg-background px-7 py-9 shadow-lg sm:px-10"
            >
                <h2 className="text-2xl font-semibold tracking-tight">
                    Jordan Rivera
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    {draft.headline}
                </p>
                <p className="mt-3 break-words text-[10px] text-muted-foreground">
                    {draft.email} · Austin, TX · jordanrivera.design
                </p>
                <Separator className="my-6" />
                {[
                    ["Profile", draft.summary],
                    ["Experience", draft.experience],
                    ["Skills", draft.skills],
                    [
                        "Education",
                        "BFA, Communication Design · State University",
                    ],
                ].map(([title, body]) => (
                    <section key={title} className="mb-7">
                        <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[.16em]">
                            {title}
                        </h3>
                        {title === "Experience" && (
                            <p className="mb-3 text-xs font-medium">
                                Senior Product Designer · Northwind Studio
                                <br />
                                <span className="font-normal text-muted-foreground">
                                    2021 — Present
                                </span>
                            </p>
                        )}
                        <p className="whitespace-pre-line text-xs leading-[1.85]">
                            {body}
                        </p>
                    </section>
                ))}
                <p className="mt-10 text-right text-[10px] text-muted-foreground">
                    Resume preview
                </p>
            </article>
        </div>
    );
}
function Field({
    label,
    value,
    onChange,
    multiline = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    multiline?: boolean;
}) {
    const id = React.useId();
    return (
        <div className="flex flex-col gap-2">
            <Label htmlFor={id}>{label}</Label>
            {multiline ? (
                <Textarea
                    id={id}
                    rows={5}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            ) : (
                <Input
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            )}
        </div>
    );
}
function App() {
    const initial = Number(new URLSearchParams(location.search).get("v") || 1);
    const [direction, setDirection] = useState(
        initial >= 1 && initial <= 6 ? initial - 1 : 0,
    );
    const [jobs, setJobs] = useState<Job[]>(sampleJobs);
    const [drafts, setDrafts] = useState<Draft[]>(sampleDrafts);
    const [jobId, setJobId] = useState("harbor");
    const [draftId, setDraftId] = useState("harbor-v1");
    const job = jobs.find((j) => j.id === jobId)!;
    const draft = drafts.find((d) => d.id === draftId)!;
    const evidence = findEvidence(draft, job);
    const found = evidence.filter((e) => e.found).length;
    const [panel, setPanel] = useState<Panel>(null);
    const [dialog, setDialog] = useState<
        "copy" | "job" | "membership" | "design" | null
    >(null);
    const [query, setQuery] = useState("");
    const [remote, setRemote] = useState(false);
    const [saved, setSaved] = useState<string[]>(["harbor", "northstar"]);
    const [mode, setMode] = useState("Document");
    const [roomTab, setRoomTab] = useState("Resume");
    const [inspector, setInspector] = useState("Checks");
    const [switcher, setSwitcher] = useState(false);
    const [checks, setChecks] = useState<Record<string, string[]>>({});
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [snapshots, setSnapshots] = useState<
        { id: string; label: string; draft: Draft }[]
    >([]);
    const [dismissed, setDismissed] = useState<string[]>([]);
    const [newName, setNewName] = useState("");
    const [newJob, setNewJob] = useState({
        company: "",
        role: "",
        description: "",
        requirements: "",
    });
    const [boardFilter, setBoardFilter] = useState("All");
    const currentChecks = checks[draft.id] || [];
    const update = (key: keyof Draft, value: string) => {
        setDrafts((all) =>
            all.map((d) => (d.id === draft.id ? { ...d, [key]: value } : d)),
        );
        setChecks((all) => ({ ...all, [draft.id]: [] }));
    };
    const selectJob = (j: Job) => {
        setJobId(j.id);
        const attached = drafts.find((d) => d.jobId === j.id);
        setDraftId(attached?.id || "base");
    };
    const selectDirection = (value: string) => {
        const i = Number(value);
        setDirection(i);
        const url = new URL(location.href);
        url.searchParams.set("v", String(i + 1));
        history.replaceState(null, "", url);
    };
    const beginCopy = () => {
        setNewName(`${job.company} · ${job.role}`);
        setDialog("copy");
    };
    const saveCheckpoint = (label = "Manual checkpoint") => {
        setSnapshots((all) => [
            { id: crypto.randomUUID(), label, draft: { ...draft } },
            ...all,
        ]);
        toast("Checkpoint saved for this version");
    };
    const setStage = (id: string, stage: Stage) =>
        setJobs((all) => all.map((j) => (j.id === id ? { ...j, stage } : j)));
    const toggleSave = (id: string) =>
        setSaved((all) =>
            all.includes(id) ? all.filter((s) => s !== id) : [...all, id],
        );
    const download = () => {
        const contents = [
            `APPLICATION BRIEF — ${job.company}`,
            job.role,
            `Resume version: ${draft.name}`,
            "Jordan Rivera",
            draft.email,
            draft.headline,
            draft.summary,
            draft.experience,
            draft.skills,
            "REQUIREMENTS",
            ...evidence.map(
                (e) =>
                    `${e.term}: ${e.found ? `Found in ${e.section}` : "Not mentioned"}`,
            ),
            "PREPARATION NOTES",
            notes[job.id] || "No notes yet.",
            "INTERVIEW PREPARATION",
            answers[job.id] || "No preparation notes yet.",
        ].join("\n\n");
        const url = URL.createObjectURL(
            new Blob([contents], { type: "text/plain" }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = `${job.company}-application-brief.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast("Application brief downloaded");
    };
    const versionPicker = (
        <Popover open={switcher} onOpenChange={setSwitcher}>
            <PopoverTrigger asChild>
                <Button variant="outline" className="max-w-full">
                    <GitBranch />
                    <span className="truncate">{draft.name}</span>
                    <ChevronDown />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
                <Command>
                    <CommandInput placeholder="Find a resume version…" />
                    <CommandList>
                        <CommandEmpty>No versions found.</CommandEmpty>
                        <CommandGroup heading="Product design · resume family">
                            {drafts.map((d) => (
                                <CommandItem
                                    key={d.id}
                                    value={d.name}
                                    onSelect={() => {
                                        setDraftId(d.id);
                                        setSwitcher(false);
                                    }}
                                >
                                    <FileText />
                                    {d.name}
                                    {d.id === draftId && (
                                        <Check className="ml-auto" />
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        <CommandGroup heading="New">
                            <CommandItem
                                onSelect={() => {
                                    setSwitcher(false);
                                    beginCopy();
                                }}
                            >
                                <Plus />
                                Copy for this job
                            </CommandItem>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
    const editor = (
        <div className="flex flex-col gap-5">
            <Field
                label="Headline"
                value={draft.headline}
                onChange={(v) => update("headline", v)}
            />
            <Field
                label="Email"
                value={draft.email}
                onChange={(v) => update("email", v)}
            />
            <Field
                label="Summary"
                value={draft.summary}
                onChange={(v) => update("summary", v)}
                multiline
            />
            <Field
                label="Experience"
                value={draft.experience}
                onChange={(v) => update("experience", v)}
                multiline
            />
            <Field
                label="Skills"
                value={draft.skills}
                onChange={(v) => update("skills", v)}
            />
        </div>
    );
    const evidenceView = (
        <div className="flex flex-col gap-4">
            <div className="flex items-end gap-2">
                <span className="text-3xl font-semibold tracking-tight tabular-nums">
                    {found}
                    <span className="text-lg font-normal text-muted-foreground">
                        {" "}
                        / {evidence.length}
                    </span>
                </span>
                <span className="pb-1 text-xs text-muted-foreground">
                    requirements mentioned
                </span>
            </div>
            <Progress
                value={evidence.length ? (found / evidence.length) * 100 : 0}
                aria-label="Requirements mentioned"
                aria-valuemin={0}
                aria-valuemax={evidence.length || 1}
                aria-valuenow={found}
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
                Exact phrases in your resume. Open a requirement to see its
                source; missing wording may still reflect experience you have.
            </p>
            <Accordion
                type="multiple"
                defaultValue={[job.requirements[0] || ""]}
                className="w-full"
            >
                {evidence.map((e) => (
                    <AccordionItem key={e.term} value={e.term}>
                        <AccordionTrigger>
                            <span className="flex items-center gap-2">
                                {e.found ? (
                                    <Check className="size-4" />
                                ) : (
                                    <CircleHelp className="size-4 text-muted-foreground" />
                                )}
                                {e.term}
                            </span>
                        </AccordionTrigger>
                        <AccordionContent>
                            {e.found ? (
                                <>
                                    <Badge variant="secondary">
                                        {e.section}
                                    </Badge>
                                    <p className="mt-3 text-sm leading-relaxed">
                                        “{e.quote}”
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    No exact phrase found. Review your
                                    experience before adding this requirement.
                                </p>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
            {evidence.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    Add requirements to this job to start a comparison.
                </p>
            )}
            <Button variant="outline" onClick={() => setPanel("edit")}>
                Refine this version
                <ArrowRight />
            </Button>
        </div>
    );
    const checksView = (
        <div className="flex flex-col gap-5">
            <div>
                <p className="text-3xl font-semibold tabular-nums">
                    {currentChecks.length}
                    <span className="text-lg font-normal text-muted-foreground">
                        {" "}
                        / {checklist.length}
                    </span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                    Personal review checks completed
                </p>
            </div>
            <Progress
                value={(currentChecks.length / checklist.length) * 100}
                aria-label="Review checklist completion"
                aria-valuemin={0}
                aria-valuemax={checklist.length}
                aria-valuenow={currentChecks.length}
            />
            {checklist.map((c) => (
                <Label key={c} className="leading-relaxed">
                    <Checkbox
                        checked={currentChecks.includes(c)}
                        onCheckedChange={(checked) =>
                            setChecks((all) => ({
                                ...all,
                                [draft.id]: checked
                                    ? [...currentChecks, c]
                                    : currentChecks.filter((x) => x !== c),
                            }))
                        }
                    />
                    {c}
                </Label>
            ))}
            <Separator />
            <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                    These are your review checks. No automated ATS certification
                    or employer submission is implied.
                </p>
            </div>
            <Button onClick={download}>
                <Download />
                Download application brief
            </Button>
        </div>
    );
    const interviewView = (
        <div className="flex flex-col gap-5">
            <Badge variant="outline" className="w-fit">
                Preparation workspace
            </Badge>
            <h3 className="text-lg font-semibold">
                Make your experience easy to explain.
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
                Prepare a concrete example for {job.company} before the
                conversation starts.
            </p>
            <Accordion type="single" collapsible defaultValue="question">
                <AccordionItem value="question">
                    <AccordionTrigger>
                        Tell us about your work with{" "}
                        {job.requirements[0] || "this role"}.
                    </AccordionTrigger>
                    <AccordionContent>
                        <p className="text-sm text-muted-foreground">
                            What was the problem? What did you own? What
                            changed? Use only outcomes you can support.
                        </p>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            <Field
                label="Your talking points"
                value={answers[job.id] || ""}
                onChange={(v) => setAnswers((all) => ({ ...all, [job.id]: v }))}
                multiline
            />
            <p className="text-xs text-muted-foreground">
                Included in your downloadable application brief.
            </p>
        </div>
    );
    const jobSummary = (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
                <Badge variant="outline">Target opportunity</Badge>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={
                        saved.includes(job.id)
                            ? "Unsave current job"
                            : "Save current job"
                    }
                    onClick={() => toggleSave(job.id)}
                >
                    <Bookmark
                        fill={saved.includes(job.id) ? "currentColor" : "none"}
                    />
                </Button>
            </div>
            <h2 className="text-xl font-semibold tracking-tight">{job.role}</h2>
            <p className="text-sm text-muted-foreground">
                {job.company} · {job.location}
            </p>
            <p className="text-sm leading-relaxed">{job.description}</p>
            <div className="flex flex-wrap gap-2">
                {job.requirements.map((r) => (
                    <Badge variant="secondary" key={r}>
                        {r}
                    </Badge>
                ))}
            </div>
        </div>
    );
    const targetBar = (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-5">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
                {versionPicker}
                <span className="text-xs text-muted-foreground">for</span>
                <Select
                    aria-label="Target job"
                    value={job.id}
                    onChange={(e) =>
                        selectJob(jobs.find((j) => j.id === e.target.value)!)
                    }
                    className="max-w-full"
                >
                    {jobs.map((j) => (
                        <option key={j.id} value={j.id}>
                            {j.company} · {j.role}
                        </option>
                    ))}
                </Select>
            </div>
            <Button variant="outline" onClick={beginCopy}>
                <Plus />
                New version
            </Button>
        </div>
    );
    const documentWithTools = (
        <div className="min-w-0 overflow-hidden rounded-lg border">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-background px-4 py-3">
                <span className="text-xs text-muted-foreground">
                    {draft.name}
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPanel("edit")}
                >
                    Edit resume
                    <ArrowRight />
                </Button>
            </div>
            <Paper draft={draft} />
        </div>
    );
    const filteredJobs = jobs.filter(
        (j) =>
            (!remote || j.remote) &&
            `${j.company} ${j.role}`
                .toLowerCase()
                .includes(query.toLowerCase()),
    );
    const jobList = (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Opportunities</h2>
                <Badge variant="secondary">{filteredJobs.length}</Badge>
            </div>
            <Input
                aria-label="Find jobs"
                placeholder="Find a company or role…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            <Label className="py-2">
                <Checkbox
                    checked={remote}
                    onCheckedChange={(v) => setRemote(v === true)}
                />
                Remote only
            </Label>
            <Separator />
            {filteredJobs.map((j) => (
                <Card key={j.id}>
                    <CardHeader>
                        <CardDescription>{j.company}</CardDescription>
                        <CardTitle>{j.role}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3" />
                            {j.location}
                        </p>
                        <p className="mt-3 text-xs">
                            {
                                findEvidence(draft, j).filter((e) => e.found)
                                    .length
                            }{" "}
                            of {j.requirements.length} phrases in this version
                        </p>
                    </CardContent>
                    <CardFooter className="justify-between">
                        <Button
                            variant={j.id === job.id ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => selectJob(j)}
                        >
                            {j.id === job.id ? "Selected" : "Open role"}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`${saved.includes(j.id) ? "Unsave" : "Save"} ${j.company}`}
                            onClick={() => toggleSave(j.id)}
                        >
                            <Bookmark
                                fill={
                                    saved.includes(j.id)
                                        ? "currentColor"
                                        : "none"
                                }
                            />
                        </Button>
                    </CardFooter>
                </Card>
            ))}
            {filteredJobs.length === 0 && (
                <Alert>
                    <AlertDescription>
                        No roles match these filters.
                    </AlertDescription>
                </Alert>
            )}
            <Button variant="outline" onClick={() => setDialog("job")}>
                <Plus />
                Add a job
            </Button>
        </div>
    );
    const proposalAvailable =
        job.requirements.some(term => normalize(term) === "design systems") &&
        draft.experience.includes(proposal.source) &&
        !dismissed.includes(draft.id);
    const pendingReview = (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Badge variant="outline">Suggested edit</Badge>
                    <Badge variant="secondary">Experience</Badge>
                </div>
                <CardTitle>Bring your systems work forward</CardTitle>
                <CardDescription>
                    {job.company} asks for design systems.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div>
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">
                        FROM YOUR RESUME
                    </p>
                    <p className="text-sm leading-relaxed">{proposal.source}</p>
                </div>
                <Separator />
                <div>
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">
                        PROPOSED WORDING
                    </p>
                    <p className="text-base leading-relaxed">
                        {proposal.replacement}
                    </p>
                </div>
                <Alert>
                    <ShieldCheck className="size-4" />
                    <AlertDescription>{proposal.reason}</AlertDescription>
                </Alert>
            </CardContent>
            <CardFooter className="flex-wrap gap-2">
                <Button
                    onClick={() => {
                        saveCheckpoint("Before suggested edit");
                        update(
                            "experience",
                            draft.experience.replace(
                                proposal.source,
                                proposal.replacement,
                            ),
                        );
                        toast(
                            "Edit accepted. The previous wording is saved in checkpoints.",
                        );
                    }}
                >
                    <Check />
                    Accept edit
                </Button>
                <Button
                    variant="outline"
                    onClick={() => {
                        setDismissed((all) => [...all, draft.id]);
                        toast("Suggestion dismissed");
                    }}
                >
                    <X />
                    Dismiss
                </Button>
            </CardFooter>
        </Card>
    );
    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="border-b bg-muted/40 px-5 py-3">
                <div className="mx-auto flex max-w-[1560px] flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline">Round two</Badge>
                        <span className="text-xs text-muted-foreground">
                            Fictional jobs · session-only preview
                        </span>
                    </div>
                    <Button variant="outline" size="sm" asChild><a href="./application-flow.html">Job-first walkthrough<ArrowRight /></a></Button>
                    <Button variant="ghost" size="sm" asChild>
                        <a href="./index.html">
                            <ArrowLeft />
                            Original five
                        </a>
                    </Button>
                </div>
                <Tabs
                    value={String(direction)}
                    onValueChange={selectDirection}
                    className="mx-auto mt-3 max-w-[1560px]"
                >
                    <TabsList className="h-auto w-full flex-wrap justify-start">
                        {directions.map((d, i) => (
                            <TabsTrigger key={d.name} value={String(i)}>
                                {i + 6}. {d.name}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </div>
            <div className="border-b px-5 py-3">
                <div className="mx-auto flex max-w-[1560px] flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                            Potential paid value:
                        </span>{" "}
                        {directions[direction].value}
                    </p>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDialog("design")}
                    >
                        Design notes
                        <CircleHelp />
                    </Button>
                </div>
            </div>
            <header className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-5 px-6 py-7">
                <div>
                    <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <FileText className="size-4" />
                        Resumegen / Workstation
                    </p>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {directions[direction].title}
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        {directions[direction].detail}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setDialog("membership")}
                    >
                        <Sparkles />
                        Membership concept
                    </Button>
                    <Button onClick={download}>
                        <Download />
                        Export brief
                    </Button>
                </div>
            </header>
            <main className="mx-auto max-w-[1600px] px-6 pb-12">
                {direction === 0 && (
                    <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(0,1fr)]">
                        <aside>{jobList}</aside>
                        <div className="min-w-0">
                            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                                {versionPicker}
                                <Button onClick={beginCopy}>
                                    <Copy />
                                    Tailor a copy
                                </Button>
                            </div>
                            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]">
                                <div className="min-w-0">
                                    {documentWithTools}
                                </div>
                                <div className="flex min-w-0 flex-col gap-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>
                                                {job.company} · {job.role}
                                            </CardTitle>
                                            <CardDescription>
                                                {job.location}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            {evidenceView}
                                        </CardContent>
                                    </Card>
                                    <Button
                                        variant="outline"
                                        onClick={() => setPanel("interview")}
                                    >
                                        Prepare for this role
                                        <ArrowRight />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {direction === 1 && (
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-base font-semibold">
                                    Your versions × your opportunities
                                </h2>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Choose a cell to inspect its evidence.
                                    Counts compare exact requirement phrases.
                                </p>
                            </div>
                            <Button variant="outline" onClick={beginCopy}>
                                <Plus />
                                New version
                            </Button>
                        </div>
                        <div className="overflow-hidden rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Resume version</TableHead>
                                        {jobs.map((j) => (
                                            <TableHead key={j.id}>
                                                <span className="block text-foreground">
                                                    {j.company}
                                                </span>
                                                <span className="text-xs font-normal">
                                                    {j.role}
                                                </span>
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {drafts.map((d) => (
                                        <TableRow key={d.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <GitBranch className="size-4 shrink-0" />
                                                    <span>{d.name}</span>
                                                </div>
                                            </TableCell>
                                            {jobs.map((j) => {
                                                const n = findEvidence(
                                                    d,
                                                    j,
                                                ).filter((e) => e.found).length;
                                                return (
                                                    <TableCell key={j.id}>
                                                        <Button
                                                            aria-label={`${d.name} matched to ${j.company}: ${n} of ${j.requirements.length}`}
                                                            variant={
                                                                draft.id ===
                                                                    d.id &&
                                                                job.id === j.id
                                                                    ? "default"
                                                                    : "ghost"
                                                            }
                                                            onClick={() => {
                                                                setDraftId(
                                                                    d.id,
                                                                );
                                                                setJobId(j.id);
                                                            }}
                                                        >
                                                            {n} /{" "}
                                                            {
                                                                j.requirements
                                                                    .length
                                                            }
                                                            {draft.id ===
                                                                d.id &&
                                                                job.id ===
                                                                    j.id && (
                                                                    <Check />
                                                                )}
                                                        </Button>
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="grid items-start gap-6 lg:grid-cols-[minmax(300px,.75fr)_minmax(0,1.25fr)]">
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        {draft.name} → {job.company}
                                    </CardTitle>
                                    <CardDescription>
                                        Evidence behind this pairing
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>{evidenceView}</CardContent>
                            </Card>
                            {documentWithTools}
                        </div>
                    </div>
                )}
                {direction === 2 && (
                    <div className="grid items-start gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
                        <aside className="flex flex-col gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Application brief</CardTitle>
                                </CardHeader>
                                <CardContent>{jobSummary}</CardContent>
                                <CardFooter>
                                    <Select
                                        aria-label="Application room job"
                                        value={job.id}
                                        onChange={(e) =>
                                            selectJob(
                                                jobs.find(
                                                    (j) =>
                                                        j.id === e.target.value,
                                                )!,
                                            )
                                        }
                                        className="w-full"
                                    >
                                        {jobs.map((j) => (
                                            <option key={j.id} value={j.id}>
                                                {j.company}
                                            </option>
                                        ))}
                                    </Select>
                                </CardFooter>
                            </Card>
                            <Button
                                variant="outline"
                                onClick={() => setPanel("notes")}
                            >
                                <ListChecks />
                                Private notes
                            </Button>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="room-stage">
                                    Application stage
                                </Label>
                                <Select
                                    id="room-stage"
                                    value={job.stage}
                                    onChange={(e) =>
                                        setStage(
                                            job.id,
                                            e.target.value as Stage,
                                        )
                                    }
                                >
                                    {["Saved", "Tailoring", "Ready"].map(
                                        (s) => (
                                            <option key={s}>{s}</option>
                                        ),
                                    )}
                                </Select>
                            </div>
                        </aside>
                        <div className="min-w-0">
                            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                                {versionPicker}
                                <Button variant="outline" onClick={beginCopy}>
                                    <Plus />
                                    New version
                                </Button>
                            </div>
                            <Tabs value={roomTab} onValueChange={setRoomTab}>
                                <TabsList className="h-auto flex-wrap">
                                    {[
                                        "Resume",
                                        "Job fit",
                                        "Checklist",
                                        "Interview",
                                    ].map((t) => (
                                        <TabsTrigger key={t} value={t}>
                                            {t}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                            <div className="mt-5 grid items-start gap-6 xl:grid-cols-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            {roomTab === "Resume"
                                                ? "Make it specific"
                                                : roomTab === "Job fit"
                                                  ? "Connect the evidence"
                                                  : roomTab === "Checklist"
                                                    ? "Ready when you are"
                                                    : "Prepare your story"}
                                        </CardTitle>
                                        <CardDescription>
                                            {job.company} · {draft.name}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {roomTab === "Resume"
                                            ? editor
                                            : roomTab === "Job fit"
                                              ? evidenceView
                                              : roomTab === "Checklist"
                                                ? checksView
                                                : interviewView}
                                    </CardContent>
                                </Card>
                                <div className="min-w-0 xl:sticky xl:top-5">
                                    {documentWithTools}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {direction === 3 && (
                    <div className="flex flex-col gap-6">
                        {targetBar}
                        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
                            <div className="flex flex-col gap-5">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-base font-semibold">
                                        Review queue
                                    </h2>
                                    <Badge variant="secondary">
                                        {proposalAvailable ? 1 : 0} pending
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Example editorial suggestion, grounded in
                                    the sample resume. No AI service is running
                                    in this preview.
                                </p>
                                {proposalAvailable ? (
                                    pendingReview
                                ) : (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>All caught up</CardTitle>
                                            <CardDescription>
                                                No pending suggestion for this
                                                version.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <CheckCheck className="size-8" />
                                            <p className="mt-4 text-sm text-muted-foreground">
                                                Keep editing, or revisit a saved
                                                checkpoint.
                                            </p>
                                        </CardContent>
                                        <CardFooter>
                                            <Button
                                                variant="outline"
                                                onClick={() =>
                                                    setPanel("history")
                                                }
                                            >
                                                <History />
                                                View checkpoints
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                )}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            What still needs context?
                                        </CardTitle>
                                        <CardDescription>
                                            {job.company} · exact wording review
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex flex-wrap gap-2">
                                            {evidence
                                                .filter((e) => !e.found)
                                                .map((e) => (
                                                    <Badge
                                                        key={e.term}
                                                        variant="outline"
                                                    >
                                                        {e.term}
                                                    </Badge>
                                                ))}
                                            {evidence.length > 0 && evidence.every((e) => e.found) && (
                                                <p className="text-sm">
                                                    All listed requirement
                                                    phrases appear.
                                                </p>
                                            )}
                                        </div>
                                        <p className="mt-4 text-sm text-muted-foreground">
                                            A missing phrase is a question to
                                            explore, not a skill to invent.
                                        </p>
                                    </CardContent>
                                    <CardFooter>
                                        <Button
                                            variant="ghost"
                                            onClick={() => setPanel("evidence")}
                                        >
                                            Inspect evidence
                                            <ArrowRight />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </div>
                            <div className="min-w-0">
                                <div className="mb-3 flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium">
                                        Current version
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setPanel("history")}
                                    >
                                        <History />
                                        Checkpoints
                                    </Button>
                                </div>
                                {documentWithTools}
                            </div>
                        </div>
                    </div>
                )}
                {direction === 4 && (
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <ToggleGroup
                                type="single"
                                value={boardFilter}
                                onValueChange={(v) => v && setBoardFilter(v)}
                                aria-label="Opportunity filter"
                            >
                                <ToggleGroupItem value="All">
                                    All opportunities
                                </ToggleGroupItem>
                                <ToggleGroupItem value="Shortlist">
                                    Shortlist
                                </ToggleGroupItem>
                            </ToggleGroup>
                            <Button
                                variant="outline"
                                onClick={() => setDialog("job")}
                            >
                                <Plus />
                                Add a job
                            </Button>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-3">
                            {(["Saved", "Tailoring", "Ready"] as Stage[]).map(
                                (stage) => (
                                    <section
                                        className="min-w-0 rounded-lg border bg-muted/30 p-3"
                                        key={stage}
                                    >
                                        <div className="mb-3 flex items-center justify-between px-1">
                                            <h2 className="text-sm font-semibold">
                                                {stage}
                                            </h2>
                                            <Badge variant="secondary">
                                                {
                                                    jobs.filter(
                                                        (j) =>
                                                            j.stage === stage &&
                                                            (boardFilter ===
                                                                "All" ||
                                                                saved.includes(
                                                                    j.id,
                                                                )),
                                                    ).length
                                                }
                                            </Badge>
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            {jobs
                                                .filter(
                                                    (j) =>
                                                        j.stage === stage &&
                                                        (boardFilter ===
                                                            "All" ||
                                                            saved.includes(
                                                                j.id,
                                                            )),
                                                )
                                                .map((j) => (
                                                    <Card key={j.id}>
                                                        <CardHeader>
                                                            <CardDescription>
                                                                {j.company}
                                                            </CardDescription>
                                                            <CardTitle>
                                                                {j.role}
                                                            </CardTitle>
                                                        </CardHeader>
                                                        <CardContent>
                                                            <p className="mb-3 text-xs text-muted-foreground">
                                                                {j.location}
                                                            </p>
                                                            <Badge variant="outline">
                                                                <GitBranch className="mr-1 size-3" />
                                                                {
                                                                    drafts.filter(
                                                                        (d) =>
                                                                            d.jobId ===
                                                                            j.id,
                                                                    ).length
                                                                }{" "}
                                                                linked{" "}
                                                                {drafts.filter(
                                                                    (d) =>
                                                                        d.jobId ===
                                                                        j.id,
                                                                ).length === 1
                                                                    ? "version"
                                                                    : "versions"}
                                                            </Badge>
                                                        </CardContent>
                                                        <CardFooter className="flex-wrap justify-between gap-2">
                                                            <Button
                                                                variant={
                                                                    j.id ===
                                                                    job.id
                                                                        ? "secondary"
                                                                        : "outline"
                                                                }
                                                                size="sm"
                                                                onClick={() =>
                                                                    selectJob(j)
                                                                }
                                                            >
                                                                {j.id === job.id
                                                                    ? "Working here"
                                                                    : "Open workspace"}
                                                            </Button>
                                                            <Select
                                                                aria-label={`${j.company} stage`}
                                                                value={j.stage}
                                                                onChange={(e) =>
                                                                    setStage(
                                                                        j.id,
                                                                        e.target
                                                                            .value as Stage,
                                                                    )
                                                                }
                                                            >
                                                                {[
                                                                    "Saved",
                                                                    "Tailoring",
                                                                    "Ready",
                                                                ].map((s) => (
                                                                    <option
                                                                        key={s}
                                                                    >
                                                                        {s}
                                                                    </option>
                                                                ))}
                                                            </Select>
                                                        </CardFooter>
                                                    </Card>
                                                ))}
                                            {jobs.filter(
                                                (j) =>
                                                    j.stage === stage &&
                                                    (boardFilter === "All" ||
                                                        saved.includes(j.id)),
                                            ).length === 0 && (
                                                <p className="px-2 py-5 text-sm text-muted-foreground">
                                                    No opportunities here yet.
                                                </p>
                                            )}
                                        </div>
                                    </section>
                                ),
                            )}
                        </div>
                        <Separator />
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Working on {job.company}
                                </h2>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    The attached resume travels with the
                                    opportunity.
                                </p>
                            </div>
                            {versionPicker}
                            <Button variant="outline" onClick={beginCopy}>
                                <Plus />
                                Attach a new version
                            </Button>
                        </div>
                        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
                            {documentWithTools}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Next useful step</CardTitle>
                                    <CardDescription>
                                        Review the evidence, then prepare a
                                        concrete example.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>{evidenceView}</CardContent>
                                <CardFooter>
                                    <Button
                                        variant="outline"
                                        onClick={() => setPanel("notes")}
                                    >
                                        Application notes
                                        <ArrowRight />
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                )}
                {direction === 5 && (
                    <div className="flex flex-col gap-5">
                        {targetBar}
                        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
                            <div className="min-w-0">
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                    <Tabs value={mode} onValueChange={setMode}>
                                        <TabsList>
                                            <TabsTrigger value="Document">
                                                Document
                                            </TabsTrigger>
                                            <TabsTrigger value="Plain text">
                                                Plain text
                                            </TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPanel("edit")}
                                    >
                                        Edit resume
                                    </Button>
                                </div>
                                {mode === "Document" ? (
                                    <Paper draft={draft} />
                                ) : (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Readable text</CardTitle>
                                            <CardDescription>
                                                What the document says without
                                                its visual layout.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="whitespace-pre-line text-sm leading-relaxed">
                                                {[
                                                    "Jordan Rivera",
                                                    draft.email,
                                                    draft.headline,
                                                    draft.summary,
                                                    draft.experience,
                                                    draft.skills,
                                                ].join("\n\n")}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Final pass</CardTitle>
                                    <CardDescription>
                                        {job.company} · {draft.name}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Tabs
                                        value={inspector}
                                        onValueChange={setInspector}
                                    >
                                        <TabsList className="mb-5">
                                            <TabsTrigger value="Checks">
                                                Checks
                                            </TabsTrigger>
                                            <TabsTrigger value="Match">
                                                Match
                                            </TabsTrigger>
                                            <TabsTrigger value="Prepare">
                                                Prepare
                                            </TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                    {inspector === "Checks"
                                        ? checksView
                                        : inspector === "Match"
                                          ? evidenceView
                                          : interviewView}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </main>
            <Sheet
                open={panel !== null}
                onOpenChange={(v) => !v && setPanel(null)}
            >
                <SheetContent className="overflow-y-auto sm:max-w-lg">
                    <SheetHeader>
                        <SheetTitle>
                            {panel === "edit"
                                ? "Edit this version"
                                : panel === "evidence"
                                  ? "Requirement evidence"
                                  : panel === "history"
                                    ? "Version checkpoints"
                                    : panel === "notes"
                                      ? "Private application notes"
                                      : "Interview preparation"}
                        </SheetTitle>
                        <DialogDescription>
                            {draft.name} · {job.company}
                        </DialogDescription>
                    </SheetHeader>
                    <div className="mt-4 flex flex-col gap-5">
                        {panel === "edit" ? (
                            editor
                        ) : panel === "evidence" ? (
                            evidenceView
                        ) : panel === "notes" ? (
                            <>
                                <Field
                                    label="Private notes"
                                    value={notes[job.id] || ""}
                                    onChange={(v) =>
                                        setNotes((all) => ({
                                            ...all,
                                            [job.id]: v,
                                        }))
                                    }
                                    multiline
                                />
                                <p className="text-xs text-muted-foreground">
                                    Kept with this job and included in the
                                    application brief.
                                </p>
                            </>
                        ) : panel === "interview" ? (
                            interviewView
                        ) : (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    Restore content within this version. Other
                                    versions remain independent.
                                </p>
                                <Button onClick={() => saveCheckpoint()}>
                                    <Plus />
                                    Save checkpoint
                                </Button>
                                {snapshots
                                    .filter((s) => s.draft.id === draft.id)
                                    .map((s) => (
                                        <Card key={s.id}>
                                            <CardHeader>
                                                <CardTitle>{s.label}</CardTitle>
                                                <CardDescription>
                                                    {s.draft.name}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardFooter>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        setDrafts((all) =>
                                                            all.map((d) =>
                                                                d.id ===
                                                                s.draft.id
                                                                    ? {
                                                                          ...s.draft,
                                                                      }
                                                                    : d,
                                                            ),
                                                        );
                                                        setDismissed((all) =>
                                                            all.filter(
                                                                (id) =>
                                                                    id !==
                                                                    s.draft.id,
                                                            ),
                                                        );
                                                        setChecks((all) => ({
                                                            ...all,
                                                            [s.draft.id]: [],
                                                        }));
                                                        toast(
                                                            "Checkpoint restored",
                                                        );
                                                    }}
                                                >
                                                    Restore checkpoint
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                {snapshots.filter(
                                    (s) => s.draft.id === draft.id,
                                ).length === 0 && (
                                    <p className="text-sm text-muted-foreground">
                                        No checkpoints yet.
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
            <Dialog
                open={dialog !== null}
                onOpenChange={(v) => !v && setDialog(null)}
            >
                <DialogContent className="max-h-[90svh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {dialog === "copy"
                                ? "Create a job-specific version"
                                : dialog === "job"
                                  ? "Add an opportunity"
                                  : dialog === "membership"
                                    ? "Less busywork. More considered applications."
                                    : "About this direction"}
                        </DialogTitle>
                        <DialogDescription>
                            {dialog === "copy"
                                ? `Copy ${draft.name} for ${job.company}. The source stays unchanged.`
                                : dialog === "job"
                                  ? "Add a sample opportunity and the phrases you want to check."
                                  : dialog === "membership"
                                    ? "A possible membership built around continuity, confidence, and saved effort. This is a product concept, not a checkout."
                                    : `${directions[direction].name} · ${directions[direction].tradeoff}`}
                        </DialogDescription>
                    </DialogHeader>
                    {dialog === "copy" ? (
                        <Field
                            label="Version name"
                            value={newName}
                            onChange={setNewName}
                        />
                    ) : dialog === "job" ? (
                        <div className="flex flex-col gap-4">
                            <Field
                                label="Company"
                                value={newJob.company}
                                onChange={(v) =>
                                    setNewJob({ ...newJob, company: v })
                                }
                            />
                            <Field
                                label="Role"
                                value={newJob.role}
                                onChange={(v) =>
                                    setNewJob({ ...newJob, role: v })
                                }
                            />
                            <Field
                                label="Job description"
                                value={newJob.description}
                                onChange={(v) =>
                                    setNewJob({ ...newJob, description: v })
                                }
                                multiline
                            />
                            <Field
                                label="Requirement phrases, separated by commas"
                                value={newJob.requirements}
                                onChange={(v) =>
                                    setNewJob({ ...newJob, requirements: v })
                                }
                            />
                        </div>
                    ) : dialog === "membership" ? (
                        <div className="flex flex-col gap-5">
                            {[
                                [
                                    "Find the right starting point",
                                    "Compare job requirements across your versions, with evidence you can inspect.",
                                ],
                                [
                                    "Keep the work you have already done",
                                    "Save job-specific versions, private notes, and preparation in one place.",
                                ],
                                [
                                    "Improve with control",
                                    "Review source-backed edits and return to an earlier checkpoint.",
                                ],
                                [
                                    "Carry your preparation forward",
                                    "Download a brief with your resume, requirement review, and talking points.",
                                ],
                            ].map(([t, b]) => (
                                <div key={t} className="flex gap-3">
                                    <Check className="mt-1 size-4 shrink-0" />
                                    <div>
                                        <h3 className="text-sm font-semibold">
                                            {t}
                                        </h3>
                                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                            {b}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            <Alert>
                                <AlertDescription>
                                    These benefits are hypotheses to validate
                                    with users. All preview features are
                                    available to explore; no payment is
                                    collected.
                                </AlertDescription>
                            </Alert>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <p className="text-sm">
                                <strong>Potential paid value:</strong>{" "}
                                {directions[direction].value}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                The original workstation supports versions,
                                checkpoints, and exact-wording comparison. These
                                concepts explore new ways to connect them with
                                job discovery and preparation. All jobs and
                                proposed edits here are fixtures.
                            </p>
                            <p className="text-sm">
                                Built with installed shadcn components. Research
                                references:{" "}
                                <a
                                    className="underline"
                                    href="https://ui.shadcn.com/docs/components/radix/table"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Table
                                </a>
                                ,{" "}
                                <a
                                    className="underline"
                                    href="https://ui.shadcn.com/docs/components/radix/accordion"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Accordion
                                </a>
                                ,{" "}
                                <a
                                    className="underline"
                                    href="https://ui.shadcn.com/docs/components/radix/progress"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Progress
                                </a>
                                ,{" "}
                                <a
                                    className="underline"
                                    href="https://ui.shadcn.com/docs/components/radix/command"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Command
                                </a>
                                .
                            </p>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDialog(null)}
                        >
                            Cancel
                        </Button>
                        {dialog === "copy" && (
                            <Button
                                disabled={!newName.trim()}
                                onClick={() => {
                                    const id = crypto.randomUUID();
                                    setDrafts((all) => [
                                        ...all,
                                        copyDraft(
                                            draft,
                                            id,
                                            newName.trim(),
                                            job.id,
                                        ),
                                    ]);
                                    setDraftId(id);
                                    setDialog(null);
                                    toast("Independent version created");
                                }}
                            >
                                Create version
                            </Button>
                        )}
                        {dialog === "job" && (
                            <Button
                                disabled={
                                    !newJob.company.trim() ||
                                    !newJob.role.trim()
                                }
                                onClick={() => {
                                    const id = crypto.randomUUID();
                                    const added: Job = {
                                        id,
                                        company: newJob.company.trim(),
                                        role: newJob.role.trim(),
                                        description: newJob.description.trim(),
                                        location: "Location not specified",
                                        remote: false,
                                        requirements: [
                                            ...new Set(
                                                newJob.requirements
                                                    .split(",")
                                                    .map((s) =>
                                                        s.trim().toLowerCase(),
                                                    )
                                                    .filter(Boolean),
                                            ),
                                        ],
                                        stage: "Saved",
                                    };
                                    setJobs((all) => [...all, added]);
                                    setJobId(id);
                                    setDraftId("base");
                                    setNewJob({
                                        company: "",
                                        role: "",
                                        description: "",
                                        requirements: "",
                                    });
                                    setDialog(null);
                                    toast("Opportunity added to this preview");
                                }}
                            >
                                Add opportunity
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Toaster position="bottom-center" />
        </div>
    );
}
createRoot(document.getElementById("root")!).render(<App />);
