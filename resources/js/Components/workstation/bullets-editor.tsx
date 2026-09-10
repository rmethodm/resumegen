import {
    LinkIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { Button } from '@/Components/ui/button';
import { Label } from '@/Components/ui/label';
import {
    bulletRewriteControl,
    bulletRewriteReducer,
    rewriteFailureMessage,
    type BulletRewriteCredits,
} from '@/lib/bullet-rewrite';
import {
    htmlListToMarkdownLines,
    markdownLinesToHtmlList,
} from '@/lib/bullet-markdown';
import { cn } from '@/lib/utils';

function currentListItemRange(
    editor: Editor,
): { from: number; to: number; text: string } | null {
    const { $from } = editor.state.selection;

    for (let depth = $from.depth; depth > 0; depth--) {
        const node = $from.node(depth);

        if (node.type.name === 'listItem') {
            return {
                from: $from.before(depth) + 1,
                to: $from.after(depth) - 1,
                text: node.textContent,
            };
        }
    }

    return null;
}

/**
 * TipTap bullet list that looks like the resume list while editing.
 * Persists as Markdown strings in the existing `string[]` bullets field
 * (bold → **, italic → *, links → [text](url)).
 */
export function BulletsField({
    label,
    value,
    onChange,
    idPrefix,
    max = 12,
    targetRole,
    aiCredits = null,
    onCreditsRemaining,
}: {
    label: string;
    value: string[];
    onChange: (value: string[]) => void;
    /** Reserved for jump-to anchors; the editor root uses `${idPrefix}-editor`. */
    idPrefix?: string;
    /** Mirrors UpdateResumeRequest's bullets/highlights array cap. */
    max?: number;
    /** Threaded into the "Rewrite with AI" request; omitted if the resume has none. */
    targetRole?: string;
    aiCredits?: BulletRewriteCredits | null;
    onCreditsRemaining?: (creditsRemaining: number) => void;
}) {
    const initialHtml = useMemo(
        () => markdownLinesToHtmlList(value),
        // Mount-only seed; live sync is handled in the effect below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: false,
                blockquote: false,
                codeBlock: false,
                code: false,
                horizontalRule: false,
                orderedList: false,
                bulletList: {
                    keepMarks: true,
                },
            }),
            Link.configure({
                openOnClick: false,
                autolink: true,
                defaultProtocol: 'https',
                HTMLAttributes: {
                    class: 'text-brand underline',
                },
            }),
            Placeholder.configure({
                placeholder: 'Write a bullet — Enter for the next one',
            }),
        ],
        content: initialHtml,
        editorProps: {
            attributes: {
                ...(idPrefix ? { id: `${idPrefix}-editor` } : {}),
                class: cn(
                    'min-h-28 max-w-none px-3 py-2 text-sm text-ink outline-hidden',
                    '[&_ul]:my-0 [&_ul]:list-disc [&_ul]:pl-5',
                    '[&_li]:my-1 [&_li]:pl-0.5',
                    '[&_p]:my-0',
                    '[&_a]:text-brand [&_a]:underline',
                    '[&_.is-editor-empty:first-child::before]:pointer-events-none',
                    '[&_.is-editor-empty:first-child::before]:float-left',
                    '[&_.is-editor-empty:first-child::before]:h-0',
                    '[&_.is-editor-empty:first-child::before]:text-ink-faint',
                    '[&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
                ),
            },
        },
        onUpdate: ({ editor: current }) => {
            onChange(htmlListToMarkdownLines(current.getHTML(), max));
        },
    });

    const [rewrite, dispatchRewrite] = useReducer(bulletRewriteReducer, {
        status: 'idle',
    } as const);
    const rewriteControl = bulletRewriteControl(aiCredits);

    async function requestRewrite() {
        if (!editor || rewriteControl.disabled || rewrite.status === 'loading') {
            return;
        }

        const range = currentListItemRange(editor);
        const bulletText = range?.text.trim();

        if (!range || !bulletText) return;

        dispatchRewrite({ type: 'start' });

        try {
            const res = await fetch(route('ai.rewrite-bullet'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN':
                        document.querySelector<HTMLMetaElement>(
                            'meta[name="csrf-token"]',
                        )?.content ?? '',
                },
                body: JSON.stringify({
                    bullet: bulletText,
                    target_role: targetRole || undefined,
                }),
            });

            const failure = rewriteFailureMessage(res.status);

            if (failure) {
                dispatchRewrite({ type: 'error', message: failure });
                return;
            }

            if (!res.ok) {
                dispatchRewrite({
                    type: 'error',
                    message: 'Rewrite failed. Try again.',
                });
                return;
            }

            const data = (await res.json()) as {
                options?: unknown;
                credits_remaining?: unknown;
            };
            const options = Array.isArray(data.options)
                ? data.options.filter(
                      (option): option is string =>
                          typeof option === 'string' && option.trim() !== '',
                  )
                : [];

            if (options.length === 0) {
                dispatchRewrite({
                    type: 'error',
                    message: 'Rewrite failed. Try again.',
                });
                return;
            }

            dispatchRewrite({
                type: 'success',
                original: bulletText,
                options,
            });

            if (typeof data.credits_remaining === 'number') {
                onCreditsRemaining?.(data.credits_remaining);
            }
        } catch {
            dispatchRewrite({
                type: 'error',
                message: 'Rewrite failed. Try again.',
            });
        }
    }

    function acceptRewrite() {
        if (rewrite.status !== 'suggested' || !editor) return;

        const selected = rewrite.options[rewrite.selectedIndex];
        const range = currentListItemRange(editor);

        if (range && selected) {
            editor
                .chain()
                .focus()
                .insertContentAt({ from: range.from, to: range.to }, selected)
                .run();
        }

        dispatchRewrite({ type: 'accept' });
    }

    // Undo / external draft reloads — re-seed without fighting local typing.
    useEffect(() => {
        if (!editor) {
            return;
        }

        const current = htmlListToMarkdownLines(editor.getHTML(), max);
        const same =
            current.length === value.length &&
            current.every((line, index) => line === value[index]);

        if (same) {
            return;
        }

        editor.commands.setContent(markdownLinesToHtmlList(value), {
            emitUpdate: false,
        });
    }, [editor, value, max]);

    function setLink() {
        if (!editor) {
            return;
        }

        const previous = editor.getAttributes('link').href as string | undefined;
        const next = window.prompt('Link URL', previous ?? 'https://');

        if (next === null) {
            return;
        }

        const trimmed = next.trim();

        if (trimmed === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();

            return;
        }

        editor
            .chain()
            .focus()
            .extendMarkRange('link')
            .setLink({ href: trimmed })
            .run();
    }

    if (!editor) {
        return null;
    }

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">{label}</Label>
                <p className="text-xs text-ink-faint">
                    {value.length}/{max} bullets · Markdown saved
                </p>
            </div>
            <div className="overflow-hidden rounded-md border border-surface-border bg-white shadow-xs focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30">
                <div
                    role="toolbar"
                    aria-label={`${label} formatting`}
                    className="flex flex-wrap items-center gap-0.5 border-b border-surface-border/80 bg-surface/40 px-1.5 py-1"
                >
                    <ToolbarButton
                        label="Bold"
                        active={editor.isActive('bold')}
                        onClick={() =>
                            editor.chain().focus().toggleBold().run()
                        }
                    >
                        <span className="font-bold">B</span>
                    </ToolbarButton>
                    <ToolbarButton
                        label="Italic"
                        active={editor.isActive('italic')}
                        onClick={() =>
                            editor.chain().focus().toggleItalic().run()
                        }
                    >
                        <span className="italic">I</span>
                    </ToolbarButton>
                    <ToolbarButton
                        label="Link"
                        active={editor.isActive('link')}
                        onClick={setLink}
                    >
                        <LinkIcon className="size-3.5" />
                    </ToolbarButton>
                    {rewriteControl.visible && (
                        <ToolbarButton
                            label={rewriteControl.label}
                            title={rewriteControl.title}
                            active={false}
                            disabled={
                                rewriteControl.disabled ||
                                rewrite.status === 'loading'
                            }
                            onClick={() => void requestRewrite()}
                        >
                            <SparklesIcon className="size-3.5" />
                            <span className="whitespace-nowrap">
                                {rewriteControl.label}
                            </span>
                        </ToolbarButton>
                    )}
                    <span className="mx-1 h-4 w-px bg-surface-border" aria-hidden />
                    <ToolbarButton
                        label="Bullet list"
                        active={editor.isActive('bulletList')}
                        onClick={() =>
                            editor.chain().focus().toggleBulletList().run()
                        }
                    >
                        List
                    </ToolbarButton>
                </div>
                {rewrite.status === 'loading' && (
                    <p className="border-b border-surface-border/80 bg-surface/40 px-3 py-1.5 text-xs text-ink-muted">
                        Rewriting…
                    </p>
                )}
                {rewrite.status === 'error' && (
                    <p className="border-b border-surface-border/80 bg-danger-subtle px-3 py-1.5 text-xs text-danger-text">
                        {rewrite.message}
                    </p>
                )}
                {rewrite.status === 'suggested' && (
                    <div className="border-b border-surface-border/80 bg-brand-subtle/40 px-3 py-2">
                        <p className="mb-1.5 text-xs text-ink-muted">
                            Suggested rewrites
                        </p>
                        <div
                            role="radiogroup"
                            aria-label="Rewrite options"
                            className="flex flex-col gap-1.5"
                        >
                            {rewrite.options.map((option, index) => {
                                const selected =
                                    index === rewrite.selectedIndex;

                                return (
                                    <button
                                        key={index}
                                        type="button"
                                        role="radio"
                                        aria-checked={selected}
                                        onClick={() =>
                                            dispatchRewrite({
                                                type: 'selectOption',
                                                index,
                                            })
                                        }
                                        className={cn(
                                            'focus-ring w-full rounded-md border px-2 py-1.5 text-left text-xs text-ink',
                                            selected
                                                ? 'border-brand bg-white'
                                                : 'border-surface-border/80 bg-white/70 hover:border-brand/40',
                                        )}
                                    >
                                        {option}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-2 flex gap-2">
                            <Button type="button" size="sm" onClick={acceptRewrite}>
                                Accept
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => dispatchRewrite({ type: 'discard' })}
                            >
                                Discard
                            </Button>
                        </div>
                    </div>
                )}
                <EditorContent editor={editor} />
            </div>
            {value.length >= max && (
                <p className="text-xs text-ink-muted">
                    Limit reached ({max}).
                </p>
            )}
        </div>
    );
}

function ToolbarButton({
    label,
    active,
    onClick,
    children,
    disabled = false,
    title,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
    children: ReactNode;
    disabled?: boolean;
    title?: string;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            aria-pressed={active}
            aria-disabled={disabled || undefined}
            title={title}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
                if (disabled) {
                    return;
                }

                onClick();
            }}
            className={cn(
                'focus-ring inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-md px-1.5 text-xs font-semibold text-ink-muted transition-colors',
                active
                    ? 'bg-brand-subtle text-brand'
                    : 'hover:bg-surface hover:text-ink',
                disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent hover:text-ink-muted',
            )}
        >
            {children}
        </button>
    );
}
