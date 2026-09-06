import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { FAQS } from '@/Components/marketing/marketing-content';

export function MarketingFaq() {
    return (
        <section id="faq" className="px-4 pt-20 sm:px-6">
            <div className="mx-auto max-w-2xl">
                <h2 className="text-center text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                    Questions &amp; answers
                </h2>
                <div className="mt-10 divide-y divide-surface-border rounded-3xl border border-surface-border bg-white shadow-card">
                    {FAQS.map((faq) => (
                        <Disclosure key={faq.question} as="div" className="px-6 py-2">
                            {({ open }) => (
                                <>
                                    <DisclosureButton className="flex w-full items-center justify-between gap-4 py-3.5 text-left text-[15px] font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-white">
                                        {faq.question}
                                        <ChevronDownIcon
                                            className={`size-4 shrink-0 text-ink-faint transition-transform duration-soft ease-soft ${open ? 'rotate-180' : ''}`}
                                        />
                                    </DisclosureButton>
                                    <DisclosurePanel className="pb-4 text-sm leading-relaxed text-ink-muted">
                                        {faq.answer}
                                    </DisclosurePanel>
                                </>
                            )}
                        </Disclosure>
                    ))}
                </div>
            </div>
        </section>
    );
}
