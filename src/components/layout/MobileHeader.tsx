import { Bell, Link2, Menu, Settings, LogOut, User, Globe, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { navigation } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";

// Paths already in bottom navigation - exclude from hamburger menu
const bottomNavPaths = ["/", "/leads", "/listings", "/company-listings", "/settings"];

const notifications = [
  { id: 1, title: "New lead assigned", time: "2 min ago", unread: true },
  { id: 2, title: "Meeting reminder", time: "1 hour ago", unread: true },
  { id: 3, title: "Lead stage updated", time: "3 hours ago", unread: false },
];

export function MobileHeader() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const { language, setLanguage, isRTL, t } = useLocalization();
  const [menuOpen, setMenuOpen] = useState(false);

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  // Filter navigation to exclude items already in bottom nav
  const filteredNavigation = useMemo(() => {
    return navigation
      .map(section => ({
        ...section,
        items: section.items.filter(item => !bottomNavPaths.includes(item.path))
      }))
      .filter(section => section.items.length > 0);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border/50">
      <div className={cn("flex items-center justify-between h-14 px-4", isRTL && "flex-row-reverse")}>
        {/* Left side - Menu + Logo */}
        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 -ml-2 active:scale-95 transition-transform"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side={isRTL ? "right" : "left"} className="w-[280px] p-0">
              <SheetHeader className="p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                    <Link2 className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <SheetTitle className="text-left text-lg">OneLinker</SheetTitle>
                    <Badge 
                      variant="secondary" 
                      className="text-xs mt-1 bg-blue-500/10 text-blue-600"
                    >
                      CRM
                    </Badge>
                  </div>
                </div>
              </SheetHeader>

              {/* Scrollable Navigation */}
              <ScrollArea className="flex-1 h-[calc(100vh-180px)]">
                <nav className="p-3">
                  {filteredNavigation.map((section, index) => (
                    <div key={section.label} className={cn(index > 0 && "mt-4 pt-4 border-t border-border")}>
                      <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {section.label}
                      </p>
                      <div className="space-y-1">
                        {section.items.map((item) => {
                          const Icon = item.icon;
                          return (
                            <NavLink
                              key={item.path}
                              to={item.path}
                              onClick={() => setMenuOpen(false)}
                              className={({ isActive }) => cn(
                                "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all",
                                isActive 
                                  ? "bg-primary/10 text-primary" 
                                  : "text-foreground hover:bg-muted"
                              )}
                            >
                              <Icon className="h-5 w-5" />
                              {item.label}
                            </NavLink>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </nav>
              </ScrollArea>

              {/* User Section */}
              <div className="p-3 border-t border-border mt-auto">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {profile?.first_name || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  className="w-full mt-2 justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <Link2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-base text-foreground">OneLinker</span>
          </div>
        </div>

        {/* Right side Actions */}
        <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="h-9 w-9 active:scale-95 transition-transform"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* Language Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            className="h-9 w-9 active:scale-95 transition-transform"
          >
            <Globe className="h-4 w-4" />
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 relative active:scale-95">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-destructive rounded-full" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 bg-popover">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>{t('notifications')}</span>
                <Badge variant="secondary" className="text-xs">
                  {notifications.filter(n => n.unread).length} new
                </Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.map((notification) => (
                <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1 p-3">
                  <div className="flex items-center gap-2 w-full">
                    {notification.unread && (
                      <span className="h-2 w-2 bg-primary rounded-full" />
                    )}
                    <span className={notification.unread ? "font-medium" : "text-muted-foreground"}>
                      {notification.title}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground pl-4">
                    {notification.time}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full active:scale-95">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">
                    {profile?.first_name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <User className="h-4 w-4 mr-2" />
                {t('profile')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="h-4 w-4 mr-2" />
                {t('settings')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}