import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { FAQS } from '@/Components/marketing/marketing-content';

export function MarketingFaq() {
    return (
        <section id="faq" className="px-4 pt-20 sm:px-6">
            <div className="mx-auto max-w-2xl">
                <h2 className="text-center text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                    Questions &amp; answers
                </h2>
                <div className="mt-10 divide-y divide-border rounded-3xl border border-border bg-white shadow-sm">
                    {FAQS.map((faq) => (
                        <Disclosure key={faq.question} as="div" className="px-6 py-2">
                            {({ open }) => (
                                <>
                                    <DisclosureButton className="flex w-full items-center justify-between gap-4 py-3.5 text-left text-[15px] font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white">
                                        {faq.question}
                                        <ChevronDownIcon
                                            className={`size-4 shrink-0 text-muted-foreground/70 transition-transform duration-soft ease-soft ${open ? 'rotate-180' : ''}`}
                                        />
                                    </DisclosureButton>
                                    <DisclosurePanel className="pb-4 text-sm leading-relaxed text-muted-foreground">
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
