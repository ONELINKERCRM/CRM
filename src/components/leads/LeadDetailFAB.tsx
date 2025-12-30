import { useState } from "react";
import { 
  Plus, 
  StickyNote, 
  Mic, 
  Paperclip, 
  Users, 
  Calendar 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadDetailFABProps {
  onNote: () => void;
  onVoice: () => void;
  onAttachment: () => void;
  onMeeting: () => void;
  onFollowup: () => void;
}

export function LeadDetailFAB({ 
  onNote, 
  onVoice, 
  onAttachment, 
  onMeeting, 
  onFollowup 
}: LeadDetailFABProps) {
  const [isOpen, setIsOpen] = useState(false);

  const fabActions = [
    { type: "note", label: "Note", icon: StickyNote, color: "text-amber-600", action: onNote },
    { type: "voice", label: "Voice", icon: Mic, color: "text-primary", action: onVoice },
    { type: "file", label: "File", icon: Paperclip, color: "text-blue-600", action: onAttachment },
    { type: "meeting", label: "Meeting", icon: Users, color: "text-purple-600", action: onMeeting },
    { type: "followup", label: "Follow-up", icon: Calendar, color: "text-green-600", action: onFollowup },
  ];

  const handleAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <>
      {/* FAB Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* FAB Options */}
      <div className={cn(
        "fixed bottom-36 right-4 z-50 flex flex-col gap-2 transition-all duration-200 md:bottom-24 md:right-8",
        isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        {fabActions.map((action) => (
          <button
            key={action.type}
            onClick={() => handleAction(action.action)}
            className="flex items-center gap-3 bg-card text-card-foreground px-4 py-3 rounded-full shadow-lg border active:scale-95 transition-transform"
          >
            <action.icon className={cn("h-5 w-5", action.color)} />
            <span className="text-sm font-medium">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-all duration-200 md:bottom-8 md:right-8",
          isOpen && "rotate-45"
        )}
      >
        <Plus className="h-6 w-6" />
      </button>
    </>
  );
}
