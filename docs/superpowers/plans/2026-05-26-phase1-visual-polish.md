# Phase 1 — Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Minimal Ruled template, redesign the public resume view, and polish the editor left panel — all with no API dependencies.

**Architecture:** The `ResumeTemplate` type gains `'minimal-ruled'`. The public view is rebuilt with a two-column date/content layout. The editor preview renders it as the 4th template. Left panel gets visual polish only (no logic changes). Backend validation is updated to accept the new template value.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v3, Laravel 13, Inertia.js v2

---

## File Map

| File | Change |
|---|---|
| `resources/js/types/index.d.ts` | Add `'minimal-ruled'` to `ResumeTemplate` union |
| `app/Http/Controllers/ResumeBuilderController.php` | Add `minimal-ruled` to template validation in `update()` and `beacon()` |
| `resources/js/Pages/ResumeBuilder/PublicView.tsx` | Full Minimal Ruled redesign + elevated contact form |
| `resources/js/Pages/ResumeBuilder/Edit.tsx` | Add template option, update preview for minimal-ruled, left panel polish |

---

## Task 1: Add `minimal-ruled` to TypeScript type and backend validation

**Files:**
- Modify: `resources/js/types/index.d.ts`
- Modify: `app/Http/Controllers/ResumeBuilderController.php`

- [ ] **Step 1: Write the failing test**

Add to `tests/Feature/ExampleTest.php` or create `tests/Feature/ResumeBuilderTest.php`:

```php
<?php
namespace Tests\Feature;

use App\Models\User;
use App\Models\Resume;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeBuilderTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_save_minimal_ruled_template(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        $response = $this->actingAs($user)->put(route('builder.update', $resume->id), [
            'name'     => 'Test',
            'template' => 'minimal-ruled',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('resumes', ['id' => $resume->id, 'template' => 'minimal-ruled']);
    }

    public function test_invalid_template_is_rejected(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        $response = $this->actingAs($user)->put(route('builder.update', $resume->id), [
            'name'     => 'Test',
            'template' => 'not-a-real-template',
        ]);

        $response->assertSessionHasErrors('template');
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
php artisan test tests/Feature/ResumeBuilderTest.php
```

Expected: `test_can_save_minimal_ruled_template` FAILS with validation error (template not in allowed list).

- [ ] **Step 3: Update backend validation to accept `minimal-ruled`**

In `app/Http/Controllers/ResumeBuilderController.php`, change both `update()` and `beacon()` — find the line:

```php
'template' => ['sometimes', 'required', 'in:classic,modern,minimal'],
```

Replace with:

```php
'template' => ['sometimes', 'required', 'in:classic,modern,minimal,minimal-ruled'],
```

This appears twice — once in `update()` at line 69, once in `beacon()` at line 112.

- [ ] **Step 4: Update the TypeScript union type**

In `resources/js/types/index.d.ts`, change:

```ts
export type ResumeTemplate = 'classic' | 'modern' | 'minimal';
```

To:

```ts
export type ResumeTemplate = 'classic' | 'modern' | 'minimal' | 'minimal-ruled';
```

- [ ] **Step 5: Run test to verify it passes**

```bash
php artisan test tests/Feature/ResumeBuilderTest.php
```

Expected: both tests PASS.

- [ ] **Step 6: Commit**

```bash
git add resources/js/types/index.d.ts app/Http/Controllers/ResumeBuilderController.php tests/Feature/ResumeBuilderTest.php
git commit -m "feat: add minimal-ruled template type and backend validation"
```

---

## Task 2: Redesign PublicView.tsx with Minimal Ruled layout

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/PublicView.tsx`

The public view always renders Minimal Ruled regardless of the resume's saved template. Layout uses a two-column structure: narrow `w-16` left column for dates (right-aligned, gray), flex-1 right column for content.

- [ ] **Step 1: Replace the resume header section**

Open `resources/js/Pages/ResumeBuilder/PublicView.tsx`. Replace the entire `<div className="mx-auto max-w-[8.5in]...">` block and everything inside it (lines 35–189) with the full redesign below.

Full replacement file content:

```tsx
import PublicLayout from '@/Layouts/PublicLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEvent } from 'react';
import { PageProps, ResumeData } from '@/types';

interface Props {
    resume: ResumeData;
    token: string;
}

export default function PublicView({ resume, token }: Props) {
    const { props } = usePage<PageProps<{ flash: { questionSubmitted?: boolean } }>>();
    const contact = resume.contact;
    const skills = resume.skills ?? [];
    const experience = resume.experience ?? [];
    const education = resume.education ?? [];
    const certifications = resume.certifications ?? [];

    const firstTitle = experience.find(e => e.title)?.title ?? '';
    const firstCompany = experience.find(e => e.company)?.company ?? '';
    const subtitle = [firstTitle, firstCompany].filter(Boolean).join(' · ');

    const form = useForm({
        sender_name: '',
        sender_email: '',
        sender_phone: '',
        message: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('public.question', token));
    };

    return (
        <PublicLayout>
            <Head title={`${resume.name} — Resume`} />

            <div className="min-h-screen bg-gray-50 py-10">
                <div className="mx-auto max-w-[8.5in] bg-white shadow-lg px-[0.75in] py-[0.75in]" style={{ minHeight: '11in' }}>

                    {/* Header */}
                    <div className="mb-10 pb-6 border-b border-gray-200">
                        <h1 className="text-3xl font-light tracking-widest uppercase text-gray-900">
                            {contact?.full_name || resume.name}
                        </h1>
                        {subtitle && (
                            <p className="mt-1 text-xs font-semibold tracking-widest uppercase text-gray-400">{subtitle}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-x-3 text-xs text-gray-500">
                            {contact?.email && <span>{contact.email}</span>}
                            {contact?.phone && <span>· {contact.phone}</span>}
                            {contact?.location && <span>· {contact.location}</span>}
                            {contact?.linkedin && <span>· {contact.linkedin}</span>}
                            {contact?.website && <span>· {contact.website}</span>}
                        </div>
                    </div>

                    {/* Summary */}
                    {resume.summary && (
                        <section className="mb-8">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Summary</div>
                            <p className="text-sm leading-relaxed text-gray-700">{resume.summary}</p>
                        </section>
                    )}

                    {/* Experience */}
                    {experience.some(e => e.company || e.title) && (
                        <section className="mb-8">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Experience</div>
                            {experience.filter(e => e.company || e.title).map(exp => (
                                <div key={exp.id} className="flex gap-6 mb-5">
                                    <div className="w-16 shrink-0 text-right text-xs text-gray-400 pt-0.5 leading-relaxed">
                                        {exp.start_date && <div>{exp.start_date}</div>}
                                        <div>{exp.current ? 'Present' : exp.end_date}</div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-semibold text-gray-900">{exp.title || 'Job Title'}</div>
                                        <div className="text-xs text-gray-500 mb-1">{exp.company}</div>
                                        {exp.bullets && (
                                            <ul className="list-disc pl-4 text-xs text-gray-700 space-y-0.5">
                                                {exp.bullets.split('\n').filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </section>
                    )}

                    {/* Education */}
                    {education.some(e => e.school) && (
                        <section className="mb-8">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Education</div>
                            {education.filter(e => e.school).map(edu => (
                                <div key={edu.id} className="flex gap-6 mb-3">
                                    <div className="w-16 shrink-0 text-right text-xs text-gray-400 pt-0.5">
                                        {edu.grad_year}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-semibold text-gray-900">{edu.school}</div>
                                        <div className="text-xs text-gray-500">{[edu.degree, edu.field].filter(Boolean).join(' in ')}</div>
                                    </div>
                                </div>
                            ))}
                        </section>
                    )}

                    {/* Skills */}
                    {skills.length > 0 && (
                        <section className="mb-8">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Skills</div>
                            <div className="flex flex-wrap gap-2">
                                {skills.map((skill, i) => (
                                    <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-0.5 rounded-full">{skill}</span>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Certifications */}
                    {certifications.some(c => c.name) && (
                        <section className="mb-8">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Certifications</div>
                            {certifications.filter(c => c.name).map(cert => (
                                <div key={cert.id} className="flex gap-6 mb-2">
                                    <div className="w-16 shrink-0 text-right text-xs text-gray-400 pt-0.5">{cert.date}</div>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-900">{cert.name}</div>
                                        {cert.issuer && <div className="text-xs text-gray-500">{cert.issuer}</div>}
                                    </div>
                                </div>
                            ))}
                        </section>
                    )}

                    {/* Contact form */}
                    <div className="mt-12 border-l-4 border-indigo-400 bg-indigo-50 rounded-r-lg p-6">
                        <h3 className="mb-4 text-sm font-semibold text-gray-800">Interested in this candidate? Reach out directly.</h3>

                        {props.flash?.questionSubmitted ? (
                            <div className="flex items-center gap-3 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                                <svg className="h-5 w-5 text-green-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Your message was submitted successfully. Thank you!
                            </div>
                        ) : (
                            <form onSubmit={submit} className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label htmlFor="sender_name" className="text-xs font-medium text-gray-600">Full Name *</label>
                                    <input
                                        id="sender_name"
                                        type="text"
                                        value={form.data.sender_name}
                                        onChange={e => form.setData('sender_name', e.target.value)}
                                        className="rounded-md border-gray-200 bg-white text-sm shadow-sm focus:border-indigo-400 focus:ring-indigo-400"
                                    />
                                    {form.errors.sender_name && <p className="text-xs text-red-500">{form.errors.sender_name}</p>}
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label htmlFor="sender_email" className="text-xs font-medium text-gray-600">Email *</label>
                                    <input
                                        id="sender_email"
                                        type="email"
                                        value={form.data.sender_email}
                                        onChange={e => form.setData('sender_email', e.target.value)}
                                        className="rounded-md border-gray-200 bg-white text-sm shadow-sm focus:border-indigo-400 focus:ring-indigo-400"
                                    />
                                    {form.errors.sender_email && <p className="text-xs text-red-500">{form.errors.sender_email}</p>}
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label htmlFor="sender_phone" className="text-xs font-medium text-gray-600">Phone *</label>
                                    <input
                                        id="sender_phone"
                                        type="tel"
                                        value={form.data.sender_phone}
                                        onChange={e => form.setData('sender_phone', e.target.value)}
                                        className="rounded-md border-gray-200 bg-white text-sm shadow-sm focus:border-indigo-400 focus:ring-indigo-400"
                                    />
                                    {form.errors.sender_phone && <p className="text-xs text-red-500">{form.errors.sender_phone}</p>}
                                </div>
                                <div className="col-span-2 flex flex-col gap-1">
                                    <label htmlFor="message" className="text-xs font-medium text-gray-600">Message *</label>
                                    <textarea
                                        id="message"
                                        rows={4}
                                        value={form.data.message}
                                        onChange={e => form.setData('message', e.target.value)}
                                        className="rounded-md border-gray-200 bg-white text-sm shadow-sm focus:border-indigo-400 focus:ring-indigo-400"
                                    />
                                    {form.errors.message && <p className="text-xs text-red-500">{form.errors.message}</p>}
                                </div>
                                <div className="col-span-2">
                                    <button
                                        type="submit"
                                        disabled={form.processing}
                                        className="rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                                    >
                                        {form.processing ? 'Sending…' : 'Send Message'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                </div>
            </div>
        </PublicLayout>
    );
}
```

- [ ] **Step 2: Run TypeScript build to verify no type errors**

```bash
npm run build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/PublicView.tsx
git commit -m "feat: redesign public resume view with Minimal Ruled layout"
```

---

## Task 3: Add Minimal Ruled preview to the editor

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

Add the `minimal-ruled` option to the template dropdown and render it in the live preview panel.

- [ ] **Step 1: Add `minimal-ruled` to the template dropdown**

In `Edit.tsx`, find the `<select aria-label="Resume template">` block (around line 278) and add a 4th option:

```tsx
<select
    aria-label="Resume template"
    value={template}
    onChange={e => { setTemplate(e.target.value as ResumeTemplate); }}
    onBlur={save}
    className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
>
    <option value="classic">Classic</option>
    <option value="modern">Modern</option>
    <option value="minimal">Minimal</option>
    <option value="minimal-ruled">Minimal Ruled</option>
</select>
```

- [ ] **Step 2: Add Minimal Ruled rendering to the preview panel**

In `Edit.tsx`, the right preview panel starts around line 595. The preview `<div>` currently uses a className that checks `template`. Add a new conditional block for `minimal-ruled` inside the preview `<div>`.

Replace the entire right panel content div (the `<div ref={previewRef} id="resume-preview" ...>` and everything inside it) with the following. The existing classic/modern/minimal sections are preserved and the new minimal-ruled block is added:

```tsx
{/* RIGHT: Live Preview */}
<div className="flex-1 overflow-y-auto bg-gray-100 p-6">
    <div
        ref={previewRef}
        id="resume-preview"
        className={`mx-auto w-full max-w-[8.5in] bg-white shadow-lg ${template === 'modern' ? 'font-sans' : template === 'minimal' ? 'font-mono' : 'font-sans'}`}
        style={{ minHeight: '11in', padding: '0.75in', position: 'relative' }}
    >
        {/* Page break indicator */}
        {overflowing && (
            <div
                style={{ position: 'absolute', top: `${PAGE_HEIGHT_PX - 48}px`, left: 0, right: 0 }}
                className="border-t-2 border-dashed border-red-400 pointer-events-none"
            >
                <span className="absolute right-0 -top-4 text-[10px] text-red-400 bg-white px-1">page break</span>
            </div>
        )}

        {template === 'minimal-ruled' ? (
            <>
                {/* Minimal Ruled Header */}
                <div className="mb-10 pb-6 border-b border-gray-200">
                    <h1 className="text-3xl font-light tracking-widest uppercase text-gray-900">
                        {contact.full_name || 'Your Name'}
                    </h1>
                    {(experience.find(e => e.title)?.title || experience.find(e => e.company)?.company) && (
                        <p className="mt-1 text-xs font-semibold tracking-widest uppercase text-gray-400">
                            {[experience.find(e => e.title)?.title, experience.find(e => e.company)?.company].filter(Boolean).join(' · ')}
                        </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-3 text-xs text-gray-500">
                        {contact.email && <span>{contact.email}</span>}
                        {contact.phone && <span>· {contact.phone}</span>}
                        {contact.location && <span>· {contact.location}</span>}
                        {contact.linkedin && <span>· {contact.linkedin}</span>}
                        {contact.website && <span>· {contact.website}</span>}
                    </div>
                </div>

                {/* Minimal Ruled Summary */}
                {summary && (
                    <section className="mb-8">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Summary</div>
                        <p className="text-sm leading-relaxed text-gray-700">{summary}</p>
                    </section>
                )}

                {/* Minimal Ruled Experience */}
                {experience.some(e => e.company || e.title) && (
                    <section className="mb-8">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Experience</div>
                        {experience.filter(e => e.company || e.title).map(exp => (
                            <div key={exp.id} className="flex gap-6 mb-5">
                                <div className="w-16 shrink-0 text-right text-xs text-gray-400 pt-0.5 leading-relaxed">
                                    {exp.start_date && <div>{exp.start_date}</div>}
                                    <div>{exp.current ? 'Present' : exp.end_date}</div>
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-semibold text-gray-900">{exp.title || 'Job Title'}</div>
                                    <div className="text-xs text-gray-500 mb-1">{exp.company}</div>
                                    {exp.bullets && (
                                        <ul className="list-disc pl-4 text-xs text-gray-700 space-y-0.5">
                                            {exp.bullets.split('\n').filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        ))}
                    </section>
                )}

                {/* Minimal Ruled Education */}
                {education.some(e => e.school) && (
                    <section className="mb-8">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Education</div>
                        {education.filter(e => e.school).map(edu => (
                            <div key={edu.id} className="flex gap-6 mb-3">
                                <div className="w-16 shrink-0 text-right text-xs text-gray-400 pt-0.5">{edu.grad_year}</div>
                                <div className="flex-1">
                                    <div className="text-sm font-semibold text-gray-900">{edu.school}</div>
                                    <div className="text-xs text-gray-500">{[edu.degree, edu.field].filter(Boolean).join(' in ')}</div>
                                </div>
                            </div>
                        ))}
                    </section>
                )}

                {/* Minimal Ruled Skills */}
                {skills.length > 0 && (
                    <section className="mb-8">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Skills</div>
                        <div className="flex flex-wrap gap-2">
                            {skills.map((skill, i) => (
                                <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-0.5 rounded-full">{skill}</span>
                            ))}
                        </div>
                    </section>
                )}

                {/* Minimal Ruled Certifications */}
                {certifications.some(c => c.name) && (
                    <section className="mb-8">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Certifications</div>
                        {certifications.filter(c => c.name).map(cert => (
                            <div key={cert.id} className="flex gap-6 mb-2">
                                <div className="w-16 shrink-0 text-right text-xs text-gray-400 pt-0.5">{cert.date}</div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">{cert.name}</div>
                                    {cert.issuer && <div className="text-xs text-gray-500">{cert.issuer}</div>}
                                </div>
                            </div>
                        ))}
                    </section>
                )}
            </>
        ) : (
            <>
                {/* Header — classic / modern / minimal */}
                <div className={`mb-4 pb-3 text-center ${template === 'modern' ? 'bg-indigo-700 text-white -mx-[0.75in] -mt-[0.75in] px-[0.75in] pt-8 pb-6 mb-6' : 'border-b-2 border-gray-800'}`}>
                    <h1 className={`font-bold tracking-wide ${template === 'modern' ? 'text-2xl text-white' : 'text-2xl text-gray-900'}`}>
                        {contact.full_name || 'Your Name'}
                    </h1>
                    <div className={`mt-1 flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-xs ${template === 'modern' ? 'text-indigo-200' : 'text-gray-600'}`}>
                        {contact.email && <span>{contact.email}</span>}
                        {contact.phone && <span>• {contact.phone}</span>}
                        {contact.location && <span>• {contact.location}</span>}
                        {contact.linkedin && <span>• {contact.linkedin}</span>}
                        {contact.website && <span>• {contact.website}</span>}
                    </div>
                </div>

                {summary && (
                    <section className="mb-4">
                        <h2 className={`mb-1 pb-0.5 text-xs font-bold uppercase tracking-widest ${template === 'modern' ? 'text-indigo-700 border-b border-indigo-200' : 'text-gray-700 border-b border-gray-300'}`}>Summary</h2>
                        <p className="text-sm leading-relaxed text-gray-700">{summary}</p>
                    </section>
                )}

                {experience.some(e => e.company || e.title) && (
                    <section className="mb-4">
                        <h2 className={`mb-2 pb-0.5 text-xs font-bold uppercase tracking-widest ${template === 'modern' ? 'text-indigo-700 border-b border-indigo-200' : 'text-gray-700 border-b border-gray-300'}`}>Work Experience</h2>
                        {experience.filter(e => e.company || e.title).map(exp => (
                            <div key={exp.id} className="mb-3">
                                <div className="flex items-baseline justify-between">
                                    <span className="font-semibold text-sm text-gray-900">{exp.title || 'Job Title'}</span>
                                    <span className="text-xs text-gray-500">
                                        {exp.start_date}{(exp.start_date || exp.end_date) ? ' – ' : ''}{exp.current ? 'Present' : exp.end_date}
                                    </span>
                                </div>
                                <div className="text-xs font-medium text-gray-600">{exp.company}</div>
                                {exp.bullets && (
                                    <ul className="mt-1 list-disc pl-4 text-xs text-gray-700 space-y-0.5">
                                        {exp.bullets.split('\n').filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </section>
                )}

                {education.some(e => e.school) && (
                    <section className="mb-4">
                        <h2 className={`mb-2 pb-0.5 text-xs font-bold uppercase tracking-widest ${template === 'modern' ? 'text-indigo-700 border-b border-indigo-200' : 'text-gray-700 border-b border-gray-300'}`}>Education</h2>
                        {education.filter(e => e.school).map(edu => (
                            <div key={edu.id} className="mb-2 flex items-baseline justify-between">
                                <div>
                                    <span className="font-semibold text-sm text-gray-900">{edu.school}</span>
                                    <span className="ml-2 text-xs text-gray-600">{[edu.degree, edu.field].filter(Boolean).join(' in ')}</span>
                                </div>
                                {edu.grad_year && <span className="text-xs text-gray-500">{edu.grad_year}</span>}
                            </div>
                        ))}
                    </section>
                )}

                {skills.length > 0 && (
                    <section className="mb-4">
                        <h2 className={`mb-2 pb-0.5 text-xs font-bold uppercase tracking-widest ${template === 'modern' ? 'text-indigo-700 border-b border-indigo-200' : 'text-gray-700 border-b border-gray-300'}`}>Skills</h2>
                        <p className="text-sm text-gray-700">{skills.join(' • ')}</p>
                    </section>
                )}

                {certifications.some(c => c.name) && (
                    <section className="mb-4">
                        <h2 className={`mb-2 pb-0.5 text-xs font-bold uppercase tracking-widest ${template === 'modern' ? 'text-indigo-700 border-b border-indigo-200' : 'text-gray-700 border-b border-gray-300'}`}>Certifications</h2>
                        {certifications.filter(c => c.name).map(cert => (
                            <div key={cert.id} className="mb-1 flex items-baseline justify-between">
                                <span className="text-sm font-medium text-gray-900">{cert.name}</span>
                                <span className="text-xs text-gray-500">{cert.issuer}{cert.issuer && cert.date ? ', ' : ''}{cert.date}</span>
                            </div>
                        ))}
                    </section>
                )}
            </>
        )}
    </div>
</div>
```

- [ ] **Step 3: Run TypeScript build to verify no type errors**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: add Minimal Ruled template option and preview to editor"
```

---

## Task 4: Polish the editor left panel

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

Visual-only changes to the left form panel. No logic changes.

- [ ] **Step 1: Update the left panel background**

Find the left panel wrapper (around line 313):
```tsx
<div className="w-[45%] shrink-0 overflow-y-auto border-r border-gray-200 bg-white p-6">
```
Change `bg-white` to `bg-gray-50`:
```tsx
<div className="w-[45%] shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-6">
```

- [ ] **Step 2: Update section header buttons**

Find the `SectionHeader` component (around line 57). Replace with:

```tsx
function SectionHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="flex w-full items-center justify-between border-l-2 border-indigo-300 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none"
        >
            {title}
            <span className="ml-2 text-gray-400">{open ? '▲' : '▼'}</span>
        </button>
    );
}
```

- [ ] **Step 3: Update "Add" buttons to solid style**

Find all three "Add" buttons in the JSX. Replace each one's className. There are three instances — Add Position, Add School, Add Certification:

Old pattern (all three share this):
```tsx
className="mt-1 rounded-md border border-dashed border-indigo-300 px-3 py-2 text-sm text-indigo-600 hover:border-indigo-500 hover:bg-indigo-50"
```
New pattern:
```tsx
className="mt-1 rounded-md bg-indigo-50 border border-indigo-200 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-100"
```

- [ ] **Step 4: Replace drag handle character with SVG grip icon**

Find the `SortableItem` component (around line 90). Replace the drag handle div:

Old:
```tsx
<div
    {...attributes}
    {...listeners}
    className="absolute -left-4 top-3 cursor-grab text-gray-300 hover:text-gray-500 select-none"
    title="Drag to reorder"
>⠿</div>
```

New:
```tsx
<div
    {...attributes}
    {...listeners}
    className="absolute -left-5 top-3 cursor-grab text-gray-300 hover:text-gray-500 select-none"
    title="Drag to reorder"
>
    <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
        <circle cx="3" cy="3" r="1.5"/><circle cx="9" cy="3" r="1.5"/>
        <circle cx="3" cy="8" r="1.5"/><circle cx="9" cy="8" r="1.5"/>
        <circle cx="3" cy="13" r="1.5"/><circle cx="9" cy="13" r="1.5"/>
    </svg>
</div>
```

- [ ] **Step 5: Update save status indicator**

Find the save status `<span>` in the header (around line 289):
```tsx
<span className="text-xs text-gray-400">
    {saving ? 'Saving…' : savedAt ? `Saved at ${savedAt}` : 'Saves on field change'}
</span>
```

Replace with:
```tsx
<span className="flex items-center gap-1.5 text-xs">
    {saving ? (
        <>
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-600">Saving…</span>
        </>
    ) : savedAt ? (
        <>
            <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
            <span className="text-green-600">Saved {savedAt}</span>
        </>
    ) : (
        <span className="text-gray-400">Saves on field change</span>
    )}
</span>
```

- [ ] **Step 6: Run build and verify**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: polish editor left panel — accents, grip icon, save indicator"
```

---

## Task 5: Run all tests and verify no regressions

- [ ] **Step 1: Run the full test suite**

```bash
php artisan test
```

Expected: all tests pass including the new `ResumeBuilderTest`.

- [ ] **Step 2: Run frontend build one final time**

```bash
npm run build
```

Expected: exits 0, no TypeScript errors.

- [ ] **Step 3: Final commit if any loose files**

```bash
git status
```

If clean, Phase 1 is complete. If any files are unstaged, add and commit them.
