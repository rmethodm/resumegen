import { MoreHorizontalIcon, type LucideIcon } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/shadcn-demo/components/ui/dropdown-menu';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/shadcn-demo/components/ui/sidebar';

export function NavProjects({
    actions,
    onMore,
}: {
    actions: {
        name: string;
        icon: LucideIcon;
        onClick?: () => void;
        menu?: { label: string; onClick: () => void }[];
    }[];
    onMore: () => void;
}) {
    const { isMobile } = useSidebar();

    return (
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Quick actions</SidebarGroupLabel>
            <SidebarMenu>
                {actions.map((action) => (
                    <SidebarMenuItem key={action.name}>
                        <SidebarMenuButton onClick={action.onClick}>
                            <action.icon />
                            <span>{action.name}</span>
                        </SidebarMenuButton>
                        {action.menu && action.menu.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <SidebarMenuAction showOnHover className="aria-expanded:bg-muted">
                                        <MoreHorizontalIcon />
                                        <span className="sr-only">More</span>
                                    </SidebarMenuAction>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    className="w-fit"
                                    side={isMobile ? 'bottom' : 'right'}
                                    align={isMobile ? 'end' : 'start'}
                                >
                                    {action.menu.map((entry) => (
                                        <DropdownMenuItem key={entry.label} onClick={entry.onClick}>
                                            <span>{entry.label}</span>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                    <SidebarMenuButton className="text-sidebar-foreground/70" onClick={onMore}>
                        <MoreHorizontalIcon className="text-sidebar-foreground/70" />
                        <span>More</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroup>
    );
}
