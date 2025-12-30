import { useState, useRef } from "react";
import {
  PhoneCall,
  MessageCircle,
  MailIcon,
  StickyNote,
  GitBranch,
  CalendarPlus,
  CheckCircle,
  Mic,
  Zap,
  Paperclip,
  Clock,
  Download,
  Send,
  Users,
  Plus,
  ArrowUpRight,
  UserPlus,
  Calendar,
  FileText,
  Image,
  File,
  X,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { AttachmentInfo } from "@/hooks/useLeadActivities";

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
}

interface ActivityTimelineProps {
  timelineData: TimelineItem[];
  onOpenVoiceModal: () => void;
  onAddNote?: (note: string, files?: File[]) => Promise<boolean>;
  onAddAttachment?: (description: string, files: File[]) => Promise<boolean>;
  onAddMeeting?: (title: string, date: string, time: string, location: string, notes: string) => Promise<boolean>;
  onAddFollowup?: (title: string, date: string, time: string, priority: string, notes: string) => Promise<boolean>;
  isLoading?: boolean;
  showNoteDialog?: boolean;
  onNoteDialogChange?: (open: boolean) => void;
  showAttachmentDialog?: boolean;
  onAttachmentDialogChange?: (open: boolean) => void;
  showMeetingDialog?: boolean;
  onMeetingDialogChange?: (open: boolean) => void;
  showFollowupDialog?: boolean;
  onFollowupDialogChange?: (open: boolean) => void;
}

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
  meeting: Users,
  assignment: ArrowUpRight,
  added: UserPlus,
  message: Send,
};

const timelineColors: Record<string, string> = {
  call: "bg-emerald-500",
  email: "bg-blue-500",
  whatsapp: "bg-green-500",
  note: "bg-amber-500",
  stage: "bg-violet-500",
  followup: "bg-orange-500",
  task: "bg-teal-500",
  voicenote: "bg-rose-500",
  automation: "bg-yellow-500",
  attachment: "bg-indigo-500",
  meeting: "bg-cyan-500",
  assignment: "bg-purple-500",
  added: "bg-sky-500",
  message: "bg-pink-500",
};

export function ActivityTimeline({ 
  timelineData, 
  onOpenVoiceModal, 
  onAddNote, 
  onAddAttachment,
  onAddMeeting,
  onAddFollowup,
  isLoading,
  showNoteDialog: externalNoteDialog,
  onNoteDialogChange,
  showAttachmentDialog: externalAttachmentDialog,
  onAttachmentDialogChange,
  showMeetingDialog: externalMeetingDialog,
  onMeetingDialogChange,
  showFollowupDialog: externalFollowupDialog,
  onFollowupDialogChange,
}: ActivityTimelineProps) {
  const [internalNoteDialog, setInternalNoteDialog] = useState(false);
  const [internalMeetingDialog, setInternalMeetingDialog] = useState(false);
  const [internalFollowupDialog, setInternalFollowupDialog] = useState(false);
  const [internalAttachmentDialog, setInternalAttachmentDialog] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const showNoteDialog = externalNoteDialog ?? internalNoteDialog;
  const setShowNoteDialog = onNoteDialogChange ?? setInternalNoteDialog;
  const showMeetingDialog = externalMeetingDialog ?? internalMeetingDialog;
  const setShowMeetingDialog = onMeetingDialogChange ?? setInternalMeetingDialog;
  const showFollowupDialog = externalFollowupDialog ?? internalFollowupDialog;
  const setShowFollowupDialog = onFollowupDialogChange ?? setInternalFollowupDialog;
  const showAttachmentDialog = externalAttachmentDialog ?? internalAttachmentDialog;
  const setShowAttachmentDialog = onAttachmentDialogChange ?? setInternalAttachmentDialog;
  
  // Note form state
  const [noteText, setNoteText] = useState("");
  const [noteFiles, setNoteFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Attachment form state
  const [attachmentDescription, setAttachmentDescription] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  
  // File input refs
  const noteFileInputRef = useRef<HTMLInputElement>(null);
  const attachmentFileInputRef = useRef<HTMLInputElement>(null);
  
  // Meeting form state
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  
  // Follow-up form state
  const [followupTitle, setFollowupTitle] = useState("");
  const [followupDate, setFollowupDate] = useState("");
  const [followupTime, setFollowupTime] = useState("");
  const [followupPriority, setFollowupPriority] = useState("medium");
  const [followupNotes, setFollowupNotes] = useState("");


  const handleNoteFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNoteFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleAttachmentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachmentFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeNoteFile = (index: number) => {
    setNoteFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeAttachmentFile = (index: number) => {
    setAttachmentFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.includes('pdf')) return FileText;
    return File;
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    
    setIsSubmitting(true);
    if (onAddNote) {
      const success = await onAddNote(noteText.trim(), noteFiles.length > 0 ? noteFiles : undefined);
      if (success) {
        setNoteText("");
        setNoteFiles([]);
        setShowNoteDialog(false);
        toast.success("Note added successfully");
      }
    } else {
      toast.success("Note added successfully");
      setNoteText("");
      setNoteFiles([]);
      setShowNoteDialog(false);
    }
    setIsSubmitting(false);
  };

  const handleSaveAttachment = async () => {
    if (attachmentFiles.length === 0) {
      toast.error("Please select at least one file");
      return;
    }
    
    setIsSubmitting(true);
    if (onAddAttachment) {
      const success = await onAddAttachment(attachmentDescription, attachmentFiles);
      if (success) {
        setAttachmentDescription("");
        setAttachmentFiles([]);
        setShowAttachmentDialog(false);
        toast.success("Attachment added successfully");
      }
    } else {
      toast.success("Attachment added successfully");
      setAttachmentDescription("");
      setAttachmentFiles([]);
      setShowAttachmentDialog(false);
    }
    setIsSubmitting(false);
  };

  const handleSaveMeeting = async () => {
    if (!meetingTitle.trim() || !meetingDate) {
      toast.error("Please fill in required fields");
      return;
    }
    
    setIsSubmitting(true);
    if (onAddMeeting) {
      const success = await onAddMeeting(meetingTitle.trim(), meetingDate, meetingTime, meetingLocation, meetingNotes);
      if (success) {
        setMeetingTitle("");
        setMeetingDate("");
        setMeetingTime("");
        setMeetingLocation("");
        setMeetingNotes("");
        setShowMeetingDialog(false);
        toast.success("Meeting scheduled successfully");
      }
    } else {
      toast.success("Meeting scheduled successfully");
      setMeetingTitle("");
      setMeetingDate("");
      setMeetingTime("");
      setMeetingLocation("");
      setMeetingNotes("");
      setShowMeetingDialog(false);
    }
    setIsSubmitting(false);
  };

  const handleSaveFollowup = async () => {
    if (!followupTitle.trim() || !followupDate) {
      toast.error("Please fill in required fields");
      return;
    }
    
    setIsSubmitting(true);
    if (onAddFollowup) {
      const success = await onAddFollowup(followupTitle.trim(), followupDate, followupTime, followupPriority, followupNotes);
      if (success) {
        setFollowupTitle("");
        setFollowupDate("");
        setFollowupTime("");
        setFollowupPriority("medium");
        setFollowupNotes("");
        setShowFollowupDialog(false);
        toast.success("Follow-up created successfully");
      }
    } else {
      toast.success("Follow-up created successfully");
      setFollowupTitle("");
      setFollowupDate("");
      setFollowupTime("");
      setFollowupPriority("medium");
      setFollowupNotes("");
      setShowFollowupDialog(false);
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="relative h-full p-4">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="space-y-6 pl-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col">
      {/* Add Activity Header */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-3 px-4 py-4 border-b border-border/50 shrink-0 w-full hover:bg-muted/50 transition-colors cursor-pointer text-left">
            <div className="w-10 h-10 rounded-full border-2 border-primary flex items-center justify-center text-primary">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-primary font-medium">Add activity</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={() => setShowNoteDialog(true)} className="cursor-pointer">
            <StickyNote className="h-4 w-4 mr-2 text-amber-500" />
            Add Note
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowAttachmentDialog(true)} className="cursor-pointer">
            <Paperclip className="h-4 w-4 mr-2 text-indigo-500" />
            Add Attachment
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowMeetingDialog(true)} className="cursor-pointer">
            <Users className="h-4 w-4 mr-2 text-cyan-500" />
            Schedule Meeting
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowFollowupDialog(true)} className="cursor-pointer">
            <CalendarPlus className="h-4 w-4 mr-2 text-orange-500" />
            Add Follow-up
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenVoiceModal} className="cursor-pointer">
            <Mic className="h-4 w-4 mr-2 text-rose-500" />
            Record Voice Note
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-muted-foreground/20" />

          {timelineData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <StickyNote className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-sm font-medium">No activities yet</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Add your first activity</p>
            </div>
          ) : (
            <div className="space-y-6">
              {timelineData.map((activity) => {
                const Icon = timelineIcons[activity.type] || StickyNote;
                const iconColor = timelineColors[activity.type] || "bg-muted-foreground";
                
                return (
                  <div key={activity.id} className="relative flex gap-4">
                    <div className={cn("relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 shadow-md", iconColor)}>
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0 pb-1">
                      <p className="text-xs text-muted-foreground mb-1">
                        {activity.rawTime 
                          ? `${activity.rawTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${activity.rawTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}` 
                          : activity.time}
                      </p>

                      <h4 className="font-semibold text-foreground leading-tight text-base">
                        {activity.title}
                      </h4>

                      {activity.description && (
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                          {activity.description}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                          <UserPlus className="h-3 w-3" />
                        </div>
                        <span>by {activity.agent}</span>
                      </div>

                      {activity.type === 'voicenote' && activity.audioUrl && (
                        <div className="mt-3 flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                          <audio 
                            src={activity.audioUrl} 
                            controls 
                            className="flex-1 h-9"
                            style={{ minWidth: 0 }}
                          />
                          <span className="text-xs text-muted-foreground font-medium shrink-0">{activity.duration || '0:00'}</span>
                          <a 
                            href={activity.audioUrl} 
                            download 
                            className="shrink-0"
                          >
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                        </div>
                      )}

                      {/* Attachments display */}
                      {activity.attachmentsList && activity.attachmentsList.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {activity.attachmentsList.map((attachment, idx) => {
                            const FileIcon = getFileIcon(attachment.type);
                            return (
                              <a
                                key={idx}
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                              >
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <FileIcon className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{attachment.name}</p>
                                  <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
                                </div>
                                <Download className="h-4 w-4 text-muted-foreground" />
                              </a>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Attachments count badge */}
                      {activity.attachments && activity.attachments > 0 && !activity.attachmentsList && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <Paperclip className="h-3 w-3" />
                          <span>{activity.attachments} attachment{activity.attachments > 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>


      {/* Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-amber-500" />
              Add Note
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                placeholder="Write your note here..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
            
            {/* File attachments */}
            <div className="space-y-2">
              <Label>Attachments (optional)</Label>
              <input
                ref={noteFileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleNoteFileChange}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => noteFileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Add Files
              </Button>
              
              {noteFiles.length > 0 && (
                <div className="space-y-2 mt-2">
                  {noteFiles.map((file, index) => {
                    const FileIcon = getFileIcon(file.type);
                    return (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        <FileIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-sm truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeNoteFile(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNote} disabled={!noteText.trim() || isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meeting Dialog */}
      <Dialog open={showMeetingDialog} onOpenChange={setShowMeetingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Schedule Meeting
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="Meeting title"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                placeholder="Meeting location or link"
                value={meetingLocation}
                onChange={(e) => setMeetingLocation(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={meetingNotes}
                onChange={(e) => setMeetingNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMeetingDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveMeeting} disabled={isSubmitting}>
              {isSubmitting ? "Scheduling..." : "Schedule Meeting"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow-up Dialog */}
      <Dialog open={showFollowupDialog} onOpenChange={setShowFollowupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-500" />
              Create Follow-up
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="Follow-up title"
                value={followupTitle}
                onChange={(e) => setFollowupTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={followupDate}
                  onChange={(e) => setFollowupDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={followupTime}
                  onChange={(e) => setFollowupTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={followupPriority} onValueChange={setFollowupPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={followupNotes}
                onChange={(e) => setFollowupNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFollowupDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveFollowup} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Follow-up"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attachment Dialog */}
      <Dialog open={showAttachmentDialog} onOpenChange={setShowAttachmentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-indigo-500" />
              Add Attachment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Files *</Label>
              <input
                ref={attachmentFileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleAttachmentFileChange}
              />
              <div
                onClick={() => attachmentFileInputRef.current?.click()}
                className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload files</p>
                <p className="text-xs text-muted-foreground/60 mt-1">PDF, Images, Documents</p>
              </div>
              
              {attachmentFiles.length > 0 && (
                <div className="space-y-2 mt-3">
                  {attachmentFiles.map((file, index) => {
                    const FileIcon = getFileIcon(file.type);
                    return (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        <FileIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-sm truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeAttachmentFile(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Add a description for these files..."
                value={attachmentDescription}
                onChange={(e) => setAttachmentDescription(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAttachmentDialog(false);
              setAttachmentFiles([]);
              setAttachmentDescription("");
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveAttachment} disabled={attachmentFiles.length === 0 || isSubmitting}>
              {isSubmitting ? "Uploading..." : "Upload Files"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
