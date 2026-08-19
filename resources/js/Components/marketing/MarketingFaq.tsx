import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { FAQ_ITEMS } from '@/Components/marketing/marketing-content';

export function MarketingFaq() {
    return (
        <section id="faq" className="relative px-4 py-20 sm:px-6 sm:py-24">
            <div className="mx-auto max-w-3xl">
                <div className="text-center">
                    <span className="inline-flex rounded-full bg-brand-subtle px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">
                        FAQ
                    </span>
                    <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                        Questions & answers
                    </h2>
                    <p className="mt-3 text-sm text-ink-muted">
                        Quick answers to help you get started with Resumegen
                    </p>
                </div>
                <div className="mt-10 divide-y divide-surface-border/80 rounded-2xl border border-surface-border/80 bg-white">
                    {FAQ_ITEMS.map((item) => (
                        <Disclosure key={item.question} as="div" className="p-1">
                            <DisclosureButton className="flex w-full items-center justify-between gap-4 rounded-xl px-4 py-4 text-left text-sm font-semibold text-ink hover:bg-surface/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                                <span>{item.question}</span>
                                <span aria-hidden className="text-ink-faint">
                                    +
                                </span>
                            </DisclosureButton>
                            <DisclosurePanel className="px-4 pb-4 text-sm leading-relaxed text-ink-muted">
                                {item.answer}
                            </DisclosurePanel>
                        </Disclosure>
                    ))}
                </div>
            </div>
        </section>
    );
}
