import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/** PDF preview iframe with a visible loading state while DomPDF streams. */
export function PdfPreviewFrame({ src }: { src: string }) {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setLoaded(false);
    }, [src]);

    return (
        <div className="relative">
            {!loaded && (
                <p
                    role="status"
                    className="absolute inset-0 flex items-center justify-center text-sm text-ink-faint"
                >
                    Rendering PDF…
                </p>
            )}
            <iframe
                title="PDF preview"
                src={src}
                onLoad={() => setLoaded(true)}
                className={cn(
                    'h-[80dvh] w-full bg-surface transition-opacity duration-soft ease-soft motion-reduce:transition-none',
                    loaded ? 'opacity-100' : 'opacity-0',
                )}
            />
        </div>
    );
}
