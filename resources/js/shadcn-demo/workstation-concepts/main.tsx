import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "../../../css/app.css";
import {
    FileText,
    GitBranch,
    Plus,
    Check,
    ChevronDown,
    ArrowRight,
    ArrowLeft,
    History,
    Copy,
    Download,
    Share2,
    ListChecks,
} from "lucide-react";
import { Button } from "@/Components/ui/button";
import { toast } from "sonner";
import { Toaster } from "@/Components/ui/sonner";
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
import {
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
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
import {
    useSidebar,
    SidebarProvider,
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarFooter,
    SidebarInset,
    SidebarTrigger,
} from "@/Components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
    versions as initialVersions,
    directions,
    type Version,
} from "./fixtures";

function RailButton({ onClick, ...props }: React.ComponentProps<typeof SidebarMenuButton>) {
    const { setOpenMobile } = useSidebar();
    return <SidebarMenuButton {...props} onClick={(event) => { onClick?.(event); setOpenMobile(false); }} />;
}

function App() {
    const initial = Number(new URLSearchParams(location.search).get("v") || 1);
    const [direction, setDirection] = useState(
        initial >= 1 && initial <= 5 ? initial - 1 : 0,
    );
    const [versions, setVersions] = useState<Version[]>(initialVersions);
    const [active, setActive] = useState("linear");
    const current = versions.find((v) => v.id === active)!;
    const [tab, setTab] = useState("Edit");
    const [section, setSection] = useState("Summary");
    const [dialog, setDialog] = useState<"new" | "share" | null>(null);
    const [sheet, setSheet] = useState<"history" | "edit" | null>(null);
    const [name, setName] = useState("");
    const [switcher, setSwitcher] = useState(false);
    const [format, setFormat] = useState("Modern");
    const [checkpoints, setCheckpoints] = useState<
        { id: string; label: string; data: Version }[]
    >([]);
    const setNotice = (message: string) => {
        if (message) toast(message);
        else toast.dismiss();
    };
    const [query, setQuery] = useState("");
    const [compare, setCompare] = useState("base");
    const [jd, setJd] = useState("");
    const contact = {
        name: current.fullName,
        email: current.email,
        location: current.location,
    };
    const education = current.education;
    const skills = current.skills;
    const setEducation = (value: string) => update("education", value);
    const setSkills = (value: string) => update("skills", value);
    const update = (field: keyof Version, value: string) => {
        setVersions((all) =>
            all.map((v) => (v.id === active ? { ...v, [field]: value } : v)),
        );
        setNotice("Changes kept in this preview session");
    };
    const choose = (id: string) => {
        setActive(id);
        setSwitcher(false);
        setNotice("");
    };
    const newVersion = () => {
        setName(
            `${current.company === "No specific company" ? "New" : current.company} · Copy`,
        );
        setDialog("new");
    };
    const switchDirection = (value: string) => {
        const n = Number(value);
        setDirection(n);
        const url = new URL(location.href);
        url.searchParams.set("v", String(n + 1));
        history.replaceState(null, "", url);
        setTab("Edit");
    };
    const checkpoint = () => {
        setCheckpoints((all) => [
            {
                id: crypto.randomUUID(),
                label: `Checkpoint ${all.filter((c) => c.data.id === active).length + 1}`,
                data: { ...current },
            },
            ...all,
        ]);
        setNotice("Checkpoint saved for this version");
    };
    const download = () => {
        const text = [
            contact.name,
            current.headline,
            contact.email,
            contact.location,
            current.summary,
            current.experience,
            education,
            skills,
        ].join("\n\n");
        const url = URL.createObjectURL(
            new Blob([text], { type: "text/plain" }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = `${current.title}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };
    const versionPicker = (
        <Popover open={switcher} onOpenChange={setSwitcher}>
            <PopoverTrigger asChild>
                <Button variant="outline" className="max-w-full">
                    <GitBranch data-icon="inline-start" />
                    <span className="truncate">{current.title}</span>
                    <ChevronDown data-icon="inline-end" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
                <Command>
                    <CommandInput placeholder="Find a version…" />
                    <CommandList>
                        <CommandEmpty>No versions found.</CommandEmpty>
                        <CommandGroup heading="Product design · resume group">
                            {versions.map((v) => (
                                <CommandItem
                                    key={v.id}
                                    value={v.title}
                                    onSelect={() => choose(v.id)}
                                >
                                    <FileText />
                                    {v.title}
                                    {active === v.id && (
                                        <Check className="ml-auto" />
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        <CommandGroup heading="Create">
                            <CommandItem
                                onSelect={() => {
                                    setSwitcher(false);
                                    newVersion();
                                }}
                            >
                                <Plus />
                                New version from current
                            </CommandItem>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
    const modes = (
        <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
                {["Edit", "Review", "Optimize"].map((t) => (
                    <TabsTrigger value={t} key={t}>
                        {t}
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    );
    const field = (
        label: string,
        value: string,
        onChange: (value: string) => void,
        multiline = false,
    ) => (
        <div className="flex flex-col gap-2">
            <Label htmlFor={`field-${label}`}>{label}</Label>
            {multiline ? (
                <Textarea
                    id={`field-${label}`}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    rows={label === "Experience" ? 7 : 5}
                />
            ) : (
                <Input
                    id={`field-${label}`}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            )}
        </div>
    );
    const sectionFields = (s: string) => (
        <div className="flex flex-col gap-5">
            {s === "Contact" ? (
                <>
                    {field("Full name", contact.name, (v) =>
                        update("fullName", v),
                    )}
                    {field("Email", contact.email, (v) => update("email", v))}
                    {field("Location", contact.location, (v) =>
                        update("location", v),
                    )}
                </>
            ) : s === "Summary" ? (
                <>
                    {field("Headline", current.headline, (v) =>
                        update("headline", v),
                    )}
                    {field(
                        "Professional summary",
                        current.summary,
                        (v) => update("summary", v),
                        true,
                    )}
                    <p className="text-xs text-muted-foreground">
                        Make the opening specific to the work you want to do.
                    </p>
                </>
            ) : s === "Experience" ? (
                <>
                    {field(
                        "Experience",
                        current.experience,
                        (v) => update("experience", v),
                        true,
                    )}
                    <p className="text-xs text-muted-foreground">
                        One achievement per line. Focus on what changed because
                        of your work.
                    </p>
                </>
            ) : s === "Education" ? (
                field("Education", education, setEducation)
            ) : (
                field("Skills", skills, setSkills, true)
            )}
        </div>
    );
    const form = (
        <Card>
            <CardHeader>
                <CardTitle>Your content</CardTitle>
                <CardDescription>Editing {current.title}</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion
                    type="multiple"
                    defaultValue={["Summary", "Experience"]}
                    className="w-full"
                >
                    {[
                        "Contact",
                        "Summary",
                        "Experience",
                        "Education",
                        "Skills",
                    ].map((s, i) => (
                        <AccordionItem value={s} key={s}>
                            <AccordionTrigger>
                                <span className="flex items-center gap-3">
                                    <span className="text-xs tabular-nums text-muted-foreground">
                                        0{i + 1}
                                    </span>
                                    {s}
                                </span>
                            </AccordionTrigger>
                            <AccordionContent>
                                {sectionFields(s)}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
    );
    const paper = (v: Version, highlight = false) => (
        <div className="min-w-0 bg-muted/60 p-4 sm:p-6">
            <article
                aria-label={`Resume preview: ${v.title}`}
                className={cn(
                    "mx-auto min-h-[640px] max-w-[680px] bg-background px-7 py-10 text-sm shadow-lg sm:px-10",
                    format === "Classic" && "font-serif",
                )}
            >
                <h2 className="text-2xl font-semibold tracking-tight">
                    {v.fullName}
                </h2>
                <p className="mt-2 text-muted-foreground">{v.headline}</p>
                <p className="mt-3 text-[10px] text-muted-foreground">
                    {v.email} · {v.location} · jordanrivera.design
                </p>
                <Separator className="my-6" />
                {[
                    ["Profile", v.summary],
                    ["Experience", v.experience],
                    ["Education", v.education],
                    ["Selected skills", v.skills],
                ].map(([heading, body]) => (
                    <section className="mb-7" key={heading}>
                        <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[.15em]">
                            {heading}
                        </h3>
                        {heading === "Experience" && (
                            <p className="mb-2 text-xs font-semibold">
                                Senior Product Designer · Northwind Studio
                                <br />
                                <span className="font-normal text-muted-foreground">
                                    2021 — Present
                                </span>
                            </p>
                        )}
                        <div
                            className={cn(
                                "whitespace-pre-line text-xs leading-[1.8]",
                                highlight &&
                                    ((heading === "Profile" &&
                                        v.summary !==
                                            versions.find(
                                                (x) => x.id === compare,
                                            )!.summary) ||
                                        (heading === "Experience" &&
                                            v.experience !==
                                                versions.find(
                                                    (x) => x.id === compare,
                                                )!.experience)) &&
                                    "border-l-2 border-foreground bg-muted/70 py-2 pl-3",
                            )}
                        >
                            {body}
                        </div>
                    </section>
                ))}
                <p className="mt-12 text-right text-[10px] text-muted-foreground">
                    1 / 1
                </p>
            </article>
        </div>
    );
    const preview = (
        <div className="min-w-0 overflow-hidden rounded-lg border">
            <div className="flex items-center justify-between gap-3 bg-background px-4 py-3">
                <span className="text-xs text-muted-foreground">
                    Resume preview
                </span>
                <Badge variant="outline">{format} · Letter</Badge>
            </div>
            {paper(current)}
        </div>
    );
    const optimize = (
        <Card>
            <CardHeader>
                <CardTitle>Check the fit</CardTitle>
                <CardDescription>
                    Compare wording with your target role. This is a local
                    keyword check, not an ATS prediction.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
                {field("Job description", jd, setJd, true)}
                <Separator />
                <h3 className="text-sm font-medium">Terms present in both</h3>
                <div className="flex flex-wrap gap-2">
                    {[
                        "design",
                        "research",
                        "systems",
                        "engineering",
                        "product",
                        "collaboration",
                    ]
                        .filter(
                            (word) =>
                                jd.toLowerCase().includes(word) &&
                                (current.summary + current.experience)
                                    .toLowerCase()
                                    .includes(word),
                        )
                        .map((word) => (
                            <Badge variant="secondary" key={word}>
                                {word}
                            </Badge>
                        ))}
                </div>
                <p className="text-sm text-muted-foreground">
                    Paste a description to reveal shared terms. Only include
                    skills and experience you can support.
                </p>
            </CardContent>
        </Card>
    );
    const editor = (
        <>
            {tab === "Review" ? (
                <div className="mx-auto w-full max-w-3xl">{preview}</div>
            ) : (
                <div className="grid items-start gap-6 xl:grid-cols-2">
                    <div className="min-w-0">
                        {tab === "Optimize" ? optimize : form}
                    </div>
                    <div className="min-w-0 xl:sticky xl:top-6">{preview}</div>
                </div>
            )}
        </>
    );
    const toolbar = (
        <div className="flex flex-wrap items-center justify-between gap-3 py-5">
            {modes}
            <div className="flex flex-wrap items-center gap-2">
                <Select
                    aria-label="Resume template"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                >
                    <option>Modern</option>
                    <option>Classic</option>
                </Select>
                <Button variant="ghost" onClick={() => setSheet("history")}>
                    <History data-icon="inline-start" />
                    Checkpoints
                </Button>
            </div>
        </div>
    );
    const header = (
        <header className="flex flex-wrap items-center justify-between gap-4 border-b bg-background px-6 py-5">
            <div className="flex items-center gap-3">
                {direction === 0 && <SidebarTrigger />}
                <FileText className="size-5" />
                <div>
                    <p className="text-xs text-muted-foreground">
                        Resumes / Product design
                    </p>
                    <h1 className="mt-1 text-lg font-semibold tracking-tight">
                        {direction === 4
                            ? "Your resume versions"
                            : current.title}
                    </h1>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className="mr-2 hidden text-xs text-muted-foreground sm:inline-flex items-center gap-1">
                    <Check className="size-3" />
                    Session draft
                </span>
                <Button variant="outline" onClick={() => setDialog("share")}>
                    <Share2 data-icon="inline-start" />
                    Share
                </Button>
                <Button onClick={download}>
                    <Download data-icon="inline-start" />
                    Export text
                </Button>
            </div>
        </header>
    );
    const rail = (
        <Sidebar collapsible="offcanvas">
            <SidebarHeader className="p-5">
                <div className="flex items-center gap-2 font-semibold">
                    <FileText className="size-5" />
                    Resumegen
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                    Your next chapter, clearly told.
                </p>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>
                        Product design · {versions.length} versions
                    </SidebarGroupLabel>
                    <SidebarMenu>
                        {versions.map((v) => (
                            <SidebarMenuItem key={v.id}>
                                <RailButton
                                    isActive={v.id === active}
                                    onClick={() => choose(v.id)}
                                    className="h-auto py-3"
                                >
                                    <GitBranch />
                                    <span className="flex flex-col gap-1">
                                        <span>{v.title}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {v.status}
                                        </span>
                                    </span>
                                </RailButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={newVersion}
                    >
                        <Plus data-icon="inline-start" />
                        New version
                    </Button>
                </SidebarGroup>
                <SidebarGroup>
                    <SidebarGroupLabel>In this version</SidebarGroupLabel>
                    <SidebarMenu>
                        {[
                            "Contact",
                            "Summary",
                            "Experience",
                            "Education",
                            "Skills",
                        ].map((s) => (
                            <SidebarMenuItem key={s}>
                                <RailButton
                                    onClick={() => {
                                        setSection(s);
                                        setSheet("edit");
                                    }}
                                >
                                    <ListChecks />
                                    {s}
                                </RailButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="p-5">
                <p className="text-xs leading-relaxed text-muted-foreground">
                    Versions are separate resumes.
                    <br />
                    Checkpoints save an earlier state.
                </p>
            </SidebarFooter>
        </Sidebar>
    );
    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="border-b bg-muted/40 px-4 py-3">
                <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="outline">Design preview</Badge>
                        <Button variant="ghost" size="sm" asChild>
                            <a href="./round-two.html">
                                Six new concepts
                                <ArrowRight />
                            </a>
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            Sample content · changes stay in this session
                        </span>
                    </div>
                    <Tabs
                        value={String(direction)}
                        onValueChange={switchDirection}
                    >
                        <TabsList className="h-auto flex-wrap">
                            {directions.map((d, i) => (
                                <TabsTrigger value={String(i)} key={d.name}>
                                    {i + 1}. {d.name}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>
            </div>
            <div className="border-b px-6 py-4">
                <div className="mx-auto flex max-w-[1500px] flex-wrap items-baseline gap-x-4 gap-y-1">
                    <h2 className="text-sm font-semibold">
                        {directions[direction].tag}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        {directions[direction].description}
                    </p>
                </div>
            </div>
            {direction === 0 ? (
                <SidebarProvider className="min-h-[calc(100vh-120px)]">
                    <div className="[&_[data-slot=sidebar-container]]:top-[120px] [&_[data-slot=sidebar-container]]:h-[calc(100svh-120px)]">
                        {rail}
                    </div>
                    <SidebarInset>
                        {header}
                        <div className="px-6 pb-8">
                            {toolbar}
                            {editor}
                        </div>
                    </SidebarInset>
                </SidebarProvider>
            ) : (
                <>
                    {header}
                    <main
                        className={cn(
                            "mx-auto max-w-[1500px] px-6 pb-12",
                            direction === 1 && "max-w-[1320px]",
                        )}
                    >
                        {direction === 1 && (
                            <>
                                <div className="flex flex-wrap items-center justify-between gap-3 pt-6">
                                    {versionPicker}
                                    <Button
                                        variant="outline"
                                        onClick={newVersion}
                                    >
                                        <Plus data-icon="inline-start" />
                                        New version
                                    </Button>
                                </div>
                                {toolbar}
                                {editor}
                            </>
                        )}
                        {direction === 2 && (
                            <>
                                <div className="flex flex-wrap items-center justify-between gap-3 py-5">
                                    {versionPicker}
                                    {modes}
                                    <Button
                                        variant="outline"
                                        onClick={newVersion}
                                    >
                                        <Plus data-icon="inline-start" />
                                        New version
                                    </Button>
                                </div>
                                {tab === "Edit" ? (
                                    <div className="grid gap-6 xl:grid-cols-[190px_minmax(0,1fr)_minmax(0,1.15fr)]">
                                        <nav
                                            aria-label="Resume sections"
                                            className="flex flex-col gap-2"
                                        >
                                            <p className="mb-3 text-xs text-muted-foreground">
                                                BUILD YOUR RESUME
                                            </p>
                                            {[
                                                "Contact",
                                                "Summary",
                                                "Experience",
                                                "Education",
                                                "Skills",
                                            ].map((s, i) => (
                                                <Button
                                                    key={s}
                                                    variant={
                                                        s === section
                                                            ? "secondary"
                                                            : "ghost"
                                                    }
                                                    className="justify-start"
                                                    onClick={() =>
                                                        setSection(s)
                                                    }
                                                >
                                                    <span className="mr-2 text-xs">
                                                        0{i + 1}
                                                    </span>
                                                    {s}
                                                </Button>
                                            ))}
                                            <Separator className="my-4" />
                                            <Button
                                                variant="ghost"
                                                className="justify-start"
                                                onClick={() =>
                                                    setSheet("history")
                                                }
                                            >
                                                <History />
                                                Checkpoints
                                            </Button>
                                        </nav>
                                        <Card>
                                            <CardHeader>
                                                <CardDescription>
                                                    SECTION{" "}
                                                    {[
                                                        "Contact",
                                                        "Summary",
                                                        "Experience",
                                                        "Education",
                                                        "Skills",
                                                    ].indexOf(section) + 1}{" "}
                                                    OF 5
                                                </CardDescription>
                                                <CardTitle>{section}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                {sectionFields(section)}
                                            </CardContent>
                                            <CardFooter className="justify-between">
                                                <Button
                                                    variant="ghost"
                                                    disabled={
                                                        section === "Contact"
                                                    }
                                                    onClick={() =>
                                                        setSection(
                                                            [
                                                                "Contact",
                                                                "Summary",
                                                                "Experience",
                                                                "Education",
                                                                "Skills",
                                                            ][
                                                                [
                                                                    "Contact",
                                                                    "Summary",
                                                                    "Experience",
                                                                    "Education",
                                                                    "Skills",
                                                                ].indexOf(
                                                                    section,
                                                                ) - 1
                                                            ],
                                                        )
                                                    }
                                                >
                                                    <ArrowLeft />
                                                    Back
                                                </Button>
                                                <Button
                                                    onClick={() =>
                                                        section === "Skills"
                                                            ? setTab("Review")
                                                            : setSection(
                                                                  [
                                                                      "Contact",
                                                                      "Summary",
                                                                      "Experience",
                                                                      "Education",
                                                                      "Skills",
                                                                  ][
                                                                      [
                                                                          "Contact",
                                                                          "Summary",
                                                                          "Experience",
                                                                          "Education",
                                                                          "Skills",
                                                                      ].indexOf(
                                                                          section,
                                                                      ) + 1
                                                                  ],
                                                              )
                                                    }
                                                >
                                                    {section === "Skills"
                                                        ? "Review"
                                                        : "Next section"}
                                                    <ArrowRight />
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                        <div className="min-w-0">{preview}</div>
                                    </div>
                                ) : (
                                    editor
                                )}
                            </>
                        )}
                        {direction === 3 && (
                            <>
                                <div className="flex flex-wrap items-center justify-between gap-3 py-6">
                                    <div>
                                        <h2 className="text-xl font-semibold tracking-tight">
                                            Make every version intentional.
                                        </h2>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Compare your base with a tailored
                                            version before you send it.
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={newVersion}
                                        >
                                            <Copy />
                                            Duplicate version
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                setSection("Summary");
                                                setSheet("edit");
                                            }}
                                        >
                                            Edit selected version
                                        </Button>
                                    </div>
                                </div>
                                <div className="grid gap-6 lg:grid-cols-2">
                                    <div className="min-w-0">
                                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                            <Label htmlFor="compare-version">
                                                Compare from
                                            </Label>
                                            <Select
                                                id="compare-version"
                                                value={compare}
                                                onChange={(e) =>
                                                    setCompare(e.target.value)
                                                }
                                            >
                                                {versions.map((v) => (
                                                    <option
                                                        value={v.id}
                                                        key={v.id}
                                                    >
                                                        {v.title}
                                                    </option>
                                                ))}
                                            </Select>
                                        </div>
                                        {paper(
                                            versions.find(
                                                (v) => v.id === compare,
                                            )!,
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                            <Badge variant="secondary">
                                                Current version
                                            </Badge>
                                            {versionPicker}
                                        </div>
                                        {paper(current, true)}
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-3 py-5">
                                    <p className="text-sm text-muted-foreground">
                                        Marked blocks identify tailored content.
                                        Your base stays independent.
                                    </p>
                                    <Button
                                        variant="outline"
                                        onClick={checkpoint}
                                    >
                                        <History />
                                        Save checkpoint
                                    </Button>
                                </div>
                            </>
                        )}
                        {direction === 4 && (
                            <>
                                <div className="flex flex-wrap items-center justify-between gap-3 py-5">
                                    <div>
                                        <h2 className="text-xl font-semibold">
                                            One background. Different
                                            opportunities.
                                        </h2>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Choose a version to edit, or start a
                                            new one from an existing resume.
                                        </p>
                                    </div>
                                    <Button onClick={newVersion}>
                                        <Plus />
                                        New version
                                    </Button>
                                </div>
                                <Input
                                    aria-label="Filter versions"
                                    placeholder="Find a version or company…"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="mb-4 max-w-sm"
                                />
                                <div className="overflow-hidden rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Version</TableHead>
                                                <TableHead>Company</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">
                                                    Open
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {versions
                                                .filter((v) =>
                                                    (v.title + v.company)
                                                        .toLowerCase()
                                                        .includes(
                                                            query.toLowerCase(),
                                                        ),
                                                )
                                                .map((v) => (
                                                    <TableRow
                                                        key={v.id}
                                                        data-state={
                                                            v.id === active
                                                                ? "selected"
                                                                : undefined
                                                        }
                                                    >
                                                        <TableCell>
                                                            <span className="flex items-center gap-2">
                                                                <FileText className="size-4" />
                                                                {v.title}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            {v.company}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">
                                                                {v.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                variant={
                                                                    v.id ===
                                                                    active
                                                                        ? "secondary"
                                                                        : "ghost"
                                                                }
                                                                size="sm"
                                                                onClick={() =>
                                                                    choose(v.id)
                                                                }
                                                            >
                                                                {v.id === active
                                                                    ? "Editing"
                                                                    : "Edit version"}
                                                                <ArrowRight />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            {versions.filter((v) =>
                                                (v.title + v.company)
                                                    .toLowerCase()
                                                    .includes(
                                                        query.toLowerCase(),
                                                    ),
                                            ).length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={4}>
                                                        No matching versions.
                                                        Try another name.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                                {toolbar}
                                {editor}
                            </>
                        )}
                    </main>
                </>
            )}
            <Toaster position="bottom-center" />
            <Dialog
                open={dialog !== null}
                onOpenChange={(open) => !open && setDialog(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {dialog === "new"
                                ? "Create a new version"
                                : "Share this version"}
                        </DialogTitle>
                        <DialogDescription>
                            {dialog === "new"
                                ? `Copy “${current.title}” into an independent version. The original stays unchanged.`
                                : "This mockup shows where sharing belongs. No public link is created."}
                        </DialogDescription>
                    </DialogHeader>
                    {dialog === "new" ? (
                        field("Version name", name, setName)
                    ) : (
                        <Alert>
                            <AlertDescription>
                                Sharing applies only to {current.title}. Other
                                versions remain private.
                            </AlertDescription>
                        </Alert>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDialog(null)}
                        >
                            Close
                        </Button>
                        {dialog === "new" && (
                            <Button
                                disabled={!name.trim()}
                                onClick={() => {
                                    const id = crypto.randomUUID();
                                    setVersions((all) => [
                                        ...all,
                                        {
                                            ...current,
                                            id,
                                            title: name.trim(),
                                            status: "Draft",
                                        },
                                    ]);
                                    setActive(id);
                                    setDialog(null);
                                    setNotice(
                                        "Independent version created in this session",
                                    );
                                }}
                            >
                                Create version
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Sheet
                open={sheet !== null}
                onOpenChange={(open) => !open && setSheet(null)}
            >
                <SheetContent className="overflow-y-auto sm:max-w-lg">
                    <SheetHeader>
                        <SheetTitle>
                            {sheet === "history"
                                ? "Checkpoints"
                                : "Edit selected version"}
                        </SheetTitle>
                        <DialogDescription>
                            {current.title} · Changes affect this version only.
                        </DialogDescription>
                    </SheetHeader>
                    <div className="mt-6 flex flex-col gap-5">
                        {sheet === "history" ? (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    A checkpoint is a saved state inside this
                                    version. It is not a separate resume.
                                </p>
                                <Button onClick={checkpoint}>
                                    <Plus />
                                    Save checkpoint
                                </Button>
                                {checkpoints.filter((c) => c.data.id === active)
                                    .length === 0 && (
                                    <p className="text-sm text-muted-foreground">
                                        No checkpoints yet. Save one before
                                        trying a change.
                                    </p>
                                )}
                                {checkpoints
                                    .filter((c) => c.data.id === active)
                                    .map((c) => (
                                        <Card key={c.id}>
                                            <CardHeader>
                                                <CardTitle>{c.label}</CardTitle>
                                                <CardDescription>
                                                    {c.data.headline}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardFooter>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        setVersions((all) =>
                                                            all.map((v) =>
                                                                v.id === active
                                                                    ? {
                                                                          ...c.data,
                                                                      }
                                                                    : v,
                                                            ),
                                                        );
                                                        setNotice(
                                                            `${c.label} restored`,
                                                        );
                                                    }}
                                                >
                                                    Restore checkpoint
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ))}
                            </>
                        ) : (
                            <>
                                <Select
                                    aria-label="Section to edit"
                                    value={section}
                                    onChange={(e) => setSection(e.target.value)}
                                >
                                    {[
                                        "Contact",
                                        "Summary",
                                        "Experience",
                                        "Education",
                                        "Skills",
                                    ].map((s) => (
                                        <option key={s}>{s}</option>
                                    ))}
                                </Select>
                                {sectionFields(section)}
                            </>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
createRoot(document.getElementById("root")!).render(<App />);
