import type { ReactNode } from 'react';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import type { ResumeDraft, SectionKey } from '@/shadcn-demo/types';

function uid() {
    return Math.random().toString(36).slice(2, 9);
}

export function SectionFields({
    section,
    draft,
    onChange,
}: {
    section: SectionKey;
    draft: ResumeDraft;
    onChange: (next: ResumeDraft) => void;
}) {
    function set<K extends keyof ResumeDraft>(key: K, value: ResumeDraft[K]) {
        onChange({ ...draft, [key]: value });
    }

    if (section === 'contact') {
        return (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Full name">
                    <Input
                        value={draft.full_name}
                        onChange={(e) => set('full_name', e.target.value)}
                    />
                </Field>
                <Field label="Headline">
                    <Input
                        value={draft.headline}
                        onChange={(e) => set('headline', e.target.value)}
                    />
                </Field>
                <Field label="Email">
                    <Input
                        value={draft.email}
                        onChange={(e) => set('email', e.target.value)}
                    />
                </Field>
                <Field label="Phone">
                    <Input
                        value={draft.phone}
                        onChange={(e) => set('phone', e.target.value)}
                    />
                </Field>
                <Field label="Location">
                    <Input
                        value={draft.location}
                        onChange={(e) => set('location', e.target.value)}
                    />
                </Field>
                <Field label="Website">
                    <Input
                        value={draft.website}
                        onChange={(e) => set('website', e.target.value)}
                    />
                </Field>
            </div>
        );
    }

    if (section === 'summary') {
        return (
            <Field label="Summary">
                <Textarea
                    rows={4}
                    value={draft.summary}
                    onChange={(e) => set('summary', e.target.value)}
                />
            </Field>
        );
    }

    if (section === 'skills') {
        return (
            <Field label="Skills (comma separated)">
                <Input
                    value={draft.skills.join(', ')}
                    onChange={(e) =>
                        set(
                            'skills',
                            e.target.value
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean),
                        )
                    }
                />
            </Field>
        );
    }

    if (section === 'experience') {
        return (
            <div className="flex flex-col gap-4">
                {draft.experiences.map((exp, index) => (
                    <div key={exp.id} className="rounded-lg border p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Entry {index + 1}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                    set(
                                        'experiences',
                                        draft.experiences.filter((e) => e.id !== exp.id),
                                    )
                                }
                            >
                                <TrashIcon />
                                Remove
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Field label="Title">
                                <Input
                                    value={exp.title}
                                    onChange={(e) =>
                                        updateExperience(exp.id, { title: e.target.value })
                                    }
                                />
                            </Field>
                            <Field label="Company">
                                <Input
                                    value={exp.company}
                                    onChange={(e) =>
                                        updateExperience(exp.id, { company: e.target.value })
                                    }
                                />
                            </Field>
                            <Field label="Location">
                                <Input
                                    value={exp.location}
                                    onChange={(e) =>
                                        updateExperience(exp.id, { location: e.target.value })
                                    }
                                />
                            </Field>
                            <div className="grid grid-cols-2 gap-2">
                                <Field label="Start">
                                    <Input
                                        value={exp.start}
                                        onChange={(e) =>
                                            updateExperience(exp.id, { start: e.target.value })
                                        }
                                    />
                                </Field>
                                <Field label="End">
                                    <Input
                                        value={exp.end}
                                        onChange={(e) =>
                                            updateExperience(exp.id, { end: e.target.value })
                                        }
                                    />
                                </Field>
                            </div>
                        </div>
                        <Field label="Bullets (one per line)" className="mt-3">
                            <Textarea
                                rows={3}
                                value={exp.bullets.join('\n')}
                                onChange={(e) =>
                                    updateExperience(exp.id, {
                                        bullets: e.target.value.split('\n'),
                                    })
                                }
                            />
                        </Field>
                    </div>
                ))}
                <Button
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() =>
                        set('experiences', [
                            ...draft.experiences,
                            {
                                id: uid(),
                                title: '',
                                company: '',
                                location: '',
                                start: '',
                                end: '',
                                bullets: [''],
                            },
                        ])
                    }
                >
                    <PlusIcon />
                    Add experience
                </Button>
            </div>
        );

        function updateExperience(
            id: string,
            patch: Partial<ResumeDraft['experiences'][number]>,
        ) {
            set(
                'experiences',
                draft.experiences.map((exp) =>
                    exp.id === id ? { ...exp, ...patch } : exp,
                ),
            );
        }
    }

    if (section === 'education') {
        return (
            <div className="flex flex-col gap-4">
                {draft.education.map((edu) => (
                    <div key={edu.id} className="grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-2">
                        <Field label="School">
                            <Input
                                value={edu.school}
                                onChange={(e) =>
                                    set(
                                        'education',
                                        draft.education.map((item) =>
                                            item.id === edu.id
                                                ? { ...item, school: e.target.value }
                                                : item,
                                        ),
                                    )
                                }
                            />
                        </Field>
                        <Field label="Degree">
                            <Input
                                value={edu.degree}
                                onChange={(e) =>
                                    set(
                                        'education',
                                        draft.education.map((item) =>
                                            item.id === edu.id
                                                ? { ...item, degree: e.target.value }
                                                : item,
                                        ),
                                    )
                                }
                            />
                        </Field>
                    </div>
                ))}
                <Button
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() =>
                        set('education', [
                            ...draft.education,
                            { id: uid(), school: '', degree: '', location: '', start: '', end: '' },
                        ])
                    }
                >
                    <PlusIcon />
                    Add education
                </Button>
            </div>
        );
    }

    if (section === 'projects') {
        return (
            <div className="flex flex-col gap-4">
                {draft.projects.map((project) => (
                    <div key={project.id} className="rounded-lg border p-3">
                        <Field label="Name">
                            <Input
                                value={project.name}
                                onChange={(e) =>
                                    set(
                                        'projects',
                                        draft.projects.map((item) =>
                                            item.id === project.id
                                                ? { ...item, name: e.target.value }
                                                : item,
                                        ),
                                    )
                                }
                            />
                        </Field>
                        <Field label="Description" className="mt-3">
                            <Textarea
                                rows={2}
                                value={project.description}
                                onChange={(e) =>
                                    set(
                                        'projects',
                                        draft.projects.map((item) =>
                                            item.id === project.id
                                                ? { ...item, description: e.target.value }
                                                : item,
                                        ),
                                    )
                                }
                            />
                        </Field>
                    </div>
                ))}
                <Button
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() =>
                        set('projects', [
                            ...draft.projects,
                            { id: uid(), name: '', description: '', highlights: [] },
                        ])
                    }
                >
                    <PlusIcon />
                    Add project
                </Button>
            </div>
        );
    }

    if (section === 'certificates') {
        return (
            <div className="flex flex-col gap-4">
                {draft.certificates.map((cert) => (
                    <div key={cert.id} className="grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-3">
                        <Field label="Name">
                            <Input
                                value={cert.name}
                                onChange={(e) =>
                                    set(
                                        'certificates',
                                        draft.certificates.map((item) =>
                                            item.id === cert.id
                                                ? { ...item, name: e.target.value }
                                                : item,
                                        ),
                                    )
                                }
                            />
                        </Field>
                        <Field label="Issuer">
                            <Input
                                value={cert.issuer}
                                onChange={(e) =>
                                    set(
                                        'certificates',
                                        draft.certificates.map((item) =>
                                            item.id === cert.id
                                                ? { ...item, issuer: e.target.value }
                                                : item,
                                        ),
                                    )
                                }
                            />
                        </Field>
                        <Field label="Date">
                            <Input
                                value={cert.date}
                                onChange={(e) =>
                                    set(
                                        'certificates',
                                        draft.certificates.map((item) =>
                                            item.id === cert.id
                                                ? { ...item, date: e.target.value }
                                                : item,
                                        ),
                                    )
                                }
                            />
                        </Field>
                    </div>
                ))}
                <Button
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() =>
                        set('certificates', [
                            ...draft.certificates,
                            { id: uid(), name: '', issuer: '', date: '' },
                        ])
                    }
                >
                    <PlusIcon />
                    Add certificate
                </Button>
            </div>
        );
    }

    return null;
}

function Field({
    label,
    children,
    className,
}: {
    label: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
            <Label>{label}</Label>
            {children}
        </div>
    );
}
