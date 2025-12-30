import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  GitBranch,
  Building2,
  Link2,
  CreditCard,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Home,
  Target,
  Workflow,
  Megaphone,
  UsersRound,
  Shield,
  Cloud,
  MessageCircle,
  Plug,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CRMSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const leadsMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Users, label: "Leads", path: "/leads" },
  { icon: GitBranch, label: "Pipeline", path: "/pipeline" },
  { icon: Target, label: "Lead Sources", path: "/lead-sources" },
  { icon: Workflow, label: "Lead Assignment", path: "/lead-assignment" },
];

const marketingMenuItems = [
  { icon: Megaphone, label: "Campaigns", path: "/campaigns" },
  { icon: MessageCircle, label: "WhatsApp Bot", path: "/whatsapp-chatbot" },
  { icon: Plug, label: "Connections", path: "/connections" },
];

const listingsMenuItems = [
  { icon: Home, label: "My Listings", path: "/listings" },
  { icon: Building2, label: "Company Listings", path: "/company-listings" },
  { icon: Link2, label: "Integrations", path: "/integrations" },
  { icon: Cloud, label: "Portal Settings", path: "/portal-settings" },
];

const adminMenuItems = [
  { icon: UsersRound, label: "Teams", path: "/teams" },
  { icon: Shield, label: "Roles & Permissions", path: "/roles" },
  { icon: CreditCard, label: "Billing", path: "/billing" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function CRMSidebar({ collapsed, onToggle }: CRMSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    navigate("/login");
  };

  const userName = profile?.first_name
    ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ""}`
    : user?.email?.split("@")[0] || "User";

  const userInitials = profile?.first_name && profile?.last_name
    ? `${profile.first_name[0]}${profile.last_name[0]}`
    : userName.slice(0, 2).toUpperCase();

  const NavItem = ({ icon: Icon, label, path }: { icon: any; label: string; path: string }) => {
    const isActive = location.pathname === path;

    const content = (
      <NavLink
        to={path}
        className={cn(
          "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
          "hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-950/30 dark:hover:to-purple-950/30",
          isActive && "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20",
          !isActive && "text-muted-foreground hover:text-foreground",
          collapsed && "justify-center px-2"
        )}
      >
        <Icon className={cn(
          "h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110",
          isActive && "text-white"
        )} />
        {!collapsed && <span className="truncate">{label}</span>}
        {!collapsed && isActive && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
        )}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  const SectionLabel = ({ children, showSeparator = false }: { children: React.ReactNode; showSeparator?: boolean }) => {
    if (collapsed) {
      return showSeparator ? <Separator className="my-4 opacity-30" /> : null;
    }
    return (
      <div>
        {showSeparator && <Separator className="my-4 opacity-30" />}
        <p className="px-3 py-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
          {children}
        </p>
      </div>
    );
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-background/95 backdrop-blur-xl border-r border-border/40",
        "flex flex-col transition-all duration-300 ease-out shadow-xl",
        collapsed ? "w-20" : "w-72"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border/40">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                OneLinker
              </span>
              <p className="text-[10px] text-muted-foreground font-medium">Real Estate CRM</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-full flex justify-center">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Building2 className="h-5 w-5 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="absolute -right-3 top-20 h-7 w-7 rounded-full border-2 border-border bg-background shadow-lg hover:bg-accent hover:shadow-xl transition-all duration-200 hover:scale-110"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-6 px-3">
        {/* Leads Management */}
        <SectionLabel>Leads Management</SectionLabel>
        <div className="space-y-1 mb-6">
          {leadsMenuItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </div>

        {/* Marketing Hub */}
        <SectionLabel showSeparator>Marketing Hub</SectionLabel>
        <div className="space-y-1 mb-6">
          {marketingMenuItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </div>

        {/* Listings Management */}
        <SectionLabel showSeparator>Listings</SectionLabel>
        <div className="space-y-1 mb-6">
          {listingsMenuItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </div>

        {/* Admin Control */}
        <SectionLabel showSeparator>Admin</SectionLabel>
        <div className="space-y-1">
          {adminMenuItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </div>
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-border/40 bg-muted/30">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div
              className={cn(
                "flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent/50 transition-all duration-200 cursor-pointer group",
                collapsed && "justify-center"
              )}
            >
              <Avatar className="h-10 w-10 ring-2 ring-border/50 group-hover:ring-primary/50 transition-all">
                <AvatarImage src={profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${userName}`} />
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/billing')}>
              <CreditCard className="mr-2 h-4 w-4" />
              Billing
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
