<?php

namespace App\Services\JobBoards;

/**
 * A normalized job search. Each board translates this into its own parameters.
 */
class JobQuery
{
    public function __construct(
        public readonly string $keywords,
        public readonly string $location = '',
        public readonly string $scope = 'local', // local | state | national
    ) {}

    /**
     * National search means "anywhere", so the location filter is dropped.
     */
    public function isNational(): bool
    {
        return $this->scope === 'national';
    }

    public function radiusMiles(): ?int
    {
        return config("jobs.scope_radius_miles.{$this->scope}");
    }
}
