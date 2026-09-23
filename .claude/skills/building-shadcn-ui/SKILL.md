---
name: building-shadcn-ui
description: Builds, rebuilds, and converts shadcn/ui pages and components in this project. Use when creating a new page or component (including from a reference image or a third-party repo), rebuilding the sidebar or app layout, or replacing hand-written Tailwind components and leftover CSS with shadcn/ui equivalents. Triggers on "use the shadcn skill", "make this shadcn", "replace tailwind components with shadcn", or any shadcn/ui component work.
---

# Building shadcn/ui in this project

shadcn/ui component work goes through the `shadcn` skill and the official registry, not hand-written Tailwind markup.

## Steps

1. Invoke the `shadcn` skill before writing any component code. Do not hand-write a component that the registry already provides.
2. Source structure from the official shadcn registry block (for example `@shadcn/sidebar-07`) rather than from a third-party builder repo, even when the user links one — treat the linked repo as a visual reference and pull the actual code from the registry.
3. Ask clarifying questions before building when the reference or scope is ambiguous; the user expects questions rather than guesses.
4. Compose from registry primitives under `components/ui/` and wire them to real app state. Do not leave stray Tailwind-only components or leftover hand-rolled CSS in a surface that is meant to be shadcn.
5. Keep theme and style identical across the converted surface and the rest of the shadcn UI.

## Verify

- `npx tsc --noEmit -p .` is clean for the touched paths.
- `npm run build` succeeds.
- Grep the converted surface for leftover hand-rolled classes or CSS that a registry component now owns.
