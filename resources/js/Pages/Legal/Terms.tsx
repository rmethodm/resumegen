import { Head, Link } from '@inertiajs/react';
import { BrandMark } from '@/Components/BrandMark';

export default function Terms() {
    return (
        <div className="min-h-dvh bg-muted text-foreground">
            <Head title="Terms of Service" />

            <header className="border-b border-border/80 bg-white">
                <div className="mx-auto flex max-w-3xl items-center px-4 py-4 sm:px-6">
                    <BrandMark href="/" size="md" />
                </div>
            </header>

            <main id="main-content" className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                    Legal
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                    Terms of Service
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Last updated: August 10, 2026
                </p>

                <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground">
                    <section className="space-y-2">
                        <h2 className="text-base font-bold text-foreground">Agreement</h2>
                        <p className="text-muted-foreground">
                            By creating an account or using Resumegen, you agree to these Terms of
                            Service and our{' '}
                            <Link
                                href={route('legal.privacy')}
                                className="focus-ring rounded-sm font-semibold text-primary hover:underline"
                            >
                                Privacy Policy
                            </Link>
                            . If you do not agree, do not use the service.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-base font-bold text-foreground">The service</h2>
                        <p className="text-muted-foreground">
                            Resumegen is a free resume builder. You may create, edit, export (PDF and
                            DOCX), and share resumes under the features available on this instance.
                            Features may change; we do not guarantee any particular feature will
                            remain forever.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-base font-bold text-foreground">Your account</h2>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li>You must provide accurate registration information.</li>
                            <li>You are responsible for activity under your account.</li>
                            <li>
                                You must not abuse the service (including automated scraping, spam,
                                or attempts to disrupt others).
                            </li>
                        </ul>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-base font-bold text-foreground">Your content</h2>
                        <p className="text-muted-foreground">
                            You retain ownership of the resume content you upload or type. You grant
                            us a limited license to host, process, and display that content solely to
                            operate the product (including exports and share links you enable). You
                            represent that you have the rights to the content you provide and that it
                            does not violate law or third-party rights.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-base font-bold text-foreground">Acceptable use</h2>
                        <p className="text-muted-foreground">
                            Do not use Resumegen to distribute malware, harass others, impersonate
                            people without authorization, or store illegal content. We may suspend or
                            terminate accounts that violate these terms.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-base font-bold text-foreground">No professional advice</h2>
                        <p className="text-muted-foreground">
                            Templates, scores, and optional AI suggestions are tools, not legal,
                            career, or hiring advice. You are responsible for the accuracy of what
                            you submit to employers.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-base font-bold text-foreground">Disclaimer and liability</h2>
                        <p className="text-muted-foreground">
                            The service is provided “as is” without warranties of any kind to the
                            fullest extent permitted by law. We are not liable for indirect,
                            incidental, or consequential damages arising from use of the service. Our
                            total liability for any claim is limited to the amount you paid us for the
                            service in the twelve months before the claim (which is zero for free
                            use).
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-base font-bold text-foreground">Termination</h2>
                        <p className="text-muted-foreground">
                            You may stop using the service and delete your account at any time. We may
                            suspend or terminate access for violations of these terms or to protect
                            the service and its users.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-base font-bold text-foreground">Changes</h2>
                        <p className="text-muted-foreground">
                            We may update these terms. The “Last updated” date will change when we do.
                            Material changes may be highlighted in the product when practical.
                            Continued use after an update constitutes acceptance.
                        </p>
                    </section>
                </div>

                <p className="mt-10 text-sm text-muted-foreground">
                    See also{' '}
                    <Link
                        href={route('legal.privacy')}
                        className="font-semibold text-primary hover:underline"
                    >
                        Privacy Policy
                    </Link>
                    .
                </p>
            </main>
        </div>
    );
}
