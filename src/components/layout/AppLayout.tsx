import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { MobileHeader } from "./MobileHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { AnimatedOutlet } from "./AnimatedOutlet";

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved) {
      setSidebarCollapsed(JSON.parse(saved));
    }
  }, []);

  const handleToggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newState));
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto pb-20">
          <AnimatedOutlet />
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col w-full">
      <TopBar />
      <div className="flex flex-1">
        <AppSidebar collapsed={sidebarCollapsed} onToggle={handleToggleSidebar} />
        <main
          className={cn(
            "flex-1 overflow-y-auto p-6 transition-all duration-300 ease-out",
            // Use margin-inline-start (ms-*) instead of margin-left (ml-*) for RTL support
            sidebarCollapsed ? "ms-16" : "ms-56"
          )}
        >
          <AnimatedOutlet />
        </main>
      </div>
    </div>
  );
}