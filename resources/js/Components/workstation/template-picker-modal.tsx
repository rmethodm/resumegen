import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { CheckIcon } from '@heroicons/react/24/outline';
import { templateKeys, templateLabels } from '@/lib/resume-templates';
import { templateThumbStyles } from '@/lib/template-thumb-styles';
import { cn } from '@/lib/utils';
import type { ResumeTemplateKey } from '@/types';

const sortedKeys = [...templateKeys].sort((a, b) =>
    templateLabels[a].localeCompare(templateLabels[b]),
);

/**
 * Grid of mini sheets dressed in each template's chrome, using the owner's
 * name/headline so the picker shows their content, not lorem samples.
 */
export function TemplatePickerModal({
    open,
    onOpenChange,
    template,
    onTemplateChange,
    previewName,
    previewHeadline,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    template: ResumeTemplateKey;
    onTemplateChange: (template: ResumeTemplateKey) => void;
    previewName: string;
    previewHeadline: string;
}) {
    const name = previewName.trim() !== '' ? previewName.trim() : 'Your name';
    const headline =
        previewHeadline.trim() !== '' ? previewHeadline.trim() : 'Professional headline';

    return (
        <Dialog open={open} onClose={() => onOpenChange(false)} className="relative z-50">
            <div className="fixed inset-0 bg-black/35" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <DialogPanel className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl">
                    <div className="border-b border-gray-200 px-5 py-4">
                        <DialogTitle className="text-sm font-bold text-gray-900">
                            Choose a template
                        </DialogTitle>
                        <p className="mt-1 text-xs text-gray-500">
                            Thumbnails use your current name and headline.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3 md:grid-cols-4">
                        {sortedKeys.map((key) => {
                            const selected = key === template;
                            const style = templateThumbStyles[key];

                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => {
                                        onTemplateChange(key);
                                        onOpenChange(false);
                                    }}
                                    className={cn(
                                        'flex flex-col gap-1.5 rounded-lg border p-2 text-left transition-colors',
                                        selected
                                            ? 'border-brand ring-2 ring-brand/30'
                                            : 'border-gray-200 hover:border-gray-300',
                                    )}
                                >
                                    <div
                                        className="relative aspect-[8.5/11] w-full overflow-hidden rounded border border-gray-100 bg-white shadow-sm"
                                        style={{
                                            borderLeft: style.pageAccent
                                                ? `3px solid ${style.pageAccent}`
                                                : undefined,
                                        }}
                                        aria-hidden
                                    >
                                        <div className="p-1.5">
                                            <div
                                                className="border-b pb-0.5"
                                                style={{
                                                    textAlign: style.align,
                                                    borderColor: style.accent,
                                                    borderBottomWidth: 1.5,
                                                    background: style.headerBg,
                                                    padding: style.headerBg
                                                        ? '2px 3px'
                                                        : undefined,
                                                    borderRadius: style.headerBg
                                                        ? 2
                                                        : undefined,
                                                }}
                                            >
                                                <div
                                                    className="truncate text-[7px] font-bold leading-tight"
                                                    style={{ color: style.nameColor }}
                                                >
                                                    {name}
                                                </div>
                                                <div
                                                    className="mt-0.5 truncate text-[5px] leading-tight"
                                                    style={{ color: style.subColor }}
                                                >
                                                    {headline}
                                                </div>
                                            </div>
                                            <div
                                                className="mt-1 text-[5px] font-semibold tracking-wider uppercase"
                                                style={{
                                                    color: style.headingColor,
                                                    borderBottom: `1px solid ${style.accent}`,
                                                    paddingBottom: 1,
                                                }}
                                            >
                                                Experience
                                            </div>
                                            <div className="mt-1 space-y-0.5">
                                                {[0, 1].map((i) => (
                                                    <div
                                                        key={i}
                                                        className={
                                                            style.entryStyle === 'cards'
                                                                ? 'rounded border border-gray-200 bg-gray-50 p-0.5'
                                                                : style.entryStyle === 'ruled'
                                                                  ? 'border-b border-gray-200 pb-0.5'
                                                                  : ''
                                                        }
                                                    >
                                                        <div className="h-0.5 w-[80%] rounded bg-gray-200" />
                                                        <div className="mt-0.5 h-0.5 w-full rounded bg-gray-100" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {selected && (
                                            <span className="absolute top-1 right-1 rounded-full bg-brand p-0.5 text-white">
                                                <CheckIcon className="size-2.5" />
                                            </span>
                                        )}
                                    </div>
                                    <span className="truncate text-[11px] font-medium text-gray-800">
                                        {templateLabels[key]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex justify-end border-t border-gray-200 px-5 py-3">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
                        >
                            Done
                        </button>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    );
}
