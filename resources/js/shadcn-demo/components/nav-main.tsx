import { ChevronRightIcon, type LucideIcon } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shadcn-demo/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/shadcn-demo/components/ui/sidebar';

export function NavMain({
    items,
}: {
    items: {
        title: string;
        icon?: LucideIcon;
        isActive?: boolean;
        onClick?: () => void;
        items?: { title: string; isActive?: boolean; onClick?: () => void }[];
    }[];
}) {
    return (
        <SidebarGroup>
            <SidebarGroupLabel>Editor</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => (
                    <Collapsible key={item.title} asChild defaultOpen={item.isActive} className="group/collapsible">
                        <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                                <SidebarMenuButton isActive={item.isActive} onClick={item.onClick} tooltip={item.title}>
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                    {item.items && item.items.length > 0 && (
                                        <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                    )}
                                </SidebarMenuButton>
                            </CollapsibleTrigger>
                            {item.items && item.items.length > 0 && (
                                <CollapsibleContent>
                                    <SidebarMenuSub>
                                        {item.items.map((subItem) => (
                                            <SidebarMenuSubItem key={subItem.title}>
                                                <SidebarMenuSubButton
                                                    isActive={subItem.isActive}
                                                    onClick={subItem.onClick}
                                                    className="cursor-pointer"
                                                >
                                                    <span>{subItem.title}</span>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            )}
                        </SidebarMenuItem>
                    </Collapsible>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
