import {
  LayoutDashboard,
  Users,
  GitBranch,
  Building2,
  Link2,
  CreditCard,
  Settings,
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

export type NavItem = {
  icon: any;
  label: string; // Fallback English label
  labelKey: string; // Translation key
  path: string;
};

export type NavSection = {
  label: string; // Fallback English label
  labelKey: string; // Translation key
  items: NavItem[];
};

const leadsSection: NavSection = {
  label: "Leads Management",
  labelKey: "leads_management",
  items: [
    { icon: LayoutDashboard, label: "Dashboard", labelKey: "dashboard", path: "/" },
    { icon: Users, label: "Leads", labelKey: "leads", path: "/leads" },
    { icon: GitBranch, label: "Pipeline", labelKey: "pipeline", path: "/pipeline" },
    { icon: Target, label: "Lead Sources", labelKey: "lead_sources", path: "/lead-sources" },
    { icon: Workflow, label: "Lead Assignment", labelKey: "lead_assignment", path: "/lead-assignment" },
  ],
};

const marketingSection: NavSection = {
  label: "Marketing Hub",
  labelKey: "marketing_hub",
  items: [
    { icon: Megaphone, label: "Campaigns", labelKey: "campaigns", path: "/campaigns" },
    { icon: MessageCircle, label: "WhatsApp Bot", labelKey: "whatsapp_bot", path: "/whatsapp-chatbot" },
    { icon: Plug, label: "Connections", labelKey: "connections", path: "/connections" },
  ],
};

const listingsSection: NavSection = {
  label: "Listings",
  labelKey: "listings",
  items: [
    { icon: Home, label: "My Listings", labelKey: "my_listings", path: "/listings" },
    { icon: Building2, label: "Company Listings", labelKey: "company_listings", path: "/company-listings" },
    { icon: Link2, label: "Integrations", labelKey: "integrations", path: "/integrations" },
    { icon: Cloud, label: "Portal Settings", labelKey: "portal_settings", path: "/portal-settings" },
  ],
};

const adminSection: NavSection = {
  label: "Admin",
  labelKey: "admin",
  items: [
    { icon: UsersRound, label: "Teams", labelKey: "teams", path: "/teams" },
    { icon: Shield, label: "Roles & Permissions", labelKey: "roles_permissions", path: "/roles" },
    { icon: CreditCard, label: "Billing", labelKey: "billing", path: "/billing" },
    { icon: Settings, label: "Settings", labelKey: "settings", path: "/settings" },
  ],
};

export const navigation: NavSection[] = [
  leadsSection,
  listingsSection,
  marketingSection,
  adminSection,
];