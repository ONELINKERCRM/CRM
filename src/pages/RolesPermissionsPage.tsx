import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Users,
  Crown,
  UserCog,
  User,
  Check,
  ChevronDown,
  ChevronRight,
  Search,
  Plus,
  Edit,
  Info,
  Trash2,
  Mail,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RolesFAB } from "@/components/roles/RolesFAB";
import { RolesPageSkeleton } from "@/components/ui/page-skeletons";
import { useIsMobile } from "@/hooks/use-mobile";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

const pageTransition = {
  type: "tween" as const,
  ease: "easeOut" as const,
  duration: 0.3
};

type AppRole = "admin" | "manager" | "team_leader" | "agent";

interface UserWithRole {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: AppRole;
  role_id: string;
}

// Role configurations
const roles: {
  id: AppRole;
  name: string;
  description: string;
  icon: typeof Crown;
  color: string;
  badgeColor: string;
}[] = [
    {
      id: "admin",
      name: "Admin",
      description: "Full system access with all permissions",
      icon: Crown,
      color: "from-red-500 to-rose-500",
      badgeColor: "bg-red-500/10 text-red-600",
    },
    {
      id: "manager",
      name: "Manager",
      description: "Manage teams, agents, and view reports",
      icon: UserCog,
      color: "from-amber-500 to-orange-500",
      badgeColor: "bg-amber-500/10 text-amber-600",
    },
    {
      id: "team_leader",
      name: "Team Leader",
      description: "Lead team members and manage assignments",
      icon: Users,
      color: "from-blue-500 to-indigo-500",
      badgeColor: "bg-blue-500/10 text-blue-600",
    },
    {
      id: "agent",
      name: "Agent",
      description: "Handle leads and listings",
      icon: User,
      color: "from-green-500 to-emerald-500",
      badgeColor: "bg-green-500/10 text-green-600",
    },
  ];

// Permission categories
const permissionCategories = [
  {
    id: "leads",
    name: "Leads Management",
    description: "Access to lead data and operations",
    permissions: [
      { key: "leads.view", label: "View Leads", description: "View all leads in the system" },
      { key: "leads.create", label: "Create Leads", description: "Add new leads manually" },
      { key: "leads.edit", label: "Edit Leads", description: "Modify lead information" },
      { key: "leads.delete", label: "Delete Leads", description: "Remove leads permanently" },
    ],
  },
  {
    id: "listings",
    name: "Listings Management",
    description: "Access to property listings",
    permissions: [
      { key: "listings.view", label: "View Listings", description: "View all property listings" },
      { key: "listings.create", label: "Create Listings", description: "Add new property listings" },
      { key: "listings.edit", label: "Edit Listings", description: "Modify listing details" },
      { key: "listings.delete", label: "Delete Listings", description: "Remove listings permanently" },
    ],
  },
  {
    id: "teams",
    name: "Team Management",
    description: "Access to team operations",
    permissions: [
      { key: "teams.view", label: "View Teams", description: "View team structure and members" },
      { key: "teams.create", label: "Create Teams", description: "Create new teams" },
      { key: "teams.edit", label: "Edit Teams", description: "Modify team settings" },
      { key: "teams.delete", label: "Delete Teams", description: "Remove teams" },
    ],
  },
  {
    id: "agents",
    name: "Agent Management",
    description: "Access to agent operations",
    permissions: [
      { key: "agents.view", label: "View Agents", description: "View agent profiles" },
      { key: "agents.create", label: "Invite Agents", description: "Invite new agents" },
      { key: "agents.edit", label: "Edit Agents", description: "Modify agent details" },
      { key: "agents.delete", label: "Remove Agents", description: "Remove agents from system" },
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    description: "Access to marketing campaigns",
    permissions: [
      { key: "marketing.view", label: "View Campaigns", description: "View marketing campaigns" },
      { key: "marketing.create", label: "Create Campaigns", description: "Create new campaigns" },
      { key: "marketing.edit", label: "Edit Campaigns", description: "Modify campaign settings" },
      { key: "marketing.delete", label: "Delete Campaigns", description: "Remove campaigns" },
    ],
  },
  {
    id: "reports",
    name: "Reports & Analytics",
    description: "Access to reports and data",
    permissions: [
      { key: "reports.view", label: "View Reports", description: "Access analytics dashboards" },
      { key: "reports.export", label: "Export Data", description: "Export reports and data" },
    ],
  },
  {
    id: "settings",
    name: "Settings",
    description: "System configuration access",
    permissions: [
      { key: "settings.view", label: "View Settings", description: "View system settings" },
      { key: "settings.edit", label: "Edit Settings", description: "Modify system settings" },
    ],
  },
];

// Default permissions by role
const defaultPermissions: Record<string, string[]> = {
  admin: permissionCategories.flatMap(cat => cat.permissions.map(p => p.key)),
  manager: [
    "leads.view", "leads.create", "leads.edit", "leads.delete",
    "listings.view", "listings.create", "listings.edit", "listings.delete",
    "teams.view", "teams.edit",
    "agents.view", "agents.edit",
    "marketing.view", "marketing.create", "marketing.edit",
    "reports.view", "reports.export",
    "settings.view",
  ],
  team_leader: [
    "leads.view", "leads.create", "leads.edit",
    "listings.view", "listings.create", "listings.edit",
    "teams.view",
    "agents.view",
    "reports.view",
  ],
  agent: [
    "leads.view", "leads.create", "leads.edit",
    "listings.view",
    "reports.view",
  ],
};

export default function RolesPermissionsPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedRole, setSelectedRole] = useState<AppRole>("admin");
  const [permissions] = useState(defaultPermissions);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["leads", "listings"]);
  const [searchUser, setSearchUser] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  // Data states
  const [usersWithRoles, setUsersWithRoles] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleCounts, setRoleCounts] = useState<Record<AppRole, number>>({
    admin: 0,
    manager: 0,
    team_leader: 0,
    agent: 0,
  });

  // Dialog states
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<AppRole>("agent");
  const [newUserFirstName, setNewUserFirstName] = useState("");
  const [newUserLastName, setNewUserLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch users with roles
  const fetchUsersWithRoles = async () => {
    try {
      setLoading(true);

      // Fetch all user roles with profile info
      const { data: userRolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      // Combine data
      const combined: UserWithRole[] = (userRolesData || []).map(role => {
        const profile = profilesData?.find(p => p.id === role.user_id);
        return {
          id: profile?.id || role.user_id,
          user_id: role.user_id,
          email: profile?.first_name ? `${profile.first_name.toLowerCase()}@company.com` : 'user@company.com',
          first_name: profile?.first_name || null,
          last_name: profile?.last_name || null,
          avatar_url: profile?.avatar_url || null,
          role: role.role as AppRole,
          role_id: role.id,
        };
      });

      setUsersWithRoles(combined);

      // Calculate role counts
      const counts: Record<AppRole, number> = {
        admin: 0,
        manager: 0,
        team_leader: 0,
        agent: 0,
      };
      combined.forEach(u => {
        counts[u.role]++;
      });
      setRoleCounts(counts);

    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersWithRoles();
  }, []);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const hasPermission = (roleId: string, permissionKey: string) => {
    return permissions[roleId]?.includes(permissionKey) || false;
  };

  const filteredUsers = usersWithRoles.filter(user => {
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    const matchesSearch = name.toLowerCase().includes(searchUser.toLowerCase()) ||
      user.email.toLowerCase().includes(searchUser.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleConfig = (roleId: string) => roles.find(r => r.id === roleId);

  // Add new user with role
  const handleAddUser = async () => {
    if (!newUserEmail.trim()) {
      toast.error('Email is required');
      return;
    }

    setSubmitting(true);
    try {
      // For now, we'll add to the current user if email matches, or create a placeholder
      // In a real app, you'd send an invitation email

      // Check if we're adding the current user
      if (user?.email === newUserEmail) {
        const { error } = await supabase
          .from('user_roles')
          .insert({
            user_id: user.id,
            role: newUserRole,
          });

        if (error) {
          if (error.code === '23505') {
            toast.error('This user already has a role assigned');
          } else {
            throw error;
          }
        } else {
          toast.success(`Role "${newUserRole}" assigned successfully`);
          setAddUserDialogOpen(false);
          setNewUserEmail("");
          setNewUserFirstName("");
          setNewUserLastName("");
          setNewUserRole("agent");
          fetchUsersWithRoles();
        }
      } else {
        toast.info('User invitation sent! They will receive access once they sign up.');
        setAddUserDialogOpen(false);
        setNewUserEmail("");
        setNewUserFirstName("");
        setNewUserLastName("");
        setNewUserRole("agent");
      }
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('Failed to add user');
    } finally {
      setSubmitting(false);
    }
  };

  // Update user role
  const handleUpdateRole = async (userId: string, roleId: string, newRole: AppRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('id', roleId);

      if (error) throw error;

      toast.success('Role updated successfully');
      fetchUsersWithRoles();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  // Delete user role
  const handleDeleteUserRole = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', selectedUser.role_id);

      if (error) throw error;

      toast.success('User role removed');
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchUsersWithRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to remove role');
    }
  };

  // Assign role to current user (quick action)
  const handleAssignCurrentUser = async (role: AppRole) => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: role,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('You already have this role assigned');
        } else {
          throw error;
        }
      } else {
        toast.success(`You are now assigned as ${role}`);
        fetchUsersWithRoles();
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error('Failed to assign role');
    }
  };

  if (loading) {
    return <RolesPageSkeleton isMobile={isMobile} />;
  }

  return (
    <motion.div
      className="space-y-6"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Access Control</h1>
              <p className="text-muted-foreground">Define roles and manage member permissions</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setAddUserDialogOpen(true)} className="shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Add New Member
          </Button>
        </div>
      </div>

      {/* Quick Assign for Current User */}
      {user && usersWithRoles.filter(u => u.user_id === user.id).length === 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Info className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Assign yourself a role</p>
                  <p className="text-sm text-muted-foreground">You don't have a role yet. Assign one to get started.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleAssignCurrentUser('admin')}>
                  <Crown className="h-4 w-4 mr-1" />
                  Admin
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleAssignCurrentUser('manager')}>
                  <UserCog className="h-4 w-4 mr-1" />
                  Manager
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="bg-muted/50 p-1 border h-10 w-full sm:w-auto">
          <TabsTrigger value="users" className="data-[state=active]:bg-background data-[state=active]:shadow-sm h-8 px-5">User Assignments</TabsTrigger>
          <TabsTrigger value="roles" className="data-[state=active]:bg-background data-[state=active]:shadow-sm h-8 px-5">Role Master</TabsTrigger>
        </TabsList>

        {/* User Assignments Tab */}
        <TabsContent value="users" className="space-y-6">
          {/* Role Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {roles.map(role => {
              const Icon = role.icon;
              const isFiltered = filterRole === role.id;
              return (
                <Card
                  key={role.id}
                  className={cn(
                    "relative overflow-hidden cursor-pointer transition-all hover:shadow-md border",
                    isFiltered ? "ring-2 ring-primary border-transparent bg-primary/5" : "hover:border-primary/30"
                  )}
                  onClick={() => setFilterRole(isFiltered ? "all" : role.id)}
                >
                  <CardContent className="p-3.5">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0",
                        role.color
                      )}>
                        <Icon className="h-4.5 w-4.5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xl font-bold leading-tight">{roleCounts[role.id]}</p>
                        <p className="text-[10px] font-medium text-muted-foreground truncate">{role.name}s</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="border-none bg-transparent shadow-none">
            <CardHeader className="px-0 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">System Members</CardTitle>
                  <CardDescription>Assign and edit user roles across the platform</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-full sm:w-[180px] h-10">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Users List */}
              {loading ? (
                <div className="flex items-center justify-center py-20 bg-card rounded-2xl border border-dashed">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="bg-card rounded-2xl border border-dashed py-16 px-4">
                  <EmptyState
                    icon={Users}
                    title="No members found"
                    description={searchUser ? "Your search filter didn't match any system members." : "Start growing your team by adding your first system member."}
                    actionLabel="Add Member"
                    onAction={() => setAddUserDialogOpen(true)}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredUsers.map((userItem) => {
                    const roleConfig = getRoleConfig(userItem.role);
                    const name = `${userItem.first_name || ''} ${userItem.last_name || ''}`.trim() || 'Unknown User';
                    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

                    return (
                      <Card
                        key={userItem.role_id}
                        className="p-3 transition-all hover:bg-muted/5 group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 min-w-0">
                            <Avatar className="h-10 w-10 border shadow-sm shrink-0">
                              <AvatarImage src={userItem.avatar_url || undefined} alt={name} />
                              <AvatarFallback className="bg-primary/5 text-primary text-xs font-semibold">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">{name}</p>
                              <p className="text-xs text-muted-foreground truncate">{userItem.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            {!isMobile && (
                              <Badge className={cn("hidden lg:flex", roleConfig?.badgeColor)}>
                                {roleConfig?.name}
                              </Badge>
                            )}
                            <div className="flex items-center gap-2">
                              <Select
                                defaultValue={userItem.role}
                                onValueChange={(value) => handleUpdateRole(userItem.user_id, userItem.role_id, value as AppRole)}
                              >
                                <SelectTrigger className="w-[120px] max-sm:w-[40px] h-9 max-sm:p-0 max-sm:border-none max-sm:bg-transparent">
                                  <div className="max-sm:hidden truncate">
                                    <SelectValue />
                                  </div>
                                  <div className="sm:hidden flex items-center justify-center w-full">
                                    <Edit className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                </SelectTrigger>
                                <SelectContent className="bg-popover">
                                  {roles.map(role => (
                                    <SelectItem key={role.id} value={role.id}>
                                      <div className="flex items-center gap-2">
                                        <role.icon className="h-3.5 w-3.5" />
                                        {role.name}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                onClick={() => {
                                  setSelectedUser(userItem);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles & Permissions Tab */}
        <TabsContent value="roles" className="space-y-6">
          {/* Role Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {roles.map((role) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.id;
              return (
                <Card
                  key={role.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    isSelected && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedRole(role.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2.5">
                      <div className={cn(
                        "w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0",
                        role.color
                      )}>
                        <Icon className="h-4.5 w-4.5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">{role.name}</h3>
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{role.description}</p>
                        <Badge variant="secondary" className="mt-1.5 h-4.5 text-[9px] px-1.5">
                          {roleCounts[role.id]} users
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Permissions Grid Header */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-transparent border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-center sm:text-left">
              {(() => {
                const role = getRoleConfig(selectedRole);
                const Icon = role?.icon || Shield;
                return (
                  <>
                    <div className={cn(
                      "w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shrink-0 border border-white/20 shadow-sm",
                      role?.color || "from-gray-500 to-gray-600"
                    )}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">{role?.name} Permissions</h2>
                      <p className="text-sm text-muted-foreground">{role?.description}</p>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-background/50 h-8">
                {permissions[selectedRole]?.length || 0} Modules Enabled
              </Badge>
            </div>
          </div>

          {/* Permissions List */}
          <div className="grid grid-cols-1 gap-4 mt-6">
            <TooltipProvider>
              {permissionCategories.map((category) => {
                const isExpanded = expandedCategories.includes(category.id);
                const enabledCount = category.permissions.filter(p => hasPermission(selectedRole, p.key)).length;
                const allEnabled = enabledCount === category.permissions.length;
                const someEnabled = enabledCount > 0 && !allEnabled;

                return (
                  <Card key={category.id} className="overflow-hidden border group transition-all">
                    <div className="bg-muted/30 px-4 py-3 flex items-center justify-between border-b">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          allEnabled ? "bg-green-500/10 text-green-600" : someEnabled ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground"
                        )}>
                          <Shield className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">{category.name}</h4>
                          <p className="text-[11px] text-muted-foreground">{category.description}</p>
                        </div>
                      </div>
                      <Badge variant={allEnabled ? "default" : "secondary"} className="text-[10px] h-5">
                        {enabledCount} active
                      </Badge>
                    </div>
                    <div className="divide-y divide-border/50">
                      {category.permissions.map((permission) => (
                        <div
                          key={permission.key}
                          className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/5 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-foreground">{permission.label}</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                <p className="text-[10px] max-w-[200px]">{permission.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Switch
                            checked={hasPermission(selectedRole, permission.key)}
                            disabled
                            className="scale-75"
                          />
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </TooltipProvider>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add User Dialog Redesign */}
      <ResponsiveDialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <ResponsiveDialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
          <ResponsiveDialogHeader className="px-6 py-4 border-b">
            <ResponsiveDialogTitle className="flex items-center gap-2 text-base">
              <Mail className="h-5 w-5 text-primary" />
              Invite System Member
            </ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody className="p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">First Name</Label>
                  <Input
                    placeholder="e.g. John"
                    value={newUserFirstName}
                    onChange={(e) => setNewUserFirstName(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Last Name</Label>
                  <Input
                    placeholder="e.g. Doe"
                    value={newUserLastName}
                    onChange={(e) => setNewUserLastName(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Business Email Address</Label>
                <Input
                  type="email"
                  placeholder="name@company.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">System Role</Label>
                <Select value={newUserRole} onValueChange={(value) => setNewUserRole(value as AppRole)}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center gap-2">
                          <role.icon className="h-4 w-4" />
                          {role.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-muted/50 border border-border/50">
                  <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    {getRoleConfig(newUserRole)?.description}
                  </p>
                </div>
              </div>
            </div>
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter className="p-6 border-t bg-muted/20">
            <div className="flex w-full items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setAddUserDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddUser} disabled={submitting || !newUserEmail.trim()} className="min-w-[140px] shadow-sm">
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Send Invitation
              </Button>
            </div>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Delete Confirmation Redesign */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-none p-0 overflow-hidden shadow-2xl">
          <div className="p-8 space-y-6 text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto ring-8 ring-destructive/5">
              <Trash2 className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-xl font-bold">Revoke Access?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm px-4">
                You are about to remove <span className="font-semibold text-foreground">{selectedUser?.first_name} {selectedUser?.last_name}</span>.
                They will lose all permissions and access to the CRM immediately.
              </AlertDialogDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <AlertDialogCancel asChild>
                <Button variant="outline" className="flex-1 h-11">Keep User</Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button variant="destructive" className="flex-1 h-11" onClick={handleDeleteUserRole}>
                  Revoke Access
                </Button>
              </AlertDialogAction>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile FAB */}
      <RolesFAB onAddUser={() => setAddUserDialogOpen(true)} />
    </motion.div>
  );
}