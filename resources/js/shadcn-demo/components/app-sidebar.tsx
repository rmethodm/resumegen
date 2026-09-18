import { useState } from 'react';
import { CalendarDays, ChevronDown, ChevronRight, LayoutGrid, ListTodo, MessageSquare, CircleHelp, PanelLeftClose, Settings, ShoppingCart } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/shadcn-demo/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shadcn-demo/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shadcn-demo/components/ui/dialog';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, SidebarSeparator, SidebarRail, useSidebar } from '@/shadcn-demo/components/ui/sidebar';
import type { ResumeDraft, SectionKey } from '@/shadcn-demo/types';

type AppSidebarProps = {
    tab: 'Edit' | 'Optimize';
    setTab: (tab: 'Edit' | 'Optimize') => void;
    draft: ResumeDraft;
    collapsed: SectionKey[];
    toggleCollapsed: (section: SectionKey) => void;
    download: (format: 'PDF' | 'DOCX') => void;
    setSideOpen: (open: boolean) => void;
    setCommandOpen: (open: boolean) => void;
};

const links = [
    { label: 'Overview', icon: LayoutGrid },
    { label: 'Shop', icon: ShoppingCart },
    { label: 'Released', icon: ListTodo },
    { label: 'Comments', icon: MessageSquare },
];
const settings = ['Edit Profile', 'Language', 'Payments', 'Notifications', 'Password'];

export function AppSidebar(_props: AppSidebarProps) {
    const { toggleSidebar, state, isMobile } = useSidebar();
    const compact = state === 'collapsed' && !isMobile;
    const [settingsOpen, setSettingsOpen] = useState(true);
    const [selected, setSelected] = useState('Payments');
    const [panel, setPanel] = useState<string | null>(null);

    function showPanel(label: string) {
        setSelected(label);
        setPanel(label);
    }

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" tooltip="Workspace" onClick={() => setPanel('Workspace')}>
                            <LayoutGrid />
                            <span className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">Workspace</span>
                                <span className="truncate text-xs text-muted-foreground">Project management</span>
                            </span>
                            <ChevronDown className="ml-auto" />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarSeparator />
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Workspace</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {links.map(({ label, icon: Icon }) => (
                                <SidebarMenuItem key={label}>
                                    <SidebarMenuButton tooltip={label} isActive={selected === label ? true : undefined} onClick={() => showPanel(label)}>
                                        <Icon /><span>{label}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                            <SidebarMenuItem>
                                <SidebarMenuButton tooltip="Scheduled" isActive={selected === 'Scheduled' ? true : undefined} onClick={() => showPanel('Scheduled')}>
                                    <CalendarDays /><span>Scheduled</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <SidebarGroup>
                    <SidebarGroupLabel>Manage</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <Collapsible asChild open={settingsOpen && !compact} onOpenChange={setSettingsOpen}>
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton tooltip="Settings" onClick={compact ? toggleSidebar : undefined}>
                                            <Settings /><span>Settings</span>
                                            {settingsOpen ? <ChevronDown className="ml-auto" /> : <ChevronRight className="ml-auto" />}
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub>
                                            {settings.map(label => (
                                                <SidebarMenuSubItem key={label}>
                                                    <SidebarMenuSubButton asChild isActive={selected === label ? true : undefined}>
                                                        <button className="w-full" data-active={selected === label ? true : undefined} aria-current={selected === label ? 'page' : undefined} onClick={() => showPanel(label)}><span>{label}</span></button>
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            ))}
                                        </SidebarMenuSub>
                                    </CollapsibleContent>
                                </SidebarMenuItem>
                            </Collapsible>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <SidebarGroup className="mt-auto">
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem><SidebarMenuButton tooltip="Help Center" onClick={() => setPanel('Help Center')}><CircleHelp /><span>Help Center</span></SidebarMenuButton></SidebarMenuItem>
                            <SidebarMenuItem><SidebarMenuButton tooltip={compact ? 'Expand menu' : 'Collapse menu'} onClick={toggleSidebar}><PanelLeftClose /><span>Collapse menu</span></SidebarMenuButton></SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarSeparator />
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" tooltip="Kate Russell" onClick={() => setPanel('Kate Russell')}>
                            <Avatar><AvatarFallback>KR</AvatarFallback></Avatar>
                            <span className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">Kate Russell</span>
                                <span className="truncate text-xs text-muted-foreground">Project Manager</span>
                            </span>
                            <ChevronDown className="ml-auto" />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
            <Dialog open={panel !== null} onOpenChange={open => { if (!open) setPanel(null); }}>
                <DialogContent><DialogHeader><DialogTitle>{panel}</DialogTitle><DialogDescription>This navigation is a visual demo. {panel} is not connected to an account or service.</DialogDescription></DialogHeader></DialogContent>
            </Dialog>
        </Sidebar>
    );
}
