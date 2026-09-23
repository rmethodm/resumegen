# Workstation Layout Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the Workstation user pick one of four layout modes (Tabs/Overlay/Inline/Hybrid) from a persisted dropdown, so AI/optimize feedback can be compared live without leaving the resume form.

**Architecture:** A new `users.workstation_layout` column (mirrors the existing `users.theme` column) drives a `layoutMode` value threaded from `Workstation.tsx` down through the header/toolbar. `Workstation.tsx` branches its render between the four modes; all four reuse the existing `ScoreRingTrio`, `TargetRoleBar`, `OptimizeChecklist`, `AiCritiquePanel`, and `AtsPlainTextBlock` — no AI/scoring logic changes, only where those components are mounted.

**Tech Stack:** Laravel 13 / PHP 8.5, Inertia v3 + React 19 + TypeScript, shadcn/ui (radix-nova style — `Sheet`, `Popover`, `Select` already installed), Vitest + Testing Library, PHPUnit.

**Spec:** `docs/superpowers/specs/2026-09-16-workstation-layout-modes-design.md`

## Global Constraints

- Visible to all users immediately (not a dev-only toggle) — per product decision in the spec.
- Persisted to `users.workstation_layout` (DB), default `'tabs'` — existing users see no behavior change until they pick a different mode.
- No change to AI critique generation, credit gating, or scoring/keyword logic anywhere in this plan — only where results are displayed.
- Follow existing project conventions exactly: `Select` is the project's native-`<select>` wrapper (`resources/js/Components/ui/select.tsx`), not a compound shadcn `Select`; icons here are `@heroicons/react` (not lucide) except inside shadcn primitive files that already use lucide (`sheet.tsx`, `select.tsx`) — leave those as they are.
- **Documented deviation from the spec's file list:** the spec listed `optimize-panel.tsx` as "unchanged internally." Task 6 extracts its JD-paste + keyword-overlap block into a new `jd-match-card.tsx` component (byte-identical JSX moved, zero behavior change) so Inline mode can reuse it without duplicating ~40 lines. `optimize-panel.tsx` ends up calling the extracted component instead of inlining the markup.
- **Documented simplification:** the spec's Overlay description says the header shows a suggestion-count badge on the "Optimize" button. This plan ships the button without a count badge (no additional prop plumbing needed) — a follow-up if the mode is kept.

---

## Task 1: Persist the layout preference (backend)

**Files:**
- Create: `database/migrations/2026_09_16_223000_add_workstation_layout_to_users_table.php`
- Create: `app/Support/WorkstationLayouts.php`
- Modify: `app/Models/User.php` (add `workstation_layout` to the `#[Fillable]` list)
- Modify: `app/Http/Controllers/UserPreferenceController.php` (add `setWorkstationLayout`)
- Modify: `routes/web.php` (add route, next to `theme.update`)
- Test: `tests/Feature/WorkstationLayoutPreferenceTest.php`

**Interfaces:**
- Consumes: nothing new.
- Produces: `WorkstationLayouts::IDS` (`['tabs', 'overlay', 'inline', 'hybrid']`), route name `workstation-layout.update` (PATCH, body `{ workstation_layout: string }`), `User::workstation_layout` column (string, default `'tabs'`).

- [ ] **Step 1: Write the failing feature test**

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkstationLayoutPreferenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_set_workstation_layout(): void
    {
        $user = User::factory()->create(['workstation_layout' => 'tabs']);

        $response = $this->actingAs($user)->patch(route('workstation-layout.update'), [
            'workstation_layout' => 'hybrid',
        ]);

        $response->assertRedirect();
        $this->assertSame('hybrid', $user->fresh()->workstation_layout);
    }

    public function test_workstation_layout_must_be_a_known_value(): void
    {
        $user = User::factory()->create(['workstation_layout' => 'tabs']);

        $response = $this->actingAs($user)->patch(route('workstation-layout.update'), [
            'workstation_layout' => 'not-a-real-mode',
        ]);

        $response->assertSessionHasErrors('workstation_layout');
        $this->assertSame('tabs', $user->fresh()->workstation_layout);
    }

    public function test_new_users_default_to_tabs_layout(): void
    {
        $user = User::factory()->create();

        $this->assertSame('tabs', $user->workstation_layout);
    }
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `php artisan test --filter=WorkstationLayoutPreferenceTest`
Expected: FAIL — route `workstation-layout.update` does not exist, and/or the `workstation_layout` column/attribute does not exist.

- [ ] **Step 3: Create `WorkstationLayouts` support class**

```php
<?php

namespace App\Support;

/**
 * Valid `users.workstation_layout` values — the four Workstation layout
 * modes a user can switch between from the format toolbar.
 */
class WorkstationLayouts
{
    public const IDS = [
        'tabs',
        'overlay',
        'inline',
        'hybrid',
    ];
}
```

- [ ] **Step 4: Add the migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('workstation_layout')->default('tabs')->after('theme');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('workstation_layout');
        });
    }
};
```

Run: `php artisan migrate`
Expected: migration applies cleanly.

- [ ] **Step 5: Add `workstation_layout` to `User`'s fillable list**

In `app/Models/User.php`, change the `#[Fillable]` attribute line from:

```php
#[Fillable(['name', 'email', 'password', 'has_completed_onboarding', 'profile', 'stale_nudge_sent_at', 'view_nudge_sent_at', 'preferred_template', 'target_role', 'industry', 'years_experience', 'registration_ip', 'oauth_provider', 'oauth_provider_id', 'prefers_apply_wizard', 'dismissed_checklist_at', 'theme'])]
```

to:

```php
#[Fillable(['name', 'email', 'password', 'has_completed_onboarding', 'profile', 'stale_nudge_sent_at', 'view_nudge_sent_at', 'preferred_template', 'target_role', 'industry', 'years_experience', 'registration_ip', 'oauth_provider', 'oauth_provider_id', 'prefers_apply_wizard', 'dismissed_checklist_at', 'theme', 'workstation_layout'])]
```

- [ ] **Step 6: Add the controller method**

In `app/Http/Controllers/UserPreferenceController.php`, add the `use` import and method:

```php
use App\Support\AppThemes;
use App\Support\WorkstationLayouts;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Small per-user UI preferences that do not belong on the Profile form. */
class UserPreferenceController extends Controller
{
    // ...existing methods unchanged...

    public function setWorkstationLayout(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'workstation_layout' => ['required', 'string', Rule::in(WorkstationLayouts::IDS)],
        ]);

        $request->user()->update(['workstation_layout' => $validated['workstation_layout']]);

        return back();
    }
}
```

- [ ] **Step 7: Add the route**

In `routes/web.php`, immediately after the `theme.update` line:

```php
    Route::patch('/user/theme', [UserPreferenceController::class, 'setTheme'])->name('theme.update');
    Route::patch('/user/workstation-layout', [UserPreferenceController::class, 'setWorkstationLayout'])->name('workstation-layout.update');
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `php artisan test --filter=WorkstationLayoutPreferenceTest`
Expected: PASS (3 tests).

- [ ] **Step 9: Commit**

```bash
git add database/migrations/2026_09_16_223000_add_workstation_layout_to_users_table.php \
    app/Support/WorkstationLayouts.php app/Models/User.php \
    app/Http/Controllers/UserPreferenceController.php routes/web.php \
    tests/Feature/WorkstationLayoutPreferenceTest.php
git commit -m "feat: persist workstation layout mode preference"
```

---

## Task 2: Frontend type + persistence hook

**Files:**
- Modify: `resources/js/types/index.d.ts`
- Create: `resources/js/hooks/use-workstation-layout.ts`
- Test: `resources/js/hooks/__tests__/use-workstation-layout.test.ts`

**Interfaces:**
- Consumes: `WorkstationLayouts::IDS` values as string literals (`'tabs' | 'overlay' | 'inline' | 'hybrid'`), route name `workstation-layout.update` (Task 1).
- Produces: exported type `WorkstationLayoutMode`, `User.workstation_layout: WorkstationLayoutMode`, hook `useWorkstationLayout(): [WorkstationLayoutMode, (mode: WorkstationLayoutMode) => void]`.

- [ ] **Step 1: Write the failing test**

```ts
/** @vitest-environment happy-dom */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { routerPatch } = vi.hoisted(() => ({ routerPatch: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { auth: { user: { workstation_layout: 'tabs' } } } }),
    router: { patch: routerPatch },
}));

import { useWorkstationLayout } from '@/hooks/use-workstation-layout';

describe('useWorkstationLayout', () => {
    beforeEach(() => {
        routerPatch.mockReset();
    });

    it('reads the initial mode from the page props', () => {
        const { result } = renderHook(() => useWorkstationLayout());
        expect(result.current[0]).toBe('tabs');
    });

    it('updates local state immediately and persists in the background', () => {
        const { result } = renderHook(() => useWorkstationLayout());

        act(() => {
            result.current[1]('hybrid');
        });

        expect(result.current[0]).toBe('hybrid');
        expect(routerPatch).toHaveBeenCalledWith(
            'workstation-layout.update-url',
            { workstation_layout: 'hybrid' },
            expect.objectContaining({ preserveScroll: true, preserveState: true }),
        );
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run resources/js/hooks/__tests__/use-workstation-layout.test.ts`
Expected: FAIL — `use-workstation-layout` module not found.

- [ ] **Step 3: Add the type**

In `resources/js/types/index.d.ts`, add near the top (before `export interface User`):

```ts
export type WorkstationLayoutMode = 'tabs' | 'overlay' | 'inline' | 'hybrid';
```

and add the field to `User`:

```ts
export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    disabled_at?: string | null;
    two_factor_confirmed_at: string | null;
    theme: string | null;
    workstation_layout: WorkstationLayoutMode;
    profile: {
        full_name?: string;
        email?: string;
        phone?: string;
        location?: string;
        linkedin_url?: string;
        website?: string;
    } | null;
}
```

- [ ] **Step 4: Write the hook**

```ts
import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { PageProps, WorkstationLayoutMode } from '@/types';

/**
 * Reads the signed-in user's saved Workstation layout mode and returns a
 * setter that updates local state immediately and persists in the
 * background — same optimistic-update shape as the theme preference, but
 * this hook owns both the read and the write (the mode is chosen from
 * inside the Workstation, not a separate Profile form).
 */
export function useWorkstationLayout(): [
    WorkstationLayoutMode,
    (mode: WorkstationLayoutMode) => void,
] {
    const initial = usePage<PageProps>().props.auth.user.workstation_layout;
    const [mode, setMode] = useState<WorkstationLayoutMode>(initial);

    function change(next: WorkstationLayoutMode) {
        setMode(next);
        router.patch(
            route('workstation-layout.update'),
            { workstation_layout: next },
            { preserveScroll: true, preserveState: true },
        );
    }

    return [mode, change];
}
```

Note: the test mocks `route()` as a global (already set up project-wide in `resources/js/test-setup.ts` per the Ziggy convention used by other hook tests) — if `route()` is not globally stubbed in this test file's environment, add `vi.stubGlobal('route', (name: string) => `${name}-url`);` at the top of the test before the hook import. Check `resources/js/test-setup.ts` first; only add the stub if `route` is not already global there.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run resources/js/hooks/__tests__/use-workstation-layout.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add resources/js/types/index.d.ts resources/js/hooks/use-workstation-layout.ts \
    resources/js/hooks/__tests__/use-workstation-layout.test.ts
git commit -m "feat: add useWorkstationLayout hook and type"
```

---

## Task 3: Layout switcher + Overlay trigger in the toolbar/header

**Files:**
- Modify: `resources/js/Components/workstation/workstation-format-toolbar.tsx`
- Modify: `resources/js/Components/workstation/workstation-header.tsx`
- Test: `resources/js/Components/workstation/__tests__/workstation-format-toolbar.test.tsx`

**Interfaces:**
- Consumes: `WorkstationLayoutMode` (Task 2).
- Produces: `WorkstationFormatToolbar` accepts `layoutMode: WorkstationLayoutMode`, `onLayoutModeChange: (mode: WorkstationLayoutMode) => void`, `onOpenOptimize?: () => void`; `WorkstationHeader` accepts and forwards the same three props, and threads `layoutMode` into its `reviewActive` computation.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkstationFormatToolbar } from '../workstation-format-toolbar';

function baseProps() {
    return {
        canUndo: false,
        canRedo: false,
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        template: 'classic' as const,
        onTemplateClick: vi.fn(),
        font: 'inter' as const,
        onFontChange: vi.fn(),
        density: 'balanced' as const,
        onDensityChange: vi.fn(),
        bulletStyle: 'bullet' as const,
        onBulletStyleChange: vi.fn(),
        skillsLayout: 'inline' as const,
        onSkillsLayoutChange: vi.fn(),
        pageEstimateDraft: {
            summary: '',
            experiences: [],
            projects: [],
            education: [],
            certificates: [],
            skills: [],
            density: 'balanced' as const,
        },
        zoom: 1 as const,
        onZoomChange: vi.fn(),
        reviewActive: true,
        activeTab: 'Edit' as const,
        onTabChange: vi.fn(),
        layoutMode: 'tabs' as const,
        onLayoutModeChange: vi.fn(),
    };
}

describe('WorkstationFormatToolbar layout switcher', () => {
    it('shows the Tabs/Edit switcher when layoutMode is tabs', () => {
        render(<WorkstationFormatToolbar {...baseProps()} />);
        expect(screen.getByRole('tablist', { name: 'Workstation mode' })).toBeInTheDocument();
    });

    it('hides the tab switcher and shows document tools for non-tabs modes', () => {
        render(<WorkstationFormatToolbar {...baseProps()} layoutMode="inline" />);
        expect(screen.queryByRole('tablist', { name: 'Workstation mode' })).not.toBeInTheDocument();
        expect(screen.getByLabelText('Template')).toBeInTheDocument();
    });

    it('changing the Layout select calls onLayoutModeChange', () => {
        const onLayoutModeChange = vi.fn();
        render(<WorkstationFormatToolbar {...baseProps()} onLayoutModeChange={onLayoutModeChange} />);
        fireEvent.change(screen.getByLabelText('Workstation layout'), { target: { value: 'hybrid' } });
        expect(onLayoutModeChange).toHaveBeenCalledWith('hybrid');
    });

    it('shows an Optimize button in overlay mode when onOpenOptimize is passed', () => {
        const onOpenOptimize = vi.fn();
        render(
            <WorkstationFormatToolbar
                {...baseProps()}
                layoutMode="overlay"
                onOpenOptimize={onOpenOptimize}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Optimize' }));
        expect(onOpenOptimize).toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run resources/js/Components/workstation/__tests__/workstation-format-toolbar.test.tsx`
Expected: FAIL — `layoutMode`/`onLayoutModeChange` props don't exist yet, `aria-label="Workstation layout"` control doesn't exist.

- [ ] **Step 3: Update `WorkstationFormatToolbar`**

In `resources/js/Components/workstation/workstation-format-toolbar.tsx`:

Add `WorkstationLayoutMode` to the type import:

```tsx
import type {
    ResumeBulletStyle,
    ResumeDensity,
    ResumeDraft,
    ResumeFont,
    ResumeSkillsLayout,
    ResumeTemplateKey,
    WorkstationLayoutMode,
} from '@/types';
```

Add the layout labels map near the other label maps:

```tsx
const layoutModeLabels: Record<WorkstationLayoutMode, string> = {
    tabs: 'Tabs (classic)',
    overlay: 'Overlay panel',
    inline: 'Inline',
    hybrid: 'Hybrid rail',
};
```

Change the props type and destructure — replace:

```tsx
export function WorkstationFormatToolbar({
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    template,
    onTemplateClick,
    font,
    onFontChange,
    density,
    onDensityChange,
    bulletStyle,
    onBulletStyleChange,
    skillsLayout,
    onSkillsLayoutChange,
    pageEstimateDraft,
    zoom,
    onZoomChange,
    reviewActive,
    activeTab,
    onTabChange,
    reviewPreviewMode = 'react',
    onReviewPreviewModeChange,
}: {
```

with:

```tsx
export function WorkstationFormatToolbar({
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    template,
    onTemplateClick,
    font,
    onFontChange,
    density,
    onDensityChange,
    bulletStyle,
    onBulletStyleChange,
    skillsLayout,
    onSkillsLayoutChange,
    pageEstimateDraft,
    zoom,
    onZoomChange,
    reviewActive,
    activeTab,
    onTabChange,
    reviewPreviewMode = 'react',
    onReviewPreviewModeChange,
    layoutMode,
    onLayoutModeChange,
    onOpenOptimize,
}: {
```

and add to the closing type annotation (after `onReviewPreviewModeChange?: (mode: 'react' | 'pdf') => void;`):

```tsx
    layoutMode: WorkstationLayoutMode;
    onLayoutModeChange: (mode: WorkstationLayoutMode) => void;
    /** Only rendered when layoutMode === 'overlay'. */
    onOpenOptimize?: () => void;
```

Wrap the existing tab-switcher block — replace:

```tsx
            <div
                role="tablist"
                aria-label="Workstation mode"
                className="inline-flex items-center rounded-full border border-border bg-muted p-0.5"
            >
                {WORKSTATION_TABS.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        role="tab"
                        aria-selected={tab === activeTab}
                        onClick={() => onTabChange(tab)}
                        className={cn(
                            'rounded-full px-3.5 py-1 text-sm font-medium transition-colors',
                            tab === activeTab
                                ? 'bg-primary font-semibold text-white shadow-xs'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Document tools on Edit only — Optimize stays lean. */}
            {activeTab !== 'Optimize' && (
```

with:

```tsx
            {layoutMode === 'tabs' && (
                <div
                    role="tablist"
                    aria-label="Workstation mode"
                    className="inline-flex items-center rounded-full border border-border bg-muted p-0.5"
                >
                    {WORKSTATION_TABS.map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            role="tab"
                            aria-selected={tab === activeTab}
                            onClick={() => onTabChange(tab)}
                            className={cn(
                                'rounded-full px-3.5 py-1 text-sm font-medium transition-colors',
                                tab === activeTab
                                    ? 'bg-primary font-semibold text-white shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            )}

            {/* Document tools hidden only on the classic Optimize tab — every
                other mode keeps the form visible, so tools stay visible too. */}
            {(layoutMode !== 'tabs' || activeTab !== 'Optimize') && (
```

Change the matching `reviewActive` gate — replace:

```tsx
            {/* Preview chrome on Edit — never show disabled Live/PDF/Zoom. */}
            {reviewActive && onReviewPreviewModeChange && (
```

Leave this line as-is (it already receives the correct value once `WorkstationHeader` computes `reviewActive` from `layoutMode`, in Step 5) — no change needed here.

After the closing `</>` of that `reviewActive` block (right before the toolbar `<div>`'s closing tag), add the Layout select and, in overlay mode, the Optimize trigger:

```tsx
            <ToolbarDivider />

            <Select
                aria-label="Workstation layout"
                value={layoutMode}
                onChange={(event) =>
                    onLayoutModeChange(event.target.value as WorkstationLayoutMode)
                }
                className={cn(controlHeight, 'w-auto max-w-40')}
            >
                {(Object.keys(layoutModeLabels) as WorkstationLayoutMode[]).map((mode) => (
                    <option key={mode} value={mode}>
                        {layoutModeLabels[mode]}
                    </option>
                ))}
            </Select>

            {layoutMode === 'overlay' && onOpenOptimize && (
                <button
                    type="button"
                    onClick={onOpenOptimize}
                    className={buttonClassName(
                        'outline',
                        'sm',
                        cn(controlHeight, 'gap-1 px-2.5 font-medium'),
                    )}
                >
                    Optimize
                </button>
            )}
        </div>
    );
}
```

(This replaces the toolbar's final `</div>\n    );\n}` — keep everything above it exactly as it already is.)

- [ ] **Step 4: Run the test — expect it still partially fails**

Run: `npx vitest run resources/js/Components/workstation/__tests__/workstation-format-toolbar.test.tsx`
Expected: FAIL on the two tests that call `WorkstationFormatToolbar` without `layoutMode`/`onLayoutModeChange` typed correctly is not an issue (props are supplied by `baseProps()`), but `reviewActive` in the "hides the tab switcher" test must still resolve `getByLabelText('Template')` — this already renders because `reviewActive`/`activeTab` are independent of `layoutMode` at this component's own level (only the tablist and document-tools gate changed). If this test still fails, re-check the document-tools condition edit in Step 3 was applied to the right block.

- [ ] **Step 5: Thread `layoutMode` through `WorkstationHeader`**

In `resources/js/Components/workstation/workstation-header.tsx`, add `WorkstationLayoutMode` to the type import:

```tsx
import type {
    LinkedApplication,
    ResumeBulletStyle,
    ResumeDensity,
    ResumeDraft,
    ResumeFont,
    ResumeShareLink,
    ResumeSkillsLayout,
    ResumeTemplateKey,
    SaveStatus,
    WorkstationLayoutMode,
} from '@/types';
```

Add to the destructured props (after `application = null,`):

```tsx
    layoutMode,
    onLayoutModeChange,
    onOpenOptimize,
```

and to the type annotation (after `application?: LinkedApplication | null;`):

```tsx
    layoutMode: WorkstationLayoutMode;
    onLayoutModeChange: (mode: WorkstationLayoutMode) => void;
    onOpenOptimize?: () => void;
```

Update the `<WorkstationFormatToolbar>` call — replace:

```tsx
            <WorkstationFormatToolbar
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={onUndo}
                onRedo={onRedo}
                template={template}
                onTemplateClick={() => setPickingTemplate(true)}
                font={font}
                onFontChange={onFontChange}
                density={density}
                onDensityChange={onDensityChange}
                bulletStyle={bulletStyle}
                onBulletStyleChange={onBulletStyleChange}
                skillsLayout={skillsLayout}
                onSkillsLayoutChange={onSkillsLayoutChange}
                pageEstimateDraft={pageEstimateDraft}
                zoom={zoom}
                onZoomChange={onZoomChange}
                reviewActive={activeTab === 'Edit'}
                activeTab={activeTab}
                onTabChange={onTabChange}
                reviewPreviewMode={reviewPreviewMode}
                onReviewPreviewModeChange={onReviewPreviewModeChange}
            />
```

with:

```tsx
            <WorkstationFormatToolbar
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={onUndo}
                onRedo={onRedo}
                template={template}
                onTemplateClick={() => setPickingTemplate(true)}
                font={font}
                onFontChange={onFontChange}
                density={density}
                onDensityChange={onDensityChange}
                bulletStyle={bulletStyle}
                onBulletStyleChange={onBulletStyleChange}
                skillsLayout={skillsLayout}
                onSkillsLayoutChange={onSkillsLayoutChange}
                pageEstimateDraft={pageEstimateDraft}
                zoom={zoom}
                onZoomChange={onZoomChange}
                reviewActive={layoutMode !== 'tabs' || activeTab === 'Edit'}
                activeTab={activeTab}
                onTabChange={onTabChange}
                reviewPreviewMode={reviewPreviewMode}
                onReviewPreviewModeChange={onReviewPreviewModeChange}
                layoutMode={layoutMode}
                onLayoutModeChange={onLayoutModeChange}
                onOpenOptimize={onOpenOptimize}
            />
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run resources/js/Components/workstation/__tests__/workstation-format-toolbar.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 7: Run the full frontend test suite to check nothing else broke**

Run: `npm run test`
Expected: PASS except any pre-existing unrelated failures noted in the spec (none expected here — `WorkstationHeader`/`WorkstationFormatToolbar` had no prior tests).

- [ ] **Step 8: Commit**

```bash
git add resources/js/Components/workstation/workstation-format-toolbar.tsx \
    resources/js/Components/workstation/workstation-header.tsx \
    resources/js/Components/workstation/__tests__/workstation-format-toolbar.test.tsx
git commit -m "feat: add layout-mode switcher and Overlay trigger to Workstation toolbar"
```

---

## Task 4: Extract `JdMatchCard` from `OptimizePanel`

**Files:**
- Create: `resources/js/Components/workstation/jd-match-card.tsx`
- Modify: `resources/js/Components/workstation/optimize-panel.tsx`
- Test: `resources/js/Components/workstation/__tests__/jd-match-card.test.tsx`

**Interfaces:**
- Consumes: `jdKeywordOverlap` (`@/lib/jd-keyword-overlap`), `formatKeywordLabel` (`@/lib/resume-analysis`) — both already exist, unchanged.
- Produces: `JdMatchCard({ draft, onChange }: { draft: ResumeDraft; onChange: (draft: ResumeDraft) => void })` — identical markup/behavior to the block currently inlined in `OptimizePanel`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JdMatchCard } from '../jd-match-card';
import type { ResumeDraft } from '@/types';

function draft(overrides: Partial<ResumeDraft> = {}): ResumeDraft {
    return {
        title: 'Resume',
        section_order: [],
        full_name: '',
        headline: '',
        summary: '',
        experiences: [],
        projects: [],
        education: [],
        certificates: [],
        skills: [],
        target_role: '',
        target_company: '',
        target_job_description: '',
        template: 'classic',
        font: 'inter',
        density: 'balanced',
        bullet_style: 'bullet',
        skills_layout: 'inline',
        email: '',
        phone: '',
        ...overrides,
    } as ResumeDraft;
}

describe('JdMatchCard', () => {
    it('renders nothing about overlap until a JD is pasted', () => {
        render(<JdMatchCard draft={draft()} onChange={vi.fn()} />);
        expect(screen.queryByText(/posting terms appear/)).not.toBeInTheDocument();
    });

    it('updates target_job_description as the user types', () => {
        const onChange = vi.fn();
        render(<JdMatchCard draft={draft()} onChange={onChange} />);
        fireEvent.change(screen.getByLabelText('Job description'), {
            target: { value: 'Senior Engineer, React' },
        });
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ target_job_description: 'Senior Engineer, React' }),
        );
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run resources/js/Components/workstation/__tests__/jd-match-card.test.tsx`
Expected: FAIL — module `../jd-match-card` not found.

- [ ] **Step 3: Create `jd-match-card.tsx`**

Move the JD Card block out of `optimize-panel.tsx` verbatim:

```tsx
import { jdKeywordOverlap } from '@/lib/jd-keyword-overlap';
import { formatKeywordLabel } from '@/lib/resume-analysis';
import { Card } from '@/Components/ui/card';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import type { ResumeDraft } from '@/types';

/** Paste-a-JD + exact-wording keyword overlap. Shared by every Workstation
 *  layout mode that surfaces optimize content. */
export function JdMatchCard({
    draft,
    onChange,
}: {
    draft: ResumeDraft;
    onChange: (draft: ResumeDraft) => void;
}) {
    const jd = draft.target_job_description ?? '';
    const overlap = jdKeywordOverlap(draft, jd);

    return (
        <Card className="gap-0 p-4">
            <div className="mb-3">
                <h2 className="text-sm font-bold text-foreground">
                    Optimize for a job
                </h2>
                <p className="text-xs text-muted-foreground">
                    Compare the wording in a job posting with your resume.
                    This is a wording check, not an ATS score or hiring prediction.
                </p>
            </div>

            <div className="flex flex-col gap-1.5">
                <Label className="text-xs" htmlFor="field-optimize-jd">
                    Job description
                </Label>
                <Textarea
                    id="field-optimize-jd"
                    rows={8}
                    value={jd}
                    placeholder="Paste the full job posting or key requirements…"
                    onChange={(event) =>
                        onChange({
                            ...draft,
                            target_job_description: event.target.value,
                        })
                    }
                />
                <p className="text-xs text-muted-foreground">
                    <span className="tabular-nums">{jd.length} / 10000</span> characters
                </p>
            </div>

            {jd.trim() !== '' && (
                <div className="mt-4 rounded-md border border-border bg-muted p-3">
                    <p className="mb-3 text-xs text-muted-foreground">
                        {overlap.matched.length} of {overlap.total} posting terms appear in your included resume sections.
                        Exact wording only; synonyms and relevance are not assessed.
                    </p>

                    {overlap.total === 0 && (
                        <p className="text-xs text-muted-foreground">No usable terms found. Paste the job’s requirements to compare.</p>
                    )}

                    {overlap.missing.length > 0 && (
                        <div className="mb-3">
                            <p className="mb-1.5 text-xs font-semibold text-muted-foreground/70">
                                Not found — review in context
                            </p>
                            <p className="mb-2 text-xs text-muted-foreground">
                                Check the posting, then describe relevant experience in your own words.
                                These terms are not verified skills.
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {overlap.missing.slice(0, 32).map((term) => (
                                    <span
                                        key={term}
                                        className="inline-flex items-center gap-1 rounded-full border border-dashed border-warning/40 bg-white px-2.5 py-1 text-xs font-medium text-warning-text"
                                    >
                                        {formatKeywordLabel(term)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {overlap.matched.length > 0 && (
                        <div>
                            <p className="mb-1.5 text-xs font-semibold text-muted-foreground/70">
                                Present
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {overlap.matched.slice(0, 24).map((term) => (
                                    <span
                                        key={term}
                                        className="rounded-full border border-success/30 bg-success-subtle px-2.5 py-1 text-xs font-medium text-success-text"
                                    >
                                        {formatKeywordLabel(term)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {overlap.missing.length === 0 &&
                        overlap.total > 0 && (
                            <p className="text-xs font-medium text-success-text">
                                All scanned terms appear in the resume. Review
                                bullets next for impact and weak openings.
                            </p>
                        )}
                </div>
            )}
        </Card>
    );
}
```

- [ ] **Step 4: Update `optimize-panel.tsx` to use it**

Replace the whole inlined `<Card className="gap-0 p-4">...</Card>` block at the top of `OptimizePanel`'s returned JSX (the JD-paste card) with:

```tsx
            <JdMatchCard draft={draft} onChange={onChange} />
```

Remove the now-unused `jdKeywordOverlap`, `formatKeywordLabel`, `Textarea`, `Label` imports and the `const overlap = jdKeywordOverlap(draft, jd);` / `const jd = ...` lines from `optimize-panel.tsx` if they are no longer referenced elsewhere in that file (check: `AtsPlainTextBlock` in the same file uses neither). Add the import:

```tsx
import { JdMatchCard } from '@/Components/workstation/jd-match-card';
```

The resulting top of `OptimizePanel`'s return becomes:

```tsx
    return (
        <div className="flex flex-col gap-4">
            <JdMatchCard draft={draft} onChange={onChange} />

            <OptimizeChecklist draft={draft} onJump={onJump} />

            <AiCritiquePanel
                ...
```

(the rest of the function is unchanged).

- [ ] **Step 5: Run both tests to verify they pass**

Run: `npx vitest run resources/js/Components/workstation/__tests__/jd-match-card.test.tsx resources/js/Components/workstation/optimize-panel.test.tsx`
Expected: PASS. (If `optimize-panel.test.tsx` does not exist, running just the new test is sufficient — `npx vitest run resources/js/Components/workstation/__tests__/jd-match-card.test.tsx`.)

- [ ] **Step 6: Run the full frontend suite**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add resources/js/Components/workstation/jd-match-card.tsx \
    resources/js/Components/workstation/optimize-panel.tsx \
    resources/js/Components/workstation/__tests__/jd-match-card.test.tsx
git commit -m "refactor: extract JdMatchCard out of OptimizePanel for reuse"
```

---

## Task 5: `suggestionsForSection` helper

**Files:**
- Modify: `resources/js/lib/ai-review.ts`
- Modify: `resources/js/lib/ai-review.test.ts`

**Interfaces:**
- Consumes: `AiReviewSuggestion` (`@/types`, has `.section: 'contact'|'summary'|'experience'|'skills'|'education'`).
- Produces: `suggestionsForSection(suggestions: AiReviewSuggestion[] | null | undefined, section: ResumeSectionKey): AiReviewSuggestion[]` — severity-sorted, filtered to that section.

- [ ] **Step 1: Write the failing test**

Append to `resources/js/lib/ai-review.test.ts`:

```ts
import { sortBySeverity, suggestionsForSection } from './ai-review';

// ...existing tests and `suggestion()` helper stay as-is...

describe('suggestionsForSection', () => {
    it('returns only suggestions matching the given section, severity-sorted', () => {
        const summaryLow = suggestion({ id: 'a', section: 'summary', severity: 'low' });
        const summaryHigh = suggestion({ id: 'b', section: 'summary', severity: 'high' });
        const experienceHigh = suggestion({ id: 'c', section: 'experience', severity: 'high' });

        const result = suggestionsForSection(
            [summaryLow, summaryHigh, experienceHigh],
            'summary',
        );

        expect(result).toEqual([summaryHigh, summaryLow]);
    });

    it('returns an empty array for null or undefined suggestions', () => {
        expect(suggestionsForSection(null, 'summary')).toEqual([]);
        expect(suggestionsForSection(undefined, 'summary')).toEqual([]);
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run resources/js/lib/ai-review.test.ts`
Expected: FAIL — `suggestionsForSection` is not exported.

- [ ] **Step 3: Implement it**

In `resources/js/lib/ai-review.ts`, change the import line from:

```ts
import type { AiReviewSuggestion } from '@/types';
```

to:

```ts
import type { AiReviewSuggestion, ResumeSectionKey } from '@/types';
```

and add, after `sortBySeverity`:

```ts
/** Severity-sorted suggestions for one section — used by the Inline layout
 *  mode to attach AI feedback directly under the section it critiques. */
export function suggestionsForSection(
    suggestions: AiReviewSuggestion[] | null | undefined,
    section: ResumeSectionKey,
): AiReviewSuggestion[] {
    if (!suggestions) {
        return [];
    }

    return sortBySeverity(suggestions.filter((s) => s.section === section));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run resources/js/lib/ai-review.test.ts`
Expected: PASS (all tests in the file).

- [ ] **Step 5: Commit**

```bash
git add resources/js/lib/ai-review.ts resources/js/lib/ai-review.test.ts
git commit -m "feat: add suggestionsForSection helper for Inline layout mode"
```

---

## Task 6: `OptimizeSheet` (Overlay mode)

**Files:**
- Create: `resources/js/Components/workstation/optimize-sheet.tsx`
- Test: `resources/js/Components/workstation/__tests__/optimize-sheet.test.tsx`

**Interfaces:**
- Consumes: `Sheet`/`SheetContent`/`SheetHeader`/`SheetTitle` (`@/Components/ui/sheet`), `ScoreRingTrio`, `TargetRoleBar`, `OptimizePanel`, `AtsPlainTextBlock` (all existing, unchanged).
- Produces: `OptimizeSheet({ open, onOpenChange, draft, onChange, resumeId, aiCredits, onJump, plainText })`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OptimizeSheet } from '../optimize-sheet';
import type { ResumeDraft } from '@/types';

function draft(overrides: Partial<ResumeDraft> = {}): ResumeDraft {
    return {
        title: 'Resume',
        section_order: [],
        full_name: '',
        headline: '',
        summary: '',
        experiences: [],
        projects: [],
        education: [],
        certificates: [],
        skills: [],
        target_role: '',
        target_company: '',
        target_job_description: '',
        template: 'classic',
        font: 'inter',
        density: 'balanced',
        bullet_style: 'bullet',
        skills_layout: 'inline',
        email: '',
        phone: '',
        ...overrides,
    } as ResumeDraft;
}

describe('OptimizeSheet', () => {
    it('is hidden when closed', () => {
        render(
            <OptimizeSheet
                open={false}
                onOpenChange={vi.fn()}
                draft={draft()}
                onChange={vi.fn()}
                resumeId={1}
                aiCredits={null}
                onJump={vi.fn()}
                plainText="plain text"
            />,
        );
        expect(screen.queryByText('Optimize')).not.toBeInTheDocument();
    });

    it('shows the score rings and JD card when open', () => {
        render(
            <OptimizeSheet
                open
                onOpenChange={vi.fn()}
                draft={draft()}
                onChange={vi.fn()}
                resumeId={1}
                aiCredits={null}
                onJump={vi.fn()}
                plainText="plain text"
            />,
        );
        expect(screen.getByText('Resume completeness')).toBeInTheDocument();
        expect(screen.getByLabelText('Job description')).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run resources/js/Components/workstation/__tests__/optimize-sheet.test.tsx`
Expected: FAIL — module `../optimize-sheet` not found.

- [ ] **Step 3: Implement it**

```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/Components/ui/sheet';
import { AtsPlainTextBlock, OptimizePanel } from '@/Components/workstation/optimize-panel';
import { ScoreRingTrio } from '@/Components/workstation/score-ring-trio';
import { TargetRoleBar } from '@/Components/workstation/target-role-bar';
import type { AiCredits, ResumeDraft, ResumeSectionKey } from '@/types';

/** Overlay layout mode: the full Optimize stack in a side sheet, so the
 *  form stays mounted (and its scroll/edit state intact) behind it. */
export function OptimizeSheet({
    open,
    onOpenChange,
    draft,
    onChange,
    resumeId,
    aiCredits,
    onJump,
    plainText,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    draft: ResumeDraft;
    onChange: (draft: ResumeDraft) => void;
    resumeId: number;
    aiCredits: AiCredits | null;
    onJump: (section: ResumeSectionKey) => void;
    plainText: string;
}) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full max-w-xl gap-4 overflow-y-auto sm:max-w-xl">
                <SheetHeader>
                    <SheetTitle>Optimize</SheetTitle>
                </SheetHeader>

                <ScoreRingTrio resume={draft} jd={draft.target_job_description ?? ''} />

                <TargetRoleBar
                    targetRole={draft.target_role}
                    targetCompany={draft.target_company ?? ''}
                    onChange={(target_role) => onChange({ ...draft, target_role })}
                    onTargetCompanyChange={(target_company) =>
                        onChange({ ...draft, target_company })
                    }
                />

                <OptimizePanel
                    draft={draft}
                    onChange={onChange}
                    resumeId={resumeId}
                    aiCredits={aiCredits}
                    onJump={onJump}
                >
                    <AtsPlainTextBlock plainText={plainText} />
                </OptimizePanel>
            </SheetContent>
        </Sheet>
    );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run resources/js/Components/workstation/__tests__/optimize-sheet.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add resources/js/Components/workstation/optimize-sheet.tsx \
    resources/js/Components/workstation/__tests__/optimize-sheet.test.tsx
git commit -m "feat: add OptimizeSheet for the Overlay layout mode"
```

---

## Task 7: `OptimizeRail` (Hybrid mode)

**Files:**
- Create: `resources/js/Components/workstation/optimize-rail.tsx`
- Test: `resources/js/Components/workstation/__tests__/optimize-rail.test.tsx`

**Interfaces:**
- Consumes: `analyzeResume` (`@/lib/resume-analysis`), `jdKeywordOverlap` (`@/lib/jd-keyword-overlap`), `AiCritiquePanel` (existing, unchanged), `Popover`/`PopoverTrigger`/`PopoverContent` (`@/Components/ui/popover`).
- Produces: `OptimizeRail({ draft, onChange, resumeId, aiCredits, onJump })`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OptimizeRail } from '../optimize-rail';
import type { ResumeDraft } from '@/types';

function draft(overrides: Partial<ResumeDraft> = {}): ResumeDraft {
    return {
        title: 'Resume',
        section_order: [],
        full_name: '',
        headline: '',
        summary: '',
        experiences: [],
        projects: [],
        education: [],
        certificates: [],
        skills: [],
        target_role: '',
        target_company: '',
        target_job_description: '',
        template: 'classic',
        font: 'inter',
        density: 'balanced',
        bullet_style: 'bullet',
        skills_layout: 'inline',
        email: '',
        phone: '',
        ...overrides,
    } as ResumeDraft;
}

describe('OptimizeRail', () => {
    it('shows a compact completeness score', () => {
        render(
            <OptimizeRail
                draft={draft()}
                onChange={vi.fn()}
                resumeId={1}
                aiCredits={null}
                onJump={vi.fn()}
            />,
        );
        expect(screen.getByText(/\/100 completeness/)).toBeInTheDocument();
    });

    it('opens a JD popover from the Target job button', () => {
        render(
            <OptimizeRail
                draft={draft()}
                onChange={vi.fn()}
                resumeId={1}
                aiCredits={null}
                onJump={vi.fn()}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Target job' }));
        expect(screen.getByPlaceholderText(/Paste the full job posting/)).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run resources/js/Components/workstation/__tests__/optimize-rail.test.tsx`
Expected: FAIL — module `../optimize-rail` not found.

- [ ] **Step 3: Implement it**

```tsx
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Textarea } from '@/Components/ui/textarea';
import { AiCritiquePanel } from '@/Components/workstation/ai-critique-panel';
import { jdKeywordOverlap } from '@/lib/jd-keyword-overlap';
import { analyzeResume } from '@/lib/resume-analysis';
import type { AiCredits, ResumeDraft, ResumeSectionKey } from '@/types';

/** Hybrid layout mode: a sticky rail next to the live preview showing a
 *  compact score summary, a JD popover, and the full AI critique panel. */
export function OptimizeRail({
    draft,
    onChange,
    resumeId,
    aiCredits,
    onJump,
}: {
    draft: ResumeDraft;
    onChange: (draft: ResumeDraft) => void;
    resumeId: number;
    aiCredits: AiCredits | null;
    onJump: (section: ResumeSectionKey) => void;
}) {
    const jd = draft.target_job_description ?? '';
    const analysis = analyzeResume(draft);
    const overlap = jdKeywordOverlap(draft, jd);

    return (
        <div className="flex flex-col gap-3">
            <Card className="gap-2 p-4">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-bold text-foreground">Score</h2>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button type="button" variant="outline" size="sm">
                                Target job
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-80">
                            <Textarea
                                rows={8}
                                value={jd}
                                placeholder="Paste the full job posting or key requirements…"
                                onChange={(event) =>
                                    onChange({
                                        ...draft,
                                        target_job_description: event.target.value,
                                    })
                                }
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="flex items-center gap-4 text-sm">
                    <span className="font-semibold text-foreground">
                        {analysis.score}/100 completeness
                    </span>
                    <span className="text-muted-foreground">
                        {overlap.total > 0
                            ? `${overlap.matched.length}/${overlap.total} JD terms`
                            : 'No JD pasted'}
                    </span>
                </div>
            </Card>

            <AiCritiquePanel
                resumeId={resumeId}
                jd={jd}
                initialSuggestions={draft.ai_review ?? null}
                initialGeneratedAt={draft.ai_review_generated_at ?? null}
                initialPreset={draft.ai_review_preset ?? null}
                credits={aiCredits}
                onJump={onJump}
                onResult={({ suggestions, generatedAt, preset }) =>
                    onChange({
                        ...draft,
                        ai_review: suggestions,
                        ai_review_generated_at: generatedAt,
                        ai_review_preset: preset,
                    })
                }
            />
        </div>
    );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run resources/js/Components/workstation/__tests__/optimize-rail.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add resources/js/Components/workstation/optimize-rail.tsx \
    resources/js/Components/workstation/__tests__/optimize-rail.test.tsx
git commit -m "feat: add OptimizeRail for the Hybrid layout mode"
```

---

## Task 8: Wire the four modes into `Workstation.tsx`

**Files:**
- Modify: `resources/js/Pages/Resumes/Workstation.tsx`
- Test: `resources/js/Pages/Resumes/__tests__/workstation-layout-modes.test.tsx`

**Interfaces:**
- Consumes: `useWorkstationLayout` (Task 2), `WorkstationFormatToolbar`'s new props via `WorkstationHeader` (Task 3), `JdMatchCard` (Task 4), `suggestionsForSection` (Task 5), `OptimizeSheet` (Task 6), `OptimizeRail` (Task 7).
- Produces: the four working layout modes.

Given the size of `Workstation.tsx`, this task is a full component-level integration test plus targeted edits, not a strict single failing-test-first cycle — write the test first per TDD, watch it fail for the right reason (missing UI), then make the listed edits.

- [ ] **Step 1: Write the failing integration test**

```tsx
/** @vitest-environment happy-dom */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const { routerPatch, autosaveState } = vi.hoisted(() => ({
    routerPatch: vi.fn(),
    autosaveState: { status: 'saved', offline: false, conflict: false, errorMessage: null },
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { patch: routerPatch, post: vi.fn(), reload: vi.fn() },
    usePage: () => ({
        props: {
            auth: { user: { workstation_layout: 'inline' } },
            aiCredits: null,
        },
    }),
}));

vi.mock('@/hooks/use-autosave', () => ({
    useAutosave: () => ({ ...autosaveState, retry: vi.fn() }),
}));

vi.mock('@/Layouts/AuthenticatedLayout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import Workstation from '../Workstation';
import type { ResumePageDocument } from '@/types';

function baseResume(): ResumePageDocument {
    return {
        id: 1,
        title: 'My Resume',
        updated_at: '2026-09-16T00:00:00Z',
        section_order: ['contact', 'summary', 'experience'],
        full_name: 'Jane Doe',
        headline: '',
        summary: '',
        experiences: [],
        projects: [],
        education: [],
        certificates: [],
        skills: [],
        target_role: '',
        target_company: '',
        target_job_description: '',
        template: 'classic',
        font: 'inter',
        density: 'balanced',
        bullet_style: 'bullet',
        skills_layout: 'inline',
        email: 'jane@example.com',
        phone: '',
        ai_review: [
            {
                id: 's1',
                label: 'Tighten the summary opener',
                severity: 'high',
                section: 'summary',
                detail: 'Leads with a title instead of an outcome.',
            },
        ],
        ai_review_generated_at: null,
        ai_review_preset: null,
    } as ResumePageDocument;
}

describe('Workstation Inline layout mode', () => {
    beforeEach(() => {
        routerPatch.mockClear();
    });

    it('shows the AI suggestion attached under its matching section, with no separate Optimize tab', () => {
        render(
            <Workstation
                resume={baseResume()}
                skillLibrary={[]}
                share={null}
            />,
        );

        expect(screen.queryByRole('tab', { name: 'Optimize' })).not.toBeInTheDocument();
        expect(screen.getByText('Tighten the summary opener')).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run resources/js/Pages/Resumes/__tests__/workstation-layout-modes.test.tsx`
Expected: FAIL — `Workstation` still always renders the `tabs` layout (no `Optimize` tab hiding, no inline suggestion under Summary), and `layoutMode`/`onLayoutModeChange`/`onOpenOptimize` props don't exist on `WorkstationHeader` calls yet from this file's perspective (compile-time is fine since Task 3 already added them; the behavioral assertions fail).

- [ ] **Step 3: Import the new pieces in `Workstation.tsx`**

Add these imports (alongside the existing ones):

```tsx
import { JdMatchCard } from '@/Components/workstation/jd-match-card';
import { OptimizeRail } from '@/Components/workstation/optimize-rail';
import { OptimizeSheet } from '@/Components/workstation/optimize-sheet';
import { useWorkstationLayout } from '@/hooks/use-workstation-layout';
import { suggestionsForSection } from '@/lib/ai-review';
```

- [ ] **Step 4: Add layout-mode state**

Inside the `Workstation` component, near the other `useState` calls (after `const isMobile = useIsMobile();`):

```tsx
    const [layoutMode, onLayoutModeChange] = useWorkstationLayout();
    const [optimizeSheetOpen, setOptimizeSheetOpen] = useState(false);
```

- [ ] **Step 5: Update `renderFormSections()` for Inline mode**

Replace the function from:

```tsx
    function renderFormSections() {
        return (
            <main
                aria-label="Section form"
                className="flex min-w-0 flex-col gap-3"
            >
                {draft.section_order.map((sectionKey) => {
```

to:

```tsx
    function renderFormSections() {
        return (
            <main
                aria-label="Section form"
                className="flex min-w-0 flex-col gap-3"
            >
                {layoutMode === 'inline' && (
                    <div className="flex flex-col gap-4">
                        <ScoreRingTrio
                            resume={draft}
                            jd={draft.target_job_description ?? ''}
                        />
                        <TargetRoleBar
                            targetRole={draft.target_role}
                            targetCompany={draft.target_company ?? ''}
                            onChange={(target_role) =>
                                setDraft((current) => ({ ...current, target_role }))
                            }
                            onTargetCompanyChange={(target_company) =>
                                setDraft((current) => ({ ...current, target_company }))
                            }
                        />
                    </div>
                )}

                {draft.section_order.map((sectionKey) => {
```

Then, inside the per-section `<Card>` — find the closing of the section content (right after the `<SectionFields .../>` call, still inside `<div className="px-4 py-4 sm:px-5 sm:py-5">`) and add the inline suggestions directly beneath `<SectionFields .../>`:

```tsx
                                        <SectionFields
                                            resume={draft}
                                            resumeId={id}
                                            section={sectionKey}
                                            skillLibrary={skillLibrary}
                                            contactErrors={errors}
                                            onChange={setDraft}
                                        />

                                        {layoutMode === 'inline' &&
                                            suggestionsForSection(draft.ai_review, sectionKey).map(
                                                (suggestion) => (
                                                    <Alert
                                                        key={suggestion.id}
                                                        variant={
                                                            suggestion.severity === 'high'
                                                                ? 'destructive'
                                                                : suggestion.severity === 'medium'
                                                                  ? 'warning'
                                                                  : 'default'
                                                        }
                                                        className="mt-3"
                                                    >
                                                        <AlertDescription>
                                                            <span className="font-medium text-foreground">
                                                                {suggestion.label}
                                                            </span>
                                                            <span className="block text-xs">
                                                                {suggestion.detail}
                                                            </span>
                                                        </AlertDescription>
                                                    </Alert>
                                                ),
                                            )}
```

- [ ] **Step 6: Replace the tab-driven render block**

Replace:

```tsx
                                {tab === 'Optimize' && (
                                    <>
                                        <ScoreRingTrio
                                            resume={draft}
                                            jd={draft.target_job_description ?? ''}
                                        />
                                        <TargetRoleBar
                                            targetRole={draft.target_role}
                                            targetCompany={draft.target_company ?? ''}
                                            onChange={(target_role) => setDraft((current) => ({ ...current, target_role }))}
                                            onTargetCompanyChange={(target_company) => setDraft((current) => ({ ...current, target_company }))}
                                        />
                                        <OptimizePanel
                                            draft={draft}
                                            onChange={setDraft}
                                            resumeId={id}
                                            aiCredits={page.props.aiCredits as AiCredits | null}
                                            onJump={jumpFromOptimize}
                                        >
                                            <AtsPlainTextBlock
                                                plainText={plainText}
                                            />
                                        </OptimizePanel>
                                    </>
                                )}

                                {tab === 'Edit' && (
                                    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                                        {renderFormSections()}
                                        <div className="min-w-0 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
                                            {renderPreview()}
                                        </div>
                                    </div>
                                )}
```

with:

```tsx
                                {layoutMode === 'tabs' && tab === 'Optimize' && (
                                    <>
                                        <ScoreRingTrio
                                            resume={draft}
                                            jd={draft.target_job_description ?? ''}
                                        />
                                        <TargetRoleBar
                                            targetRole={draft.target_role}
                                            targetCompany={draft.target_company ?? ''}
                                            onChange={(target_role) => setDraft((current) => ({ ...current, target_role }))}
                                            onTargetCompanyChange={(target_company) => setDraft((current) => ({ ...current, target_company }))}
                                        />
                                        <OptimizePanel
                                            draft={draft}
                                            onChange={setDraft}
                                            resumeId={id}
                                            aiCredits={page.props.aiCredits as AiCredits | null}
                                            onJump={jumpFromOptimize}
                                        >
                                            <AtsPlainTextBlock
                                                plainText={plainText}
                                            />
                                        </OptimizePanel>
                                    </>
                                )}

                                {(layoutMode !== 'tabs' || tab === 'Edit') && (
                                    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                                        {renderFormSections()}
                                        <div className="min-w-0 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
                                            {layoutMode === 'hybrid' && (
                                                <div className="mb-4">
                                                    <OptimizeRail
                                                        draft={draft}
                                                        onChange={setDraft}
                                                        resumeId={id}
                                                        aiCredits={page.props.aiCredits as AiCredits | null}
                                                        onJump={jumpFromOptimize}
                                                    />
                                                </div>
                                            )}
                                            {renderPreview()}
                                        </div>
                                    </div>
                                )}

                                {layoutMode === 'overlay' && (
                                    <OptimizeSheet
                                        open={optimizeSheetOpen}
                                        onOpenChange={setOptimizeSheetOpen}
                                        draft={draft}
                                        onChange={setDraft}
                                        resumeId={id}
                                        aiCredits={page.props.aiCredits as AiCredits | null}
                                        onJump={jumpFromOptimize}
                                        plainText={plainText}
                                    />
                                )}
```

- [ ] **Step 7: Add Inline mode's JD/ATS cards to the side-tools grid**

Replace:

```tsx
                                {showSideTools && (
                                    <div
                                        id="workstation-side-tools"
                                        className="grid gap-4 md:grid-cols-2"
                                    >
                                        <NotesPanel
                                            resumeId={id}
                                            notes={notes}
                                        />
                                        <SnapshotsPanel
                                            resumeId={id}
                                            snapshots={snapshots}
                                        />
                                    </div>
                                )}
```

with:

```tsx
                                {showSideTools && (
                                    <div
                                        id="workstation-side-tools"
                                        className="grid gap-4 md:grid-cols-2"
                                    >
                                        <NotesPanel
                                            resumeId={id}
                                            notes={notes}
                                        />
                                        <SnapshotsPanel
                                            resumeId={id}
                                            snapshots={snapshots}
                                        />
                                        {layoutMode === 'inline' && (
                                            <>
                                                <JdMatchCard
                                                    draft={draft}
                                                    onChange={setDraft}
                                                />
                                                <AtsPlainTextBlock
                                                    plainText={plainText}
                                                />
                                            </>
                                        )}
                                    </div>
                                )}
```

- [ ] **Step 8: Wire the new props into `<WorkstationHeader>`**

In the `<WorkstationHeader ... />` call, add (near `onToggleSideTools`'s closing):

```tsx
                            layoutMode={layoutMode}
                            onLayoutModeChange={onLayoutModeChange}
                            onOpenOptimize={
                                layoutMode === 'overlay'
                                    ? () => setOptimizeSheetOpen(true)
                                    : undefined
                            }
```

- [ ] **Step 9: Run the integration test to verify it passes**

Run: `npx vitest run resources/js/Pages/Resumes/__tests__/workstation-layout-modes.test.tsx`
Expected: PASS.

- [ ] **Step 10: Run the full frontend and PHP suites**

Run: `npm run test`
Run: `composer run test`
Expected: both PASS. Fix any TypeScript errors from `npx tsc --noEmit` (run this too — the project's `npm run build` runs `tsc` first) before proceeding; the most likely spot is an unused `OptimizePanel`/`AtsPlainTextBlock` import warning in `Workstation.tsx` if either lost all remaining call sites — they have not (both are still used in the `tabs`/`overlay` branches).

- [ ] **Step 11: Live-verify all four modes in the running app**

Per project verification policy, this cannot be signed off from tests alone:

1. `composer run dev`
2. Open a resume's Workstation, use the Layout select in the format toolbar to switch through **Tabs → Overlay → Inline → Hybrid**, confirming for each:
   - Tabs: unchanged from current behavior (Edit/Optimize tab switch).
   - Overlay: form + preview always visible; "Optimize" button opens the side sheet with score/JD/critique; closing it preserves scroll and any in-progress edits.
   - Inline: no Optimize tab; score/target-role strip at the top of the form column; run an AI critique (via "Notes & checkpoints" → JD/ATS card is there instead — actually AI critique itself needs a way to run in Inline mode: confirm during this check whether `AiCritiquePanel`'s "Run critique" control is reachable in Inline mode. **If it is not** (the current Inline plan only reads `draft.ai_review`, it does not render `AiCritiquePanel`'s controls), note this as a follow-up gap rather than silently shipping a broken Inline mode — Inline mode can display existing suggestions inline but cannot currently *generate* new ones without opening the side-tools JD card first; call this out explicitly rather than claiming Inline is fully equivalent to the other modes.
   - Hybrid: rail above the live preview shows score + JD popover + full AI critique panel (including "Run critique"); clicking a suggestion scrolls the form to that section.
3. Reload the page — confirm the chosen mode persists (backed by `users.workstation_layout`).
4. Check the browser console for errors in each mode.

Report what was actually seen for each of the four modes, including the Inline gap noted above if still present, rather than asserting all four are equally complete.

- [ ] **Step 12: Commit**

```bash
git add resources/js/Pages/Resumes/Workstation.tsx \
    resources/js/Pages/Resumes/__tests__/workstation-layout-modes.test.tsx
git commit -m "feat: wire Tabs/Overlay/Inline/Hybrid layout modes into Workstation"
```

---

## Self-Review Notes

- **Spec coverage:** persistence (Task 1-2), switcher UI (Task 3), Tabs baseline (untouched, verified in Task 8), Overlay (Task 6, wired in Task 8), Inline (Tasks 4/5, wired in Task 8), Hybrid (Task 7, wired in Task 8), testing (each task has component/hook/feature tests; Task 8 Step 11 is the live-browser check the spec's Testing section calls for).
- **Known gap surfaced, not hidden:** Task 8 Step 11 explicitly flags that Inline mode, as specified, may not expose a way to *run* a new AI critique (only to display cached suggestions inline) — the spec's Inline description doesn't call for `AiCritiquePanel`'s run controls anywhere in that mode. This is flagged for the live check rather than silently accepted or silently fixed by scope-creeping a new control in; if the user wants Inline to support running critiques, that's a follow-up decision, not an assumption to make here.
- **Type consistency check:** `WorkstationLayoutMode` used identically in `types/index.d.ts`, `use-workstation-layout.ts`, `workstation-format-toolbar.tsx`, `workstation-header.tsx`, and `Workstation.tsx`. `suggestionsForSection`'s signature matches its two call-adjacent types (`AiReviewSuggestion[] | null | undefined`, `ResumeSectionKey`) and its one call site in Task 8 Step 5 passes `draft.ai_review` (typed `AiReviewSuggestion[] | null | undefined` per `resume.ts`) and `sectionKey` (typed `ResumeSectionKey`) — consistent.
