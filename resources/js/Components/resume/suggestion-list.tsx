import { Button } from '@/Components/ui/button';
import { cn } from '@/lib/utils';
import type { ResumeSuggestion } from '@/types';

/** The deterministic ResumeAnalysis output, shown in the workstation inspector's Suggestions tab. */
export function SuggestionList({
    suggestions,
    stale,
    onApply,
}: {
    suggestions: ResumeSuggestion[];
    stale: boolean;
    onApply: (suggestion: ResumeSuggestion) => void;
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
                    className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3"
                >
                    <p className="text-[11px] leading-relaxed text-gray-900">
                        {suggestion.message}
                    </p>
                    {suggestion.rewrite && (
                        <>
                            <p className="border-l-2 border-indigo-600 pl-2 text-[11px] leading-relaxed font-medium text-indigo-600">
                                {suggestion.rewrite}
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={stale}
                                onClick={() => onApply(suggestion)}
                                className="self-start"
                            >
                                Insert rewrite
                            </Button>
                        </>
                    )}
                </div>
            ))}
        </div>
    );
}
