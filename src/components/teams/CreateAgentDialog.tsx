import { useState, useEffect } from 'react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
  ResponsiveDialogBody,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Shield, Upload, Mail, Loader2, Check, ArrowRight, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { Agent, Team, UserRole } from './types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: Agent | null;
  teams: Team[];
  onSave: (agentData: Partial<Agent>) => void;
}

type InviteStep = "details" | "permissions" | "complete";

export function CreateAgentDialog({ open, onOpenChange, agent, teams, onSave }: CreateAgentDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<InviteStep>("details");
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('agent');
  const [teamId, setTeamId] = useState<string>('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [permissions, setPermissions] = useState({
    leads: true,
    listings: true,
    marketing: false,
    reports: false,
    integrations: false,
  });

  useEffect(() => {
    if (open) {
      if (agent) {
        setName(agent.name);
        setEmail(agent.email);
        setPhone(agent.phone);
        setRole(agent.role);
        setTeamId(agent.teamId || '');
        setPermissions(agent.permissions);
        setStep("details");
      } else {
        setName('');
        setEmail('');
        setPhone('');
        setRole('agent');
        setTeamId('');
        setPermissions({
          leads: true,
          listings: true,
          marketing: false,
          reports: false,
          integrations: false,
        });
        setStep("details");
      }
      setInviteLink('');
    }
  }, [agent, open]);

  const handleInvite = async () => {
    if (!name.trim() || !email.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide name and email.',
        variant: 'destructive',
      });
      return;
    }

    setIsInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-agent', {
        body: {
          name,
          email,
          phone,
          role,
          team_id: teamId || null,
          permissions,
        },
      });

      if (error) throw error;

      setInviteLink(data.invite_link || `${window.location.origin}/invite/${data.agent.id}`);
      setStep("complete");

      onSave({
        id: data.agent.id,
        name,
        email,
        phone,
        role,
        status: 'invited',
        teamId: teamId || undefined,
        permissions,
      });
    } catch (error: any) {
      console.error('Error inviting agent:', error);
      toast({
        title: 'Failed to Send Invitation',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleSave = () => {
    if (agent) {
      // Editing existing agent
      onSave({
        name,
        email,
        phone,
        role,
        status: agent.status,
        teamId: teamId || undefined,
        permissions,
      });
      onOpenChange(false);
    } else {
      // New agent - send invitation
      handleInvite();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast({ title: 'Link copied!', description: 'Invite link copied to clipboard.' });
  };

  const isEditing = !!agent;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
        <ResponsiveDialogHeader className="px-5 py-2.5 border-b">
          <ResponsiveDialogTitle className="flex items-center gap-2 text-sm">
            {isEditing ? (
              <User className="h-5 w-5 text-primary" />
            ) : (
              <Mail className="h-5 w-5 text-primary" />
            )}
            {isEditing ? 'Edit Agent Profile' : 'Invite New Agent'}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="p-0">
          <div className="p-4 space-y-3">
            {/* Steps Indicator */}
            {!isEditing && step !== "complete" && (
              <div className="flex items-center justify-between pb-2 border-b">
                {[
                  { id: "details", label: "Agent Info", icon: User },
                  { id: "permissions", label: "Permissions", icon: Shield },
                ].map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                      step === s.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : step === "permissions" && i === 0
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                    )}>
                      <s.icon className="h-3.5 w-3.5" />
                      <span>{s.label}</span>
                    </div>
                    {i === 0 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                ))}
              </div>
            )}

            {step === "details" && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Full Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Role</Label>
                    <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="team_leader">Team Leader</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Email Address</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@company.com"
                      disabled={isEditing}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Phone Number</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+971 50 123 4567"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Team Assignment</Label>
                  <Select value={teamId || 'none'} onValueChange={(v) => setTeamId(v === 'none' ? '' : v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="none">No Team (Individual Agent)</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!isEditing && (
                  <div className="p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 flex gap-2">
                    <Mail className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-[9px] leading-relaxed text-blue-800 dark:text-blue-200">
                      <span className="font-semibold text-[10px]">Professional Invite:</span> Official invitation will be sent to this email.
                    </p>
                  </div>
                )}
              </div>
            )}

            {step === "permissions" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold">Module Access Control</h4>
                </div>

                <div className="space-y-2">
                  {[
                    { key: 'leads', label: 'Leads Management', description: 'CRM leads and pipeline' },
                    { key: 'listings', label: 'Property Listings', description: 'Property listings' },
                    { key: 'marketing', label: 'Marketing Tools', description: 'Marketing tools' },
                    { key: 'reports', label: 'Analytics', description: 'Performance data' },
                    { key: 'integrations', label: 'Integrations', description: 'API access' },
                  ].map((perm) => (
                    <div key={perm.key} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-transparent hover:border-border transition-all">
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-medium">{perm.label}</p>
                        <p className="text-[9px] text-muted-foreground">{perm.description}</p>
                      </div>
                      <Switch
                        checked={permissions[perm.key as keyof typeof permissions]}
                        onCheckedChange={(checked) =>
                          setPermissions(prev => ({ ...prev, [perm.key]: checked }))
                        }
                        className="scale-90"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === "complete" && (
              <div className="py-6 space-y-6 text-center animate-in zoom-in-95">
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto ring-8 ring-green-50 dark:ring-green-900/10">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-bold">Invitation Sent!</p>
                  <p className="text-sm text-muted-foreground">
                    We've sent an invite to <span className="font-semibold text-foreground">{email}</span>.
                  </p>
                </div>

                <Card className="p-4 bg-muted/50 border-dashed border-2">
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">Direct Invitation Link</p>
                    <div className="flex gap-2">
                      <Input value={inviteLink} readOnly className="h-9 text-xs bg-background" />
                      <Button size="sm" variant="outline" className="h-9 px-3" onClick={handleCopyLink}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>

                <div className="flex flex-col sm:flex-row gap-2 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => {
                    setStep("details");
                    setName('');
                    setEmail('');
                    setPhone('');
                  }}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Invite Another
                  </Button>
                  <Button className="flex-1" onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ResponsiveDialogBody>

        {step !== "complete" && (
          <ResponsiveDialogFooter className="p-3 border-t bg-muted/20">
            <div className="flex w-full items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => step === "permissions" ? setStep("details") : onOpenChange(false)}
                disabled={isInviting}
                className="h-8 px-3 text-xs"
              >
                {step === "permissions" ? "Back" : "Cancel"}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (step === "details") setStep("permissions");
                  else handleSave();
                }}
                disabled={!name.trim() || !email.trim() || isInviting}
                className="min-w-[120px] h-8 text-xs shadow-sm"
              >
                {isInviting && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                {isEditing ? 'Save Changes' : step === "details" ? (
                  <>
                    Next
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </>
                ) : 'Send Invite'}
              </Button>
            </div>
          </ResponsiveDialogFooter>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
