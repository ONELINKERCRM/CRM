import { useState, useEffect } from "react";
import { Phone, Mail, Clock, ChevronRight, User, MoreVertical, Eye, UserPlus, GitBranch, Trash2, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StageBadge } from "@/components/ui/stage-badge";
import { SourceBadge } from "@/components/ui/source-badge";
import { GroupBadge } from "@/components/ui/group-badge";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import type { Lead } from "@/hooks/useLeads";

interface MobileLeadCardProps {
  lead: Lead;
  isSelected: boolean;
  isSelectionMode: boolean;
  onSelect: () => void;
  onClick: () => void;
  onLongPressStart: () => void;
  onLongPressEnd: () => void;
  onViewDetails: () => void;
  onAssign: () => void;
  onChangeStage: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
  companySettings?: {
    new_lead_badge_color?: string | null;
    new_lead_background_color?: string | null;
    new_lead_animation?: string | null;
  };
}

export function MobileLeadCard({
  lead,
  isSelected,
  isSelectionMode,
  onSelect,
  onClick,
  onLongPressStart,
  onLongPressEnd,
  onViewDetails,
  onAssign,
  onChangeStage,
  onDelete,
  canDelete = false,
  companySettings,
}: MobileLeadCardProps) {
  const [showAnimation, setShowAnimation] = useState(lead.is_new);

  useEffect(() => {
    if (lead.is_new && companySettings?.new_lead_animation !== 'none') {
      const timer = setTimeout(() => setShowAnimation(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [lead.is_new, companySettings?.new_lead_animation]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getTimeAgo = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "-";
    }
  };

  // Dynamic styles for new leads
  const isNewLead = lead.is_new;
  const backgroundColor = isNewLead && companySettings?.new_lead_background_color
    ? companySettings.new_lead_background_color
    : undefined;
  const badgeColor = isNewLead && companySettings?.new_lead_badge_color
    ? companySettings.new_lead_badge_color
    : undefined;
  const animationClass = isNewLead && showAnimation && companySettings?.new_lead_animation === 'glow'
    ? 'animate-pulse'
    : isNewLead && showAnimation && companySettings?.new_lead_animation === 'fade'
    ? 'animate-fade-in'
    : '';

  return (
    <div
      className={cn(
        "relative bg-card rounded-xl border border-border/60 overflow-hidden transition-all duration-200",
        "active:scale-[0.98] shadow-subtle hover:shadow-elevated",
        isSelected && "border-primary bg-primary/5 shadow-md",
        animationClass
      )}
      style={backgroundColor ? { backgroundColor } : undefined}
      onClick={onClick}
      onTouchStart={onLongPressStart}
      onTouchEnd={onLongPressEnd}
      onTouchMove={onLongPressEnd}
      onMouseDown={onLongPressStart}
      onMouseUp={onLongPressEnd}
      onMouseLeave={onLongPressEnd}
    >
      {/* New Lead Indicator Bar */}
      {isNewLead && (
        <div 
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ backgroundColor: badgeColor || 'hsl(var(--primary))' }}
        />
      )}

      <div className="px-3 py-2.5">
        {/* Top Row: Avatar, Name, Actions */}
        <div className="flex items-start gap-3">
          {/* Selection Checkbox */}
          {isSelectionMode && (
            <div className="flex-shrink-0 pt-1" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isSelected}
                onCheckedChange={onSelect}
                className="h-5 w-5"
              />
            </div>
          )}

          {/* Avatar with Stage Color Ring */}
          <div className="relative flex-shrink-0">
            <Avatar className="h-9 w-9 ring-[1.5px] ring-offset-1 ring-offset-background" style={{ 
              ['--tw-ring-color' as string]: lead.lead_stage?.color || 'hsl(var(--primary))' 
            }}>
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${lead.name}&backgroundColor=3b82f6`} />
              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                {getInitials(lead.name)}
              </AvatarFallback>
            </Avatar>
            {/* Online indicator for new leads */}
            {isNewLead && (
              <span 
                className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card animate-pulse"
                style={{ backgroundColor: badgeColor || 'hsl(var(--primary))' }}
              />
            )}
          </div>

          {/* Lead Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className={cn(
                "text-sm truncate",
                isNewLead ? "font-bold text-foreground" : "font-medium text-foreground"
              )}>
                {lead.name}
              </h3>
              {isNewLead && (
                <Badge 
                  variant="secondary" 
                  className="text-[9px] px-1 py-0 font-bold uppercase tracking-wide flex-shrink-0"
                  style={badgeColor ? { backgroundColor: badgeColor, color: 'white' } : undefined}
                >
                  New
                </Badge>
              )}
            </div>
            
            {/* Contact Info */}
            <div className="flex items-center gap-2 mt-0.5">
              {lead.phone && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Phone className="h-2.5 w-2.5" />
                  <span className="truncate max-w-[100px]">{lead.phone}</span>
                </span>
              )}
              {lead.email && !lead.phone && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Mail className="h-2.5 w-2.5" />
                  <span className="truncate max-w-[120px]">{lead.email}</span>
                </span>
              )}
            </div>
          </div>

          {/* Actions Menu */}
          {!isSelectionMode && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 -mt-1 -mr-1">
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetails(); }}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                {lead.phone && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(`tel:${lead.phone}`); }}>
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </DropdownMenuItem>
                )}
                {lead.phone && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`); }}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAssign(); }}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign Agent
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onChangeStage(); }}>
                  <GitBranch className="h-4 w-4 mr-2" />
                  Change Stage
                </DropdownMenuItem>
                {canDelete && onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Middle Row: Badges */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <StageBadge 
            stage={lead.stage || "New"} 
            stageColor={lead.lead_stage?.color}
            className="text-[10px] px-1.5 py-0" 
          />
          <SourceBadge source={lead.source || "Direct"} className="text-[10px] px-1.5 py-0" />
          {lead.lead_group && (
            <GroupBadge
              groupId={lead.lead_group.id}
              groupName={lead.lead_group.name}
              groupColor={lead.lead_group.color}
              className="text-[10px] px-1.5 py-0"
            />
          )}
        </div>

        {/* Bottom Row: Meta Info */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
          {/* Agent */}
          <div className="flex items-center gap-1.5">
            {lead.agent ? (
              <>
                <Avatar className="h-5 w-5">
                  <AvatarImage src={lead.agent.avatar_url || undefined} />
                  <AvatarFallback className="text-[9px] bg-muted">
                    {lead.agent.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[11px] text-muted-foreground truncate max-w-[70px]">
                  {lead.agent.name}
                </span>
              </>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <User className="h-2.5 w-2.5" />
                Unassigned
              </span>
            )}
          </div>

          {/* Time */}
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-2.5 w-2.5" />
            <span>{lead.received_at ? getTimeAgo(lead.received_at) : getTimeAgo(lead.created_at)}</span>
          </div>

          {/* Navigate Arrow */}
          {!isSelectionMode && (
            <ChevronRight className="h-4 w-4 text-muted-foreground -mr-1" />
          )}
        </div>
      </div>
    </div>
  );
}
