import { cn } from "@/lib/utils";

type KnownSource = "Facebook" | "Google Ads" | "Website" | "WhatsApp" | "Referral" | "Meta" | "TikTok" | "Cold Call" | "Other";

interface SourceBadgeProps {
  source: string;
  className?: string;
}

const sourceStyles: Record<string, string> = {
  "Facebook": "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "Meta": "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "Google Ads": "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  "Website": "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "WhatsApp": "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  "Referral": "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  "TikTok": "bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
  "Cold Call": "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  "Direct": "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  "Other": "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export function SourceBadge({ source, className }: SourceBadgeProps) {
  const style = sourceStyles[source] || sourceStyles["Other"];
  
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
        style,
        className
      )}
    >
      {source || "Direct"}
    </span>
  );
}
