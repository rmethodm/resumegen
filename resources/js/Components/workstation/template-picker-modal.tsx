import { CheckIcon } from '@heroicons/react/24/outline';
import Modal from '@/Components/Modal';
import { Button } from '@/Components/ui/button';
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
        <Modal
            show={open}
            onClose={() => onOpenChange(false)}
            maxWidth="3xl"
            title="Choose a template"
            description="Thumbnails use your current name and headline."
            footer={
                <div className="flex justify-end">
                    <Button type="button" onClick={() => onOpenChange(false)}>
                        Done
                    </Button>
                </div>
            }
        >
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4">
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
                                            : 'border-surface-border hover:border-surface-border',
                                    )}
                                >
                                    <div
                                        className="relative aspect-8.5/11 w-full overflow-hidden rounded-sm border border-gray-100 bg-white shadow-xs"
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
                                                                ? 'rounded-sm border border-surface-border bg-surface p-0.5'
                                                                : style.entryStyle === 'ruled'
                                                                  ? 'border-b border-surface-border pb-0.5'
                                                                  : ''
                                                        }
                                                    >
                                                        <div className="h-0.5 w-[80%] rounded-sm bg-gray-200" />
                                                        <div className="mt-0.5 h-0.5 w-full rounded-sm bg-surface" />
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
                                    <span className="truncate text-xs font-medium text-ink">
                                        {templateLabels[key]}
                                    </span>
                                </button>
                            );
                        })}
            </div>
        </Modal>
    );
}
