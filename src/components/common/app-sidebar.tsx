import * as React from "react";
import {
  AudioWaveform,
  Command,
  UsersRound,
  GalleryVerticalEnd,
  Map,
  FileText,
  LayoutDashboard,
} from "lucide-react";
import { NavProjects } from "@/components/common/nav-projects";
import { NavUser } from "@/components/common/nav-user";
import { Sun, Moon, PanelLeft } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
// import { TeamSwitcher } from "@/components/common/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { appName } from "@/config";

// This is sample data.
const initialData = {
  roles: {
    
    admin: {
      projects: [
        {
          name: "Dashboard",
          url: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          name: "Taluka",
          url: "/talukas",
          icon: Map,
        },
        {
          name: "Region",
          url: "/regions",
          icon: Map,
        },
        {
          name: "Club",
          url: "/clubs",
          icon: UsersRound,
        },
        {
          name: "Group",
          url: "/groups",
          icon: UsersRound,
        },
      
        {
          name: "Competition",
          url: "/competitions",
          icon: UsersRound,
        },
      
      ],
    },
    clubadmin: {
      projects: [
        {
          name: "Dashboard",
          url: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          name: "Player",
          url: "/players",
          icon: UsersRound,
        },
        {
          name: "Competition",
          url: "/clubcompetitions",
          icon: FileText,
        },
        
      ],
    },
    observer: {
      projects: [
        {
          name: "Competition",
          url: "/observercompetitions",
          icon: FileText,
        },
      ],
    },
    referee: {
      projects: [
        {
          name: "Competition",
          url: "/refereecompetitions",
          icon: FileText,
        },
      ],
    },
  },
  user: {
    name: "",
    email: "",
    avatar: "",
    avatarName: "",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
};

function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { toggleSidebar, state } = useSidebar();
  const [isLogoHovered, setIsLogoHovered] = React.useState(false);
  const [showLogo, setShowLogo] = React.useState(false);
  const [data, setData] = React.useState({
    ...initialData,
    projects: [] as typeof initialData.roles.admin.projects,
  });
  
  const isCollapsed = state === "collapsed";

  // Reset logo hover state when sidebar state changes
  React.useEffect(() => {
    setIsLogoHovered(false);
    
    if (isCollapsed) {
      // Delay logo appearance to sync with sidebar collapse animation
      const timer = setTimeout(() => {
        setShowLogo(true);
      }, 200); // Delay to match sidebar animation timing
      return () => clearTimeout(timer);
    } else {
      setShowLogo(false);
    }
  }, [isCollapsed]);

  // Dark mode toggle state and handlers
  const [isDarkMode, setIsDarkMode] = React.useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      return savedTheme === "dark";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Sync the HTML class with the current theme
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  // Listen for system preference changes when user hasn't explicitly chosen a theme
  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) {
        setIsDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem("theme", newDarkMode ? "dark" : "light");
  };

  React.useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        parsedUser.avatarName = parsedUser.name?.charAt(0).toUpperCase() || "U";

        // Default to admin if no role is specified, then fallback to super_admin for safety
        let role =
          (parsedUser.role as keyof typeof initialData.roles) || "admin";

        // If role doesn't exist in our initialData, default to super_admin
        if (!initialData.roles[role]) {
          role = "admin";
        }

        const roleData = initialData.roles[role];

        setData((prevData) => ({
          ...prevData,
          projects: roleData?.projects || [],
          user: parsedUser,
        }));
      } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        // If there's an error, set default projects for navigation
        setData((prevData) => ({
          ...prevData,
          projects: initialData.roles.admin.projects,
         }));
      }
    } else {
      // No user in localStorage, show default navigation
      setData((prevData) => ({
        ...prevData,
        projects: initialData.roles.admin.projects,
      }));
    }
  }, []);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {/* <TeamSwitcher teams={data.teams} /> */}
        <SidebarMenu className="flex">
          <SidebarMenuItem>
            {isCollapsed ? (
              // Collapsed sidebar: Show logo that flips to expand button on hover
              <div className="flex items-center justify-center px-2 py-2">
                <div 
                  className={`transition-all duration-500 ease-out ${
                    showLogo 
                      ? 'opacity-100 translate-x-0 scale-100' 
                      : 'opacity-0 translate-x-4 scale-90'
                  }`}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSidebar}
                    onMouseEnter={() => setIsLogoHovered(true)}
                    onMouseLeave={() => setIsLogoHovered(false)}
                    aria-label="Expand sidebar"
                    className="h-11 w-11 p-2 hover:bg-transparent transition-colors duration-200"
                  >
                    <div className="relative w-7 h-7">
                      {/* Logo - visible by default, fades out on hover */}
                      <div 
                        className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out ${
                          isLogoHovered ? 'opacity-0 rotate-180 scale-75' : 'opacity-100 rotate-0 scale-100'
                        }`}
                        style={{ zIndex: isLogoHovered ? 1 : 2 }}
                      >
                        <img
                          src="/TDKA logo.png"
                          alt="TDKA logo"
                          className="h-7 w-7 transition-transform duration-300"
                          style={{ filter: "brightness(0) invert(1)" }}
                        />
                      </div>
                      {/* Expand Icon - hidden by default, fades in on hover */}
                      <div 
                        className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out ${
                          isLogoHovered ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-180 scale-75'
                        }`}
                        style={{ zIndex: isLogoHovered ? 2 : 1 }}
                      >
                        <PanelLeft className="h-7 w-7 text-white transition-transform duration-300" />
                      </div>
                    </div>
                  </Button>
                </div>
              </div>
            ) : (
              // Expanded sidebar: Show logo + app name + buttons
              <div className="flex items-center gap-2 justify-between px-2 py-1.5">
                <SidebarMenuButton
                  asChild
                  className="flex-1 data-[slot=sidebar-menu-button]:!p-0 hover:bg-transparent"
                >
                  <a
                    className="flex items-center gap-2 p-1.5 rounded-md hover:bg-accent/50 text-sidebar-foreground hover:text-sidebar-foreground"
                    href="#"
                  >
                    <img
                      src="/TDKA logo.png"
                      alt="TDKA logo"
                      className="h-6 w-6"
                      style={{ filter: "brightness(0) invert(1)" }}
                    />
                    <span className="text-base font-semibold">{appName}</span>
                  </a>
                </SidebarMenuButton>
                <div className="flex items-center gap-1">
                  <Toggle
                    pressed={isDarkMode}
                    onPressedChange={(pressed) => {
                      setIsDarkMode(pressed);
                      localStorage.setItem("theme", pressed ? "dark" : "light");
                    }}
                    aria-label="Toggle dark mode"
                    size="sm"
                    className="h-6 w-6 p-1 shrink-0"
                  >
                    {isDarkMode ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                  </Toggle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSidebar}
                    aria-label="Collapse sidebar"
                    className="h-6 w-6 p-1 shrink-0"
                  >
                    <PanelLeft className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </SidebarMenuItem>
          {/* <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1 bg-white"
            >
              <a href="/dashboard">
                <Search className="h-5 w-5 " />
                <Input placeholder="Search" className="border-0 " />
               </a>
              
            </SidebarMenuButton>
            
          </SidebarMenuItem> */}
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavProjects projects={data.projects || []} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export { AppSidebar };
