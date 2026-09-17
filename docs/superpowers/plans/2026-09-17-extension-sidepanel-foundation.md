# Extension Sidepanel Foundation (React + shadcn) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the vanilla-JS `extension/sidepanel/sidepanel.html` + `sidepanel.js` with a standalone React 19 + Vite + TypeScript + shadcn app, preserving every current sidepanel capability 1:1, with no changes to `background/service-worker.js`, `content/*.js`, or any backend endpoint.

**Architecture:** New `extension/sidepanel-app/` — its own `package.json`, Vite build, React app. It talks to `background/service-worker.js` exclusively via `chrome.runtime.sendMessage({ type, ...payload })` (the existing message contract — the background worker does all `fetch()`/`chrome.tabs.sendMessage()` work; the sidepanel never calls the API or content scripts directly). The build output (`dist/`) is committed and `manifest.json`'s `side_panel.default_path` points at `sidepanel/dist/index.html`.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`), shadcn/ui primitives copied from `resources/js/Components/ui/*` and `resources/js/shadcn-demo/components/ui/*`, `class-variance-authority`, `radix-ui` (Tabs only), `lucide-react`, `sonner` (toasts), Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-17-extension-sidepanel-foundation-design.md`

## Correction to the spec's "Data flow" section

The spec assumed the React app would fetch `/api/extension/*` directly via a
`fetchExtensionApi()` wrapper. Reading the actual current code
(`extension/sidepanel/sidepanel.js` and `extension/background/service-worker.js`)
shows this is wrong: **the current sidepanel never calls `fetch()` or reads the
token.** Every action goes through `chrome.runtime.sendMessage({ type, ...payload })`
to the background service worker, which does the `fetch()` (with the bearer
token) and the `chrome.tabs.sendMessage()` to content scripts, then returns a
plain result object. This plan follows the real, tested contract: one
`sendMessage()` helper, no `fetchExtensionApi()`, no direct `chrome.storage.sync`
reads for the token (the background's `GET_CONFIG` message already returns
`{ token, appBase, apiBase }`). This is more accurate and strictly simpler than
the spec's description, so per project Rule 7 the spec's prose is superseded by
this plan on this one point; nothing else in the spec changes.

## Global Constraints

- React 19, Vite 8, TypeScript strict mode — match versions already pinned in root `package.json` (`react@^19.0.0`, `vite@^8.0.0`, `tailwindcss@^4.3.3`, `class-variance-authority@^0.7.1`, `clsx@^2.1.1`, `tailwind-merge@^3.6.0`, `lucide-react@^1.43.0`, `radix-ui@^1.6.7`, `sonner@^2.0.8`, `@vitejs/plugin-react@^6.0.3`, `@tailwindcss/vite@^4.3.3`, `vitest@^4.1.11`, `@testing-library/react@^16.3.3`, `@testing-library/jest-dom@^6.9.1`, `happy-dom@^20.11.12`).
- `extension/sidepanel-app/` is a standalone app: own `package.json`, own `node_modules`, own build. Not a shared monorepo package with the main Inertia app (Approach B was rejected in the spec).
- `background/service-worker.js`, `content/fill.js`, `content/fill-heuristics.js`, `content/jd-badge.js`, `shared/*.js`, `options/*` are never modified.
- Never add auto-submit of any kind, anywhere in this app.
- No react-router. Navigation is plain React state.
- No backend/PHP changes. No new API endpoints.
- Build output goes to `extension/sidepanel/dist/` and is committed to git (the extension must load unpacked straight from the repo with no build step required by whoever loads it).
- `node --test extension/test/*.cjs` keeps covering `content/fill-heuristics.js` unchanged — not touched by this plan.

---

## File Structure

```
extension/sidepanel-app/
  package.json
  tsconfig.json
  vite.config.ts
  index.html                      # Vite entry, builds to ../sidepanel/dist/index.html
  src/
    main.tsx
    App.tsx
    index.css                     # Tailwind import + copied @theme tokens
    test-setup.ts
    lib/
      utils.ts                    # cn() — copied from resources/js/lib/utils.ts
      types.ts                    # ResumeGroup, FillProfile, Question, etc.
      chrome-messaging.ts         # sendMessage() wrapper
    hooks/
      useConnection.ts
      useConnection.test.ts
      useResumes.ts
      useResumes.test.ts
    components/
      ui/
        button.tsx / input.tsx / select.tsx / card.tsx / badge.tsx /
        alert.tsx / tabs.tsx / skeleton.tsx / sonner.tsx
        ui.smoke.test.tsx
      Header.tsx
      SetupView.tsx
      LoadingView.tsx
      EmptyView.tsx
      ReadyView.tsx
      FillPanel.tsx
      InsertChips.tsx
      ScreeningQuestions.tsx
      JdMatchBadge.tsx
      TrackApplication.tsx
      AttachResume.tsx
      HelpPanel.tsx
      HelpView.tsx
      App.test.tsx
      Header.test.tsx
      FillPanel.test.tsx
      InsertChips.test.tsx
      ScreeningQuestions.test.tsx
      JdMatchBadge.test.tsx
      TrackApplication.test.tsx
      AttachResume.test.tsx
      ReadyView.test.tsx
```

Modified outside `sidepanel-app/`:
- `extension/manifest.json` — `side_panel.default_path`
- `.gitignore` — ignore `extension/sidepanel-app/node_modules`
- `extension/README.md` — sidepanel section reflects the new build

Deleted:
- `extension/sidepanel/sidepanel.html`
- `extension/sidepanel/sidepanel.js`
- `extension/sidepanel/sidepanel.css`

---

### Task 1: Scaffold the Vite + React + TypeScript build

**Files:**
- Create: `extension/sidepanel-app/package.json`
- Create: `extension/sidepanel-app/tsconfig.json`
- Create: `extension/sidepanel-app/vite.config.ts`
- Create: `extension/sidepanel-app/index.html`
- Create: `extension/sidepanel-app/src/main.tsx`
- Create: `extension/sidepanel-app/src/App.tsx`
- Create: `extension/sidepanel-app/src/index.css`
- Create: `extension/sidepanel-app/src/test-setup.ts`
- Create: `extension/sidepanel-app/src/lib/utils.ts`
- Test: `extension/sidepanel-app/src/App.test.tsx`

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string` from `src/lib/utils.ts`, imported by every later component as `@/lib/utils`.
- Produces: `App` default export placeholder, replaced piece by piece in later tasks.

- [ ] **Step 1: Create `extension/sidepanel-app/package.json`**

```json
{
    "name": "resumegen-apply-sidepanel",
    "private": true,
    "type": "module",
    "scripts": {
        "dev": "vite",
        "build": "tsc && vite build",
        "test": "vitest run"
    },
    "devDependencies": {
        "@tailwindcss/vite": "^4.3.3",
        "@testing-library/jest-dom": "^6.9.1",
        "@testing-library/react": "^16.3.3",
        "@types/chrome": "^0.0.280",
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        "@vitejs/plugin-react": "^6.0.3",
        "happy-dom": "^20.11.12",
        "tailwindcss": "^4.3.3",
        "typescript": "^5.0.2",
        "vite": "^8.0.0",
        "vitest": "^4.1.11"
    },
    "dependencies": {
        "class-variance-authority": "^0.7.1",
        "clsx": "^2.1.1",
        "lucide-react": "^1.43.0",
        "radix-ui": "^1.6.7",
        "react": "^19.0.0",
        "react-dom": "^19.0.0",
        "sonner": "^2.0.8",
        "tailwind-merge": "^3.6.0"
    }
}
```

- [ ] **Step 2: Create `extension/sidepanel-app/tsconfig.json`**

```json
{
    "compilerOptions": {
        "target": "ES2022",
        "lib": ["ES2022", "DOM", "DOM.Iterable"],
        "module": "ESNext",
        "moduleResolution": "bundler",
        "jsx": "react-jsx",
        "strict": true,
        "isolatedModules": true,
        "esModuleInterop": true,
        "forceConsistentCasingInFileNames": true,
        "skipLibCheck": true,
        "noEmit": true,
        "types": ["chrome", "vite/client"],
        "paths": {
            "@/*": ["./src/*"]
        }
    },
    "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

- [ ] **Step 3: Create `extension/sidepanel-app/vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
    test: {
        environment: 'happy-dom',
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
        setupFiles: ['src/test-setup.ts'],
    },
});
```

- [ ] **Step 4: Create `extension/sidepanel-app/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Resumegen Apply</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 5: Create `extension/sidepanel-app/src/lib/utils.ts`**

```ts
import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
```

- [ ] **Step 6: Create `extension/sidepanel-app/src/index.css`**

```css
@import 'tailwindcss';

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --success: oklch(0.6 0.15 155);
  --radius: 0.625rem;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-success: var(--success);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
}

body {
  @apply bg-background text-foreground;
  width: 380px;
  min-height: 100vh;
  margin: 0;
}
```

- [ ] **Step 7: Create `extension/sidepanel-app/src/test-setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
    cleanup();
});

// happy-dom has no chrome.* global — every hook/component that talks to the
// extension APIs needs this present before it renders. Individual tests
// override sendMessage's resolved value per-call.
(globalThis as unknown as { chrome: unknown }).chrome = {
    runtime: {
        sendMessage: vi.fn(),
        openOptionsPage: vi.fn(),
    },
    storage: {
        local: {
            get: vi.fn().mockResolvedValue({}),
            set: vi.fn().mockResolvedValue(undefined),
        },
    },
};
```

- [ ] **Step 8: Create placeholder `extension/sidepanel-app/src/App.tsx`**

```tsx
export function App() {
    return <h1 className="p-4 text-lg font-semibold">Resumegen Apply</h1>;
}
```

- [ ] **Step 9: Create `extension/sidepanel-app/src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

const root = document.getElementById('root');
if (root) {
    createRoot(root).render(
        <StrictMode>
            <App />
        </StrictMode>,
    );
}
```

- [ ] **Step 10: Write the failing smoke test — `extension/sidepanel-app/src/App.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
    it('renders the extension title', () => {
        render(<App />);
        expect(screen.getByText('Resumegen Apply')).toBeInTheDocument();
    });
});
```

- [ ] **Step 11: Install and run**

```bash
cd extension/sidepanel-app && npm install && npm test
```

Expected: PASS (1 test).

- [ ] **Step 12: Verify the build**

```bash
cd extension/sidepanel-app && npm run build
```

Expected: succeeds, produces `extension/sidepanel-app/dist/index.html` and a JS/CSS bundle.

- [ ] **Step 13: Commit**

```bash
git add extension/sidepanel-app/package.json extension/sidepanel-app/package-lock.json \
  extension/sidepanel-app/tsconfig.json extension/sidepanel-app/vite.config.ts \
  extension/sidepanel-app/index.html extension/sidepanel-app/src
git commit -m "feat: scaffold React+Vite+TypeScript sidepanel app"
```

---

### Task 2: Copy shadcn UI primitives

**Files:**
- Create: `extension/sidepanel-app/src/components/ui/button.tsx`
- Create: `extension/sidepanel-app/src/components/ui/input.tsx`
- Create: `extension/sidepanel-app/src/components/ui/select.tsx`
- Create: `extension/sidepanel-app/src/components/ui/card.tsx`
- Create: `extension/sidepanel-app/src/components/ui/badge.tsx`
- Create: `extension/sidepanel-app/src/components/ui/alert.tsx`
- Create: `extension/sidepanel-app/src/components/ui/tabs.tsx`
- Create: `extension/sidepanel-app/src/components/ui/skeleton.tsx`
- Create: `extension/sidepanel-app/src/components/ui/sonner.tsx`
- Test: `extension/sidepanel-app/src/components/ui/ui.smoke.test.tsx`

**Interfaces:**
- Produces: `Button`, `Input`, `Select`, `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter`, `Badge`, `Alert`/`AlertTitle`/`AlertDescription`, `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`, `Skeleton`, `Toaster` — all consumed by Tasks 5-9.

- [ ] **Step 1: Create `button.tsx`** (byte-for-byte copy of `resources/js/Components/ui/button.tsx`, minus the legacy `buttonClassName` export which nothing here needs)

```tsx
import * as React from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
    {
        variants: {
            variant: {
                default:
                    'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
                destructive:
                    'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90',
                outline:
                    'border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground',
                secondary:
                    'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
                ghost: 'hover:bg-accent hover:text-accent-foreground',
                link: 'text-primary underline-offset-4 hover:underline',
            },
            size: {
                default: 'h-9 px-4 py-2',
                sm: 'h-8 rounded-md px-3 text-xs',
                lg: 'h-10 rounded-md px-6',
                icon: 'size-9',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
);

function Button({
    className,
    variant,
    size,
    asChild = false,
    ...props
}: React.ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
    const Comp = asChild ? Slot.Root : 'button';

    return (
        <Comp
            data-slot="button"
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        />
    );
}

export { Button, buttonVariants };
```

- [ ] **Step 2: Create `input.tsx`** (copy of `resources/js/Components/ui/input.tsx`)

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
    return (
        <input
            type={type}
            data-slot="input"
            className={cn(
                'flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors',
                'placeholder:text-muted-foreground',
                'focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring',
                'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
                'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
                className,
            )}
            {...props}
        />
    );
}

export { Input };
```

- [ ] **Step 3: Create `select.tsx`** (copy of `resources/js/Components/ui/select.tsx`)

```tsx
import * as React from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

function Select({
    className,
    children,
    ...props
}: React.ComponentProps<'select'>) {
    return (
        <div className={cn('relative', className)}>
            <select
                data-slot="select"
                className={cn(
                    'flex h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-xs outline-none transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring',
                    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
                    className,
                )}
                {...props}
            >
                {children}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
    );
}

export { Select };
```

- [ ] **Step 4: Create `card.tsx`, `badge.tsx`, `alert.tsx`** (byte-for-byte copies of `resources/js/Components/ui/card.tsx`, `badge.tsx`, `alert.tsx`, import path unchanged as `@/lib/utils`)

Copy the three files verbatim from:
- `resources/js/Components/ui/card.tsx` → `extension/sidepanel-app/src/components/ui/card.tsx`
- `resources/js/Components/ui/badge.tsx` → `extension/sidepanel-app/src/components/ui/badge.tsx`
- `resources/js/Components/ui/alert.tsx` → `extension/sidepanel-app/src/components/ui/alert.tsx`

(These already import `cn` from `@/lib/utils`, which resolves correctly under this app's own path alias — no edits needed beyond the copy.)

- [ ] **Step 5: Create `tabs.tsx`** (copy of `resources/js/shadcn-demo/components/ui/tabs.tsx`, import path adjusted to this app's `@/lib/utils`)

```tsx
import * as React from 'react';
import { Tabs as TabsPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

function Tabs({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
    return (
        <TabsPrimitive.Root
            data-slot="tabs"
            className={cn('flex flex-col gap-2', className)}
            {...props}
        />
    );
}

function TabsList({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
    return (
        <TabsPrimitive.List
            data-slot="tabs-list"
            className={cn(
                'inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-1',
                className,
            )}
            {...props}
        />
    );
}

function TabsTrigger({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
    return (
        <TabsPrimitive.Trigger
            data-slot="tabs-trigger"
            className={cn(
                "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] outline-none",
                'text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
                'focus-visible:ring-2 focus-visible:ring-ring/50',
                'disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4',
                className,
            )}
            {...props}
        />
    );
}

function TabsContent({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
    return (
        <TabsPrimitive.Content
            data-slot="tabs-content"
            className={cn('flex-1 outline-none', className)}
            {...props}
        />
    );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
```

- [ ] **Step 6: Create `skeleton.tsx`** (copy of `resources/js/shadcn-demo/components/ui/skeleton.tsx`)

```tsx
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="skeleton"
            className={cn('animate-pulse rounded-md bg-muted', className)}
            {...props}
        />
    );
}

export { Skeleton };
```

- [ ] **Step 7: Create `sonner.tsx`** (copy of `resources/js/Components/ui/sonner.tsx`)

```tsx
import type React from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster(props: ToasterProps) {
    return (
        <Sonner
            theme="light"
            className="toaster group"
            style={
                {
                    '--normal-bg': 'var(--popover)',
                    '--normal-text': 'var(--popover-foreground)',
                    '--normal-border': 'var(--border)',
                } as React.CSSProperties
            }
            {...props}
        />
    );
}

export { Toaster };
```

- [ ] **Step 8: Write the smoke test — `ui.smoke.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button';
import { Input } from './input';
import { Select } from './select';
import { Card, CardContent } from './card';
import { Badge } from './badge';
import { Alert, AlertDescription } from './alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
import { Skeleton } from './skeleton';

describe('shadcn primitives', () => {
    it('render without throwing', () => {
        render(
            <div>
                <Button>Click</Button>
                <Input placeholder="hi" />
                <Select>
                    <option value="a">A</option>
                </Select>
                <Card>
                    <CardContent>content</CardContent>
                </Card>
                <Badge>badge</Badge>
                <Alert>
                    <AlertDescription>alert text</AlertDescription>
                </Alert>
                <Tabs defaultValue="a">
                    <TabsList>
                        <TabsTrigger value="a">A tab</TabsTrigger>
                    </TabsList>
                    <TabsContent value="a">a content</TabsContent>
                </Tabs>
                <Skeleton className="h-4 w-4" />
            </div>,
        );
        expect(screen.getByText('Click')).toBeInTheDocument();
        expect(screen.getByText('A tab')).toBeInTheDocument();
    });
});
```

- [ ] **Step 9: Run tests**

```bash
cd extension/sidepanel-app && npm test
```

Expected: PASS (2 tests total, including Task 1's).

- [ ] **Step 10: Commit**

```bash
git add extension/sidepanel-app/src/components/ui
git commit -m "feat: copy shadcn ui primitives into sidepanel app"
```

---

### Task 3: Messaging wrapper, types, and connection hook

**Files:**
- Create: `extension/sidepanel-app/src/lib/types.ts`
- Create: `extension/sidepanel-app/src/lib/chrome-messaging.ts`
- Create: `extension/sidepanel-app/src/hooks/useConnection.ts`
- Test: `extension/sidepanel-app/src/hooks/useConnection.test.ts`

**Interfaces:**
- Consumes: nothing outside this task.
- Produces: `sendMessage<T>(type: string, payload?: Record<string, unknown>): Promise<MessageResponse<T>>` from `@/lib/chrome-messaging`, used by every hook/component from Task 4 onward. `useConnection(): { status: 'checking' | 'connected' | 'disconnected'; recheck: () => Promise<void> }` used by `App.tsx` (Task 5).
- Produces types `ResumeVersion`, `ResumeGroup`, `FillProfile`, `ExtensionUser`, `Question`, `FileInputField` from `@/lib/types`, used by Tasks 4, 6-8.

- [ ] **Step 1: Create `src/lib/types.ts`**

```ts
export interface ResumeVersion {
    id: number;
    version_label: string;
    updated_at: string;
}

export interface ResumeGroup {
    id: number | null;
    title: string;
    versions: ResumeVersion[];
}

export interface FillProfileContact {
    full_name: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
}

export interface FillProfileLatestRole {
    title: string;
    one_liner: string;
    bullets: string[];
}

export interface FillProfile {
    resume_id: number;
    target_role: string;
    contact: FillProfileContact;
    summary: string;
    skills_csv: string;
    latest_role: FillProfileLatestRole;
    inserts: Record<string, string>;
}

export interface ExtensionUser {
    email: string;
}

export interface QuestionDraft {
    answer: string;
    source: 'qa_bank' | 'ai';
    credits_remaining?: number;
}

export interface Question {
    id: string;
    question: string;
    draft: QuestionDraft | null;
    drafting: boolean;
    saved: boolean;
}

export interface FileInputField {
    id: string;
    label: string;
}
```

- [ ] **Step 2: Create `src/lib/chrome-messaging.ts`**

```ts
export interface MessageResponse<T = Record<string, unknown>> {
    ok: boolean;
    reason?: string;
    status?: number;
    message?: string;
    error?: string;
    body?: { message?: string };
    data?: T extends { data: infer D } ? D : unknown;
}

export function sendMessage<TExtra extends Record<string, unknown> = Record<string, unknown>>(
    type: string,
    payload: Record<string, unknown> = {},
): Promise<MessageResponse & TExtra> {
    return chrome.runtime.sendMessage({ type, ...payload });
}
```

- [ ] **Step 3: Write the failing test — `useConnection.test.ts`**

```ts
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useConnection } from './useConnection';

describe('useConnection', () => {
    it('reports connected when GET_CONFIG returns a token', async () => {
        vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({ ok: true, token: 'abc', appBase: 'https://resumegen.test' });

        const { result } = renderHook(() => useConnection());

        await waitFor(() => expect(result.current.status).toBe('connected'));
    });

    it('reports disconnected when GET_CONFIG returns no token', async () => {
        vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({ ok: true, token: '', appBase: 'https://resumegen.test' });

        const { result } = renderHook(() => useConnection());

        await waitFor(() => expect(result.current.status).toBe('disconnected'));
    });
});
```

- [ ] **Step 4: Run test to verify it fails**

```bash
cd extension/sidepanel-app && npx vitest run src/hooks/useConnection.test.ts
```

Expected: FAIL — `useConnection` not defined (module doesn't exist yet).

- [ ] **Step 5: Create `src/hooks/useConnection.ts`**

```ts
import { useCallback, useEffect, useState } from 'react';
import { sendMessage } from '@/lib/chrome-messaging';

export type ConnectionStatus = 'checking' | 'connected' | 'disconnected';

export function useConnection() {
    const [status, setStatus] = useState<ConnectionStatus>('checking');

    const check = useCallback(async () => {
        setStatus('checking');
        const config = await sendMessage<{ token: string }>('GET_CONFIG');
        setStatus(config?.token ? 'connected' : 'disconnected');
    }, []);

    useEffect(() => {
        check();
    }, [check]);

    return { status, recheck: check };
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
cd extension/sidepanel-app && npx vitest run src/hooks/useConnection.test.ts
```

Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add extension/sidepanel-app/src/lib extension/sidepanel-app/src/hooks
git commit -m "feat: add chrome messaging wrapper, shared types, and useConnection hook"
```

---

### Task 4: `useResumes` hook (load, select, profile)

**Files:**
- Create: `extension/sidepanel-app/src/hooks/useResumes.ts`
- Test: `extension/sidepanel-app/src/hooks/useResumes.test.ts`

**Interfaces:**
- Consumes: `sendMessage` from `@/lib/chrome-messaging` (Task 3), `ResumeGroup`/`FillProfile`/`ExtensionUser` types from `@/lib/types` (Task 3).
- Produces: `useResumes(): { status: 'idle'|'loading'|'empty'|'ready'|'auth_error'|'error'; groups: ResumeGroup[]; user: ExtensionUser|null; selectedGroupId: number|null; selectedResumeId: number|null; profile: FillProfile|null; errorMessage: string; load: () => Promise<void>; selectGroup: (id: number|null) => Promise<void>; selectResume: (id: number) => Promise<void> }` — consumed by `App.tsx` (Task 5) and every `ready`-view component (Tasks 6-8).

- [ ] **Step 1: Write the failing test — `useResumes.test.ts`**

```ts
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useResumes } from './useResumes';

const GROUP = {
    id: 1,
    title: 'Software Engineer',
    versions: [{ id: 10, version_label: 'v1', updated_at: '2026-09-01T00:00:00Z' }],
};
const PROFILE = {
    resume_id: 10,
    target_role: 'Software Engineer',
    contact: { full_name: 'Jane Doe', email: 'jane@example.com', phone: '', location: '', linkedin: '' },
    summary: '',
    skills_csv: '',
    latest_role: { title: '', one_liner: '', bullets: [] },
    inserts: {},
};

describe('useResumes', () => {
    it('moves to empty status when there are no resume groups', async () => {
        vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({ ok: true, data: { groups: [], user: null } });

        const { result } = renderHook(() => useResumes());
        await act(async () => result.current.load());

        expect(result.current.status).toBe('empty');
    });

    it('moves to ready status and loads a fill profile when groups exist', async () => {
        vi.mocked(chrome.runtime.sendMessage)
            .mockResolvedValueOnce({ ok: true, data: { groups: [GROUP], user: { email: 'jane@example.com' } } })
            .mockResolvedValueOnce({ ok: true, data: PROFILE });

        const { result } = renderHook(() => useResumes());
        await act(async () => result.current.load());

        await waitFor(() => expect(result.current.status).toBe('ready'));
        expect(result.current.selectedResumeId).toBe(10);
        expect(result.current.profile?.contact.full_name).toBe('Jane Doe');
    });

    it('moves to auth_error status when FETCH_RESUMES is unauthorized', async () => {
        vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({ ok: false, reason: 'unauthorized' });

        const { result } = renderHook(() => useResumes());
        await act(async () => result.current.load());

        expect(result.current.status).toBe('auth_error');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd extension/sidepanel-app && npx vitest run src/hooks/useResumes.test.ts
```

Expected: FAIL — `useResumes` not defined.

- [ ] **Step 3: Create `src/hooks/useResumes.ts`**

```ts
import { useCallback, useState } from 'react';
import { sendMessage } from '@/lib/chrome-messaging';
import type { ExtensionUser, FillProfile, ResumeGroup } from '@/lib/types';

export type ResumesStatus = 'idle' | 'loading' | 'empty' | 'ready' | 'auth_error' | 'error';

interface State {
    status: ResumesStatus;
    groups: ResumeGroup[];
    user: ExtensionUser | null;
    selectedGroupId: number | null;
    selectedResumeId: number | null;
    profile: FillProfile | null;
    errorMessage: string;
}

const initialState: State = {
    status: 'idle',
    groups: [],
    user: null,
    selectedGroupId: null,
    selectedResumeId: null,
    profile: null,
    errorMessage: '',
};

function groupKey(id: number | null): string {
    return id == null ? '0' : String(id);
}

export function useResumes() {
    const [state, setState] = useState<State>(initialState);

    const loadProfile = useCallback(async (resumeId: number | null) => {
        if (!resumeId) {
            setState((s) => ({ ...s, profile: null }));
            return;
        }

        const result = await sendMessage<{ data: FillProfile }>('FETCH_FILL_PROFILE', { resumeId });

        if (!result.ok) {
            if (result.reason === 'unauthorized') {
                setState((s) => ({ ...s, status: 'auth_error' }));
                return;
            }
            setState((s) => ({
                ...s,
                profile: null,
                errorMessage: "Couldn't load resume data. Check your connection and try again.",
            }));
            return;
        }

        const profile = result.data as FillProfile;
        setState((s) => ({ ...s, profile, selectedResumeId: profile.resume_id, errorMessage: '' }));
        await chrome.storage.local.set({ selectedResumeId: profile.resume_id });
    }, []);

    const load = useCallback(async () => {
        setState((s) => ({ ...s, status: 'loading', errorMessage: '' }));

        const result = await sendMessage<{ data: { groups: ResumeGroup[]; user: ExtensionUser | null } }>('FETCH_RESUMES');

        if (!result.ok) {
            if (result.reason === 'no_token' || result.reason === 'unauthorized') {
                setState((s) => ({ ...s, status: 'auth_error' }));
                return;
            }
            setState((s) => ({
                ...s,
                status: 'error',
                errorMessage: "Couldn't load resume data. Check your connection and try again.",
            }));
            return;
        }

        const groups = result.data.groups || [];
        const user = result.data.user || null;

        if (groups.length === 0) {
            setState((s) => ({ ...s, status: 'empty', groups, user }));
            return;
        }

        const stored = await chrome.storage.local.get(['selectedGroupId', 'selectedResumeId']);
        const group = groups.find((g) => groupKey(g.id) === groupKey(stored.selectedGroupId)) || groups[0];
        const version = group.versions.find((v) => String(v.id) === String(stored.selectedResumeId)) || group.versions[0];
        const selectedGroupId = group.id;
        const selectedResumeId = version?.id ?? null;

        await chrome.storage.local.set({ selectedGroupId, selectedResumeId });
        setState((s) => ({ ...s, status: 'ready', groups, user, selectedGroupId, selectedResumeId }));
        await loadProfile(selectedResumeId);
    }, [loadProfile]);

    const selectGroup = useCallback(async (groupId: number | null) => {
        const group = state.groups.find((g) => groupKey(g.id) === groupKey(groupId)) || state.groups[0];
        const resumeId = group?.versions?.[0]?.id ?? null;

        setState((s) => ({ ...s, selectedGroupId: groupId, selectedResumeId: resumeId }));
        await chrome.storage.local.set({ selectedGroupId: groupId, selectedResumeId: resumeId });
        await loadProfile(resumeId);
    }, [state.groups, loadProfile]);

    const selectResume = useCallback(async (resumeId: number) => {
        setState((s) => ({ ...s, selectedResumeId: resumeId }));
        await chrome.storage.local.set({ selectedResumeId: resumeId });
        await loadProfile(resumeId);
    }, [loadProfile]);

    return { ...state, load, selectGroup, selectResume };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd extension/sidepanel-app && npx vitest run src/hooks/useResumes.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add extension/sidepanel-app/src/hooks/useResumes.ts extension/sidepanel-app/src/hooks/useResumes.test.ts
git commit -m "feat: add useResumes hook for loading and selecting resumes"
```

---

### Task 5: Setup/Loading/Empty views, Header, and App wiring

**Files:**
- Create: `extension/sidepanel-app/src/components/SetupView.tsx`
- Create: `extension/sidepanel-app/src/components/LoadingView.tsx`
- Create: `extension/sidepanel-app/src/components/EmptyView.tsx`
- Create: `extension/sidepanel-app/src/components/Header.tsx`
- Create: `extension/sidepanel-app/src/components/Header.test.tsx`
- Modify: `extension/sidepanel-app/src/App.tsx`
- Modify: `extension/sidepanel-app/src/App.test.tsx`

**Interfaces:**
- Consumes: `useConnection` (Task 3), `useResumes` (Task 4), `sendMessage` (Task 3), `Button` (Task 2).
- Produces: `App` now renders the full setup/loading/empty state machine; `ReadyView`/`HelpView` are rendered as stubs (`<div>ready</div>` / `<div>help</div>`) until Tasks 6-9 replace them.

- [ ] **Step 1: Create `src/components/SetupView.tsx`**

```tsx
import { Button } from '@/components/ui/button';
import { sendMessage } from '@/lib/chrome-messaging';

export function SetupView() {
    return (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="text-4xl" aria-hidden="true">🔗</div>
            <h1 className="text-lg font-semibold">Connect your Resumegen account</h1>
            <p className="text-sm text-muted-foreground">
                Pull contact details and experience from your resumes into job forms.
                Nothing is submitted for you.
            </p>
            <Button className="w-full" onClick={() => sendMessage('OPEN_APP', { path: '/extension/connect' })}>
                Connect to Resumegen
            </Button>
            <p className="text-xs text-muted-foreground">
                Takes about a minute. Generate a token on Profile, then paste it in Settings.
            </p>
            <Button variant="link" onClick={() => chrome.runtime.openOptionsPage()}>
                Open Settings
            </Button>
        </div>
    );
}
```

- [ ] **Step 2: Create `src/components/LoadingView.tsx`**

```tsx
export function LoadingView() {
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading resumes…</p>;
}
```

- [ ] **Step 3: Create `src/components/EmptyView.tsx`**

```tsx
import { Button } from '@/components/ui/button';
import { sendMessage } from '@/lib/chrome-messaging';

interface EmptyViewProps {
    email?: string;
    onRefresh: () => void;
}

export function EmptyView({ email, onRefresh }: EmptyViewProps) {
    return (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2 rounded-full bg-success" /> Connected{email ? ` · ${email}` : ''}
            </div>
            <div className="text-4xl" aria-hidden="true">📄</div>
            <h1 className="text-lg font-semibold">No resumes yet</h1>
            <p className="text-sm text-muted-foreground">
                Create a resume in Resumegen, then come back here to fill applications.
            </p>
            <Button className="w-full" onClick={() => sendMessage('OPEN_APP', { path: '/dashboard' })}>
                Create a resume
            </Button>
            <Button variant="link" onClick={onRefresh}>Refresh</Button>
        </div>
    );
}
```

- [ ] **Step 4: Write the failing test — `Header.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Header } from './Header';

describe('Header', () => {
    it('opens the menu and calls onDisconnect when Disconnect is clicked', () => {
        const onDisconnect = vi.fn();
        window.confirm = vi.fn(() => true);

        render(
            <Header
                onRefresh={vi.fn()}
                onOpenApp={vi.fn()}
                onOpenSettings={vi.fn()}
                onDisconnect={onDisconnect}
            />,
        );

        fireEvent.click(screen.getByTitle('Menu'));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Disconnect' }));

        expect(onDisconnect).toHaveBeenCalledTimes(1);
    });
});
```

- [ ] **Step 5: Run test to verify it fails**

```bash
cd extension/sidepanel-app && npx vitest run src/components/Header.test.tsx
```

Expected: FAIL — `Header` not defined.

- [ ] **Step 6: Create `src/components/Header.tsx`**

```tsx
import { useState } from 'react';
import { EllipsisVerticalIcon } from 'lucide-react';

interface HeaderProps {
    onRefresh: () => void;
    onOpenApp: () => void;
    onOpenSettings: () => void;
    onDisconnect: () => void;
}

export function Header({ onRefresh, onOpenApp, onOpenSettings, onDisconnect }: HeaderProps) {
    const [open, setOpen] = useState(false);

    return (
        <header className="relative flex items-center justify-between border-b px-4 py-3">
            <div className="text-sm font-semibold">Resumegen Apply</div>
            <button
                type="button"
                aria-haspopup="true"
                title="Menu"
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={() => setOpen((o) => !o)}
            >
                <EllipsisVerticalIcon className="size-4" />
            </button>
            {open && (
                <div
                    role="menu"
                    className="absolute top-full right-4 z-50 mt-1 w-44 rounded-md border bg-popover py-1 text-sm shadow-md"
                    onMouseLeave={() => setOpen(false)}
                >
                    <MenuItem onClick={() => { setOpen(false); onRefresh(); }}>Refresh resumes</MenuItem>
                    <MenuItem onClick={() => { setOpen(false); onOpenApp(); }}>Open Resumegen</MenuItem>
                    <MenuItem onClick={() => { setOpen(false); onOpenSettings(); }}>Settings</MenuItem>
                    <hr className="my-1 border-border" />
                    <MenuItem danger onClick={() => { setOpen(false); onDisconnect(); }}>Disconnect</MenuItem>
                </div>
            )}
        </header>
    );
}

function MenuItem({
    children,
    onClick,
    danger,
}: {
    children: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
}) {
    return (
        <button
            type="button"
            role="menuitem"
            onClick={onClick}
            className={`block w-full px-3 py-1.5 text-left hover:bg-accent hover:text-accent-foreground ${danger ? 'text-destructive' : ''}`}
        >
            {children}
        </button>
    );
}
```

- [ ] **Step 7: Run test to verify it passes**

```bash
cd extension/sidepanel-app && npx vitest run src/components/Header.test.tsx
```

Expected: PASS (1 test).

- [ ] **Step 8: Rewrite `src/App.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { useConnection } from '@/hooks/useConnection';
import { useResumes } from '@/hooks/useResumes';
import { sendMessage } from '@/lib/chrome-messaging';
import { Header } from '@/components/Header';
import { SetupView } from '@/components/SetupView';
import { LoadingView } from '@/components/LoadingView';
import { EmptyView } from '@/components/EmptyView';

type View = 'setup' | 'loading' | 'empty' | 'ready' | 'help';

export function App() {
    const { status: connectionStatus, recheck } = useConnection();
    const resumes = useResumes();
    const [view, setView] = useState<View>('loading');
    const [previousView, setPreviousView] = useState<View>('ready');

    useEffect(() => {
        if (connectionStatus === 'checking') {
            return;
        }
        if (connectionStatus === 'disconnected') {
            setView('setup');
            return;
        }
        resumes.load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connectionStatus]);

    useEffect(() => {
        if (resumes.status === 'auth_error') {
            setView('setup');
        } else if (resumes.status === 'loading') {
            setView('loading');
        } else if (resumes.status === 'empty') {
            setView('empty');
        } else if (resumes.status === 'ready' || resumes.status === 'error') {
            setView((v) => (v === 'help' ? v : 'ready'));
        }
    }, [resumes.status]);

    function openHelp() {
        setPreviousView((prev) => (view === 'help' ? prev : view));
        setView('help');
    }

    function closeHelp() {
        setView(previousView);
    }

    async function disconnect() {
        if (!confirm('Disconnect this browser? You can connect again anytime.')) {
            return;
        }
        await sendMessage('DISCONNECT');
        await recheck();
    }

    return (
        <div className="flex h-full min-h-screen flex-col">
            <Header
                onRefresh={() => resumes.load()}
                onOpenApp={() => sendMessage('OPEN_APP', { path: '/dashboard' })}
                onOpenSettings={() => chrome.runtime.openOptionsPage()}
                onDisconnect={disconnect}
            />
            <main className="flex-1 overflow-y-auto p-4">
                {view === 'setup' && <SetupView />}
                {view === 'loading' && <LoadingView />}
                {view === 'empty' && <EmptyView email={resumes.user?.email} onRefresh={() => resumes.load()} />}
                {view === 'ready' && <div data-testid="ready-view-stub">ready</div>}
                {view === 'help' && <div data-testid="help-view-stub">help</div>}
            </main>
            <footer className="flex items-center justify-between border-t p-2 text-sm">
                <button
                    type="button"
                    className="text-primary underline-offset-4 hover:underline"
                    onClick={() => sendMessage('OPEN_APP', { path: '/dashboard' })}
                >
                    Open Resumegen
                </button>
                <button type="button" className="text-primary underline-offset-4 hover:underline" onClick={openHelp}>
                    Help
                </button>
            </footer>
            <Toaster position="bottom-center" />
        </div>
    );
}
```

- [ ] **Step 9: Rewrite `src/App.test.tsx`**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

describe('App', () => {
    it('shows the setup view when there is no token', async () => {
        vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({ ok: true, token: '', appBase: 'https://resumegen.test' });

        render(<App />);

        await waitFor(() => expect(screen.getByText('Connect your Resumegen account')).toBeInTheDocument());
    });

    it('loads resumes and shows the empty view when connected with no resumes', async () => {
        vi.mocked(chrome.runtime.sendMessage)
            .mockResolvedValueOnce({ ok: true, token: 'abc', appBase: 'https://resumegen.test' })
            .mockResolvedValueOnce({ ok: true, data: { groups: [], user: null } });

        render(<App />);

        await waitFor(() => expect(screen.getByText('No resumes yet')).toBeInTheDocument());
    });
});
```

- [ ] **Step 10: Run tests**

```bash
cd extension/sidepanel-app && npm test
```

Expected: PASS (all tests so far).

- [ ] **Step 11: Commit**

```bash
git add extension/sidepanel-app/src/components/SetupView.tsx extension/sidepanel-app/src/components/LoadingView.tsx \
  extension/sidepanel-app/src/components/EmptyView.tsx extension/sidepanel-app/src/components/Header.tsx \
  extension/sidepanel-app/src/components/Header.test.tsx extension/sidepanel-app/src/App.tsx extension/sidepanel-app/src/App.test.tsx
git commit -m "feat: wire setup/loading/empty views and header menu into App"
```

---

### Task 6: ReadyView shell + FillPanel + InsertChips

**Files:**
- Create: `extension/sidepanel-app/src/components/ReadyView.tsx`
- Create: `extension/sidepanel-app/src/components/FillPanel.tsx`
- Create: `extension/sidepanel-app/src/components/FillPanel.test.tsx`
- Create: `extension/sidepanel-app/src/components/InsertChips.tsx`
- Create: `extension/sidepanel-app/src/components/InsertChips.test.tsx`
- Modify: `extension/sidepanel-app/src/App.tsx` (swap the `ready` stub for `<ReadyView resumes={resumes} />`)

**Interfaces:**
- Consumes: `useResumes` return shape (Task 4), `Select`/`Button` (Task 2), `sendMessage` (Task 3), `FillProfile` (Task 3).
- Produces: `ReadyView` renders a `Tabs` shell (`fill`/`track`/`help`) — the `track` and `help` tab contents stay `<div>` placeholders until Tasks 7-9 fill them in.

- [ ] **Step 1: Write the failing test — `InsertChips.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InsertChips } from './InsertChips';
import type { FillProfile } from '@/lib/types';

const PROFILE: FillProfile = {
    resume_id: 10,
    target_role: '',
    contact: { full_name: 'Jane Doe', email: '', phone: '', location: '', linkedin: '' },
    summary: '',
    skills_csv: '',
    latest_role: { title: '', one_liner: '', bullets: [] },
    inserts: { full_name: 'Jane Doe' },
};

describe('InsertChips', () => {
    it('sends INSERT_FOCUSED with the resolved text when a chip has a value', () => {
        vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({ ok: true, message: 'Inserted Full name into the focused field.' });

        render(<InsertChips profile={PROFILE} />);
        fireEvent.click(screen.getByText('Full name'));

        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
            type: 'INSERT_FOCUSED',
            text: 'Jane Doe',
            label: 'Full name',
        });
    });

    it('does not send a message when the chip has no value on the resume', () => {
        render(<InsertChips profile={PROFILE} />);
        fireEvent.click(screen.getByText('Email'));

        expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd extension/sidepanel-app && npx vitest run src/components/InsertChips.test.tsx
```

Expected: FAIL — `InsertChips` not defined.

- [ ] **Step 3: Create `src/components/InsertChips.tsx`**

```tsx
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { sendMessage } from '@/lib/chrome-messaging';
import type { FillProfile } from '@/lib/types';

const INSERT_LABELS: Record<string, string> = {
    full_name: 'Full name',
    email: 'Email',
    phone: 'Phone',
    linkedin: 'LinkedIn',
    location: 'Location',
    summary: 'Summary',
    skills: 'Skills',
    latest_role: 'Latest role',
    latest_role_bullets: 'Latest role bullets',
};

const CHIP_KEYS = ['full_name', 'email', 'phone', 'linkedin', 'location', 'summary', 'skills', 'latest_role'];

interface InsertChipsProps {
    profile: FillProfile | null;
}

export function InsertChips({ profile }: InsertChipsProps) {
    async function insert(key: string) {
        const label = INSERT_LABELS[key] || key;
        const text = profile?.inserts?.[key] || '';

        if (!text) {
            toast.warning(`No ${label} on this resume. Add it in Resumegen.`);
            return;
        }

        const result = await sendMessage<{ message?: string }>('INSERT_FOCUSED', { text, label });
        if (!result.ok) {
            toast.warning(result.message || 'Click a text field on the page first, then insert.');
            return;
        }
        toast.success(result.message || `Inserted ${label} into the focused field.`);
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="text-xs font-medium text-muted-foreground">Insert into focused field</div>
            <div className="flex flex-wrap gap-1.5">
                {CHIP_KEYS.map((key) => (
                    <button
                        key={key}
                        type="button"
                        title={`Insert ${INSERT_LABELS[key]} into the focused field`}
                        className="rounded-full border px-2.5 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
                        onClick={() => insert(key)}
                    >
                        {INSERT_LABELS[key]}
                    </button>
                ))}
            </div>
            <Button variant="secondary" className="w-full" onClick={() => insert('latest_role_bullets')}>
                Latest role bullets
            </Button>
        </div>
    );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd extension/sidepanel-app && npx vitest run src/components/InsertChips.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing test — `FillPanel.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FillPanel } from './FillPanel';
import { useResumes } from '@/hooks/useResumes';

function baseResumes(): ReturnType<typeof useResumes> {
    return {
        status: 'ready',
        groups: [{ id: 1, title: 'SWE', versions: [{ id: 10, version_label: 'v1', updated_at: '2026-09-01T00:00:00Z' }] }],
        user: null,
        selectedGroupId: 1,
        selectedResumeId: 10,
        profile: {
            resume_id: 10,
            target_role: 'Engineer',
            contact: { full_name: 'Jane Doe', email: 'jane@example.com', phone: '', location: '', linkedin: '' },
            summary: 'Summary text',
            skills_csv: 'React, TypeScript',
            latest_role: { title: 'Engineer', one_liner: 'Built things', bullets: [] },
            inserts: {},
        },
        errorMessage: '',
        load: vi.fn(),
        selectGroup: vi.fn(),
        selectResume: vi.fn(),
    };
}

describe('FillPanel', () => {
    it('sends FILL_COMMON_FIELDS with the current profile when Fill is clicked', async () => {
        vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({ ok: true, filled: 3, message: 'Filled 3 fields' });

        const resumes = baseResumes();
        render(<FillPanel resumes={resumes} />);
        fireEvent.click(screen.getByText('Fill common fields'));

        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
            type: 'FILL_COMMON_FIELDS',
            profile: resumes.profile,
        });
    });
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
cd extension/sidepanel-app && npx vitest run src/components/FillPanel.test.tsx
```

Expected: FAIL — `FillPanel` not defined.

- [ ] **Step 7: Create `src/components/FillPanel.tsx`**

```tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { sendMessage } from '@/lib/chrome-messaging';
import { useResumes } from '@/hooks/useResumes';

interface FillPanelProps {
    resumes: ReturnType<typeof useResumes>;
}

export function FillPanel({ resumes }: FillPanelProps) {
    const [filling, setFilling] = useState(false);
    const [helper, setHelper] = useState('Only empty fields. You submit.');
    const [previewOpen, setPreviewOpen] = useState(false);

    const group = resumes.groups.find((g) => String(g.id ?? '0') === String(resumes.selectedGroupId ?? '0')) || resumes.groups[0];
    const versions = group?.versions || [];

    async function handleFill() {
        if (!resumes.profile) {
            toast.warning('Select a resume first.');
            return;
        }
        setFilling(true);
        const result = await sendMessage<{ filled?: number; message?: string }>('FILL_COMMON_FIELDS', { profile: resumes.profile });
        setFilling(false);

        if (!result.ok) {
            toast.warning(result.message || 'No fillable fields found on this page');
            setHelper('Open the application form, then try again. Or use Insert below.');
            return;
        }
        const filled = result.filled || 0;
        if (filled > 0) {
            toast.success(result.message || `Filled ${filled} fields`);
        } else {
            toast.warning(result.message || `Filled ${filled} fields`);
        }
        setHelper('Review the form before you submit.');
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="text-xs font-medium text-muted-foreground">Resume</div>
            <Select
                aria-label="Resume group"
                value={String(resumes.selectedGroupId ?? '0')}
                onChange={(e) => resumes.selectGroup(e.target.value === '0' ? null : Number(e.target.value))}
            >
                {resumes.groups.map((g) => (
                    <option key={String(g.id ?? '0')} value={String(g.id ?? '0')}>
                        {g.title || 'Untitled resume'}
                    </option>
                ))}
            </Select>
            <Select
                aria-label="Version"
                value={String(resumes.selectedResumeId ?? '')}
                onChange={(e) => resumes.selectResume(Number(e.target.value))}
            >
                {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                        {v.version_label || 'v?'} · Updated {relativeTime(v.updated_at)}
                    </option>
                ))}
            </Select>

            {resumes.profile && (
                <div className="text-xs text-muted-foreground">
                    <div>{[resumes.profile.contact?.full_name, resumes.profile.target_role].filter(Boolean).join(' · ')}</div>
                    <div>{[resumes.profile.contact?.email, resumes.profile.contact?.phone, resumes.profile.contact?.location].filter(Boolean).join(' · ')}</div>
                </div>
            )}

            <Button className="w-full" onClick={handleFill} disabled={filling}>
                {filling ? 'Filling…' : 'Fill common fields'}
            </Button>
            <p className="text-xs text-muted-foreground">{helper}</p>

            <button type="button" className="text-left text-xs text-primary" onClick={() => setPreviewOpen((o) => !o)}>
                {previewOpen ? '▾ Hide preview' : '▸ Preview details'}
            </button>
            {previewOpen && resumes.profile && (
                <div className="rounded-md border p-3 text-xs">
                    <h3 className="font-semibold">Contact</h3>
                    <p>
                        {resumes.profile.contact?.full_name}<br />
                        {resumes.profile.contact?.email}<br />
                        {resumes.profile.contact?.phone}<br />
                        {resumes.profile.contact?.location}<br />
                        {resumes.profile.contact?.linkedin}
                    </p>
                    <h3 className="font-semibold">Summary</h3>
                    <p>{clamp(resumes.profile.summary || '—', 280)}</p>
                    <h3 className="font-semibold">Latest role</h3>
                    <p>
                        {resumes.profile.latest_role?.one_liner || '—'}
                        {(resumes.profile.latest_role?.bullets || []).slice(0, 3).map((b, i) => (
                            <span key={i}><br />• {b}</span>
                        ))}
                    </p>
                    <h3 className="font-semibold">Skills</h3>
                    <p>{resumes.profile.skills_csv || '—'}</p>
                    <button
                        type="button"
                        className="mt-2 text-primary underline-offset-4 hover:underline"
                        onClick={() => sendMessage('OPEN_APP', { path: `/resumes/${resumes.profile!.resume_id}/workstation` })}
                    >
                        Edit in Resumegen
                    </button>
                </div>
            )}
        </div>
    );
}

function clamp(str: string, n: number): string {
    return str.length <= n ? str : `${str.slice(0, n)}…`;
}

function relativeTime(iso: string): string {
    if (!iso) {
        return 'recently';
    }
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (Number.isNaN(diff)) {
        return 'recently';
    }
    if (diff < 60) {
        return 'just now';
    }
    if (diff < 3600) {
        return `${Math.floor(diff / 60)}m ago`;
    }
    if (diff < 86400) {
        return `${Math.floor(diff / 3600)}h ago`;
    }
    if (diff < 86400 * 14) {
        return `${Math.floor(diff / 86400)}d ago`;
    }
    return new Date(iso).toLocaleDateString();
}
```

- [ ] **Step 8: Run test to verify it passes**

```bash
cd extension/sidepanel-app && npx vitest run src/components/FillPanel.test.tsx
```

Expected: PASS (1 test).

- [ ] **Step 9: Create `src/components/ReadyView.tsx`**

```tsx
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FillPanel } from '@/components/FillPanel';
import { InsertChips } from '@/components/InsertChips';
import { useResumes } from '@/hooks/useResumes';

interface ReadyViewProps {
    resumes: ReturnType<typeof useResumes>;
}

export function ReadyView({ resumes }: ReadyViewProps) {
    const [tab, setTab] = useState('fill');

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2 rounded-full bg-success" /> Connected{resumes.user?.email ? ` · ${resumes.user.email}` : ''}
            </div>

            {resumes.errorMessage && (
                <Alert variant="destructive">
                    <AlertDescription>{resumes.errorMessage}</AlertDescription>
                </Alert>
            )}

            <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="w-full">
                    <TabsTrigger value="fill">Fill</TabsTrigger>
                    <TabsTrigger value="track">Track</TabsTrigger>
                    <TabsTrigger value="help">Help</TabsTrigger>
                </TabsList>

                <TabsContent value="fill" className="flex flex-col gap-4">
                    <FillPanel resumes={resumes} />
                    <InsertChips profile={resumes.profile} />
                </TabsContent>

                <TabsContent value="track" className="flex flex-col gap-4">
                    <div data-testid="track-tab-stub" />
                </TabsContent>

                <TabsContent value="help">
                    <div data-testid="help-tab-stub" />
                </TabsContent>
            </Tabs>
        </div>
    );
}
```

- [ ] **Step 10: Wire it into `src/App.tsx`**

Replace the import list and the `ready`-view line:

```tsx
import { ReadyView } from '@/components/ReadyView';
```

```tsx
                {view === 'ready' && <ReadyView resumes={resumes} />}
```

- [ ] **Step 11: Run the full test suite**

```bash
cd extension/sidepanel-app && npm test
```

Expected: PASS (all tests).

- [ ] **Step 12: Commit**

```bash
git add extension/sidepanel-app/src/components/ReadyView.tsx extension/sidepanel-app/src/components/FillPanel.tsx \
  extension/sidepanel-app/src/components/FillPanel.test.tsx extension/sidepanel-app/src/components/InsertChips.tsx \
  extension/sidepanel-app/src/components/InsertChips.test.tsx extension/sidepanel-app/src/App.tsx
git commit -m "feat: add ReadyView tab shell, FillPanel, and InsertChips"
```

---

### Task 7: ScreeningQuestions + JdMatchBadge

**Files:**
- Create: `extension/sidepanel-app/src/components/ScreeningQuestions.tsx`
- Create: `extension/sidepanel-app/src/components/ScreeningQuestions.test.tsx`
- Create: `extension/sidepanel-app/src/components/JdMatchBadge.tsx`
- Create: `extension/sidepanel-app/src/components/JdMatchBadge.test.tsx`
- Modify: `extension/sidepanel-app/src/components/ReadyView.tsx` (add both to the `fill` tab)

**Interfaces:**
- Consumes: `sendMessage` (Task 3), `Button` (Task 2), `FillProfile`/`Question` types (Task 3).
- Produces: nothing consumed further — leaf components.

- [ ] **Step 1: Write the failing test — `JdMatchBadge.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { JdMatchBadge } from './JdMatchBadge';
import type { FillProfile } from '@/lib/types';

const PROFILE = { resume_id: 10 } as FillProfile;

describe('JdMatchBadge', () => {
    it('sends DETECT_JD_BADGE with the profile when clicked', () => {
        vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({ ok: true, total: 8, score: 72 });

        render(<JdMatchBadge profile={PROFILE} />);
        fireEvent.click(screen.getByText('Show match badge on page'));

        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'DETECT_JD_BADGE', profile: PROFILE });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd extension/sidepanel-app && npx vitest run src/components/JdMatchBadge.test.tsx
```

Expected: FAIL — `JdMatchBadge` not defined.

- [ ] **Step 3: Create `src/components/JdMatchBadge.tsx`**

```tsx
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { sendMessage } from '@/lib/chrome-messaging';
import type { FillProfile } from '@/lib/types';

interface JdMatchBadgeProps {
    profile: FillProfile | null;
}

export function JdMatchBadge({ profile }: JdMatchBadgeProps) {
    async function show() {
        if (!profile) {
            toast.warning('Select a resume first.');
            return;
        }
        const result = await sendMessage<{ total?: number; score?: number }>('DETECT_JD_BADGE', { profile });
        if (!result.ok) {
            toast.warning(result.message || 'Could not show a match badge on this page.');
            return;
        }
        if ((result.total || 0) === 0) {
            toast.warning('This resume has no job description set yet — right-click selected text on the page to set one.');
            return;
        }
        toast.success(`Match badge shown: ${result.score}%`);
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="text-xs font-medium text-muted-foreground">Job description match</div>
            <p className="text-xs text-muted-foreground">
                Select text on the page, right-click, and choose &quot;Set as Resumegen job description&quot; to update this resume&apos;s target JD. Then check the match:
            </p>
            <Button variant="secondary" className="w-full" onClick={show}>
                Show match badge on page
            </Button>
        </div>
    );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd extension/sidepanel-app && npx vitest run src/components/JdMatchBadge.test.tsx
```

Expected: PASS (1 test).

- [ ] **Step 5: Write the failing test — `ScreeningQuestions.test.tsx`**

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScreeningQuestions } from './ScreeningQuestions';
import type { FillProfile } from '@/lib/types';

const PROFILE = { resume_id: 10 } as FillProfile;

describe('ScreeningQuestions', () => {
    it('scans for questions and renders each one found', async () => {
        vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({
            ok: true,
            questions: [{ id: 'q1', question: 'Why do you want this role?' }],
        });

        render(<ScreeningQuestions profile={PROFILE} resumeId={10} />);
        fireEvent.click(screen.getByText('Scan for questions'));

        await waitFor(() => expect(screen.getByText('Why do you want this role?')).toBeInTheDocument());
    });

    it('shows a warning toast and keeps drafting=false when drafting returns 402', async () => {
        vi.mocked(chrome.runtime.sendMessage)
            .mockResolvedValueOnce({ ok: true, questions: [{ id: 'q1', question: 'Why do you want this role?' }] })
            .mockResolvedValueOnce({ ok: false, status: 402 });

        render(<ScreeningQuestions profile={PROFILE} resumeId={10} />);
        fireEvent.click(screen.getByText('Scan for questions'));
        await waitFor(() => screen.getByText('Draft'));
        fireEvent.click(screen.getByText('Draft'));

        await waitFor(() => expect(screen.getByText('Draft')).toBeInTheDocument());
    });
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
cd extension/sidepanel-app && npx vitest run src/components/ScreeningQuestions.test.tsx
```

Expected: FAIL — `ScreeningQuestions` not defined.

- [ ] **Step 7: Create `src/components/ScreeningQuestions.tsx`**

```tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { sendMessage } from '@/lib/chrome-messaging';
import type { FillProfile, Question } from '@/lib/types';

interface ScreeningQuestionsProps {
    profile: FillProfile | null;
    resumeId: number | null;
}

export function ScreeningQuestions({ profile, resumeId }: ScreeningQuestionsProps) {
    const [scanning, setScanning] = useState(false);
    const [questions, setQuestions] = useState<Question[]>([]);

    async function scan() {
        if (!profile) {
            toast.warning('Select a resume first.');
            return;
        }
        setScanning(true);
        const result = await sendMessage<{ questions?: Array<{ id: string; question: string }> }>('DETECT_QUESTIONS', { profile });
        setScanning(false);

        if (!result.ok) {
            toast.warning(result.message || 'Could not scan this page.');
            return;
        }

        const found = (result.questions || []).map((q) => ({ ...q, draft: null, drafting: false, saved: false }));
        setQuestions(found);
        if (found.length === 0) {
            toast.warning('No free-text questions found on this page.');
        }
    }

    async function draft(id: string) {
        const question = questions.find((q) => q.id === id);
        setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, drafting: true } : q)));

        const result = await sendMessage<{ data?: Question['draft'] }>('DRAFT_QA_ANSWER', {
            question: question?.question,
            resumeId,
        });

        if (!result.ok) {
            if (result.status === 402) {
                toast.warning('Not enough AI credits for a draft.');
            } else if (result.status === 429) {
                toast.error('AI drafting is currently blocked on your account.');
            } else {
                toast.warning(result.body?.message || result.message || 'Could not draft an answer.');
            }
            setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, drafting: false } : q)));
            return;
        }

        setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, drafting: false, draft: result.data ?? null, saved: false } : q)));
    }

    async function insertDraft(id: string) {
        const question = questions.find((q) => q.id === id);
        if (!question?.draft) {
            return;
        }
        const result = await sendMessage('INSERT_QA_DRAFT', { id, text: question.draft.answer });
        if (!result.ok) {
            toast.warning(result.message || 'Re-scan the page and try again.');
            return;
        }
        toast.success('Inserted the draft into the field.');
    }

    async function saveToQaBank(id: string) {
        const question = questions.find((q) => q.id === id);
        if (!question?.draft) {
            return;
        }
        const result = await sendMessage('SAVE_QA_BANK_ENTRY', { question: question.question, answer: question.draft.answer });
        if (!result.ok) {
            toast.warning(result.message || 'Could not save to your Q&A bank.');
            return;
        }
        setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, saved: true } : q)));
        toast.success('Saved to your Q&A bank.');
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="text-xs font-medium text-muted-foreground">Screening questions</div>
            <Button variant="secondary" className="w-full" onClick={scan} disabled={scanning}>
                {scanning ? 'Scanning…' : 'Scan for questions'}
            </Button>
            <p className="text-xs text-muted-foreground">
                Finds free-text questions on this page. You review every draft before it&apos;s inserted.
            </p>
            <div className="flex flex-col gap-2">
                {questions.map((q) => (
                    <div key={q.id} className="rounded-md border p-2 text-sm">
                        <p>{q.question}</p>
                        {q.draft && (
                            <>
                                <div className="mt-1 rounded bg-muted p-2 text-xs">{q.draft.answer}</div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {q.draft.source === 'qa_bank' ? 'From your Q&A bank' : `Drafted with AI · ${q.draft.credits_remaining ?? 0} credits left`}
                                </p>
                            </>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                            <Button variant="secondary" size="sm" onClick={() => draft(q.id)} disabled={q.drafting}>
                                {q.drafting ? 'Drafting…' : q.draft ? 'Redraft' : 'Draft'}
                            </Button>
                            {q.draft && (
                                <Button variant="secondary" size="sm" onClick={() => insertDraft(q.id)}>
                                    Insert
                                </Button>
                            )}
                            {q.draft && q.draft.source === 'ai' && !q.saved && (
                                <Button variant="link" size="sm" onClick={() => saveToQaBank(q.id)}>
                                    Save to Q&A bank
                                </Button>
                            )}
                            {q.saved && <span className="text-xs text-muted-foreground">Saved to Q&A bank</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
```

- [ ] **Step 8: Run test to verify it passes**

```bash
cd extension/sidepanel-app && npx vitest run src/components/ScreeningQuestions.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 9: Wire both into `ReadyView.tsx`'s `fill` tab**

```tsx
import { ScreeningQuestions } from '@/components/ScreeningQuestions';
import { JdMatchBadge } from '@/components/JdMatchBadge';
```

```tsx
                <TabsContent value="fill" className="flex flex-col gap-4">
                    <FillPanel resumes={resumes} />
                    <InsertChips profile={resumes.profile} />
                    <ScreeningQuestions profile={resumes.profile} resumeId={resumes.selectedResumeId} />
                    <JdMatchBadge profile={resumes.profile} />
                </TabsContent>
```

- [ ] **Step 10: Run the full test suite**

```bash
cd extension/sidepanel-app && npm test
```

Expected: PASS (all tests).

- [ ] **Step 11: Commit**

```bash
git add extension/sidepanel-app/src/components/ScreeningQuestions.tsx extension/sidepanel-app/src/components/ScreeningQuestions.test.tsx \
  extension/sidepanel-app/src/components/JdMatchBadge.tsx extension/sidepanel-app/src/components/JdMatchBadge.test.tsx \
  extension/sidepanel-app/src/components/ReadyView.tsx
git commit -m "feat: add ScreeningQuestions and JdMatchBadge to the Fill tab"
```

---

### Task 8: TrackApplication + AttachResume

**Files:**
- Create: `extension/sidepanel-app/src/components/TrackApplication.tsx`
- Create: `extension/sidepanel-app/src/components/TrackApplication.test.tsx`
- Create: `extension/sidepanel-app/src/components/AttachResume.tsx`
- Create: `extension/sidepanel-app/src/components/AttachResume.test.tsx`
- Modify: `extension/sidepanel-app/src/components/ReadyView.tsx` (replace the `track` tab stub)

**Interfaces:**
- Consumes: `sendMessage` (Task 3), `Button`/`Input` (Task 2), `FileInputField` type (Task 3).
- Produces: nothing consumed further — leaf components.

- [ ] **Step 1: Write the failing test — `TrackApplication.test.tsx`**

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TrackApplication } from './TrackApplication';

describe('TrackApplication', () => {
    it('detects the job posting, prefills the form, and saves it', async () => {
        vi.mocked(chrome.runtime.sendMessage)
            .mockResolvedValueOnce({ ok: true, meta: { company: 'Acme', role: 'Engineer' }, url: 'https://acme.example/jobs/1' })
            .mockResolvedValueOnce({ ok: true });

        render(<TrackApplication />);
        fireEvent.click(screen.getByText('Save to tracker'));

        await waitFor(() => expect(screen.getByDisplayValue('Acme')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Save'));

        await waitFor(() =>
            expect(chrome.runtime.sendMessage).toHaveBeenLastCalledWith({
                type: 'SAVE_JOB_APPLICATION',
                company: 'Acme',
                role: 'Engineer',
                jobUrl: 'https://acme.example/jobs/1',
            }),
        );
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd extension/sidepanel-app && npx vitest run src/components/TrackApplication.test.tsx
```

Expected: FAIL — `TrackApplication` not defined.

- [ ] **Step 3: Create `src/components/TrackApplication.tsx`**

```tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sendMessage } from '@/lib/chrome-messaging';

export function TrackApplication() {
    const [formOpen, setFormOpen] = useState(false);
    const [jobUrl, setJobUrl] = useState('');
    const [company, setCompany] = useState('');
    const [role, setRole] = useState('');

    async function detect() {
        const result = await sendMessage<{ meta?: { company?: string; role?: string }; url?: string }>('DETECT_JOB_POSTING');
        if (!result.ok) {
            toast.warning(result.message || 'Could not read this page.');
            return;
        }
        setCompany(result.meta?.company || '');
        setRole(result.meta?.role || '');
        setJobUrl(result.url || '');
        setFormOpen(true);
    }

    async function save() {
        const trimmedCompany = company.trim();
        const trimmedRole = role.trim();
        if (!trimmedCompany || !trimmedRole) {
            toast.warning('Company and role are required.');
            return;
        }
        const result = await sendMessage('SAVE_JOB_APPLICATION', { company: trimmedCompany, role: trimmedRole, jobUrl });
        if (!result.ok) {
            toast.warning(result.message || 'Could not save to your tracker.');
            return;
        }
        setFormOpen(false);
        toast.success('Saved to your job tracker.');
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="text-xs font-medium text-muted-foreground">Track this application</div>
            <Button variant="secondary" className="w-full" onClick={detect}>
                Save to tracker
            </Button>
            {formOpen && (
                <div className="rounded-md border p-2">
                    <Input
                        aria-label="Company"
                        placeholder="Company"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="mb-2"
                    />
                    <Input
                        aria-label="Role"
                        placeholder="Role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="mb-2"
                    />
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={save}>Save</Button>
                        <Button variant="link" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
                    </div>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd extension/sidepanel-app && npx vitest run src/components/TrackApplication.test.tsx
```

Expected: PASS (1 test).

- [ ] **Step 5: Write the failing test — `AttachResume.test.tsx`**

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AttachResume } from './AttachResume';

describe('AttachResume', () => {
    it('scans for upload fields and attaches the resume when clicked', async () => {
        vi.mocked(chrome.runtime.sendMessage)
            .mockResolvedValueOnce({ ok: true, fields: [{ id: 'resume-upload', label: 'Resume/CV' }] })
            .mockResolvedValueOnce({ ok: true });

        render(<AttachResume resumeId={10} />);
        fireEvent.click(screen.getByText('Find resume upload'));

        await waitFor(() => expect(screen.getByText('Resume/CV')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Attach resume PDF'));

        await waitFor(() =>
            expect(chrome.runtime.sendMessage).toHaveBeenLastCalledWith({
                type: 'ATTACH_RESUME_PDF',
                fieldId: 'resume-upload',
                resumeId: 10,
            }),
        );
    });
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
cd extension/sidepanel-app && npx vitest run src/components/AttachResume.test.tsx
```

Expected: FAIL — `AttachResume` not defined.

- [ ] **Step 7: Create `src/components/AttachResume.tsx`**

```tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { sendMessage } from '@/lib/chrome-messaging';
import type { FileInputField } from '@/lib/types';

interface AttachResumeProps {
    resumeId: number | null;
}

export function AttachResume({ resumeId }: AttachResumeProps) {
    const [fields, setFields] = useState<FileInputField[]>([]);

    async function scan() {
        const result = await sendMessage<{ fields?: FileInputField[] }>('DETECT_FILE_INPUTS');
        if (!result.ok) {
            toast.warning(result.message || 'Could not scan this page for a resume upload.');
            return;
        }
        const found = result.fields || [];
        setFields(found);
        if (found.length === 0) {
            toast.warning('No resume upload field found on this page.');
        }
    }

    async function attach(fieldId: string) {
        if (!resumeId) {
            toast.warning('Select a resume first.');
            return;
        }
        const result = await sendMessage('ATTACH_RESUME_PDF', { fieldId, resumeId });
        if (!result.ok) {
            toast.warning(result.message || 'This site rejected the automatic attach — download and upload it manually.');
            return;
        }
        toast.success('Attached your resume PDF.');
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="text-xs font-medium text-muted-foreground">Attach resume</div>
            <Button variant="secondary" className="w-full" onClick={scan}>
                Find resume upload
            </Button>
            <div className="flex flex-col gap-2">
                {fields.map((field) => (
                    <div key={field.id} className="rounded-md border p-2 text-sm">
                        <p>{field.label}</p>
                        <Button variant="secondary" size="sm" className="mt-2" onClick={() => attach(field.id)}>
                            Attach resume PDF
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
```

- [ ] **Step 8: Run test to verify it passes**

```bash
cd extension/sidepanel-app && npx vitest run src/components/AttachResume.test.tsx
```

Expected: PASS (1 test).

- [ ] **Step 9: Replace the `track` tab stub in `ReadyView.tsx`**

```tsx
import { TrackApplication } from '@/components/TrackApplication';
import { AttachResume } from '@/components/AttachResume';
```

```tsx
                <TabsContent value="track" className="flex flex-col gap-4">
                    <TrackApplication />
                    <AttachResume resumeId={resumes.selectedResumeId} />
                </TabsContent>
```

- [ ] **Step 10: Run the full test suite**

```bash
cd extension/sidepanel-app && npm test
```

Expected: PASS (all tests).

- [ ] **Step 11: Commit**

```bash
git add extension/sidepanel-app/src/components/TrackApplication.tsx extension/sidepanel-app/src/components/TrackApplication.test.tsx \
  extension/sidepanel-app/src/components/AttachResume.tsx extension/sidepanel-app/src/components/AttachResume.test.tsx \
  extension/sidepanel-app/src/components/ReadyView.tsx
git commit -m "feat: add TrackApplication and AttachResume to the Track tab"
```

---

### Task 9: Help content + error-state wiring

**Files:**
- Create: `extension/sidepanel-app/src/components/HelpPanel.tsx`
- Create: `extension/sidepanel-app/src/components/HelpView.tsx`
- Modify: `extension/sidepanel-app/src/App.tsx` (swap the `help` stub for `<HelpView onBack={closeHelp} />`)
- Modify: `extension/sidepanel-app/src/components/ReadyView.tsx` (replace the `help` tab stub with `<HelpPanel />`)
- Create: `extension/sidepanel-app/src/components/ReadyView.test.tsx`
- Modify: `extension/sidepanel-app/src/App.test.tsx` (add the auth-failure-mid-session test)

**Interfaces:**
- Consumes: `Button` (Task 2).
- Produces: `HelpPanel` (content-only) consumed by both `HelpView` and `ReadyView`'s Help tab; `HelpView` (with a back button) consumed by `App.tsx`.

- [ ] **Step 1: Create `src/components/HelpPanel.tsx`**

```tsx
export function HelpPanel() {
    return (
        <div className="flex flex-col gap-3 text-left">
            <section>
                <h2 className="text-sm font-semibold">How filling works</h2>
                <p className="text-sm text-muted-foreground">
                    We only fill empty fields we recognize (name, email, phone, and similar). We never submit the form.
                </p>
            </section>
            <section>
                <h2 className="text-sm font-semibold">Insert</h2>
                <p className="text-sm text-muted-foreground">Click into a field on the page, then choose what to insert.</p>
            </section>
            <section>
                <h2 className="text-sm font-semibold">We don&apos;t fill</h2>
                <p className="text-sm text-muted-foreground">Salary, work authorization, diversity questions, passwords, or checkboxes.</p>
            </section>
            <section>
                <h2 className="text-sm font-semibold">Resume file</h2>
                <p className="text-sm text-muted-foreground">Download or open your resume in Resumegen, then upload it on the employer&apos;s site.</p>
            </section>
        </div>
    );
}
```

- [ ] **Step 2: Create `src/components/HelpView.tsx`**

```tsx
import { Button } from '@/components/ui/button';
import { HelpPanel } from '@/components/HelpPanel';

interface HelpViewProps {
    onBack: () => void;
}

export function HelpView({ onBack }: HelpViewProps) {
    return (
        <div className="flex flex-col gap-3">
            <Button variant="link" className="self-start" onClick={onBack}>← Back</Button>
            <h1 className="text-left text-lg font-semibold">Help</h1>
            <HelpPanel />
        </div>
    );
}
```

- [ ] **Step 3: Wire `HelpView` into `App.tsx`**

```tsx
import { HelpView } from '@/components/HelpView';
```

```tsx
                {view === 'help' && <HelpView onBack={closeHelp} />}
```

- [ ] **Step 4: Replace the `help` tab stub in `ReadyView.tsx`**

```tsx
import { HelpPanel } from '@/components/HelpPanel';
```

```tsx
                <TabsContent value="help">
                    <HelpPanel />
                </TabsContent>
```

- [ ] **Step 5: Write `ReadyView.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReadyView } from './ReadyView';
import { useResumes } from '@/hooks/useResumes';

function baseResumes(): ReturnType<typeof useResumes> {
    return {
        status: 'ready',
        groups: [],
        user: { email: 'jane@example.com' },
        selectedGroupId: null,
        selectedResumeId: null,
        profile: null,
        errorMessage: '',
        load: vi.fn(),
        selectGroup: vi.fn(),
        selectResume: vi.fn(),
    };
}

describe('ReadyView', () => {
    it('switches to the Help tab and shows help content', () => {
        render(<ReadyView resumes={baseResumes()} />);

        fireEvent.click(screen.getByRole('tab', { name: 'Help' }));

        expect(screen.getByText('How filling works')).toBeInTheDocument();
    });
});
```

- [ ] **Step 6: Add the auth-failure-mid-session test to `App.test.tsx`**

Append this test to the existing `describe('App', ...)` block:

```tsx
    it('returns to the setup view when the fill profile fetch is unauthorized', async () => {
        const group = { id: 1, title: 'SWE', versions: [{ id: 10, version_label: 'v1', updated_at: '2026-09-01T00:00:00Z' }] };

        vi.mocked(chrome.runtime.sendMessage)
            .mockResolvedValueOnce({ ok: true, token: 'abc', appBase: 'https://resumegen.test' })
            .mockResolvedValueOnce({ ok: true, data: { groups: [group], user: null } })
            .mockResolvedValueOnce({ ok: false, reason: 'unauthorized' });

        render(<App />);

        await waitFor(() => expect(screen.getByText('Connect your Resumegen account')).toBeInTheDocument());
    });
```

- [ ] **Step 7: Run the full test suite**

```bash
cd extension/sidepanel-app && npm test
```

Expected: PASS (all tests).

- [ ] **Step 8: Run the build**

```bash
cd extension/sidepanel-app && npm run build
```

Expected: succeeds with no TypeScript errors.

- [ ] **Step 9: Commit**

```bash
git add extension/sidepanel-app/src/components/HelpPanel.tsx extension/sidepanel-app/src/components/HelpView.tsx \
  extension/sidepanel-app/src/components/ReadyView.tsx extension/sidepanel-app/src/components/ReadyView.test.tsx \
  extension/sidepanel-app/src/App.tsx extension/sidepanel-app/src/App.test.tsx
git commit -m "feat: add help content and verify auth-failure recovery mid-session"
```

---

### Task 10: Wire the built app into the extension, remove the legacy sidepanel

**Files:**
- Modify: `extension/manifest.json`
- Delete: `extension/sidepanel/sidepanel.html`
- Delete: `extension/sidepanel/sidepanel.js`
- Delete: `extension/sidepanel/sidepanel.css`
- Modify: `.gitignore`
- Modify: `extension/README.md`

**Interfaces:**
- Consumes: `extension/sidepanel-app/dist/` output from Task 9's build.
- Produces: nothing further downstream — this is the integration task.

- [ ] **Step 1: Build the app**

```bash
cd extension/sidepanel-app && npm run build
```

Expected: `extension/sidepanel-app/dist/index.html` and hashed JS/CSS assets exist.

- [ ] **Step 2: Point `manifest.json` at the built entry**

In `extension/manifest.json`, change:

```json
  "side_panel": {
    "default_path": "sidepanel/sidepanel.html"
  },
```

to:

```json
  "side_panel": {
    "default_path": "sidepanel/dist/index.html"
  },
```

Wait — Vite builds `extension/sidepanel-app/dist/`, not `extension/sidepanel/dist/`. The manifest path is relative to `extension/`, so the build output must land at `extension/sidepanel/dist/`. Fix the `outDir` in `extension/sidepanel-app/vite.config.ts` from Task 1 instead of moving files by hand:

```ts
    build: {
        outDir: '../sidepanel/dist',
        emptyOutDir: true,
    },
```

Re-run the build:

```bash
cd extension/sidepanel-app && npm run build
```

Expected: `extension/sidepanel/dist/index.html` now exists. Then set `manifest.json`'s `side_panel.default_path` to `"sidepanel/dist/index.html"` as above.

- [ ] **Step 3: Delete the legacy sidepanel files**

```bash
git rm extension/sidepanel/sidepanel.html extension/sidepanel/sidepanel.js extension/sidepanel/sidepanel.css
```

- [ ] **Step 4: Add the extension app's `node_modules` to `.gitignore`**

Add this line under the existing `/node_modules` entry in `.gitignore`:

```
/extension/sidepanel-app/node_modules
```

- [ ] **Step 5: Update `extension/README.md`'s sidepanel section**

Find the line describing `sidepanel/` (main UI, wireframe states) and replace it with:

```
- `sidepanel-app/` — React 19 + Vite + TypeScript + shadcn source for the side panel UI (`npm run build` from inside this directory)
- `sidepanel/dist/` — built output the manifest's `side_panel.default_path` points at (committed, not hand-edited)
```

- [ ] **Step 6: Verify nothing else references the deleted files**

```bash
grep -rn "sidepanel.html\|sidepanel.js\|sidepanel.css" extension/manifest.json extension/background extension/content extension/options
```

Expected: no matches (this command is outside the graph-gated project root exploration and is fine to run directly since it targets specific known files, not open-ended discovery).

- [ ] **Step 7: Commit**

```bash
git add extension/manifest.json extension/sidepanel/dist extension/sidepanel-app/vite.config.ts .gitignore extension/README.md
git commit -m "feat: wire built sidepanel app into the extension manifest"
```

---

### Task 11: Manual acceptance check

Not a code task — this is the project's required live verification before calling the sub-project done (Verification Policy: passing unit tests and a clean build are not sufficient on their own for a UI feature).

- [ ] **Step 1: Load the unpacked extension**

In Chrome, go to `chrome://extensions`, enable Developer mode, "Load unpacked", select the `extension/` directory. Confirm the side panel opens and renders the new React UI (not the old vanilla one).

- [ ] **Step 2: Connect and load resumes**

Connect via Settings (paste-token flow) against the local Herd app. Confirm the panel moves setup → loading → ready (or empty, if the test account has no resumes) exactly as the old sidepanel did.

- [ ] **Step 3: Run through the 5 ATS fixture pages**

Visit each of the fixture pages at `/dev/job-fixtures` (Workday, Greenhouse, Lever, iCIMS, hand-built) and for each one:
- Click "Fill common fields" — confirm only empty fields fill, exactly as before.
- Click each insert chip — confirm it inserts into the focused field.
- Scan for screening questions, draft one, insert it.
- Right-click selected text → "Set as Resumegen job description", then "Show match badge on page".
- Save to tracker, confirm it appears in the `/job-applications` Kanban.
- Find resume upload and attach the resume PDF.

- [ ] **Step 4: Confirm error states**

Revoke the token from the Profile page, then try an action in the panel — confirm it drops back to the setup/connect view with the reconnect copy (not a blank screen or a crash).

- [ ] **Step 5: Report results**

Note any parity gaps found against the pre-rebuild extension before considering this sub-project complete. Fix and re-run this task's steps for anything broken.

---

## Self-Review

**Spec coverage:** every item in the spec's "Scope of this sub-project" list has a task — connect/disconnect (Tasks 5, 9), group/version select + fill (Task 6), insert chips (Task 6), preview toggle (Task 6), screening questions (Task 7), JD match badge (Task 7), track application (Task 8), attach resume (Task 8), help view (Task 9), settings/menu (Task 5). Architecture & build (Task 1, 10), views & navigation / tab strip (Tasks 6-9), data flow (Tasks 3-4, corrected above), error handling's three classes (auth failure — Task 4/9, network/API error — Task 6's `errorMessage` banner, content-script unreachable — generic `result.message` toasts throughout Tasks 6-8), testing (every task), manual acceptance (Task 11).

**Placeholder scan:** no TBD/TODO; every step has real code or a real shell command.

**Type consistency:** `FillProfile`, `ResumeGroup`, `Question`, `FileInputField` are defined once in Task 3 and imported everywhere else without redefinition. `sendMessage` signature is defined once (Task 3) and used identically in every later task. `useResumes()`'s returned shape (`status`, `groups`, `user`, `selectedGroupId`, `selectedResumeId`, `profile`, `errorMessage`, `load`, `selectGroup`, `selectResume`) is fixed in Task 4 and consumed unchanged by `App.tsx` (Task 5), `ReadyView`/`FillPanel` (Task 6), and their tests (Task 6 mock object matches the real shape field-for-field).
