import { useState } from "react";
import { CRMSidebar } from "./CRMSidebar";
import { MobileNav } from "./MobileNav";
import { MobileHeader } from "./MobileHeader";
import { TopBar } from "./TopBar";
import { AnimatedOutlet } from "./AnimatedOutlet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export function CRMLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <CRMSidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
      )}

      {/* Main Content */}
      <div 
        className={cn(
          "min-h-screen transition-all duration-300",
          isMobile ? "pb-20" : sidebarCollapsed ? "ml-20" : "ml-64"
        )}
      >
        {/* Mobile Header */}
        {isMobile && <MobileHeader />}
        
        {/* Desktop TopBar */}
        {!isMobile && <TopBar />}
        
        <main className={cn(
          "p-4 md:p-4 lg:p-5",
          isMobile && "pt-4 px-4"
        )}>
          <AnimatedOutlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileNav />}
    </div>
  );
}
