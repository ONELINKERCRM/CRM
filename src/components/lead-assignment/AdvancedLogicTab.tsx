import { useState } from "react";
import { 
  Plus, 
  GripVertical, 
  Trash2, 
  Play, 
  History,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Zap,
  GitBranch
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";

interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface Action {
  id: string;
  type: string;
  value: string;
}

interface LogicRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: Condition[];
  conditionLogic: "and" | "or";
  actions: Action[];
  priority: number;
}

const conditionFields = [
  { value: "source", label: "Source / Campaign" },
  { value: "budget", label: "Budget Range" },
  { value: "city", label: "City" },
  { value: "area", label: "Area / Community" },
  { value: "leadType", label: "Lead Type" },
  { value: "leadScore", label: "Lead Score" },
  { value: "agentAvailability", label: "Agent Availability" },
  { value: "agentPerformance", label: "Agent Performance Score" },
  { value: "language", label: "Lead Language" },
  { value: "timeOfDay", label: "Time of Day" },
  { value: "dayOfWeek", label: "Day of Week (Weekend)" },
  { value: "isDuplicate", label: "Duplicate Lead Detection" },
  { value: "propertyType", label: "Property Type Required" }
];

const operators = [
  { value: "equals", label: "Equals" },
  { value: "notEquals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "greaterThan", label: "Greater Than" },
  { value: "lessThan", label: "Less Than" },
  { value: "between", label: "Between" },
  { value: "in", label: "Is One Of" }
];

const actionTypes = [
  { value: "assignAgent", label: "Assign to Specific Agent" },
  { value: "assignTeam", label: "Assign to Team" },
  { value: "roundRobin", label: "Assign using Round Robin" },
  { value: "weighted", label: "Assign using Weighted Logic" },
  { value: "unassigned", label: "Move to Unassigned Pool" },
  { value: "notifyEmail", label: "Notify via Email" },
  { value: "notifyWhatsApp", label: "Notify via WhatsApp" },
  { value: "notifyPush", label: "Send Push Notification" },
  { value: "autoMessage", label: "Auto-send Welcome Message" },
  { value: "autoTag", label: "Auto-tag the Lead" },
  { value: "changeStage", label: "Auto-change Lead Stage" },
  { value: "createTask", label: "Auto-create Follow-up Task" },
  { value: "updateField", label: "Update Custom Field" },
  { value: "forwardPartner", label: "Forward to Partner" }
];

const initialRules: LogicRule[] = [
  {
    id: "1",
    name: "High Budget VIP Treatment",
    enabled: true,
    conditions: [
      { id: "c1", field: "budget", operator: "greaterThan", value: "5000000" },
      { id: "c2", field: "leadScore", operator: "greaterThan", value: "80" }
    ],
    conditionLogic: "and",
    actions: [
      { id: "a1", type: "assignTeam", value: "VIP Team" },
      { id: "a2", type: "autoTag", value: "VIP, High-Value" },
      { id: "a3", type: "notifyEmail", value: "Sales Manager" }
    ],
    priority: 1
  },
  {
    id: "2",
    name: "After Hours Auto-Reply",
    enabled: true,
    conditions: [
      { id: "c1", field: "timeOfDay", operator: "between", value: "18:00-09:00" }
    ],
    conditionLogic: "and",
    actions: [
      { id: "a1", type: "autoMessage", value: "After hours template" },
      { id: "a2", type: "assignTeam", value: "Night Team" }
    ],
    priority: 2
  },
  {
    id: "3",
    name: "Duplicate Lead Handler",
    enabled: true,
    conditions: [
      { id: "c1", field: "isDuplicate", operator: "equals", value: "true" }
    ],
    conditionLogic: "and",
    actions: [
      { id: "a1", type: "autoTag", value: "Duplicate" },
      { id: "a2", type: "notifyEmail", value: "Original Agent" }
    ],
    priority: 3
  }
];

export const AdvancedLogicTab = () => {
  const [rules, setRules] = useState<LogicRule[]>(initialRules);
  const [expandedRules, setExpandedRules] = useState<string[]>(["1"]);

  const toggleRuleExpanded = (id: string) => {
    setExpandedRules(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const toggleRuleEnabled = (id: string) => {
    setRules(rules.map(r => 
      r.id === id ? { ...r, enabled: !r.enabled } : r
    ));
    toast.success("Rule updated");
  };

  const handleDeleteRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
    toast.success("Rule deleted");
  };

  const addCondition = (ruleId: string) => {
    setRules(rules.map(r => {
      if (r.id === ruleId) {
        const newCondition: Condition = {
          id: `c${Date.now()}`,
          field: "source",
          operator: "equals",
          value: ""
        };
        return { ...r, conditions: [...r.conditions, newCondition] };
      }
      return r;
    }));
  };

  const updateCondition = (ruleId: string, conditionId: string, field: string, value: string) => {
    setRules(rules.map(r => {
      if (r.id === ruleId) {
        return {
          ...r,
          conditions: r.conditions.map(c => 
            c.id === conditionId ? { ...c, [field]: value } : c
          )
        };
      }
      return r;
    }));
  };

  const removeCondition = (ruleId: string, conditionId: string) => {
    setRules(rules.map(r => {
      if (r.id === ruleId) {
        return { ...r, conditions: r.conditions.filter(c => c.id !== conditionId) };
      }
      return r;
    }));
  };

  const addAction = (ruleId: string) => {
    setRules(rules.map(r => {
      if (r.id === ruleId) {
        const newAction: Action = {
          id: `a${Date.now()}`,
          type: "assignAgent",
          value: ""
        };
        return { ...r, actions: [...r.actions, newAction] };
      }
      return r;
    }));
  };

  const updateAction = (ruleId: string, actionId: string, field: string, value: string) => {
    setRules(rules.map(r => {
      if (r.id === ruleId) {
        return {
          ...r,
          actions: r.actions.map(a => 
            a.id === actionId ? { ...a, [field]: value } : a
          )
        };
      }
      return r;
    }));
  };

  const removeAction = (ruleId: string, actionId: string) => {
    setRules(rules.map(r => {
      if (r.id === ruleId) {
        return { ...r, actions: r.actions.filter(a => a.id !== actionId) };
      }
      return r;
    }));
  };

  const toggleConditionLogic = (ruleId: string) => {
    setRules(rules.map(r => {
      if (r.id === ruleId) {
        return { ...r, conditionLogic: r.conditionLogic === "and" ? "or" : "and" };
      }
      return r;
    }));
  };

  const addNewRule = () => {
    const newId = String(Math.max(...rules.map(r => parseInt(r.id))) + 1);
    const newRule: LogicRule = {
      id: newId,
      name: "New Logic Rule",
      enabled: false,
      conditions: [{ id: "c1", field: "source", operator: "equals", value: "" }],
      conditionLogic: "and",
      actions: [{ id: "a1", type: "assignAgent", value: "" }],
      priority: rules.length + 1
    };
    setRules([...rules, newRule]);
    setExpandedRules([...expandedRules, newId]);
    toast.success("New rule created");
  };

  const handleSimulation = () => {
    toast.info("Opening simulation mode to test rules...");
  };

  const handleViewHistory = () => {
    toast.info("Opening rule version history...");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <BrainCircuit className="h-5 w-5" />
            Advanced Logic Engine
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Build complex IF/THEN rules with nested conditions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleViewHistory} className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Version History</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleSimulation} className="gap-2">
            <Play className="h-4 w-4" />
            <span className="hidden sm:inline">Simulate</span>
          </Button>
          <Button size="sm" onClick={addNewRule} className="gap-2">
            <Plus className="h-4 w-4" />
            New Rule
          </Button>
        </div>
      </div>

      {/* Conflict Warning */}
      {rules.filter(r => r.enabled).length > 3 && (
        <Card className="bg-warning/10 border-warning/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Potential Rule Conflicts</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Multiple active rules may overlap. Use simulation mode to test priority order.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <Card key={rule.id} className={!rule.enabled ? "opacity-60" : ""}>
            <Collapsible 
              open={expandedRules.includes(rule.id)}
              onOpenChange={() => toggleRuleExpanded(rule.id)}
            >
              <CardHeader className="p-4">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab hidden sm:block" />
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      {expandedRules.includes(rule.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="font-mono text-xs">
                        #{rule.priority}
                      </Badge>
                      <Input
                        value={rule.name}
                        onChange={(e) => {
                          setRules(rules.map(r => 
                            r.id === rule.id ? { ...r, name: e.target.value } : r
                          ));
                        }}
                        className="h-7 text-sm font-medium border-transparent hover:border-border focus:border-border max-w-xs"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {rule.conditions.length} condition{rule.conditions.length !== 1 ? "s" : ""} → {rule.actions.length} action{rule.actions.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={() => toggleRuleEnabled(rule.id)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDeleteRule(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CollapsibleContent>
                <CardContent className="pt-0 space-y-6">
                  {/* IF Conditions */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        IF
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => toggleConditionLogic(rule.id)}
                      >
                        {rule.conditionLogic.toUpperCase()}
                      </Button>
                    </div>

                    <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                      {rule.conditions.map((condition, index) => (
                        <div key={condition.id} className="flex flex-wrap items-center gap-2">
                          {index > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {rule.conditionLogic.toUpperCase()}
                            </Badge>
                          )}
                          <Select
                            value={condition.field}
                            onValueChange={(value) => updateCondition(rule.id, condition.id, "field", value)}
                          >
                            <SelectTrigger className="w-40 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {conditionFields.map((f) => (
                                <SelectItem key={f.value} value={f.value}>
                                  {f.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={condition.operator}
                            onValueChange={(value) => updateCondition(rule.id, condition.id, "operator", value)}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {operators.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={condition.value}
                            onChange={(e) => updateCondition(rule.id, condition.id, "value", e.target.value)}
                            placeholder="Value"
                            className="w-32 h-8 text-xs"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeCondition(rule.id, condition.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => addCondition(rule.id)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Condition
                      </Button>
                    </div>
                  </div>

                  {/* THEN Actions */}
                  <div className="space-y-3">
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                      THEN
                    </Badge>

                    <div className="space-y-2 pl-4 border-l-2 border-success/20">
                      {rule.actions.map((action, index) => (
                        <div key={action.id} className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {index + 1}
                          </Badge>
                          <Select
                            value={action.type}
                            onValueChange={(value) => updateAction(rule.id, action.id, "type", value)}
                          >
                            <SelectTrigger className="w-48 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {actionTypes.map((a) => (
                                <SelectItem key={a.value} value={a.value}>
                                  {a.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={action.value}
                            onChange={(e) => updateAction(rule.id, action.id, "value", e.target.value)}
                            placeholder="Value"
                            className="w-40 h-8 text-xs"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeAction(rule.id, action.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => addAction(rule.id)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Action
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {rules.length === 0 && (
        <Card className="p-8 text-center">
          <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium">No Advanced Logic Rules</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create IF/THEN rules to automate complex lead assignments.
          </p>
          <Button className="mt-4" onClick={addNewRule}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Rule
          </Button>
        </Card>
      )}
    </div>
  );
};

const BrainCircuit = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4.5a2.5 2.5 0 0 0-4.96-.46 2.5 2.5 0 0 0-1.98 3 2.5 2.5 0 0 0-1.32 4.24 3 3 0 0 0 .34 5.58 2.5 2.5 0 0 0 2.96 3.08 2.5 2.5 0 0 0 4.91.05L12 20V4.5Z"/>
    <path d="M16 8V5c0-1.1.9-2 2-2"/>
    <path d="M12 13h4"/>
    <path d="M12 18h6a2 2 0 0 1 2 2v1"/>
    <path d="M12 8h8"/>
    <path d="M20.5 8a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z"/>
    <path d="M16.5 13a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z"/>
    <path d="M20.5 21a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z"/>
    <path d="M18.5 3a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z"/>
  </svg>
);
