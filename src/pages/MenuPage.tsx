import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  GitBranch,
  Link2,
  Target,
  Workflow,
  Megaphone,
  Plug,
  Cloud,
  UsersRound,
  Shield,
  CreditCard,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { MenuPageSkeleton } from "@/components/ui/page-skeletons";

interface NavSection {
  title: string;
  items: {
    icon: LucideIcon;
    label: string;
    path: string;
    description?: string;
  }[];
}

// Menu sections matching desktop sidebar order, excluding bottom nav pages
// Bottom nav has: Dashboard (/), Leads (/leads), Listings (/listings), Properties (/company-listings), Settings (/settings)
const navSections: NavSection[] = [
  {
    title: "Leads Management",
    items: [
      { icon: GitBranch, label: "Pipeline", path: "/pipeline", description: "Visual lead pipeline" },
      { icon: Target, label: "Lead Sources", path: "/lead-sources", description: "Track lead origins" },
      { icon: Workflow, label: "Lead Assignment", path: "/lead-assignment", description: "Assignment rules" },
      { icon: Megaphone, label: "Marketing", path: "/marketing", description: "Campaigns & outreach" },
    ],
  },
  {
    title: "Listings",
    items: [
      { icon: Plug, label: "Integrations", path: "/integrations", description: "Connect portals" },
      { icon: Cloud, label: "Portal Settings", path: "/portal-settings", description: "Portal configurations" },
    ],
  },
  {
    title: "Admin",
    items: [
      { icon: UsersRound, label: "Teams", path: "/teams", description: "Team management" },
      { icon: Shield, label: "Roles & Permissions", path: "/roles", description: "Access control" },
      { icon: CreditCard, label: "Billing", path: "/billing", description: "Subscription & payments" },
    ],
  },
];

export default function MenuPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <MenuPageSkeleton />;
  }

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Menu</h1>
        <p className="text-muted-foreground text-sm">Additional pages & features</p>
      </div>

      {navSections.map((section) => (
        <div key={section.title} className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            {section.title}
          </h2>
          <Card className="divide-y divide-border overflow-hidden">
            {section.items.map(({ icon: Icon, label, path, description }) => (
              <NavLink
                key={path}
                to={path}
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(5);
                }}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-muted/70",
                    isActive
                      ? "bg-primary/5 text-primary"
                      : "text-foreground hover:bg-muted/50"
                  )
                }
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium">{label}</p>
                  {description && (
                    <p className="text-xs text-muted-foreground truncate">{description}</p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </NavLink>
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
}
