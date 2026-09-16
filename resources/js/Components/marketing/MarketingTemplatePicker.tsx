import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { cn } from '@/lib/utils';

type Template = (typeof TEMPLATES)[number];

const TEMPLATES = [
    { name: 'Modern Sans', src: '/images/templates/modern.png', selected: true },
    { name: 'Classic Serif', src: '/images/templates/classic.png', selected: false },
    { name: 'ATS Plain', src: '/images/templates/ats.png', selected: false },
    { name: 'Minimalist', src: '/images/templates/minimal.png', selected: false },
] as const;

export function MarketingTemplatePicker() {
    const [viewing, setViewing] = useState<Template | null>(null);

    return (
        <section className="px-4 pt-20 sm:px-6">
            <div className="mx-auto max-w-5xl text-center">
                <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                    Pick a look. Change it anytime.
                </h2>
                <p className="mx-auto mt-3.5 max-w-md text-base leading-relaxed text-muted-foreground">
                    Four ATS-tuned templates. Switch with one click — your content reflows
                    instantly.
                </p>
                <div className="mx-auto mt-11 max-w-4xl rounded-3xl border border-border bg-accent/60 p-4 shadow-[0_16px_44px_rgba(0,0,0,0.08)] sm:p-7">
                    <div className="flex items-center justify-between px-1 pb-4">
                        <span className="text-sm font-bold text-foreground">Choose a template</span>
                        <span className="text-xs text-muted-foreground/70">Your content stays put</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                        {TEMPLATES.map((template) => (
                            <button
                                key={template.name}
                                type="button"
                                onClick={() => setViewing(template)}
                                aria-label={`View ${template.name} template`}
                                className={cn(
                                    'cursor-zoom-in rounded-2xl bg-white p-2 text-left transition-transform duration-soft ease-soft',
                                    'hover:-translate-y-0.5 motion-reduce:hover:translate-y-0',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                                    template.selected
                                        ? 'border-[3px] border-primary shadow-[0_8px_20px_rgba(0,0,0,0.14)]'
                                        : 'border border-border',
                                )}
                            >
                                <img
                                    src={template.src}
                                    alt={`${template.name} template`}
                                    className="block h-40 w-full rounded-[10px] object-cover object-top sm:h-50"
                                    loading="lazy"
                                    decoding="async"
                                />
                                <div className="flex items-center justify-between p-1 pt-2.5">
                                    <span
                                        className={cn(
                                            'text-xs',
                                            template.selected
                                                ? 'font-bold text-foreground'
                                                : 'font-semibold text-neutral-700',
                                        )}
                                    >
                                        {template.name}
                                    </span>
                                    {template.selected && (
                                        <span className="inline-flex size-4.5 items-center justify-center rounded-full bg-primary text-[10px] text-white">
                                            ✓
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <Dialog open={viewing !== null} onOpenChange={(next) => !next && setViewing(null)}>
                <DialogContent className="flex max-h-[85dvh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
                    <DialogHeader className="gap-1 border-b px-5 py-4 text-left">
                        <DialogTitle className="text-sm font-bold">{viewing?.name}</DialogTitle>
                        <DialogDescription className="text-xs">
                            Full template preview
                        </DialogDescription>
                    </DialogHeader>
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        {viewing && (
                            <img
                                src={viewing.src}
                                alt={`${viewing.name} template — full preview`}
                                className="block w-full"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </section>
    );
}
