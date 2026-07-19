import { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

type Props = {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
};

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
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { onClose(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            role="dialog"
            aria-label={title}
            className="absolute inset-y-0 right-0 z-20 flex w-full max-w-[640px] flex-col border-l border-[#cbd5e1] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.18)]"
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
