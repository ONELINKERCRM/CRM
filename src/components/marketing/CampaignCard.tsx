import { 
  Mail, 
  MessageSquare, 
  Phone, 
  Layers, 
  Calendar, 
  Users, 
  MoreVertical,
  Play,
  Pause,
  Copy,
  Pencil,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface Campaign {
  id: string;
  name: string;
  type: "email" | "sms" | "whatsapp" | "multi-channel";
  status: "active" | "scheduled" | "completed" | "paused" | "draft";
  targetAudience: string;
  leadsCount: number;
  startDate: string;
  endDate?: string;
  stats?: {
    sent?: number;
    delivered?: number;
    opened?: number;
    clicked?: number;
    failed?: number;
  };
}

interface CampaignCardProps {
  campaign: Campaign;
  onView: (campaign: Campaign) => void;
  onEdit: (campaign: Campaign) => void;
  onDuplicate: (campaign: Campaign) => void;
  onToggleStatus: (campaign: Campaign) => void;
  onDelete: (campaign: Campaign) => void;
}

const typeIcons = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: Phone,
  "multi-channel": Layers,
};

const typeLabels = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
  "multi-channel": "Multi-channel",
};

const statusConfig = {
  active: { 
    label: "Active", 
    className: "bg-success/10 text-success border-success/20",
    icon: Play
  },
  scheduled: { 
    label: "Scheduled", 
    className: "bg-info/10 text-info border-info/20",
    icon: Clock
  },
  completed: { 
    label: "Completed", 
    className: "bg-muted text-muted-foreground border-border",
    icon: CheckCircle
  },
  paused: { 
    label: "Paused", 
    className: "bg-warning/10 text-warning border-warning/20",
    icon: Pause
  },
  draft: { 
    label: "Draft", 
    className: "bg-secondary text-secondary-foreground border-border",
    icon: AlertCircle
  },
};

export function CampaignCard({
  campaign,
  onView,
  onEdit,
  onDuplicate,
  onToggleStatus,
  onDelete,
}: CampaignCardProps) {
  const TypeIcon = typeIcons[campaign.type];
  const status = statusConfig[campaign.status];
  const StatusIcon = status.icon;

  return (
    <Card className="card-hover group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Type Icon */}
            <div className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0",
              campaign.type === "email" && "bg-primary/10 text-primary",
              campaign.type === "sms" && "bg-info/10 text-info",
              campaign.type === "whatsapp" && "bg-success/10 text-success",
              campaign.type === "multi-channel" && "bg-warning/10 text-warning"
            )}>
              <TypeIcon className="h-5 w-5" />
            </div>

            {/* Campaign Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground truncate">
                  {campaign.name}
                </h3>
                <Badge variant="outline" className={cn("text-xs", status.className)}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5" />
                  {typeLabels[campaign.type]}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {campaign.leadsCount.toLocaleString()} leads
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(campaign.startDate).toLocaleDateString()}
                  {campaign.endDate && ` - ${new Date(campaign.endDate).toLocaleDateString()}`}
                </span>
              </div>

              <p className="text-sm text-muted-foreground mt-1">
                Target: {campaign.targetAudience}
              </p>

              {/* Stats */}
              {campaign.stats && (
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                  {campaign.stats.sent !== undefined && (
                    <div className="text-center">
                      <p className="text-lg font-semibold text-foreground">{campaign.stats.sent}</p>
                      <p className="text-xs text-muted-foreground">Sent</p>
                    </div>
                  )}
                  {campaign.stats.delivered !== undefined && (
                    <div className="text-center">
                      <p className="text-lg font-semibold text-success">{campaign.stats.delivered}</p>
                      <p className="text-xs text-muted-foreground">Delivered</p>
                    </div>
                  )}
                  {campaign.stats.opened !== undefined && (
                    <div className="text-center">
                      <p className="text-lg font-semibold text-info">{campaign.stats.opened}</p>
                      <p className="text-xs text-muted-foreground">Opened</p>
                    </div>
                  )}
                  {campaign.stats.clicked !== undefined && (
                    <div className="text-center">
                      <p className="text-lg font-semibold text-primary">{campaign.stats.clicked}</p>
                      <p className="text-xs text-muted-foreground">Clicked</p>
                    </div>
                  )}
                  {campaign.stats.failed !== undefined && campaign.stats.failed > 0 && (
                    <div className="text-center">
                      <p className="text-lg font-semibold text-destructive">{campaign.stats.failed}</p>
                      <p className="text-xs text-muted-foreground">Failed</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 smooth">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onView(campaign)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(campaign)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(campaign)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onToggleStatus(campaign)}>
                {campaign.status === "active" ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(campaign)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
