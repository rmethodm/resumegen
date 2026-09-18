import { useState } from 'react';
import { CalendarDays, ChevronDown, ChevronRight, LayoutGrid, ListTodo, MessageSquare, MessagesSquare, PanelLeftClose, Settings, ShoppingCart } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/shadcn-demo/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shadcn-demo/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shadcn-demo/components/ui/dialog';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from '@/shadcn-demo/components/ui/sidebar';
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
        <Sidebar collapsible="icon" className="reference-sidebar">
            <SidebarHeader>
                <button className="reference-profile" onClick={() => setPanel('Kate Russell')} aria-label="Open Kate Russell profile">
                    <Avatar className="reference-avatar"><AvatarFallback>KR</AvatarFallback></Avatar>
                    {!compact && <><span className="reference-profile-copy"><strong>Kate Russell</strong><span>Project Manager</span></span><ChevronDown className="reference-chevron" /></>}
                </button>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                    {links.map(({ label, icon: Icon }) => (
                        <SidebarMenuItem key={label}>
                            <SidebarMenuButton tooltip={label} isActive={selected === label} onClick={() => showPanel(label)}>
                                <Icon /><span>{label}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                    <SidebarMenuItem>
                        <Collapsible open={settingsOpen && !compact} onOpenChange={setSettingsOpen}>
                            <CollapsibleTrigger asChild>
                                <SidebarMenuButton className="reference-settings" tooltip="Settings" onClick={compact ? toggleSidebar : undefined}>
                                    <Settings /><span>Settings</span><ChevronDown className="reference-chevron" />
                                </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <ul className="reference-settings-list">
                                    {settings.map(label => <li key={label}><button className={selected === label ? 'is-selected' : ''} aria-current={selected === label ? 'page' : undefined} onClick={() => showPanel(label)}>{label}</button></li>)}
                                </ul>
                            </CollapsibleContent>
                        </Collapsible>
                    </SidebarMenuItem>
                    <SidebarMenuItem><SidebarMenuButton tooltip="Scheduled" isActive={selected === 'Scheduled'} onClick={() => showPanel('Scheduled')}><CalendarDays /><span>Scheduled</span></SidebarMenuButton></SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                <button className="reference-help" onClick={() => setPanel('Help Center')} aria-label="Open Help Center">
                    <span className="reference-help-icon"><MessagesSquare /></span>
                    {!compact && <><span className="reference-profile-copy"><strong>Help Center</strong><span>Answers here</span></span><ChevronRight className="reference-chevron" /></>}
                </button>
                <SidebarMenuButton className="reference-collapse" onClick={toggleSidebar} tooltip={compact ? 'Expand menu' : 'Collapse menu'}><PanelLeftClose /><span>Collapse menu</span></SidebarMenuButton>
            </SidebarFooter>
            <Dialog open={panel !== null} onOpenChange={open => { if (!open) setPanel(null); }}>
                <DialogContent><DialogHeader><DialogTitle>{panel}</DialogTitle><DialogDescription>This navigation is a visual demo. {panel} is not connected to an account or service.</DialogDescription></DialogHeader></DialogContent>
            </Dialog>
        </Sidebar>
    );
}
