import { Button } from '@/Components/ui/button';
import { cn } from '@/lib/utils';
import type { ResumeSuggestion } from '@/types';

/** The deterministic ResumeAnalysis output, shown in the workstation left rail. */
export function SuggestionList({
    suggestions,
    stale,
    onApply,
    onSelect,
}: {
    suggestions: ResumeSuggestion[];
    stale: boolean;
    onApply: (suggestion: ResumeSuggestion) => void;
    onSelect?: (suggestion: ResumeSuggestion) => void;
}) {
    if (suggestions.length === 0) {
        return (
            <p className="rounded-lg border border-gray-200 bg-white p-3 text-[11px] leading-relaxed text-gray-500">
                Nothing to flag. Every bullet leads with an action and carries a
                number.
            </p>
        );
    }

    return (
        <div
            className={cn(
                'flex flex-col gap-3 transition-opacity',
                stale && 'opacity-50',
            )}
            aria-busy={stale}
        >
            {suggestions.map((suggestion, index) => (
                <div
                    key={index}
                    role={onSelect ? 'button' : undefined}
                    tabIndex={onSelect ? 0 : undefined}
                    onClick={() => onSelect?.(suggestion)}
                    onKeyDown={(event) => {
                        if (!onSelect) {
                            return;
                        }

                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onSelect(suggestion);
                        }
                    }}
                    className={cn(
                        'flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3',
                        onSelect &&
                            'cursor-pointer hover:border-brand/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                    )}
                >
                    {suggestion.category && (
                        <span className="self-start rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium tracking-wide text-gray-500 uppercase">
                            {suggestion.category}
                        </span>
                    )}
                    <p className="text-[11px] leading-relaxed text-gray-900">
                        {suggestion.message}
                    </p>
                    {suggestion.rewrite ? (
                        <>
                            <p className="border-l-2 border-brand pl-2 text-[11px] leading-relaxed font-medium text-brand">
                                {suggestion.rewrite}
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={stale}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onApply(suggestion);
                                }}
                                className="self-start"
                            >
                                Insert rewrite
                            </Button>
                        </>
                    ) : (
                        suggestion.verbs.length > 0 && (
                            <p className="text-[11px] leading-relaxed text-gray-500">
                                Consider: {suggestion.verbs.join(', ')}
                            </p>
                        )
                    )}
                </div>
            ))}
        </div>
    );
}
