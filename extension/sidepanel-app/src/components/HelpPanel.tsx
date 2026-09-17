export function HelpPanel() {
    return (
        <div className="flex flex-col gap-3 text-left">
            <section>
                <h2 className="text-sm font-semibold">How filling works</h2>
                <p className="text-sm text-muted-foreground">
                    We only fill empty fields we recognize (name, email, phone, and similar). We never submit the form.
                </p>
            </section>
            <section>
                <h2 className="text-sm font-semibold">Insert</h2>
                <p className="text-sm text-muted-foreground">Click into a field on the page, then choose what to insert.</p>
            </section>
            <section>
                <h2 className="text-sm font-semibold">We don&apos;t fill</h2>
                <p className="text-sm text-muted-foreground">Salary, work authorization, diversity questions, passwords, or checkboxes.</p>
            </section>
            <section>
                <h2 className="text-sm font-semibold">Resume file</h2>
                <p className="text-sm text-muted-foreground">Download or open your resume in Resumegen, then upload it on the employer&apos;s site.</p>
            </section>
        </div>
    );
}
