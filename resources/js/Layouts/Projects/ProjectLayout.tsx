import { useState, type ReactNode } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Bell, Box, ChevronDown, ChevronRight, ChevronsUpDown, ClipboardCheck, FolderKanban, Hexagon, LayoutDashboard, Search, ShoppingCart, Sun, Truck, UserRound, Users } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Avatar, AvatarFallback } from '@/Components/ui/avatar';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, SidebarTrigger } from '@/Components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/Components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/Components/ui/dialog';

const sections = [
    { label: 'Ecommerce', items: [{ label: 'Dashboard', icon: LayoutDashboard }, { label: 'Products', icon: Box }, { label: 'Orders', icon: ShoppingCart }, { label: 'Customers', icon: Users }, { label: 'Shipments', icon: Truck }] },
    { label: 'Project Management', items: [{ label: 'Dashboard', icon: LayoutDashboard }, { label: 'Projects', icon: FolderKanban }, { label: 'Teams', icon: Users }, { label: 'Members', icon: UserRound }] },
];

export default function ProjectLayout({ children, onSearch }: { children: ReactNode; onSearch?: () => void }) {
    const { url } = usePage();
    const [notice, setNotice] = useState<string | null>(null);
    const [dark, setDark] = useState(false);
    const views = ['Issue List 1', 'Issue List 2', 'Issue Calendar 1', 'Issue Calendar 2', 'Issue Detail 1', 'Issue Detail 2', 'Issue Kanban 1', 'Issue Kanban 2'];
    return (
        <SidebarProvider className="project-demo" data-theme={dark ? 'dark' : 'light'}>
            <Sidebar>
                <SidebarHeader className="px-4 py-4">
                    <div className="flex items-center gap-2">
                        <span className="project-logo"><Hexagon /><Box /></span>
                        <div className="min-w-0 flex-1"><p className="text-xs font-semibold">Shadcnblocks Admin Kit</p><p className="text-xs">Nextjs + shadcn/ui</p></div>
                        <ChevronsUpDown className="size-4" />
                    </div>
                </SidebarHeader>
                <SidebarContent>
                    {sections.map((section) => <SidebarGroup key={section.label} className="px-2 pb-4">
                        <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                        <SidebarMenu>{section.items.map(({ label, icon: Icon }) => <SidebarMenuItem key={label}>
                            <SidebarMenuButton className="h-9" onClick={() => setNotice(label)}><Icon /><span>{label}</span><ChevronRight className="ml-auto" /></SidebarMenuButton>
                        </SidebarMenuItem>)}</SidebarMenu>
                    </SidebarGroup>)}
                    <Collapsible defaultOpen className="-mt-4 px-2">
                        <SidebarMenu><SidebarMenuItem>
                            <CollapsibleTrigger asChild><SidebarMenuButton className="h-9"><ClipboardCheck /><span>Issues</span><ChevronDown className="ml-auto" /></SidebarMenuButton></CollapsibleTrigger>
                            <CollapsibleContent><SidebarMenuSub className="gap-1 pb-2">
                                {views.map((label) => {
                                    const name = label === 'Issue List 1' ? 'projects.issues.index' : label === 'Issue Kanban 1' ? 'projects.issues.kanban' : null;
                                    const href = name ? route(name) : undefined;
                                    const active = href ? url.split('?')[0] === new URL(href, window.location.origin).pathname : false;
                                    return <SidebarMenuSubItem key={label}><SidebarMenuSubButton asChild isActive={active}>
                                        {href ? <Link href={href} aria-current={active ? 'page' : undefined}>{label}</Link> : <button type="button" onClick={() => setNotice(label)}>{label}</button>}
                                    </SidebarMenuSubButton></SidebarMenuSubItem>;
                                })}
                            </SidebarMenuSub></CollapsibleContent>
                        </SidebarMenuItem></SidebarMenu>
                    </Collapsible>
                </SidebarContent>
                <SidebarFooter className="p-4"><div className="flex items-center gap-2"><Avatar><AvatarFallback>AD</AvatarFallback></Avatar><div className="min-w-0 flex-1"><p className="text-sm font-semibold">ausrobdev</p><p className="text-xs">rob@shadcnblocks.com</p></div><ChevronsUpDown className="size-4" /></div></SidebarFooter>
            </Sidebar>
            <div className="project-main">
                <header className="project-topbar">
                    <SidebarTrigger /><h1>Project Management</h1>
                    <div className="ml-auto flex items-center gap-2">
                        <Button variant="outline" size="sm" aria-label="Search issues" onClick={onSearch}><Search data-icon="inline-start" /><kbd className="hidden text-muted-foreground sm:inline">⌘ K</kbd></Button>
                        <Button variant="outline" size="icon" aria-label="Notifications" onClick={() => setNotice('Notifications')}><Bell data-icon="inline-start" /></Button>
                        <Button variant="ghost" size="icon" aria-label="Toggle color theme" onClick={() => setDark(!dark)}><Sun data-icon="inline-start" /></Button>
                        <Button variant="outline" className="hidden sm:flex" onClick={() => setDark(!dark)}><span className="project-swatches"><i /><i /><i /><i /></span>Default<ChevronDown data-icon="inline-end" /></Button>
                    </div>
                </header>
                {children}
            </div>
            <Dialog open={notice !== null} onOpenChange={() => setNotice(null)}><DialogContent><DialogHeader><DialogTitle>{notice}</DialogTitle><DialogDescription>{notice === 'Notifications' ? 'You’re all caught up. No new notifications.' : 'This standalone preview includes Issue List 1 and Issue Kanban 1. Choose either view in the sidebar to explore the sample project.'}</DialogDescription></DialogHeader></DialogContent></Dialog>
        </SidebarProvider>
    );
}
