<?php

namespace App\Services\JobBoards;

interface JobBoard
{
    /**
     * Short stable identifier stored on job_listings.source.
     */
    public function key(): string;

    /**
     * True when the board has the credentials it needs.
     */
    public function isConfigured(): bool;

    /**
     * Fetch postings. Implementations must fail soft — a board that errors
     * returns [] so the other sources still produce a usable page.
     *
     * @return array<array{source: string, external_id: string, title: string, company: string, location: string, url: string, description: string, salary_min: ?int, salary_max: ?int, posted_at: ?string}>
     */
    public function search(JobQuery $query): array;
}
