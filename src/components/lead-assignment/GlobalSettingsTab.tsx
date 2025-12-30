import { useState } from "react";
import { 
  Settings, 
  Moon, 
  Users, 
  Shield, 
  Clock, 
  AlertTriangle,
  Bell,
  Copy,
  ExternalLink,
  Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export const GlobalSettingsTab = () => {
  // Default Assignment Method
  const [defaultMethod, setDefaultMethod] = useState("roundrobin");
  
  // After Hours Settings
  const [afterHoursAction, setAfterHoursAction] = useState("nightteam");
  const [workingHoursStart, setWorkingHoursStart] = useState("09:00");
  const [workingHoursEnd, setWorkingHoursEnd] = useState("18:00");
  
  // Agent Availability
  const [autoOfflineEnabled, setAutoOfflineEnabled] = useState(true);
  const [autoOfflineMinutes, setAutoOfflineMinutes] = useState("30");
  
  // Limits
  const [maxLeadsPerDay, setMaxLeadsPerDay] = useState("50");
  
  // Lead Forwarding
  const [forwardToApi, setForwardToApi] = useState(false);
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [copyToManager, setCopyToManager] = useState(true);
  
  // Duplicate Handling
  const [duplicateAction, setDuplicateAction] = useState("previousAgent");
  
  // Auto Reassignment
  const [autoReassignEnabled, setAutoReassignEnabled] = useState(true);
  const [autoReassignMinutes, setAutoReassignMinutes] = useState("30");
  
  // SLA Rules
  const [slaEnabled, setSlaEnabled] = useState(true);
  const [slaNotifyMinutes, setSlaNotifyMinutes] = useState("15");
  const [escalationEnabled, setEscalationEnabled] = useState(true);

  const handleSave = () => {
    toast.success("Global settings saved successfully");
  };

  return (
    <div className="space-y-6">
      {/* Default Assignment Method */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Default Assignment Method</CardTitle>
          </div>
          <CardDescription>
            Choose how leads are assigned when no specific rules match
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={defaultMethod} onValueChange={setDefaultMethod}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="roundrobin">Round Robin</SelectItem>
              <SelectItem value="campaign">Campaign Rules</SelectItem>
              <SelectItem value="manual">Manual Assignment</SelectItem>
              <SelectItem value="weighted">Weighted Distribution</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* After Hours Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">After Hours Rules</CardTitle>
          </div>
          <CardDescription>
            Configure how leads are handled outside working hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Working Hours Start</Label>
              <Input
                type="time"
                value={workingHoursStart}
                onChange={(e) => setWorkingHoursStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Working Hours End</Label>
              <Input
                type="time"
                value={workingHoursEnd}
                onChange={(e) => setWorkingHoursEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>After Hours Action</Label>
            <Select value={afterHoursAction} onValueChange={setAfterHoursAction}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nightteam">Assign to Night Team</SelectItem>
                <SelectItem value="autoreply">Send Auto Reply Only</SelectItem>
                <SelectItem value="hold">Hold Until Next Morning</SelectItem>
                <SelectItem value="oncall">Assign to On-Call Agent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Agent Availability */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Agent Availability Tracking</CardTitle>
          </div>
          <CardDescription>
            Automatically manage agent online/offline status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-mark Offline</Label>
              <p className="text-sm text-muted-foreground">
                Automatically mark agents as offline if inactive
              </p>
            </div>
            <Switch
              checked={autoOfflineEnabled}
              onCheckedChange={setAutoOfflineEnabled}
            />
          </div>

          {autoOfflineEnabled && (
            <div className="space-y-2">
              <Label>Inactive Duration (minutes)</Label>
              <Select value={autoOfflineMinutes} onValueChange={setAutoOfflineMinutes}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <Label>Maximum Leads per Agent per Day</Label>
            <Input
              type="number"
              value={maxLeadsPerDay}
              onChange={(e) => setMaxLeadsPerDay(e.target.value)}
              className="w-full sm:w-32"
            />
            <p className="text-xs text-muted-foreground">
              System-wide limit regardless of individual agent settings
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Lead Forwarding */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Lead Forwarding Settings</CardTitle>
          </div>
          <CardDescription>
            Forward leads to external systems or managers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Forward to External API</Label>
              <p className="text-sm text-muted-foreground">
                Send lead data to an external webhook
              </p>
            </div>
            <Switch
              checked={forwardToApi}
              onCheckedChange={setForwardToApi}
            />
          </div>

          {forwardToApi && (
            <div className="space-y-2">
              <Label>API Endpoint URL</Label>
              <Input
                type="url"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                placeholder="https://api.example.com/leads"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Send Copy to Manager</Label>
              <p className="text-sm text-muted-foreground">
                Notify manager for every new lead assignment
              </p>
            </div>
            <Switch
              checked={copyToManager}
              onCheckedChange={setCopyToManager}
            />
          </div>
        </CardContent>
      </Card>

      {/* Duplicate Lead Handling */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Duplicate Lead Handling</CardTitle>
          </div>
          <CardDescription>
            Configure how duplicate leads are processed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>When a Duplicate is Detected</Label>
            <Select value={duplicateAction} onValueChange={setDuplicateAction}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="merge">Merge with Existing Lead</SelectItem>
                <SelectItem value="reject">Reject and Notify</SelectItem>
                <SelectItem value="previousAgent">Assign to Previous Agent</SelectItem>
                <SelectItem value="newLead">Create as New Lead</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Auto Reassignment */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Auto-Reassignment</CardTitle>
          </div>
          <CardDescription>
            Automatically reassign uncontacted leads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Auto-Reassignment</Label>
              <p className="text-sm text-muted-foreground">
                Reassign leads if agent doesn't make contact
              </p>
            </div>
            <Switch
              checked={autoReassignEnabled}
              onCheckedChange={setAutoReassignEnabled}
            />
          </div>

          {autoReassignEnabled && (
            <div className="space-y-2">
              <Label>Reassign After (minutes)</Label>
              <Select value={autoReassignMinutes} onValueChange={setAutoReassignMinutes}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="240">4 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SLA Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">SLA Rules</CardTitle>
          </div>
          <CardDescription>
            Service Level Agreement notifications and escalations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable SLA Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Notify manager if agent doesn't act in time
              </p>
            </div>
            <Switch
              checked={slaEnabled}
              onCheckedChange={setSlaEnabled}
            />
          </div>

          {slaEnabled && (
            <>
              <div className="space-y-2">
                <Label>SLA Warning Time (minutes)</Label>
                <Select value={slaNotifyMinutes} onValueChange={setSlaNotifyMinutes}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 min</SelectItem>
                    <SelectItem value="10">10 min</SelectItem>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Escalation Hierarchy</Label>
                  <p className="text-sm text-muted-foreground">
                    Escalate to team lead, then manager if unresolved
                  </p>
                </div>
                <Switch
                  checked={escalationEnabled}
                  onCheckedChange={setEscalationEnabled}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Save Global Settings
        </Button>
      </div>
    </div>
  );
};
