export const statuses = ['Backlog', 'Todo', 'In Progress', 'Review', 'Done'] as const;
export type Status = typeof statuses[number];
export interface Issue { id: number; title: string; status: Status; updated: string; priority?: string; description?: string; subs?: number; owner?: string; }
export const issues: Issue[] = [
    { id: 104, title: 'Document drag and resize behavior', status: 'Backlog', updated: 'Blocked', priority: 'Blocked' },
    { id: 108, title: 'Prepare issue calendar follow-up screen', status: 'Backlog', updated: 'No owner yet' },
    { id: 109, title: 'Map unresolved import states', status: 'Backlog', updated: 'Queued yesterday', priority: 'Medium', description: 'Cover empty, delayed, and failed dependency states.', subs: 2 },
    { id: 110, title: 'Document project permission rules', status: 'Backlog', updated: 'Created yesterday', priority: 'Low', description: 'Clarify who can edit, archive, and share issues.' },
    { id: 102, title: 'Review gantt interaction states', status: 'Todo', updated: 'Updated today', priority: 'Medium', subs: 1 },
    { id: 105, title: 'Create empty and loading timeline states', status: 'Todo', updated: 'Updated today', priority: 'Medium', subs: 2 },
    { id: 111, title: 'Define compact issue row actions', status: 'Todo', updated: 'Planned today', priority: 'High', description: 'Confirm the small-screen action set for issue cards.', subs: 3, owner: 'Alex Morgan' },
    { id: 112, title: 'Validate bulk selection copy', status: 'Todo', updated: 'Planned today', priority: 'Medium' },
    { id: 101, title: 'Finalize issue timeline architecture', status: 'In Progress', updated: 'Updated 2h ago', priority: 'High', subs: 3, owner: 'Nina Oliver' },
    { id: 113, title: 'Wire activity stream pagination', status: 'In Progress', updated: 'Updated 30m ago', priority: 'High', description: 'Keep the activity panel responsive with larger histories.', subs: 4, owner: 'James Wilson' },
    { id: 114, title: 'Tune drag preview affordances', status: 'In Progress', updated: 'In progress', priority: 'Medium', description: 'Make drag feedback clearer across dense boards.', subs: 2 },
    { id: 103, title: 'Sync issue filters with project views', status: 'Review', updated: 'Updated yesterday', priority: 'High', subs: 4, owner: 'Kai Young' },
    { id: 107, title: 'Polish the quarter report export', status: 'Review', updated: 'Updated today', priority: 'Medium', owner: 'Nina Oliver' },
    { id: 115, title: 'Review dependency badge variants', status: 'Review', updated: 'Ready for review', description: 'Check blocked, stale, and resolved dependency treatments.' },
    { id: 116, title: 'Check keyboard navigation', status: 'Review', updated: 'Updated today', priority: 'High', subs: 2 },
    { id: 106, title: 'Set up project workspace', status: 'Done', updated: 'Completed yesterday', priority: 'Medium', owner: 'Alex Morgan' },
    { id: 117, title: 'Align project navigation labels', status: 'Done', updated: 'Completed yesterday', priority: 'Low' },
    { id: 118, title: 'Publish issue status guidelines', status: 'Done', updated: 'Completed Monday', priority: 'Low' },
];
export const listIds = [104, 108, 102, 105, 101, 103, 107, 106];
