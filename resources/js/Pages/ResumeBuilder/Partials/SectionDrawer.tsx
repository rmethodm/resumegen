import { useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

type Props = {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
};

const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Overlays the preview column while one section's fields are edited.
 * Positioning shell only — owns no field logic and no resume state.
 *
 * No backdrop and no click-outside-to-close: a backdrop would dim the
 * preview, which is the one thing this layout exists to keep prominent, and
 * click-outside would fire while the user is reaching for the palette. Esc
 * and the close button are the two ways out.
 */
export default function SectionDrawer({ title, onClose, children }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const previouslyFocusedRef = useRef<HTMLElement | null>(null);

    // Move focus into the drawer on open, and restore it to the triggering
    // element (the palette row) on close.
    useEffect(() => {
        previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

        const container = containerRef.current;
        const firstFocusable = container?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        (firstFocusable ?? container)?.focus();

        return () => {
            previouslyFocusedRef.current?.focus();
        };
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
                return;
            }

            if (e.key !== 'Tab') {
                return;
            }

            const container = containerRef.current;
            if (!container) {
                return;
            }

            const focusable = Array.from(
                container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
            );
            if (focusable.length === 0) {
                e.preventDefault();
                container.focus();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;

            if (e.shiftKey) {
                if (active === first || !container.contains(active)) {
                    e.preventDefault();
                    last.focus();
                }
            } else if (active === last || !container.contains(active)) {
                e.preventDefault();
                first.focus();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className="fixed inset-0 z-30 flex w-full flex-col bg-white focus:outline-none lg:absolute lg:inset-y-0 lg:left-auto lg:right-[300px] lg:z-20 lg:max-w-[640px] lg:border-l lg:border-[#cbd5e1] lg:shadow-[0_8px_30px_rgba(15,23,42,0.18)]"
        >
            <div className="flex shrink-0 items-center justify-between border-b border-[#eeeef5] px-5 py-3">
                <span className="text-sm font-semibold text-[#0f172a]">{title}</span>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close section"
                    className="rounded-md p-1.5 text-[#94a3b8] transition-colors hover:bg-[#f1f5f9] hover:text-[#4f46e5]"
                >
                    <XMarkIcon className="h-4 w-4" />
                </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {children}
            </div>
        </div>
    );
}
