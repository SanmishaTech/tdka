"use client";

import * as React from "react";
import {
  Folder,
  Forward,
  MoreHorizontal,
  Trash2,
  type LucideIcon,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavProjects({
  projects,
}: {
  projects: {
    name: string;
    url: string;
    icon: LucideIcon;
  }[];
}) {
  const { isMobile, state } = useSidebar();
  const [showItems, setShowItems] = React.useState(false);
  
  const isCollapsed = state === "collapsed";

  // Control animation for navigation items when sidebar state changes
  React.useEffect(() => {
    if (isCollapsed) {
      // Delay items appearance to sync with sidebar collapse + logo animation
      const timer = setTimeout(() => {
        setShowItems(true);
      }, 400); // Start after logo animation begins
      return () => clearTimeout(timer);
    } else {
      setShowItems(false);
    }
  }, [isCollapsed]);

  if (!projects.length) return null;

  return (
    <TooltipProvider>
      <SidebarGroup>
        <SidebarGroupLabel>Clubs</SidebarGroupLabel>
        <SidebarMenu>
          {projects.map((item, index) => (
            <SidebarMenuItem key={item.name}>
              <div
                className={`transition-all duration-500 ease-out ${
                  showItems && isCollapsed
                    ? 'opacity-100 translate-x-0 scale-100'
                    : isCollapsed
                    ? 'opacity-0 translate-x-4 scale-90'
                    : 'opacity-100 translate-x-0 scale-100'
                }`}
                style={{
                  transitionDelay: isCollapsed && showItems ? `${index * 100}ms` : '0ms'
                }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton asChild>
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.name}</span>
                      </a>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>{item.name}</p>
                  </TooltipContent>
                )}
                </Tooltip>
              </div>
            <DropdownMenu>
              {/* <DropdownMenuTrigger asChild>
                <SidebarMenuAction showOnHover>
                  <MoreHorizontal />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger> */}
              <DropdownMenuContent
                className="w-30 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                <DropdownMenuItem>
                  <Folder className="text-muted-foreground" />
                  <span>View </span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Forward className="text-muted-foreground" />
                  <span>Share </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Trash2 className="text-muted-foreground" />
                  <span>Delete </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
        {/* <SidebarMenuItem>
          <SidebarMenuButton className="text-sidebar-foreground/70">
            <MoreHorizontal className="text-sidebar-foreground/70" />
            <span>More</span>
          </SidebarMenuButton>
        </SidebarMenuItem> */}
      </SidebarMenu>
    </SidebarGroup>
    </TooltipProvider>
  );
}
