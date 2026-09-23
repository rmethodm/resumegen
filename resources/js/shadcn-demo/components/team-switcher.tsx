import { ChevronsUpDownIcon, PlusIcon } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/shadcn-demo/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/shadcn-demo/components/ui/sidebar';

export function TeamSwitcher({
    workspace,
}: {
    workspace: { name: string; logo: React.ReactNode; plan: string };
}) {
    const { isMobile } = useSidebar();

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                {workspace.logo}
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{workspace.name}</span>
                                <span className="truncate text-xs">{workspace.plan}</span>
                            </div>
                            <ChevronsUpDownIcon className="ml-auto" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="start" side={isMobile ? 'bottom' : 'right'} sideOffset={4}>
                        <DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>
                        <DropdownMenuItem className="gap-2 p-2">
                            <div className="flex size-6 items-center justify-center rounded-md border">
                                {workspace.logo}
                            </div>
                            {workspace.name}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 p-2" disabled>
                            <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                                <PlusIcon className="size-4" />
                            </div>
                            <div className="text-muted-foreground">Add workspace — demo only</div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
