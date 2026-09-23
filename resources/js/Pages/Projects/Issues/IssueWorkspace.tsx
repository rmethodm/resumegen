import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Check, ChevronDown, FolderKanban, MoreHorizontal, Plus, Search, SlidersHorizontal, Users } from 'lucide-react';
import { DropdownMenu as MenuPrimitive } from 'radix-ui';
import ProjectLayout from '@/Layouts/Projects/ProjectLayout';
import { Avatar, AvatarFallback } from '@/Components/ui/avatar';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/Components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/Components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/Components/ui/dropdown-menu';
import { Input } from '@/Components/ui/input';
import { Separator } from '@/Components/ui/separator';
import { issues as fixtures, listIds, statuses, type Issue, type Status } from './issue-data';

const statusKey = (status: Status) => status.toLowerCase().replace(' ', '-');
function StatusBadge({ status }: { status: Status }) {
    return <Badge variant="outline" style={{ color: 'var(--status-ink)', borderColor: 'var(--status-border)', background: 'var(--status-wash)' } as CSSProperties}><span className="project-status-dot" />{status}</Badge>;
}
function Owner({ name, withName = false }: { name?: string; withName?: boolean }) {
    if (!name) return <span className="project-unassigned" aria-label="Unassigned"><Users /></span>;
    return <span className={withName ? 'project-owner' : 'project-avatar'} title={name}><Avatar className="size-6"><AvatarFallback>{name.split(' ').map(part => part[0]).join('')}</AvatarFallback></Avatar>{withName && <span>{name}</span>}</span>;
}

export default function IssueWorkspace({ view }: { view: 'list' | 'board' }) {
    const [issues, setIssues] = useState(() => fixtures.filter(issue => view === 'board' || listIds.includes(issue.id)));
    const [query, setQuery] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [filter, setFilter] = useState<Status | null>(null);
    const [editor, setEditor] = useState<{ id?: number; title: string; status: Status } | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const nextId = useRef(119);
    useEffect(() => {
        function onKey(event: KeyboardEvent) {
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') { event.preventDefault(); setSearchOpen(true); }
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);
    useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);
    const visible = issues.filter(issue => (!filter || issue.status === filter) && `${issue.title} RFC-${issue.id}`.toLowerCase().includes(query.toLowerCase()));
    function add(status: Status = 'Backlog') { setEditor({ title: '', status }); }
    function save() {
        if (!editor?.title.trim()) return;
        if (editor.id) setIssues(current => current.map(issue => issue.id === editor.id ? { ...issue, title: editor.title.trim(), status: editor.status } : issue));
        else setIssues(current => [...current, { id: nextId.current++, title: editor.title.trim(), status: editor.status, updated: 'Created just now' }]);
        setEditor(null);
    }
    function move(id: number, status: Status) { setIssues(current => current.map(issue => issue.id === id ? { ...issue, status } : issue)); }
    function actions(issue: Issue) {
        return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-7" aria-label={`Actions for RFC-${issue.id}`}><MoreHorizontal data-icon="inline-start" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><MenuPrimitive.Group>
            <DropdownMenuItem onSelect={() => setEditor(issue)}>Edit issue</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuLabel>Move to</DropdownMenuLabel>
            {statuses.map(status => <DropdownMenuItem key={status} onSelect={() => move(issue.id, status)}>{status}{issue.status === status && <Check className="ml-auto" />}</DropdownMenuItem>)}
            <DropdownMenuSeparator /><DropdownMenuItem onSelect={() => setIssues(current => current.filter(item => item.id !== issue.id))}>Archive issue</DropdownMenuItem>
        </MenuPrimitive.Group></DropdownMenuContent></DropdownMenu>;
    }
    return <ProjectLayout onSearch={() => setSearchOpen(value => !value)}>
        <Head title={view === 'list' ? 'Issue list · Project Management' : 'Issue board · Project Management'} />
        <div className="project-toolbar">
            <FolderKanban className="size-4 shrink-0" /><span className="project-name" title="Renewal Forecast Console">Renewal Forecast Console</span>
            <Button variant="ghost" size="icon" className="size-7 hidden lg:flex" aria-label="Project information" onClick={() => setInfo('Renewal Forecast Console')}><MoreHorizontal data-icon="inline-start" /></Button>
            <Separator orientation="vertical" className="mx-1 hidden h-5 lg:block" />
            <nav className="project-tabs" aria-label="Project sections"><Button variant="secondary" size="sm" aria-current="page">Issues</Button>{['Cycles', 'Modules', 'Views', 'Pages'].map(tab => <Button key={tab} variant="ghost" size="sm" onClick={() => setInfo(tab)}>{tab}</Button>)}</nav>
            <div className="ml-auto flex shrink-0 gap-2">
                <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="size-8" aria-label="Filter issues"><SlidersHorizontal data-icon="inline-start" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><MenuPrimitive.Group><DropdownMenuLabel>Filter by status</DropdownMenuLabel><DropdownMenuItem onSelect={() => setFilter(null)}>All statuses{!filter && <Check className="ml-auto" />}</DropdownMenuItem>{statuses.map(status => <DropdownMenuItem key={status} onSelect={() => setFilter(status)}>{status}{filter === status && <Check className="ml-auto" />}</DropdownMenuItem>)}</MenuPrimitive.Group></DropdownMenuContent></DropdownMenu>
                <Button size="sm" onClick={() => add()}><Plus data-icon="inline-start" />Add issue</Button>
            </div>
        </div>
        <div className="project-summary"><strong>{visible.length} Issues</strong><div className="ml-auto flex items-center gap-4">{filter && <Button variant="ghost" size="sm" onClick={() => setFilter(null)}>{filter} ×</Button>}<span>Grouped by status</span><Link className="project-view-link" href={route(view === 'list' ? 'projects.issues.kanban' : 'projects.issues.index')}>{view === 'list' ? 'Board view' : 'List view'} ↗</Link></div></div>
        {searchOpen && <div className="flex items-center gap-3 border-b px-6 py-3"><Search className="size-4" /><Input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by title or issue ID…" aria-label="Search issues" /><Button variant="ghost" size="sm" onClick={() => { setQuery(''); setSearchOpen(false); }}>Close</Button></div>}
        <main className={view === 'board' ? 'project-board' : 'project-list'} aria-label={view === 'board' ? 'Issue board' : 'Issue list'}>
            {statuses.filter(status => !filter || filter === status).map(status => {
                const group = visible.filter(issue => issue.status === status);
                const heading = <><span className="project-status-ring"><span className="project-status-dot" /></span><span>{status}</span><span className="project-count">{group.length}</span></>;
                if (view === 'board') return <section key={status} className="project-column" data-status={statusKey(status)} aria-label={status}>
                    <div className="project-column-heading">{heading}<Button variant="ghost" size="icon" className="ml-auto size-7" aria-label={`Add ${status} issue`} onClick={() => add(status)}><Plus data-icon="inline-start" /></Button></div>
                    <div className="project-column-cards">{group.map(issue => <Card key={issue.id} className="gap-3 py-3">
                        <CardHeader className="gap-2 px-3"><div className="flex items-center justify-between"><span className="project-issue-id">RFC-{issue.id}</span>{actions(issue)}</div><CardTitle><button className="project-card-title" onClick={() => setEditor(issue)}>{issue.title}</button></CardTitle>{issue.description && <CardDescription>{issue.description}</CardDescription>}</CardHeader>
                        <CardContent className="px-3"><div className="project-meta"><span>{issue.updated}</span>{issue.priority && <><i>/</i><span>{issue.priority}</span></>}</div></CardContent>
                        <CardFooter className="gap-2 px-3"><StatusBadge status={status} /><span className="ml-auto project-subcount">{issue.subs ? `${issue.subs} sub` : ''}</span><Owner name={issue.owner} /></CardFooter>
                    </Card>)}</div><Button variant="ghost" className="mx-3 mb-3 justify-start" onClick={() => add(status)}><Plus data-icon="inline-start" />New issue</Button>
                </section>;
                return <Collapsible key={status} defaultOpen data-status={statusKey(status)}>
                    <div className="project-group-heading"><CollapsibleTrigger className="project-group-toggle"><ChevronDown className="project-chevron" />{heading}</CollapsibleTrigger><Button variant="ghost" size="icon" className="ml-auto size-7" aria-label={`Add ${status} issue`} onClick={() => add(status)}><Plus data-icon="inline-start" /></Button></div>
                    <CollapsibleContent>{group.map(issue => <article key={issue.id} className="project-issue-row">
                        <span className="project-issue-id">RFC-{issue.id}</span><button className="project-row-copy" onClick={() => setEditor(issue)}><span className="project-row-title">{issue.title}</span><span className="project-meta"><span>{issue.updated}</span>{issue.priority && <><i>/</i><span>{issue.priority}{issue.priority !== 'Blocked' ? ' Priority' : ''}</span></>}{issue.subs && <><i>/</i><span>{issue.subs} sub-issue{issue.subs > 1 ? 's' : ''}</span></>}</span></button>
                        <div className="project-row-badges"><StatusBadge status={status} />{issue.owner && <Owner name={issue.owner} withName />}</div>{actions(issue)}
                    </article>)}<div className="project-new-row"><Button variant="ghost" size="sm" onClick={() => add(status)}><Plus data-icon="inline-start" />New issue</Button></div></CollapsibleContent>
                </Collapsible>;
            })}
        </main>
        <Dialog open={editor !== null} onOpenChange={open => { if (!open) setEditor(null); }}><DialogContent><DialogHeader><DialogTitle>{editor?.id ? `RFC-${editor.id}` : 'New issue'}</DialogTitle><DialogDescription>Sample project · Changes last until you leave or reload this page.</DialogDescription></DialogHeader>
            <label className="flex flex-col gap-2 text-sm">Issue title<Input autoFocus value={editor?.title ?? ''} onChange={event => setEditor(current => current ? { ...current, title: event.target.value } : current)} onKeyDown={event => { if (event.key === 'Enter') save(); }} /></label>
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline">{editor?.status}<ChevronDown data-icon="inline-end" /></Button></DropdownMenuTrigger><DropdownMenuContent><MenuPrimitive.Group>{statuses.map(status => <DropdownMenuItem key={status} onSelect={() => setEditor(current => current ? { ...current, status } : current)}>{status}</DropdownMenuItem>)}</MenuPrimitive.Group></DropdownMenuContent></DropdownMenu>
            <DialogFooter><Button variant="outline" onClick={() => setEditor(null)}>Cancel</Button><Button disabled={!editor?.title.trim()} onClick={save}>{editor?.id ? 'Save changes' : 'Create issue'}</Button></DialogFooter>
        </DialogContent></Dialog>
        <Dialog open={info !== null} onOpenChange={() => setInfo(null)}><DialogContent><DialogHeader><DialogTitle>{info}</DialogTitle><DialogDescription>This demo focuses on issue tracking. Explore the list and board views, search issues, or use the status filters to narrow your view.</DialogDescription></DialogHeader></DialogContent></Dialog>
    </ProjectLayout>;
}
