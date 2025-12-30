import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useLocalization } from "@/contexts/LocalizationContext";
import { navigation } from "@/config/navigation";
import { toast } from "sonner";

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();
  const { t, isRTL } = useLocalization();

  const handleSignOut = async () => {
    await signOut();
    toast.success(t('logout'));
    navigate("/login");
  };

  const userName = profile?.first_name
    ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ""}`
    : user?.email?.split("@")[0] || "User";

  const userInitials = profile?.first_name && profile?.last_name
    ? `${profile.first_name[0]}${profile.last_name[0]}`
    : userName.slice(0, 2).toUpperCase();

  const NavItem = ({ icon: Icon, label, path }: { icon: any; label: string; path: string }) => {
    const isActive = location.pathname === path ||
      (path !== "/" && location.pathname.startsWith(path));

    const content = (
      <NavLink
        to={path}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
          "hover:bg-muted",
          isActive && "bg-primary/10 text-primary",
          !isActive && "text-muted-foreground hover:text-foreground",
          collapsed && "justify-center px-2"
        )}
      >
        <Icon className={cn(
          "h-[18px] w-[18px] flex-shrink-0",
          isActive ? "text-primary" : "text-muted-foreground"
        )} />
        {!collapsed && <span>{label}</span>}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          {/* Use logical side: in RTL, "end" becomes left, in LTR, "end" becomes right */}
          <TooltipContent side={isRTL ? "left" : "right"}>{label}</TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  const SectionLabel = ({ children, showSeparator = false }: { children: React.ReactNode; showSeparator?: boolean }) => {
    if (collapsed) {
      if (showSeparator) return <Separator className="my-3" />;
      return null;
    }
    return (
      <div>
        {showSeparator && <Separator className="my-3" />}
        <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {children}
        </p>
      </div>
    );
  };

  // Flip chevron icons in RTL
  const CollapseIcon = collapsed ? (isRTL ? ChevronLeft : ChevronRight) : (isRTL ? ChevronRight : ChevronLeft);

  return (
    <aside
      className={cn(
        // Use start-0 instead of left-0 for RTL support
        "fixed start-0 top-16 z-30 h-[calc(100vh-4rem)] bg-background border-e border-border/60",
        "flex flex-col transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Header with Toggle */}
      <div className="flex items-center justify-between h-12 px-3 border-b border-border/60">
        {!collapsed && (
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t('menu') || 'Menu'}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn("h-8 w-8", collapsed && "mx-auto")}
        >
          <CollapseIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3">
        {navigation.map((section, index) => (
          <div key={section.labelKey}>
            <SectionLabel showSeparator={index > 0}>{t(section.labelKey) || section.label}</SectionLabel>
            <div className="space-y-1 mb-4">
              {section.items.map((item) => (
                <NavItem
                  key={item.path}
                  icon={item.icon}
                  label={t(item.labelKey) || item.label}
                  path={item.path}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-border/60">
        <div
          className={cn(
            "flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer",
            collapsed && "justify-center"
          )}
        >
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${userName}`} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">{t('logout')}</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
        {collapsed && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-full mt-2 h-8 text-muted-foreground hover:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={isRTL ? "left" : "right"}>{t('logout')}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </aside>
  );
}
