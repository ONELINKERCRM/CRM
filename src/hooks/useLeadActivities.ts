import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AttachmentInfo {
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  type: string;
  title: string;
  description: string | null;
  agent_id: string | null;
  agent_name: string;
  duration: string | null;
  audio_url: string | null;
  attachments_count: number;
  attachments: AttachmentInfo[] | null;
  created_at: string;
}

export interface TimelineItem {
  id: number | string;
  type: string;
  title: string;
  description: string;
  agent: string;
  time: string;
  rawTime?: Date;
  duration?: string;
  audioUrl?: string;
  attachments?: number;
  attachmentsList?: AttachmentInfo[];
  isSystem?: boolean;
}

export interface LeadInfo {
  id: string;
  name: string;
  created_at: string;
  source?: string | null;
  assigned_agent_id?: string | null;
  agent?: {
    name: string;
  } | null;
}

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes.toString().padStart(2, "0");
    return `Today, ${formattedHours}:${formattedMinutes} ${ampm}`;
  }
  if (diffDays === 1) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes.toString().padStart(2, "0");
    return `Yesterday, ${formattedHours}:${formattedMinutes} ${ampm}`;
  }
  
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes.toString().padStart(2, "0");
  return `${month} ${day}, ${year} ${formattedHours}:${formattedMinutes} ${ampm}`;
};

const mapActivityToTimeline = (activity: LeadActivity): TimelineItem => {
  const attachmentsList = Array.isArray(activity.attachments) 
    ? activity.attachments 
    : [];
  
  return {
    id: activity.id,
    type: activity.type,
    title: activity.title,
    description: activity.description || "",
    agent: activity.agent_name,
    time: formatTimeAgo(activity.created_at),
    rawTime: new Date(activity.created_at),
    duration: activity.duration || undefined,
    audioUrl: activity.audio_url || undefined,
    attachments: attachmentsList.length || activity.attachments_count || undefined,
    attachmentsList: attachmentsList.length > 0 ? attachmentsList : undefined,
  };
};

// Format date for system activity descriptions
const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes.toString().padStart(2, "0");
  return `${month} ${day}, ${year} at ${formattedHours}:${formattedMinutes} ${ampm}`;
};

// Generate system activities based on lead data
const generateSystemActivities = (lead: LeadInfo | null): TimelineItem[] => {
  if (!lead) return [];
  
  const systemActivities: TimelineItem[] = [];
  const createdDateTime = formatDateTime(lead.created_at);
  
  // Lead Created activity
  systemActivities.push({
    id: `system-created-${lead.id}`,
    type: "added",
    title: "Lead added to CRM",
    description: lead.source 
      ? `${createdDateTime} • Source: ${lead.source}` 
      : `${createdDateTime} • Manually added`,
    agent: "System",
    time: formatTimeAgo(lead.created_at),
    rawTime: new Date(lead.created_at),
    isSystem: true,
  });
  
  // Lead Assigned activity (if assigned)
  if (lead.assigned_agent_id && lead.agent?.name) {
    // Add a slight offset so assignment appears after creation
    const assignedTime = new Date(new Date(lead.created_at).getTime() + 1000);
    const assignedDateTime = formatDateTime(assignedTime.toISOString());
    systemActivities.push({
      id: `system-assigned-${lead.id}`,
      type: "assignment",
      title: `Assigned to ${lead.agent.name}`,
      description: assignedDateTime,
      agent: "System",
      time: formatTimeAgo(assignedTime.toISOString()),
      rawTime: assignedTime,
      isSystem: true,
    });
  }
  
  return systemActivities;
};

export function useLeadActivities(leadId: string, leadInfo?: LeadInfo | null) {
  const [dbActivities, setDbActivities] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Generate system activities from lead info
  const systemActivities = useMemo(() => generateSystemActivities(leadInfo || null), [leadInfo]);
  
  // Combine and sort all activities
  const activities = useMemo(() => {
    const combined = [...dbActivities, ...systemActivities];
    // Sort by rawTime descending (newest first)
    return combined.sort((a, b) => {
      const timeA = a.rawTime ? a.rawTime.getTime() : 0;
      const timeB = b.rawTime ? b.rawTime.getTime() : 0;
      return timeB - timeA;
    });
  }, [dbActivities, systemActivities]);

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("lead_activities")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching activities:", error);
        return;
      }

      if (data) {
        setDbActivities(data.map((item) => mapActivityToTimeline(item as unknown as LeadActivity)));
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch initial activities
  useEffect(() => {
    fetchActivities();
  }, [leadId]);

  // Subscribe to realtime updates
  useEffect(() => {
    console.log("Setting up realtime subscription for lead:", leadId);
    
    const channel = supabase
      .channel(`lead-activities-${leadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "lead_activities",
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          console.log("New activity received:", payload);
          const newActivity = payload.new as LeadActivity;
          const timelineItem = mapActivityToTimeline(newActivity);
          
          setDbActivities((prev) => [timelineItem, ...prev]);
          toast.success(`New ${newActivity.type} added to timeline`);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "lead_activities",
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          console.log("Activity deleted:", payload);
          const deletedId = (payload.old as LeadActivity).id;
          setDbActivities((prev) => prev.filter((a) => a.id !== deletedId));
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    return () => {
      console.log("Cleaning up realtime subscription");
      supabase.removeChannel(channel);
    };
  }, [leadId]);

  // Upload files and return attachment info
  const uploadFiles = async (files: File[], activityId: string): Promise<AttachmentInfo[]> => {
    const attachments: AttachmentInfo[] = [];
    
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${leadId}/${activityId}/${Date.now()}-${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('activity-attachments')
        .upload(fileName, file);
      
      if (error) {
        console.error("Error uploading file:", error);
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }
      
      const { data: urlData } = supabase.storage
        .from('activity-attachments')
        .getPublicUrl(data.path);
      
      attachments.push({
        name: file.name,
        url: urlData.publicUrl,
        size: file.size,
        type: file.type,
      });
    }
    
    return attachments;
  };

  // Add a new activity with optional attachments
  const addActivity = async (
    type: string,
    title: string,
    description: string,
    agentName: string = "Current User",
    agentId?: string,
    files?: File[]
  ) => {
    try {
      // First insert the activity to get its ID
      const { data: insertedActivity, error } = await supabase
        .from("lead_activities")
        .insert({
          lead_id: leadId,
          type,
          title,
          description,
          agent_name: agentName,
          agent_id: agentId,
          attachments: [],
          attachments_count: 0,
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding activity:", error);
        toast.error("Failed to add activity");
        return false;
      }

      // If there are files, upload them and update the activity
      if (files && files.length > 0) {
        const attachments = await uploadFiles(files, insertedActivity.id);
        
        if (attachments.length > 0) {
          const { error: updateError } = await supabase
            .from("lead_activities")
            .update({
              attachments: JSON.parse(JSON.stringify(attachments)),
              attachments_count: attachments.length,
            })
            .eq("id", insertedActivity.id);
          
          if (updateError) {
            console.error("Error updating attachments:", updateError);
          }
        }
      }

      return true;
    } catch (error) {
      console.error("Error adding activity:", error);
      toast.error("Failed to add activity");
      return false;
    }
  };

  const refetch = async () => {
    await fetchActivities();
  };

  return {
    activities,
    isLoading,
    addActivity,
    refetch,
  };
}
