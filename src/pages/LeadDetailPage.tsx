import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageSquare,
  DollarSign,
  User,
  Edit2,
  Trash2,
  Plus,
  Paperclip,
  Mic,
  PhoneCall,
  MessageCircle,
  MailIcon,
  StickyNote,
  GitBranch,
  CalendarPlus,
  CheckCircle,
  Pause,
  FileText,
  ChevronDown,
  ChevronRight,
  Merge,
  Upload,
  Zap,
  Facebook,
  Link2,
  Settings,
  Loader2,
  Calendar,
  Clock,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StageBadge } from "@/components/ui/stage-badge";
import { GroupBadge } from "@/components/ui/group-badge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import { useStages } from "@/contexts/StagesContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ActivityTimeline } from "@/components/leads/ActivityTimeline";
import { LeadDetailFAB } from "@/components/leads/LeadDetailFAB";
import { useLeadActivities, LeadInfo } from "@/hooks/useLeadActivities";
import { useLead } from "@/hooks/useLead";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { LeadDetailSkeleton } from "@/components/ui/page-skeletons";
import { LeadGroupSelector } from "@/components/leads/LeadGroupSelector";
import { LeadAssignedSelector } from "@/components/leads/LeadAssignedSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useLocalization } from "@/contexts/LocalizationContext";

const timelineIcons: Record<string, any> = {
  call: PhoneCall,
  email: MailIcon,
  whatsapp: MessageCircle,
  note: StickyNote,
  stage: GitBranch,
  followup: CalendarPlus,
  task: CheckCircle,
  voicenote: Mic,
  automation: Zap,
  attachment: Paperclip,
};

export default function LeadDetailPage() {
  const { t } = useLocalization();

  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { stages } = useStages();
  const { profile } = useAuth();

  // Fetch lead data from database
  const { lead, isLoading: isLoadingLead, error: leadError, refetch } = useLead(id);

  const [currentStage, setCurrentStage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceCaption, setVoiceCaption] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "activity">("details");
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    form: true,
    tracking: false,
  });
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSavingVoice, setIsSavingVoice] = useState(false);

  // Dialog states for FAB
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showAttachmentDialog, setShowAttachmentDialog] = useState(false);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [showFollowupDialog, setShowFollowupDialog] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Create lead info for activities hook
  const leadInfo = lead ? {
    id: lead.id,
    name: lead.name,
    created_at: lead.created_at,
    source: lead.source,
    assigned_agent_id: lead.assigned_agent_id,
    agent: lead.agent,
  } : null;

  // Use realtime activities hook with lead info for system activities
  const { activities: realtimeActivities, isLoading: isLoadingActivities, addActivity, refetch: refetchActivities } = useLeadActivities(id || "", leadInfo);

  // Timer for recording
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  // Track previous stage to detect changes
  const previousStageRef = useRef<string | null>(null);

  // Initialize currentStage from lead data (prefer stage_id, fallback to stage text for backwards compatibility)
  useEffect(() => {
    if (lead && !currentStage) {
      const stageId = lead.stage_id || lead.lead_stage?.id || lead.stage;
      if (stageId) {
        setCurrentStage(stageId);
        previousStageRef.current = stageId;
      }
    }
  }, [lead?.stage_id, lead?.lead_stage?.id, lead?.stage]);

  // Handle stage change - update database and log activity
  useEffect(() => {
    const updateStage = async () => {
      if (!lead || !currentStage || !previousStageRef.current) return;
      if (currentStage === previousStageRef.current) return;

      const oldStageName = stages.find(s => s.id === previousStageRef.current)?.name || previousStageRef.current;
      const newStageName = stages.find(s => s.id === currentStage)?.name || currentStage;

      // Update both stage_id (FK) and stage (text) for backwards compatibility
      const { error } = await supabase
        .from("leads")
        .update({
          stage_id: currentStage,
          stage: newStageName // Keep text field in sync for backwards compatibility
        })
        .eq("id", lead.id);

      if (error) {
        console.error("Error updating stage:", error);
        toast.error("Failed to update stage");
        setCurrentStage(previousStageRef.current);
        return;
      }

      // Log the stage change as an activity
      await addActivity(
        "stage",
        `Stage changed to ${newStageName}`,
        `From "${oldStageName}" to "${newStageName}"`,
        lead.agent?.name || "System"
      );

      previousStageRef.current = currentStage;
      toast.success(`Stage updated to ${newStageName}`);
    };

    updateStage();
  }, [currentStage, lead, stages, addActivity]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetch(), refetchActivities()]);
    toast.success("Lead refreshed");
  }, [refetch, refetchActivities]);

  const handleAddRealtimeNote = async (noteText: string, files?: File[]): Promise<boolean> => {
    const success = await addActivity(
      "note",
      "Note Added",
      noteText,
      lead?.agent?.name || "Agent",
      undefined,
      files
    );
    return success;
  };

  const handleAddAttachment = async (description: string, files: File[]): Promise<boolean> => {
    const success = await addActivity(
      "attachment",
      "Files Attached",
      description || `${files.length} file(s) attached`,
      lead?.agent?.name || "Agent",
      undefined,
      files
    );
    return success;
  };

  const handleAddMeeting = async (title: string, date: string, time: string, location: string, notes: string): Promise<boolean> => {
    if (!lead || !profile?.company_id) return false;

    const dateTimeStr = time ? `${date} at ${time}` : date;
    const description = [
      `Scheduled for ${dateTimeStr}`,
      location && `Location: ${location}`,
      notes && `Notes: ${notes}`,
    ].filter(Boolean).join('\n');

    try {
      // Create due_date from date and time
      const dueDate = time ? new Date(`${date}T${time}`) : new Date(date);

      // Save to lead_followups table for dashboard tracking
      const { error: followupError } = await supabase
        .from('lead_followups')
        .insert({
          lead_id: lead.id,
          company_id: profile.company_id,
          title: `Meeting: ${title}`,
          description: description,
          due_date: dueDate.toISOString(),
          status: 'pending',
          priority: 'medium',
          created_by: profile.id,
        });

      if (followupError) {
        console.error("Error saving meeting:", followupError);
        toast.error("Failed to schedule meeting");
        return false;
      }

      // Also add as activity for timeline
      const success = await addActivity(
        "meeting",
        title,
        description,
        lead?.agent?.name || "Agent"
      );

      toast.success("Meeting scheduled successfully");
      return success;
    } catch (error) {
      console.error("Error adding meeting:", error);
      toast.error("Failed to schedule meeting");
      return false;
    }
  };

  const handleAddFollowup = async (title: string, date: string, time: string, priority: string, notes: string): Promise<boolean> => {
    if (!lead || !profile?.company_id) return false;

    const dateTimeStr = time ? `${date} at ${time}` : date;
    const description = [
      `Due: ${dateTimeStr}`,
      `Priority: ${priority}`,
      notes && `Notes: ${notes}`,
    ].filter(Boolean).join('\n');

    try {
      // Create due_date from date and time
      const dueDate = time ? new Date(`${date}T${time}`) : new Date(date);

      // Save to lead_followups table for dashboard tracking
      const { error: followupError } = await supabase
        .from('lead_followups')
        .insert({
          lead_id: lead.id,
          company_id: profile.company_id,
          title: title,
          description: notes || '',
          due_date: dueDate.toISOString(),
          status: 'pending',
          priority: priority,
          created_by: profile.id,
        });

      if (followupError) {
        console.error("Error saving follow-up:", followupError);
        toast.error("Failed to create follow-up");
        return false;
      }

      // Also add as activity for timeline
      const success = await addActivity(
        "followup",
        title,
        description,
        lead?.agent?.name || "Agent"
      );

      toast.success("Follow-up created successfully");
      return success;
    } catch (error) {
      console.error("Error adding follow-up:", error);
      toast.error("Failed to create follow-up");
      return false;
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      toast.info("Recording started...");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Could not access microphone. Please allow microphone permissions.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleSaveVoiceNote = async () => {
    if (!audioBlob) {
      toast.error("No recording to save");
      return;
    }

    setIsSavingVoice(true);
    try {
      // Convert blob to file for upload
      const durationStr = `${Math.floor(recordingTime / 60)}:${String(recordingTime % 60).padStart(2, '0')}`;
      const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });

      // Upload voice note file
      const fileName = `${id}/${Date.now()}-voice-note.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('activity-attachments')
        .upload(fileName, audioBlob);

      let audioUrlToSave: string | undefined;
      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage
          .from('activity-attachments')
          .getPublicUrl(uploadData.path);
        audioUrlToSave = urlData.publicUrl;
      }

      // Save voice note as activity with audio URL
      const { error: activityError } = await supabase
        .from("lead_activities")
        .insert({
          lead_id: id,
          type: "voicenote",
          title: "Voice Note Added",
          description: voiceCaption || "Voice note recording",
          agent_name: lead?.agent?.name || "Agent",
          duration: durationStr,
          audio_url: audioUrlToSave,
          attachments: [],
          attachments_count: 0,
        });

      if (activityError) {
        throw activityError;
      }

      toast.success("Voice note saved");
      setShowVoiceModal(false);
      setVoiceCaption("");
      setRecordingTime(0);
      setAudioBlob(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
    } catch (error) {
      console.error("Error saving voice note:", error);
      toast.error("Failed to save voice note");
    } finally {
      setIsSavingVoice(false);
    }
  };

  const handleCancelVoiceModal = () => {
    setShowVoiceModal(false);
    setIsRecording(false);
    setRecordingTime(0);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const SectionHeader = ({
    title,
    section,
    icon: Icon
  }: {
    title: string;
    section: keyof typeof expandedSections;
    icon: any;
  }) => (
    <CollapsibleTrigger className="flex items-center justify-between w-full py-3 hover:bg-muted/50 rounded-lg px-2 -mx-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold text-sm">{title}</span>
      </div>
      {expandedSections[section] ? (
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      )}
    </CollapsibleTrigger>
  );

  // Loading state
  if (isLoadingLead) {
    return <LeadDetailSkeleton isMobile={isMobile} />;
  }
  // Error or not found state
  if (leadError || !lead) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-muted-foreground">Lead not found</p>
        <Button onClick={() => navigate("/leads")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Leads
        </Button>
      </div>
    );
  }

  // Combine form data from multiple sources
  const sourceMetadata = lead.source_metadata as Record<string, any> | null;
  const mappedFields = lead.mapped_fields as Record<string, any> | null;
  const rawFormData = lead.form_data as Record<string, any> | null;

  // Build comprehensive form data object
  const formData: Record<string, any> = {
    // From source_metadata
    ...(sourceMetadata?.platform && { platform: sourceMetadata.platform }),
    ...(sourceMetadata?.page_name && { page_name: sourceMetadata.page_name }),
    ...(sourceMetadata?.form_name && { formName: sourceMetadata.form_name }),
    ...(sourceMetadata?.form_id && { formId: sourceMetadata.form_id }),
    ...(sourceMetadata?.ad_id && { ad_id: sourceMetadata.ad_id }),
    ...(sourceMetadata?.adgroup_id && { adgroup_id: sourceMetadata.adgroup_id }),
    ...(sourceMetadata?.created_time && { submittedAt: sourceMetadata.created_time }),
    ...(sourceMetadata?.webhook && { sync_method: 'Webhook' }),
    // From lead columns
    ...(lead.form_name && { formName: lead.form_name }),
    ...(lead.form_id && { formId: lead.form_id }),
    ...(lead.campaign_name && { campaignName: lead.campaign_name }),
    ...(lead.ad_set_name && { adSetName: lead.ad_set_name }),
    ...(lead.ad_name && { adName: lead.ad_name }),
    ...(lead.fetched_at && { fetchedAt: lead.fetched_at }),
    ...(lead.external_id && { external_id: lead.external_id }),
    // From mapped_fields (actual form field values)
    ...mappedFields,
    // From form_data (legacy)
    ...rawFormData,
  };

  const hasFormData = Object.keys(formData).length > 0;

  const content = (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-20 sm:pb-0 overflow-x-hidden" style={{ touchAction: 'pan-y' }}>
      {/* Top Header */}
      <div className="bg-card border rounded-xl p-3 sm:p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/leads")}
              className="h-9 w-9 rounded-full hover:bg-primary/10 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="font-semibold text-base sm:text-lg">{lead.name}</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Lead Details</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 min-h-[40px] min-w-[40px] rounded-full hover:bg-primary/10 transition-colors"
            >
              <Edit2 className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full hover:bg-primary/10 transition-colors hidden sm:flex"
            >
              <Merge className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full hover:bg-destructive/10 text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Lead
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>


        {/* Tab Navigation - Mobile */}
        <div className="mt-4 lg:hidden">
          <div className="flex bg-muted/50 rounded-lg p-1 gap-1">
            <button
              onClick={() => setActiveTab("details")}
              className={cn(
                "flex-1 py-2.5 px-4 text-sm font-medium rounded-lg transition-all duration-200",
                activeTab === "details"
                  ? "bg-background text-primary shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={cn(
                "flex-1 py-2.5 px-4 text-sm font-medium rounded-lg transition-all duration-200",
                activeTab === "activity"
                  ? "bg-background text-primary shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              Activity
            </button>
          </div>
        </div>
      </div>

      {/* Desktop: Side by Side Layout */}
      <div className="hidden lg:grid lg:grid-cols-5 gap-6 lg:gap-8">
        {/* Left Column - Lead Information */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Lead Header Card */}
          <Card>
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <Avatar className="h-12 w-12 sm:h-16 sm:w-16 border-2 sm:border-4 border-card shadow-lg flex-shrink-0">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${lead.name}`} />
                  <AvatarFallback className="text-xl">{lead.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold truncate">{lead.name}</h2>
                  {lead.phone && (
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{lead.phone}</span>
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{lead.email}</span>
                    </div>
                  )}
                  {lead.agent && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      <span>Assigned: {lead.agent.name}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <StageBadge stage={lead.stage || "New"} showTooltip />
                    {lead.lead_group && (
                      <GroupBadge
                        groupId={lead.lead_group?.id}
                        groupName={lead.lead_group?.name}
                        groupColor={lead.lead_group?.color}
                        showTooltip
                      />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {lead.agent ? (
                      <Badge variant="secondary" className="text-xs font-medium bg-green-100 text-green-700 border-green-200">
                        Assigned to {lead.agent.name}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs font-medium bg-orange-100 text-orange-700 border-orange-200">
                        Unassigned
                      </Badge>
                    )}
                    {lead.source && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {lead.source}
                      </Badge>
                    )}
                  </div>
                  {lead.tags && lead.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {lead.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                      <Button variant="ghost" size="sm" className="h-5 px-1">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Lead Score */}
              {lead.lead_score !== null && lead.lead_score > 0 && (
                <div className="mt-4 p-3 bg-card/80 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Lead Score</span>
                    <span className="text-sm font-bold text-primary">{lead.lead_score}/100</span>
                  </div>
                  <Progress value={lead.lead_score} className="h-2" />
                </div>
              )}

              {/* Communication Buttons */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={async () => {
                    if (lead.phone) {
                      await addActivity(
                        "call",
                        "Outbound Call",
                        `Called ${lead.phone}`,
                        lead.agent?.name || "Agent"
                      );
                      window.open(`tel:${lead.phone}`);
                    }
                  }}
                  disabled={!lead.phone}
                >
                  <Phone className="h-4 w-4 mr-1.5" />
                  Call
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={async () => {
                    if (lead.phone) {
                      await addActivity(
                        "whatsapp",
                        "WhatsApp Message",
                        `Opened WhatsApp chat with ${lead.phone}`,
                        lead.agent?.name || "Agent"
                      );
                      window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`);
                    }
                  }}
                  disabled={!lead.phone}
                >
                  <MessageSquare className="h-4 w-4 mr-1.5" />
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={async () => {
                    if (lead.email) {
                      await addActivity(
                        "email",
                        "Email Sent",
                        `Opened email to ${lead.email}`,
                        lead.agent?.name || "Agent"
                      );
                      window.open(`mailto:${lead.email}`);
                    }
                  }}
                  disabled={!lead.email}
                >
                  <Mail className="h-4 w-4 mr-1.5" />{t('email')}</Button>
              </div>
            </div>

            <CardContent className="p-4 space-y-4">
              {/* Stage Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Lead Stage</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                    onClick={() => {
                      navigate("/leads");
                      toast.info("Go to Leads page to manage stages");
                    }}
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Manage Stages
                  </Button>
                </div>
                <Select value={currentStage || lead.stage || ""} onValueChange={setCurrentStage}>
                  <SelectTrigger className="h-10">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: stages.find(s => s.id === (currentStage || lead.stage))?.color || "#3B82F6" }}
                      />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: stage.color }}
                          />
                          {stage.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lead Group Selector */}
              <LeadGroupSelector
                leadId={lead.id}
                currentGroupId={lead.lead_group_id}
                agentName={lead.agent?.name}
                onGroupChange={() => refetch()}
              />

              {/* Assigned Agent Selector */}
              <LeadAssignedSelector
                leadId={lead.id}
                currentAgentId={lead.assigned_agent_id}
                currentAgentName={lead.agent?.name}
                onAgentChange={() => refetch()}
              />

              {/* Budget */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Budget (Optional)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="e.g. 2,500,000"
                    defaultValue={lead.budget || ""}
                    className="h-9 pl-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lead Info Card - Dates & Location */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Lead Info</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-1.5 border-b border-dashed">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />{t('created')}</span>
                  <span className="font-medium text-right">
                    <span>{new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span className="text-xs text-muted-foreground ml-1">({formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })})</span>
                  </span>
                </div>
                {lead.last_contacted_at && (
                  <div className="flex items-center justify-between py-1.5 border-b border-dashed">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      Last Contacted
                    </span>
                    <span className="font-medium text-right">
                      <span>{new Date(lead.last_contacted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span className="text-xs text-muted-foreground ml-1">({formatDistanceToNow(new Date(lead.last_contacted_at), { addSuffix: true })})</span>
                    </span>
                  </div>
                )}
                {lead.location && (
                  <div className="flex items-center justify-between py-1.5 border-b border-dashed">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      Location
                    </span>
                    <span className="font-medium">{lead.location}</span>
                  </div>
                )}
                {lead.requirements && (
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-muted-foreground">Requirements</span>
                    <span className="font-medium text-right max-w-[60%] truncate">{lead.requirements}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Details - Form Submission */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Details</span>
              </div>

              {hasFormData ? (
                <div className="space-y-3">
                  {/* Platform Header */}
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/50">
                    <Facebook className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                        {formData.platform === 'meta' ? 'Meta Lead Form' : 'Lead Form'}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-500">
                        {formData.formName || formData.form_name || "Form Submission"}
                      </p>
                    </div>
                  </div>

                  {/* Form Details */}
                  <div className="space-y-2 text-sm">
                    {/* Campaign Info */}
                    {formData.campaignName && (
                      <div className="flex justify-between py-1.5 border-b border-dashed border-border/50">
                        <span className="text-muted-foreground">Campaign</span>
                        <span className="font-medium">{formData.campaignName}</span>
                      </div>
                    )}
                    {formData.adSetName && (
                      <div className="flex justify-between py-1.5 border-b border-dashed border-border/50">
                        <span className="text-muted-foreground">Ad Set</span>
                        <span>{formData.adSetName}</span>
                      </div>
                    )}
                    {formData.adName && (
                      <div className="flex justify-between py-1.5 border-b border-dashed border-border/50">
                        <span className="text-muted-foreground">Ad</span>
                        <span>{formData.adName}</span>
                      </div>
                    )}
                    {formData.page_name && (
                      <div className="flex justify-between py-1.5 border-b border-dashed border-border/50">
                        <span className="text-muted-foreground">Page</span>
                        <span>{formData.page_name}</span>
                      </div>
                    )}

                    {/* All other form fields */}
                    {Object.entries(formData)
                      .filter(([key]) => !["formName", "form_name", "campaignName", "adSetName", "adName", "formId", "form_id", "submittedAt", "platform", "page_name", "ad_id", "adgroup_id", "webhook", "sync_method", "fetchedAt", "external_id", "raw_data"].includes(key))
                      .filter(([_, value]) => value !== null && value !== undefined && value !== '')
                      .map(([key, value]) => (
                        <div key={key} className="flex justify-between py-1.5 border-b border-dashed border-border/50 last:border-0">
                          <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                          <span className="text-right max-w-[60%] break-words">{String(value)}</span>
                        </div>
                      ))
                    }

                    {/* Metadata */}
                    {(formData.formId || formData.form_id) && (
                      <div className="flex justify-between py-1.5 border-b border-dashed border-border/50">
                        <span className="text-muted-foreground">Form ID</span>
                        <span className="text-xs font-mono opacity-70">{formData.formId || formData.form_id}</span>
                      </div>
                    )}
                    {formData.external_id && (
                      <div className="flex justify-between py-1.5 border-b border-dashed border-border/50">
                        <span className="text-muted-foreground">Lead ID</span>
                        <span className="text-xs font-mono opacity-70">{formData.external_id}</span>
                      </div>
                    )}
                    {formData.sync_method && (
                      <div className="flex justify-between py-1.5 border-b border-dashed border-border/50">
                        <span className="text-muted-foreground">Sync Method</span>
                        <Badge variant="secondary" className="text-xs">{formData.sync_method}</Badge>
                      </div>
                    )}
                    {formData.fetchedAt && (
                      <div className="flex justify-between py-1.5">
                        <span className="text-muted-foreground">Fetched At</span>
                        <span className="text-xs opacity-70">{new Date(formData.fetchedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No form submission details available.</p>
              )}
            </CardContent>
          </Card>

          {/* Assigned Agent Card */}
          {lead.agent && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-sm">Assigned Agent</span>
                </div>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarImage src={lead.agent.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${lead.agent.name}`} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {lead.agent.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{lead.agent.name}</p>
                    <p className="text-xs text-muted-foreground">Sales Agent</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => window.open(`tel:+971500000000`)}
                  >
                    <Phone className="h-3.5 w-3.5 mr-1" />
                    Call
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => window.open(`https://wa.me/971500000000`)}
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1" />
                    Message
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Activity Timeline */}
        <div className="lg:col-span-3">
          <ActivityTimeline
            timelineData={realtimeActivities}
            onOpenVoiceModal={() => setShowVoiceModal(true)}
            onAddNote={handleAddRealtimeNote}
            onAddAttachment={handleAddAttachment}
            onAddMeeting={handleAddMeeting}
            onAddFollowup={handleAddFollowup}
            isLoading={isLoadingActivities}
            showNoteDialog={showNoteDialog}
            onNoteDialogChange={setShowNoteDialog}
            showAttachmentDialog={showAttachmentDialog}
            onAttachmentDialogChange={setShowAttachmentDialog}
            showMeetingDialog={showMeetingDialog}
            onMeetingDialogChange={setShowMeetingDialog}
            showFollowupDialog={showFollowupDialog}
            onFollowupDialogChange={setShowFollowupDialog}
          />
        </div>
      </div>

      {/* Mobile: Tab Content */}
      <div className="lg:hidden">
        <div className="touch-pan-y">
          {activeTab === "details" ? (
            <div className="space-y-3">
              {/* Lead Info Card with contact info */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-14 w-14 border-2 border-background shadow-md flex-shrink-0">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${lead.name}`} />
                      <AvatarFallback className="text-lg font-bold bg-primary text-primary-foreground">{lead.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold truncate">{lead.name}</h2>
                      {lead.phone && (
                        <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span className="text-sm">{lead.phone}</span>
                        </div>
                      )}
                      {lead.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span className="text-sm truncate">{lead.email}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <StageBadge stage={lead.stage || "New"} showTooltip />
                        {lead.lead_group && (
                          <GroupBadge
                            groupId={lead.lead_group?.id}
                            groupName={lead.lead_group?.name}
                            groupColor={lead.lead_group?.color}
                            showTooltip
                          />
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {lead.agent ? (
                          <Badge variant="secondary" className="text-xs font-medium bg-green-100 text-green-700 border-green-200">
                            Assigned to {lead.agent.name}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs font-medium bg-orange-100 text-orange-700 border-orange-200">
                            Unassigned
                          </Badge>
                        )}
                        {lead.source && (
                          <Badge variant="outline" className="text-xs font-medium border-primary text-primary">
                            {lead.source}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Communication Buttons - Outline Style */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border/50">
                    <Button
                      variant="outline"
                      className="h-10 gap-2 text-sm font-medium w-full"
                      type="button"
                      disabled={!lead.phone}
                      onClick={async () => {
                        if (lead.phone) {
                          await addActivity(
                            "call",
                            "Outbound Call",
                            `Called ${lead.phone}`,
                            lead.agent?.name || "Agent"
                          );
                          window.open(`tel:${lead.phone}`);
                        }
                      }}
                    >
                      <Phone className="h-4 w-4" />
                      Call
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10 gap-2 text-sm font-medium border-green-500 text-green-600 hover:bg-green-50 w-full"
                      type="button"
                      disabled={!lead.phone}
                      onClick={async () => {
                        if (lead.phone) {
                          await addActivity(
                            "whatsapp",
                            "WhatsApp Message",
                            `Opened WhatsApp chat with ${lead.phone}`,
                            lead.agent?.name || "Agent"
                          );
                          window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`, '_blank');
                        }
                      }}
                    >
                      <MessageSquare className="h-4 w-4" />
                      WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10 gap-2 text-sm font-medium w-full"
                      type="button"
                      disabled={!lead.email}
                      onClick={async () => {
                        if (lead.email) {
                          await addActivity(
                            "email",
                            "Email Sent",
                            `Opened email to ${lead.email}`,
                            lead.agent?.name || "Agent"
                          );
                          window.open(`mailto:${lead.email}`);
                        }
                      }}
                    >
                      <Mail className="h-4 w-4" />{t('email')}</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Lead Stage, Group & Assignment */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Lead Stage</Label>
                    <Select value={currentStage || lead.stage || ""} onValueChange={setCurrentStage}>
                      <SelectTrigger className="h-12 bg-muted/30">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: stages.find(s => s.id === (currentStage || lead.stage))?.color || "#3B82F6" }}
                          />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: stage.color }}
                              />
                              {stage.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lead Group Selector - Mobile */}
                  <LeadGroupSelector
                    leadId={lead.id}
                    currentGroupId={lead.lead_group_id}
                    agentName={lead.agent?.name}
                    onGroupChange={() => refetch()}
                  />

                  {/* Assigned Agent Selector - Mobile */}
                  <LeadAssignedSelector
                    leadId={lead.id}
                    currentAgentId={lead.assigned_agent_id}
                    currentAgentName={lead.agent?.name}
                    onAgentChange={() => refetch()}
                  />

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Budget (Optional)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="AED 2,500,000"
                        defaultValue={lead.budget || ""}
                        className="h-12 pl-10 bg-muted/30"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lead Info Card - Mobile */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">Lead Info</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between py-1.5 border-b border-dashed">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />{t('created')}</span>
                      <span className="font-medium text-right">
                        <span>{new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span className="text-xs text-muted-foreground ml-1">({formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })})</span>
                      </span>
                    </div>
                    {lead.last_contacted_at && (
                      <div className="flex items-center justify-between py-1.5 border-b border-dashed">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5" />
                          Last Contacted
                        </span>
                        <span className="font-medium text-right">
                          <span>{new Date(lead.last_contacted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          <span className="text-xs text-muted-foreground ml-1">({formatDistanceToNow(new Date(lead.last_contacted_at), { addSuffix: true })})</span>
                        </span>
                      </div>
                    )}
                    {lead.location && (
                      <div className="flex items-center justify-between py-1.5 border-b border-dashed">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" />
                          Location
                        </span>
                        <span className="font-medium">{lead.location}</span>
                      </div>
                    )}
                    {lead.requirements && (
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-muted-foreground">Requirements</span>
                        <span className="font-medium text-right max-w-[60%] truncate">{lead.requirements}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Details - Form Submission */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-base font-semibold">Details</h3>
                  </div>

                  {hasFormData ? (
                    <div className="space-y-3">
                      {/* Platform Header */}
                      <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/50">
                        <Facebook className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                            {formData.platform === 'meta' ? 'Meta Lead Form' : 'Lead Form'}
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-500">
                            {formData.formName || formData.form_name || "Form Submission"}
                          </p>
                        </div>
                      </div>

                      {/* Form Details */}
                      <div className="space-y-2 text-sm">
                        {formData.campaignName && (
                          <div className="flex justify-between py-1.5 border-b border-dashed border-border/50">
                            <span className="text-muted-foreground">Campaign</span>
                            <span className="font-medium">{formData.campaignName}</span>
                          </div>
                        )}
                        {formData.adSetName && (
                          <div className="flex justify-between py-1.5 border-b border-dashed border-border/50">
                            <span className="text-muted-foreground">Ad Set</span>
                            <span>{formData.adSetName}</span>
                          </div>
                        )}
                        {formData.adName && (
                          <div className="flex justify-between py-1.5 border-b border-dashed border-border/50">
                            <span className="text-muted-foreground">Ad</span>
                            <span>{formData.adName}</span>
                          </div>
                        )}
                        {formData.page_name && (
                          <div className="flex justify-between py-1.5 border-b border-dashed border-border/50">
                            <span className="text-muted-foreground">Page</span>
                            <span>{formData.page_name}</span>
                          </div>
                        )}

                        {/* All other form fields */}
                        {Object.entries(formData)
                          .filter(([key]) => !["formName", "form_name", "campaignName", "adSetName", "adName", "formId", "form_id", "submittedAt", "platform", "page_name", "ad_id", "adgroup_id", "webhook", "sync_method", "fetchedAt", "external_id", "raw_data"].includes(key))
                          .filter(([_, value]) => value !== null && value !== undefined && value !== '')
                          .map(([key, value]) => (
                            <div key={key} className="flex justify-between py-1.5 border-b border-dashed border-border/50 last:border-0">
                              <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                              <span className="text-right max-w-[55%] break-words font-medium">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </div>
                          ))
                        }

                        {/* Metadata */}
                        {(formData.formId || formData.form_id) && (
                          <div className="flex justify-between py-1.5 border-b border-dashed border-border/50">
                            <span className="text-muted-foreground">Form ID</span>
                            <span className="text-xs font-mono opacity-70">{formData.formId || formData.form_id}</span>
                          </div>
                        )}
                        {formData.external_id && (
                          <div className="flex justify-between py-1.5 border-b border-dashed border-border/50">
                            <span className="text-muted-foreground">Lead ID</span>
                            <span className="text-xs font-mono opacity-70">{formData.external_id}</span>
                          </div>
                        )}
                        {formData.sync_method && (
                          <div className="flex justify-between py-1.5 border-b border-dashed border-border/50">
                            <span className="text-muted-foreground">Sync Method</span>
                            <Badge variant="secondary" className="text-xs">{formData.sync_method}</Badge>
                          </div>
                        )}
                        {formData.fetchedAt && (
                          <div className="flex justify-between py-1.5">
                            <span className="text-muted-foreground">Fetched At</span>
                            <span className="text-xs opacity-70">{new Date(formData.fetchedAt).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No form submission details available.</p>
                  )}

                  {/* Tags */}
                  {lead.tags && lead.tags.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-border/50">
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {lead.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Assigned Agent Card - Mobile */}
              {lead.agent && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">Assigned Agent</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border-2 border-primary/20">
                        <AvatarImage src={lead.agent.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${lead.agent.name}`} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {lead.agent.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{lead.agent.name}</p>
                        <p className="text-xs text-muted-foreground">Sales Agent</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => window.open(`tel:+971500000000`)}
                      >
                        <Phone className="h-3.5 w-3.5 mr-1" />
                        Call
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => window.open(`https://wa.me/971500000000`)}
                      >
                        <MessageSquare className="h-3.5 w-3.5 mr-1" />
                        Message
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <ActivityTimeline
              timelineData={realtimeActivities}
              onOpenVoiceModal={() => setShowVoiceModal(true)}
              onAddNote={handleAddRealtimeNote}
              onAddAttachment={handleAddAttachment}
              onAddMeeting={handleAddMeeting}
              onAddFollowup={handleAddFollowup}
              isLoading={isLoadingActivities}
              showNoteDialog={showNoteDialog}
              onNoteDialogChange={setShowNoteDialog}
              showAttachmentDialog={showAttachmentDialog}
              onAttachmentDialogChange={setShowAttachmentDialog}
              showMeetingDialog={showMeetingDialog}
              onMeetingDialogChange={setShowMeetingDialog}
              showFollowupDialog={showFollowupDialog}
              onFollowupDialogChange={setShowFollowupDialog}
            />
          )}
        </div>
      </div>

      {/* Voice Note Recording Modal */}
      <Dialog open={showVoiceModal} onOpenChange={(open) => {
        if (!open) handleCancelVoiceModal();
        else setShowVoiceModal(open);
      }}>
        <DialogContent className="sm:max-w-sm p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Record Voice Note</DialogTitle>
          </DialogHeader>
          <div className="p-6 text-center">
            {!isRecording && !audioBlob ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Record Voice Note</h3>
                  <p className="text-sm text-muted-foreground">Tap to start recording</p>
                </div>
                <button
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(50);
                    handleStartRecording();
                  }}
                  className="mx-auto h-24 w-24 rounded-full bg-primary hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 flex items-center justify-center shadow-lg"
                >
                  <Mic className="h-10 w-10 text-primary-foreground" />
                </button>
              </div>
            ) : isRecording ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-destructive">Recording...</h3>
                  <p className="text-3xl font-mono font-bold">{Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}</p>
                </div>

                <div className="flex items-center justify-center gap-1 h-16 px-8">
                  {[...Array(24)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-destructive rounded-full animate-pulse"
                      style={{
                        height: `${20 + Math.random() * 80}%`,
                        animationDelay: `${i * 40}ms`,
                        animationDuration: '0.5s'
                      }}
                    />
                  ))}
                </div>

                <button
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
                    handleStopRecording();
                  }}
                  className="mx-auto h-24 w-24 rounded-full bg-destructive hover:bg-destructive/90 transition-all hover:scale-105 active:scale-95 flex items-center justify-center shadow-lg"
                >
                  <div className="h-8 w-8 bg-white rounded-sm" />
                </button>
                <p className="text-sm text-muted-foreground">Tap to stop</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Preview Recording</h3>
                  <p className="text-2xl font-mono font-bold">{Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}</p>
                </div>

                {audioUrl && (
                  <audio controls src={audioUrl} className="w-full" />
                )}

                <div className="space-y-2 text-left">
                  <Label className="text-sm">Caption (optional)</Label>
                  <Input
                    placeholder="Add a caption..."
                    value={voiceCaption}
                    onChange={(e) => setVoiceCaption(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border-t bg-muted/30 p-4 flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCancelVoiceModal}
            >{t('cancel')}</Button>
            <Button
              className="flex-1"
              onClick={handleSaveVoiceNote}
              disabled={!audioBlob || isSavingVoice}
            >
              {isSavingVoice ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  const fabComponent = typeof document !== "undefined"
    ? createPortal(
      <LeadDetailFAB
        onNote={() => setShowNoteDialog(true)}
        onVoice={() => setShowVoiceModal(true)}
        onAttachment={() => setShowAttachmentDialog(true)}
        onMeeting={() => setShowMeetingDialog(true)}
        onFollowup={() => setShowFollowupDialog(true)}
      />,
      document.body
    )
    : null;

  if (isMobile) {
    return (
      <>
        <PullToRefresh onRefresh={handleRefresh}>
          {content}
        </PullToRefresh>
        {fabComponent}
      </>
    );
  }

  return (
    <>
      {content}
      {fabComponent}
    </>
  );
}
