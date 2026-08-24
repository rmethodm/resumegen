import { useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

type Props = {
    title: string;
    onClose: () => void;
    /** Element to return focus to on close — the palette row that opened this
     *  drawer, passed explicitly by the caller rather than sniffed from
     *  document.activeElement (see mount effect below for why). May be null,
     *  or a node later removed from the DOM; focusing it is then a no-op. */
    restoreFocusTo: HTMLElement | null;
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
export default function SectionDrawer({ title, onClose, restoreFocusTo, children }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Move focus into the drawer on open, and restore it to the caller-supplied
    // trigger element on close. Deliberately not read from document.activeElement
    // here: this component remounts (via a `key` on the section) when switching
    // straight from one section's drawer to another's, and React runs the
    // outgoing instance's cleanup before the incoming instance's mount effect in
    // the same commit — a mount-time read would capture the previous drawer's
    // just-restored focus target, not the row that opened this drawer.
    useEffect(() => {
        const container = containerRef.current;
        const firstFocusable = container?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        (firstFocusable ?? container)?.focus();

        return () => {
            restoreFocusTo?.focus();
        };
    }, [restoreFocusTo]);

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
            className="fixed inset-0 z-30 flex w-full flex-col bg-white focus:outline-hidden lg:absolute lg:inset-y-0 lg:left-auto lg:right-[300px] lg:z-20 lg:max-w-[640px] lg:border-l lg:border-surface-border lg:shadow-[0_8px_30px_rgba(15,23,42,0.18)]"
        >
            <div className="flex shrink-0 items-center justify-between border-b border-surface-border px-5 py-3">
                <span className="text-sm font-semibold text-ink">{title}</span>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close section"
                    className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-surface hover:text-brand"
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
