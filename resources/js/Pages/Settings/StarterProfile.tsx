import { Form, Head, Link, router } from '@inertiajs/react';
import { BriefcaseIcon, CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';
import { Button, buttonClassName } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { Checkbox } from '@/Components/ui/checkbox';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { formatPhone } from '@/lib/contact-validation';
import type {
    QaBankEntry,
    StarterProfile,
    StarterProfileExperience,
    StarterProfileSkill,
} from '@/types';

const MAX_QA_ENTRIES = 30;

// Read the fresh XSRF-TOKEN cookie Laravel refreshes on every response — the
// <meta> CSRF token goes stale in an SPA (see commit cc11c580).
const xsrfToken = (): string => {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
};

function QaBankSection({ entries }: { entries: QaBankEntry[] }) {
    const [newQuestion, setNewQuestion] = useState('');
    const [drafts, setDrafts] = useState<Record<number, string>>({});
    const [drafting, setDrafting] = useState<number | null>(null);
    const [processingId, setProcessingId] = useState<number | 'new' | null>(null);

    const addEntry = () => {
        if (!newQuestion.trim()) {
            return;
        }
        setProcessingId('new');
        router.post(
            route('qa-bank-entries.store'),
            { question: newQuestion },
            {
                preserveScroll: true,
                onSuccess: () => setNewQuestion(''),
                onFinish: () => setProcessingId(null),
            },
        );
    };

    const updateAnswer = (entry: QaBankEntry, answer: string) => {
        setProcessingId(entry.id);
        router.patch(
            route('qa-bank-entries.update', entry.id),
            { answer },
            { preserveScroll: true, onFinish: () => setProcessingId(null) },
        );
    };

    const deleteEntry = (entry: QaBankEntry) => {
        setProcessingId(entry.id);
        router.delete(route('qa-bank-entries.destroy', entry.id), {
            preserveScroll: true,
            onFinish: () => setProcessingId(null),
        });
    };

    const draftAnswer = async (entry: QaBankEntry) => {
        setDrafting(entry.id);
        try {
            const response = await fetch(route('qa-bank-entries.draft', entry.id), {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': xsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const body = await response.json();
            if (response.ok) {
                setDrafts((current) => ({ ...current, [entry.id]: body.draft }));
            } else {
                setDrafts((current) => ({ ...current, [entry.id]: `Error: ${body.message}` }));
            }
        } finally {
            setDrafting(null);
        }
    };

    return (
        <div className="grid gap-3">
            <Label>Application Q&A bank</Label>
            <p className="text-xs text-muted-foreground">
                Save answers to common application questions to reuse them when applying — the browser extension can autofill from these.
            </p>
            {entries.map((entry) => (
                <div key={entry.id} className="grid gap-2 rounded-md border border-border p-3">
                    <p className="text-sm font-semibold text-foreground">{entry.question}</p>
                    <textarea
                        aria-label={`Answer to: ${entry.question}`}
                        defaultValue={entry.answer ?? ''}
                        onBlur={(e) => updateAnswer(entry, e.target.value)}
                        placeholder="Your answer"
                        rows={3}
                        disabled={processingId === entry.id}
                        className="block w-full rounded-lg border-border text-sm shadow-xs transition-[border-color,box-shadow] duration-soft ease-soft focus:border-primary focus:ring-primary"
                    />
                    {drafts[entry.id] && (
                        <p className="rounded-md bg-primary/10/50 p-2 text-xs text-foreground">
                            <span className="font-semibold">AI draft:</span> {drafts[entry.id]}
                        </p>
                    )}
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={drafting === entry.id}
                            onClick={() => draftAnswer(entry)}
                        >
                            {drafting === entry.id ? 'Drafting…' : 'Draft with AI'}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteEntry(entry)}
                            disabled={processingId === entry.id}
                        >
                            Remove
                        </Button>
                    </div>
                </div>
            ))}
            <div className="flex gap-2">
                <Input
                    aria-label="New question"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Why do you want to work here?"
                    className="flex-1"
                />
                <Button
                    type="button"
                    variant="outline"
                    disabled={entries.length >= MAX_QA_ENTRIES || processingId === 'new'}
                    onClick={addEntry}
                >
                    Add question
                </Button>
            </div>
        </div>
    );
}

const MAX_EXPERIENCES = 20;
const MAX_SKILLS = 60;

const blankExperience = (): StarterProfileExperience => ({
    title: '',
    company: '',
    start_date: '',
    end_date: '',
    is_current: false,
    bullets: [''],
});

export default function StarterProfilePage({
    starterProfile,
    qaBankEntries,
}: {
    starterProfile: StarterProfile | null;
    qaBankEntries: QaBankEntry[];
}) {
    const [experiences, setExperiences] = useState<StarterProfileExperience[]>(
        starterProfile?.experience_snapshot ?? [],
    );
    const [skills, setSkills] = useState<StarterProfileSkill[]>(
        starterProfile?.skills ?? [],
    );
    const [phone, setPhone] = useState(starterProfile?.phone ?? '');

    // After a successful save Inertia reuses this page with fresh props;
    // re-sync list/phone state so blank rows dropped server-side disappear.
    useEffect(() => {
        setExperiences(starterProfile?.experience_snapshot ?? []);
        setSkills(starterProfile?.skills ?? []);
        setPhone(starterProfile?.phone ?? '');
    }, [starterProfile]);

    const updateExperience = (
        index: number,
        patch: Partial<StarterProfileExperience>,
    ): void =>
        setExperiences(
            experiences.map((e, i) => (i === index ? { ...e, ...patch } : e)),
        );

    const updateSkill = (
        index: number,
        patch: Partial<StarterProfileSkill>,
    ): void =>
        setSkills(skills.map((s, i) => (i === index ? { ...s, ...patch } : s)));

    return (
        <AuthenticatedLayout
            header={
                <h1 className="text-xl font-semibold text-foreground">
                    Starter profile
                </h1>
            }
        >
            <Head title="Starter profile" />

            <div className="py-8">
                <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <p className="text-sm text-muted-foreground">
                        Set this up once and every new resume starts pre-filled.
                        You can edit it anytime.
                    </p>

                    <Card className="overflow-hidden border-primary/10 bg-primary/10/60 p-0">
                        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:p-6">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <SparklesIcon className="size-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-base font-bold tracking-tight">
                                    Build your career source of truth
                                </p>
                                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                                    Add the details you want reused when
                                    creating new resumes.
                                </p>
                                <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                                    <span className="flex items-center gap-2">
                                        <CheckCircleIcon className="size-3.5 text-primary" />
                                        Pre-filled resumes
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <CheckCircleIcon className="size-3.5 text-primary" />
                                        Consistent contact details
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <CheckCircleIcon className="size-3.5 text-primary" />
                                        Stronger role targeting
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Form
                        action={route('starter-profile.update')}
                        method="patch"
                        options={{ preserveScroll: true }}
                        className="space-y-8"
                    >
                        {({ processing, errors, recentlySuccessful }) => (
                            <>
                                <section className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <BriefcaseIcon className="size-4 text-primary" />
                                        <h2 className="text-sm font-bold">
                                            Your professional snapshot
                                        </h2>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="full_name">
                                                Full name
                                            </Label>
                                            <Input
                                                id="full_name"
                                                name="full_name"
                                                defaultValue={
                                                    starterProfile?.full_name ?? ''
                                                }
                                                placeholder="Ada Lovelace"
                                            />
                                            <InputError
                                                message={errors.full_name}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="headline">
                                                Headline
                                            </Label>
                                            <Input
                                                id="headline"
                                                name="headline"
                                                defaultValue={
                                                    starterProfile?.headline ?? ''
                                                }
                                                placeholder="Staff Engineer"
                                            />
                                            <InputError message={errors.headline} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                name="email"
                                                defaultValue={
                                                    starterProfile?.email ?? ''
                                                }
                                                placeholder="you@example.com"
                                            />
                                            <InputError message={errors.email} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="phone">Phone</Label>
                                            <Input
                                                id="phone"
                                                type="tel"
                                                name="phone"
                                                value={phone}
                                                onChange={(event) =>
                                                    setPhone(
                                                        formatPhone(
                                                            event.target.value,
                                                        ),
                                                    )
                                                }
                                                placeholder="(555) 123-4567"
                                            />
                                            <InputError message={errors.phone} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="location">
                                                Location
                                            </Label>
                                            <Input
                                                id="location"
                                                name="location"
                                                defaultValue={
                                                    starterProfile?.location ?? ''
                                                }
                                                placeholder="San Francisco, CA"
                                            />
                                            <InputError message={errors.location} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="target_role">
                                                Target role
                                            </Label>
                                            <Input
                                                id="target_role"
                                                name="target_role"
                                                defaultValue={
                                                    starterProfile?.target_role ??
                                                    ''
                                                }
                                                placeholder="Senior Backend Engineer"
                                            />
                                            <InputError
                                                message={errors.target_role}
                                            />
                                        </div>
                                    </div>
                                </section>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="linkedin">LinkedIn</Label>
                                        <Input
                                            id="linkedin"
                                            name="linkedin"
                                            defaultValue={
                                                starterProfile?.linkedin ?? ''
                                            }
                                            placeholder="https://linkedin.com/in/you"
                                        />
                                        <InputError message={errors.linkedin} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="website">Website</Label>
                                        <Input
                                            id="website"
                                            name="website"
                                            defaultValue={
                                                starterProfile?.website ?? ''
                                            }
                                            placeholder="https://you.dev"
                                        />
                                        <InputError message={errors.website} />
                                    </div>
                                </div>

                                <div className="grid gap-3">
                                    <Label>Recent experience</Label>
                                    {experiences.map((experience, index) => (
                                        <div
                                            key={index}
                                            className="grid gap-2 rounded-md border border-border p-3"
                                        >
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                <Input
                                                    aria-label={`Experience ${index + 1} title`}
                                                    value={experience.title}
                                                    onChange={(event) =>
                                                        updateExperience(index, {
                                                            title: event.target
                                                                .value,
                                                        })
                                                    }
                                                    name={`experience_snapshot[${index}][title]`}
                                                    placeholder="Job title"
                                                />
                                                <Input
                                                    aria-label={`Experience ${index + 1} company`}
                                                    value={experience.company}
                                                    onChange={(event) =>
                                                        updateExperience(index, {
                                                            company:
                                                                event.target.value,
                                                        })
                                                    }
                                                    name={`experience_snapshot[${index}][company]`}
                                                    placeholder="Company"
                                                />
                                                <Input
                                                    aria-label={`Experience ${index + 1} start date`}
                                                    value={experience.start_date}
                                                    onChange={(event) =>
                                                        updateExperience(index, {
                                                            start_date:
                                                                event.target.value,
                                                        })
                                                    }
                                                    name={`experience_snapshot[${index}][start_date]`}
                                                    placeholder="Jan 2020"
                                                />
                                                <Input
                                                    aria-label={`Experience ${index + 1} end date`}
                                                    value={experience.end_date}
                                                    onChange={(event) =>
                                                        updateExperience(index, {
                                                            end_date:
                                                                event.target.value,
                                                        })
                                                    }
                                                    name={`experience_snapshot[${index}][end_date]`}
                                                    placeholder="Present"
                                                />
                                            </div>
                                            {/* One bullet per line; the server drops blanks. */}
                                            <Input
                                                aria-label={`Experience ${index + 1} summary`}
                                                value={experience.bullets[0] ?? ''}
                                                onChange={(event) =>
                                                    updateExperience(index, {
                                                        bullets: [
                                                            event.target.value,
                                                        ],
                                                    })
                                                }
                                                name={`experience_snapshot[${index}][bullets][0]`}
                                                placeholder="One line on what you did"
                                            />
                                            <Label className="font-normal">
                                                <Checkbox
                                                    checked={experience.is_current}
                                                    onCheckedChange={(checked) =>
                                                        updateExperience(index, {
                                                            is_current:
                                                                checked === true,
                                                        })
                                                    }
                                                />
                                                I currently work here
                                            </Label>
                                            <input
                                                type="hidden"
                                                name={`experience_snapshot[${index}][is_current]`}
                                                value={
                                                    experience.is_current
                                                        ? '1'
                                                        : '0'
                                                }
                                            />
                                            <div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    onClick={() =>
                                                        setExperiences(
                                                            experiences.filter(
                                                                (_, i) =>
                                                                    i !== index,
                                                            ),
                                                        )
                                                    }
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    <div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={
                                                experiences.length >=
                                                MAX_EXPERIENCES
                                            }
                                            onClick={() =>
                                                setExperiences([
                                                    ...experiences,
                                                    blankExperience(),
                                                ])
                                            }
                                        >
                                            Add role
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid gap-3">
                                    <Label>Skills</Label>
                                    {skills.map((skill, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-2"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <Input
                                                    aria-label={`Skill ${index + 1}`}
                                                    value={skill.name}
                                                    onChange={(event) =>
                                                        updateSkill(index, {
                                                            name: event.target.value,
                                                        })
                                                    }
                                                    name={`skills[${index}][name]`}
                                                    placeholder="PostgreSQL"
                                                />
                                                <InputError
                                                    message={
                                                        errors[
                                                            `skills.${index}.name`
                                                        ]
                                                    }
                                                />
                                            </div>
                                            <input
                                                type="hidden"
                                                name={`skills[${index}][category]`}
                                                value={skill.category}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() =>
                                                    setSkills(
                                                        skills.filter(
                                                            (_, i) => i !== index,
                                                        ),
                                                    )
                                                }
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    ))}
                                    <div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={skills.length >= MAX_SKILLS}
                                            onClick={() =>
                                                setSkills([
                                                    ...skills,
                                                    { category: '', name: '' },
                                                ])
                                            }
                                        >
                                            Add skill
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <Button type="submit" disabled={processing}>
                                        Save
                                    </Button>
                                    {recentlySuccessful && (
                                        <p className="text-sm text-muted-foreground">
                                            Saved.
                                        </p>
                                    )}
                                    <Link
                                        href={route('starter-profile.skip')}
                                        method="post"
                                        as="button"
                                        className={buttonClassName('ghost')}
                                    >
                                        Skip for now
                                    </Link>
                                </div>
                            </>
                        )}
                    </Form>

                    <QaBankSection entries={qaBankEntries} />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
