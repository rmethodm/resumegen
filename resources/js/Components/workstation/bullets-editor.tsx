import {
    LinkIcon,
} from '@heroicons/react/24/outline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useMemo, type ReactNode } from 'react';
import { Label } from '@/Components/ui/label';
import {
    htmlListToMarkdownLines,
    markdownLinesToHtmlList,
} from '@/lib/bullet-markdown';
import { cn } from '@/lib/utils';

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
}: {
    label: string;
    value: string[];
    onChange: (value: string[]) => void;
    /** Reserved for jump-to anchors; the editor root uses `${idPrefix}-editor`. */
    idPrefix?: string;
    /** Mirrors UpdateResumeRequest's bullets/highlights array cap. */
    max?: number;
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
}: {
    label: string;
    active: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            aria-pressed={active}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClick}
            className={cn(
                'inline-flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-xs font-semibold text-ink-muted transition-colors',
                active
                    ? 'bg-brand-subtle text-brand'
                    : 'hover:bg-surface hover:text-ink',
            )}
        >
            {children}
        </button>
    );
}
