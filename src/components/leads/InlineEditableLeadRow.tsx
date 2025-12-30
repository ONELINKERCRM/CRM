import { useState } from "react";
import { Check, X, Phone, Edit } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StageBadge } from "@/components/ui/stage-badge";
import { GroupBadge } from "@/components/ui/group-badge";
import { useStages } from "@/contexts/StagesContext";
import { cn } from "@/lib/utils";
import type { Lead } from "@/hooks/useLeads";
import { format } from "date-fns";

interface InlineEditableLeadRowProps {
  lead: Lead;
  isSelected: boolean;
  onToggleSelect: () => void;
  onNavigate: () => void;
  onUpdate: (updates: Partial<Lead>) => void;
  getSourceBadgeColor: (source: string) => string;
  agents: string[];
  renderActions: () => React.ReactNode;
}

export function InlineEditableLeadRow({
  lead,
  isSelected,
  onToggleSelect,
  onNavigate,
  onUpdate,
  getSourceBadgeColor,
  agents,
  renderActions,
}: InlineEditableLeadRowProps) {
  const { stages } = useStages();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: lead.name,
    phone: lead.phone || "",
    stage: lead.stage || "New",
    agentName: lead.agent?.name || "",
  });

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditData({
      name: lead.name,
      phone: lead.phone || "",
      stage: lead.stage || "New",
      agentName: lead.agent?.name || "",
    });
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate({
      name: editData.name.trim(),
      phone: editData.phone.trim(),
      stage: editData.stage,
    });
    setIsEditing(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    setEditData({
      name: lead.name,
      phone: lead.phone || "",
      stage: lead.stage || "New",
      agentName: lead.agent?.name || "",
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave(e as unknown as React.MouseEvent);
    } else if (e.key === "Escape") {
      handleCancel(e as unknown as React.MouseEvent);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return dateString;
    }
  };

  if (isEditing) {
    return (
      <TableRow className="bg-primary/5 border-primary/20">
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
          />
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${editData.name}`} />
              <AvatarFallback>{editData.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
            </Avatar>
            <Input
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              onKeyDown={handleKeyDown}
              className="h-8 w-40"
              autoFocus
            />
          </div>
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Input
            value={editData.phone}
            onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
            onKeyDown={handleKeyDown}
            className="h-8 w-36"
          />
        </TableCell>
        <TableCell>
          <Badge variant="outline" className={getSourceBadgeColor(lead.source || "")}>
            {lead.source || "Unknown"}
          </Badge>
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Select
            value={editData.stage}
            onValueChange={(value) => setEditData({ ...editData, stage: value })}
          >
            <SelectTrigger className="h-8 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.name}>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    {stage.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Select
            value={editData.agentName}
            onValueChange={(value) => setEditData({ ...editData, agentName: value })}
          >
            <SelectTrigger className="h-8 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {agents.map((agent) => (
                <SelectItem key={agent} value={agent}>
                  {agent}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">{formatDate(lead.created_at)}</TableCell>
        <TableCell>
        {lead.lead_group ? (
            <GroupBadge 
              groupId={lead.lead_group.id}
              groupName={lead.lead_group.name}
              groupColor={lead.lead_group.color}
              showTooltip
            />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
              onClick={handleSave}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50 smooth group"
      onClick={onNavigate}
    >
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${lead.name}`} />
            <AvatarFallback>{lead.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{lead.name}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-3 w-3 text-muted-foreground" />
          {lead.phone || "-"}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={getSourceBadgeColor(lead.source || "")}>
          {lead.source || "Unknown"}
        </Badge>
      </TableCell>
      <TableCell>
        <StageBadge stage={lead.stage || "New"} showTooltip />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={lead.agent?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${lead.agent?.name || 'default'}`} />
            <AvatarFallback>{lead.agent?.name?.[0] || "?"}</AvatarFallback>
          </Avatar>
          <span className="text-sm">{lead.agent?.name?.split(" ")[0] || "Unassigned"}</span>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{formatDate(lead.created_at)}</TableCell>
      <TableCell>
        {lead.lead_group ? (
          <GroupBadge 
            groupId={lead.lead_group.id}
            groupName={lead.lead_group.name}
            groupColor={lead.lead_group.color}
            showTooltip
          />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleStartEdit}
            title="Quick edit"
          >
            <Edit className="h-4 w-4" />
          </Button>
          {renderActions()}
        </div>
      </TableCell>
    </TableRow>
  );
}
