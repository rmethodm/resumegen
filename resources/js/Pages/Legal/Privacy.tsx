import { Head, Link } from '@inertiajs/react';
import { BrandMark } from '@/Components/BrandMark';

export default function Privacy() {
    return (
        <div className="min-h-dvh bg-muted text-foreground">
            <Head title="Privacy Policy" />

            <header className="border-b border-border/80 bg-card">
                <div className="mx-auto flex max-w-3xl items-center px-4 py-4 sm:px-6">
                    <BrandMark href="/" size="md" />
                </div>
            </header>

            <main id="main-content" className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                    Legal
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                    Privacy Policy
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Last updated: August 13, 2026
                </p>

                <div className="prose-legal mt-8 space-y-6 text-sm leading-relaxed text-foreground">
                    <section className="space-y-2">
                        <h2 className="text-base font-bold text-foreground">What this covers</h2>
                        <p className="text-muted-foreground">
                            This policy describes how Resumegen (“we”, “us”) handles information when
                            you use the website and application at this domain. Resumegen is a free
                            resume builder: you create, edit, export, and optionally share resumes.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-base font-bold text-foreground">Information you provide</h2>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li>
                                <strong className="text-foreground">Account data:</strong> name, email, and
                                password (stored hashed) when you register.
                            </li>
                            <li>
                                <strong className="text-foreground">Resume content:</strong> the text and
                                structure you enter (experience, education, skills, etc.).
                            </li>
                            <li>
                                <strong className="text-foreground">Optional settings:</strong> starter
                                profile, share-link options (including an optional share password and
                                visitor emails if you enable those gates).
                            </li>
                            <li>
                                <strong className="text-foreground">Support actions:</strong> if you contact
                                us, the content of that message.
                            </li>
                        </ul>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-base font-bold text-foreground">Information collected automatically</h2>
                        <p className="text-muted-foreground">
                            We collect standard server logs (IP address, user agent, timestamps) for
                            security, rate limiting, and reliability. Session cookies keep you signed
                            in. We do not sell personal data or use advertising trackers for third-party
                            ad networks.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-base font-bold text-foreground">How we use information</h2>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li>Provide and improve the resume builder and exports (PDF/DOCX).</li>
                            <li>Authenticate accounts and protect against abuse.</li>
                            <li>
                                Operate share links you create (including optional password and email
                                gates you turn on).
                            </li>
                            <li>
                                If AI features are enabled by configuration, process the resume text
                                you submit for those actions (for example bullet rewrite). When
                                disabled, that path is not used.
                            </li>
                        </ul>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-base font-bold text-foreground">Sharing</h2>
                        <p className="text-muted-foreground">
                            We do not sell your resume content. Processors that help run the service
                            (hosting, email delivery, optional AI provider when enabled) may process
                            data solely to provide that function. Public share links expose only what
                            you choose to publish via that link.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-base font-bold text-foreground">Browser extension</h2>
                        <p className="text-muted-foreground">
                            The Resumegen Apply browser extension fills job application forms from
                            your resumes. It stores a connection token (which you generate and can
                            revoke from Profile settings) in your browser's local sync storage. This
                            token is sent only to the Resumegen API to fetch your resume data, never
                            to the job site you're filling. The extension reads and writes form
                            fields only on pages where you actively open it; it does not run in the
                            background, track your browsing, or send page content to Resumegen. Data
                            filled into a form is submitted only when you choose to submit it.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-base font-bold text-foreground">Retention and deletion</h2>
                        <p className="text-muted-foreground">
                            Your account and resume data remain until you delete them or request
                            deletion. You can delete individual resumes and cancel share links in the
                            product. Deleting your account removes associated account data from the
                            application database subject to residual backups retained for a limited
                            period for disaster recovery.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-base font-bold text-foreground">Your choices</h2>
                        <p className="text-muted-foreground">
                            You may update profile fields, delete content, revoke share links, and
                            delete your account from the product. For privacy requests, contact us via
                            the channels listed on the site if available, or through the email used to
                            operate this instance.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-base font-bold text-foreground">Changes</h2>
                        <p className="text-muted-foreground">
                            We may update this policy. The “Last updated” date at the top will change
                            when we do. Continued use after an update means you accept the revised
                            policy.
                        </p>
                    </section>
                </div>

                <p className="mt-10 text-sm text-muted-foreground">
                    See also{' '}
                    <Link href={route('legal.terms')} className="focus-ring rounded-sm font-semibold text-primary hover:underline">
                        Terms of Service
                    </Link>
                    .
                </p>
            </main>
        </div>
    );
}
