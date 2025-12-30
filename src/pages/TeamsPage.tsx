import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Team, Agent, UserStatus } from '@/components/teams/types';
import { DroppableTeamCard } from '@/components/teams/DroppableTeamCard';
import { DragOverlayCard } from '@/components/teams/DragOverlayCard';
import { TeamFilters, TeamFiltersState } from '@/components/teams/TeamFilters';
import { CreateTeamDialog } from '@/components/teams/CreateTeamDialog';
import { CreateAgentDialog } from '@/components/teams/CreateAgentDialog';
import { TeamsPageSkeleton } from '@/components/ui/page-skeletons';
import { useIsMobile } from '@/hooks/use-mobile';
import { TeamsFAB } from '@/components/teams/TeamsFAB';
import { useLocalization } from "@/contexts/LocalizationContext";
import { supabase } from '@/integrations/supabase/client';

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

export default function TeamsPage() {
  const { t } = useLocalization();

  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [createAgentOpen, setCreateAgentOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);

  const [filters, setFilters] = useState<TeamFiltersState>({
    search: '',
    role: 'all',
    team: 'all',
    status: 'all',
  });

  // Selection state for bulk actions
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set());
  const selectionMode = selectedAgentIds.size > 0;

  const fetchData = async () => {
    try {
      setIsLoading(true);
      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });

      if (teamsError) throw teamsError;

      // Fetch agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (agentsError) throw agentsError;

      // Map agents to match interface
      const mappedAgents: Agent[] = agentsData.map(a => ({
        id: a.id,
        name: a.name,
        email: a.email,
        phone: a.phone || '',
        avatar: a.avatar_url,
        role: a.role,
        status: a.status,
        teamId: a.team_id || undefined,
        permissions: (a.permissions as any) || { leads: true, listings: true, marketing: false, reports: false, integrations: false },
        createdAt: new Date(a.created_at),
        // These would normally be calculated from other tables
        assignedLeads: 0,
        assignedListings: 0,
        performance: { leadsConverted: 0, revenue: 0, listingsPublished: 0 }
      }));

      // Map teams and attach agents
      const mappedTeams: Team[] = teamsData.map(t => ({
        id: t.id,
        name: t.name,
        leaderId: t.leader_id || undefined,
        status: t.status as 'active' | 'inactive',
        createdAt: new Date(t.created_at),
        agents: mappedAgents.filter(a => a.teamId === t.id),
        // These would be calculated
        assignedLeads: 0,
        assignedListings: 0,
      }));

      setAgents(mappedAgents);
      setTeams(mappedTeams);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load teams and agents.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const draggedAgent = agents.find(a => a.id === active.id);
    if (draggedAgent) {
      setActiveAgent(draggedAgent);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveAgent(null);

    if (!over) return;

    const draggedAgentId = active.id as string;
    const droppedOnId = over.id as string;

    // Extract team id from droppable id (format: "team-{id}")
    if (!droppedOnId.startsWith('team-')) return;
    const targetTeamId = droppedOnId.replace('team-', '');

    const draggedAgent = agents.find(a => a.id === draggedAgentId);
    if (!draggedAgent || draggedAgent.teamId === targetTeamId) return;

    const sourceTeam = teams.find(t => t.id === draggedAgent.teamId);
    const targetTeam = teams.find(t => t.id === targetTeamId);

    // Optimistic update
    const updatedAgent = { ...draggedAgent, teamId: targetTeamId };
    const updatedAgents = agents.map(a => a.id === draggedAgentId ? updatedAgent : a);
    setAgents(updatedAgents);

    const updatedTeams = teams.map(t => ({
      ...t,
      agents: updatedAgents.filter(a => a.teamId === t.id)
    }));
    setTeams(updatedTeams);

    // DB Update
    try {
      const { error } = await supabase
        .from('agents')
        .update({ team_id: targetTeamId })
        .eq('id', draggedAgentId);

      if (error) throw error;

      toast({
        title: 'Agent Moved',
        description: `${draggedAgent.name} moved ${sourceTeam ? `from ${sourceTeam.name}` : ''} to ${targetTeam?.name}.`,
      });
    } catch (error) {
      // Revert on error (could be improved)
      toast({ title: 'Error', description: 'Failed to update agent team.', variant: 'destructive' });
      fetchData();
    }
  };

  // Filter teams based on filters (kept same logic as checks active state)
  const filteredTeams = teams.filter(team => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesTeam = team.name.toLowerCase().includes(searchLower);
      const matchesAgent = team.agents.some(a =>
        a.name.toLowerCase().includes(searchLower) ||
        a.email.toLowerCase().includes(searchLower)
      );
      if (!matchesTeam && !matchesAgent) return false;
    }
    if (filters.team !== 'all' && team.id !== filters.team) return false;
    return true;
  }).map(team => ({
    ...team,
    agents: team.agents.filter(agent => {
      if (filters.role !== 'all' && agent.role !== filters.role) return false;
      if (filters.status !== 'all' && agent.status !== filters.status) return false;
      return true;
    })
  }));

  // Team handlers
  const handleSaveTeam = async (teamData: Partial<Team>) => {
    try {
      let teamId: string | undefined;

      if (editingTeam) {
        teamId = editingTeam.id;
        const { error } = await supabase
          .from('teams')
          .update({
            name: teamData.name,
            leader_id: teamData.leaderId || null,
            status: teamData.status
          })
          .eq('id', editingTeam.id);

        if (error) throw error;
        toast({ title: 'Team Updated', description: `"${teamData.name}" has been updated.` });
      } else {
        const { data, error } = await supabase
          .from('teams')
          .insert({
            name: teamData.name || 'New Team',
            leader_id: teamData.leaderId || null,
            status: teamData.status || 'active'
          })
          .select('id')
          .single();

        if (error) throw error;
        teamId = data.id;
        toast({ title: 'Team Created', description: `"${teamData.name || 'New Team'}" has been created.` });
      }

      // Update agents' team assignments
      if (teamId && teamData.agents) {
        const selectedAgentIds = teamData.agents.map(a => a.id);

        // 1. Assign selected agents to this team
        if (selectedAgentIds.length > 0) {
          const { error: assignError } = await supabase
            .from('agents')
            .update({ team_id: teamId })
            .in('id', selectedAgentIds);

          if (assignError) throw assignError;
        }

        // 2. Unassign agents that were removed (only if editing)
        // If we are creating, there are no existing agents to remove.
        // If editing, we assume teamData.agents represents the FULL desired state.
        // However, ensuring we don't accidentally unassign agents from OTHER teams if the UI logic is partial logic?
        // The UI dialog returns "agents: availableAgents.filter(a => selectedAgents.includes(a.id))".
        // So it returns the comprehensive list of members for this team.

        // We need to unassign agents who currently have this team_id but are NOT in selectedAgentIds
        const { error: unassignError } = await supabase
          .from('agents')
          .update({ team_id: null })
          .eq('team_id', teamId)
          .not('id', 'in', `(${selectedAgentIds.length > 0 ? selectedAgentIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);
        // Using a dummy UUID for empty list to keep query valid

        if (unassignError) throw unassignError;
      }

      fetchData(); // Refresh data
      setEditingTeam(null);
    } catch (error: any) {
      console.error("Error saving team:", error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setCreateTeamOpen(true);
  };

  const handleDeleteTeam = async (team: Team) => {
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', team.id);

      if (error) throw error;

      setTeams(teams.filter(t => t.id !== team.id));
      toast({ title: 'Team Deleted', description: `"${team.name}" has been deleted.`, variant: 'destructive' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Agent handlers
  const handleSaveAgent = (agentData: Partial<Agent>) => {
    // With CreateAgentDialog doing the saving/inviting, we just need to refresh.
    // However, if we edit here, we might need to handle updates if the dialog doesn't fully handle it?
    // Looking at CreateAgentDialog, it calls 'invite-agent' for new, and 'onSave' is called.
    // If editing, CreateAgentDialog calls onSave but doesn't db update?
    // CreateAgentDialog content:
    // if (agent) { onSave({ ... }); onOpenChange(false); }
    // It seems CreateAgentDialog assumes parent handles save for edits?

    // Let's implement edit logic here.
    if (editingAgent) {
      const updateAgent = async () => {
        try {
          // Prepare Permissions JSON
          // Map permissions object to json

          const { error } = await supabase
            .from('agents')
            .update({
              name: agentData.name,
              phone: agentData.phone,
              role: agentData.role,
              team_id: agentData.teamId,
              permissions: agentData.permissions
            })
            .eq('id', editingAgent.id);

          if (error) throw error;
          toast({ title: 'Agent Updated', description: `"${agentData.name}" has been updated.` });
          fetchData();
        } catch (error: any) {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
      };
      updateAgent();
    } else {
      // New agent comes from invite-agent function, which already inserted it.
      // We just need to refresh.
      fetchData();
      toast({ title: 'Agent Created', description: `Agent has been invited.` });
    }
    setEditingAgent(null);
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setCreateAgentOpen(true);
  };

  const handleToggleAgentStatus = async (agent: Agent) => {
    const newStatus = agent.status === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase
        .from('agents')
        .update({ status: newStatus })
        .eq('id', agent.id);

      if (error) throw error;

      // Optimistic update
      const updatedAgent = { ...agent, status: newStatus as Agent['status'] };
      setAgents(agents.map(a => a.id === agent.id ? updatedAgent : a));
      setTeams(teams.map(t => ({
        ...t,
        agents: t.agents.map(a => a.id === agent.id ? updatedAgent : a)
      })));

      toast({
        title: `Agent ${newStatus === 'active' ? 'Activated' : 'Deactivated'}`,
        description: `"${agent.name}" is now ${newStatus}.`
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Selection handlers
  const handleSelectAgent = (agent: Agent, selected: boolean) => {
    setSelectedAgentIds(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(agent.id);
      } else {
        newSet.delete(agent.id);
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedAgentIds(new Set());
  };

  // Bulk action handlers
  const handleBulkAssignTeam = (teamId: string) => {
    const selectedAgents = agents.filter(a => selectedAgentIds.has(a.id));
    const newTeamId = teamId === 'unassign' ? undefined : teamId;

    // Update agents
    const updatedAgents = agents.map(a =>
      selectedAgentIds.has(a.id) ? { ...a, teamId: newTeamId } : a
    );
    setAgents(updatedAgents);

    // Update teams
    const updatedTeams = teams.map(t => ({
      ...t,
      agents: updatedAgents.filter(a => a.teamId === t.id)
    }));
    setTeams(updatedTeams);

    const targetTeam = teams.find(t => t.id === teamId);
    toast({
      title: 'Agents Reassigned',
      description: teamId === 'unassign'
        ? `${selectedAgents.length} agent(s) removed from teams.`
        : `${selectedAgents.length} agent(s) assigned to ${targetTeam?.name}.`,
    });
    clearSelection();
  };

  const handleBulkChangeStatus = (status: UserStatus) => {
    const selectedAgents = agents.filter(a => selectedAgentIds.has(a.id));

    // Update agents
    const updatedAgents = agents.map(a =>
      selectedAgentIds.has(a.id) ? { ...a, status } : a
    );
    setAgents(updatedAgents);

    // Update teams
    setTeams(teams.map(t => ({
      ...t,
      agents: t.agents.map(a => selectedAgentIds.has(a.id) ? { ...a, status } : a)
    })));

    toast({
      title: 'Status Updated',
      description: `${selectedAgents.length} agent(s) set to ${status.replace('_', ' ')}.`,
    });
    clearSelection();
  };

  const handleBulkExport = () => {
    const selectedAgents = agents.filter(a => selectedAgentIds.has(a.id));

    // Generate CSV content
    const headers = ['Name', 'Email', 'Phone', 'Role', 'Status', 'Team', 'Leads', 'Listings', 'Converted'];
    const rows = selectedAgents.map(a => {
      const team = teams.find(t => t.id === a.teamId);
      return [
        a.name,
        a.email,
        a.phone,
        a.role,
        a.status,
        team?.name || 'Unassigned',
        a.assignedLeads,
        a.assignedListings,
        a.performance.leadsConverted,
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agents-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: `${selectedAgents.length} agent(s) exported to CSV.`,
    });
  };


  if (isLoading) {
    return <TeamsPageSkeleton isMobile={isMobile} />;
  }

  return (
    <motion.div
      className="space-y-4"
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
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Teams & Agents</h1>
              <p className="text-muted-foreground">
                Manage teams, agents, and roles in one place
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => {
            setEditingAgent(null);
            setCreateAgentOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Agent
          </Button>
          <Button variant="outline" onClick={() => {
            setEditingTeam(null);
            setCreateTeamOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Team
          </Button>
        </div>
      </div>

      {/* Teams List */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="space-y-3">
          {/* Filters */}
          <div className="bg-card rounded-xl border border-border p-3">
            <TeamFilters filters={filters} onFiltersChange={setFilters} />
          </div>

          {/* Teams List */}
          <div className="space-y-3">
            {filteredTeams.map((team) => (
              <DroppableTeamCard
                key={team.id}
                team={team}
                onEdit={handleEditTeam}
                onAddAgent={() => {
                  setEditingAgent(null);
                  setCreateAgentOpen(true);
                }}
                onRemoveAgent={() => { }}
                onAssignLeader={handleEditTeam}
                onDelete={handleDeleteTeam}
                onViewAgent={() => { }}
                onEditAgent={handleEditAgent}
                onReassignAgent={() => { }}
                onToggleAgentStatus={handleToggleAgentStatus}
                isAdmin={true}
                selectedAgentIds={selectedAgentIds}
                onSelectAgent={handleSelectAgent}
                selectionMode={selectionMode}
              />
            ))}

            {filteredTeams.length === 0 && (
              <div className="text-center py-12 bg-card rounded-xl border border-border">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">No teams found</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Create your first team to get started
                </p>
                <Button onClick={() => setCreateTeamOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Team
                </Button>
              </div>
            )}
          </div>
        </div>
        <DragOverlay>
          {activeAgent ? <DragOverlayCard agent={activeAgent} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Dialogs */}
      <CreateTeamDialog
        open={createTeamOpen}
        onOpenChange={(open) => {
          setCreateTeamOpen(open);
          if (!open) setEditingTeam(null);
        }}
        team={editingTeam}
        availableAgents={agents}
        onSave={handleSaveTeam}
      />

      <CreateAgentDialog
        open={createAgentOpen}
        onOpenChange={(open) => {
          setCreateAgentOpen(open);
          if (!open) setEditingAgent(null);
        }}
        agent={editingAgent}
        teams={teams}
        onSave={handleSaveAgent}
      />

      {/* Mobile FAB */}
      <TeamsFAB
        onAddAgent={() => {
          setEditingAgent(null);
          setCreateAgentOpen(true);
        }}
        onCreateTeam={() => {
          setEditingTeam(null);
          setCreateTeamOpen(true);
        }}
      />
    </motion.div>
  );
}
