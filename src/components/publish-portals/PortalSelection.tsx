import { Check, AlertCircle, Info, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Portal } from "./types";

interface PortalSelectionProps {
  portals: Portal[];
  selectedPortals: string[];
  onTogglePortal: (portalId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

// Fallback logos for portals without a logo_url
const fallbackPortalLogos: Record<string, string> = {
  'property finder': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/PropertyFinder_Logo_Color.svg/512px-PropertyFinder_Logo_Color.svg.png',
  'bayut': 'https://www.bayut.com/assets/bayutIcon.37db20ff1267bb446252.svg',
  'dubizzle': 'https://www.dubizzle.com/assets/dubizzleVerticalLogo-fcd4de61fd8d3c8c7be8.svg',
  'google': 'https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png',
  'wordpress': 'https://s.w.org/style/images/about/WordPress-logotype-simplified.png',
};

function getPortalLogo(portal: { id: string; name: string; logo: string }): string | null {
  if (portal.logo) return portal.logo;
  const nameLower = portal.name.toLowerCase();
  for (const [key, url] of Object.entries(fallbackPortalLogos)) {
    if (nameLower.includes(key)) return url;
  }
  return null;
}

export function PortalSelection({
  portals,
  selectedPortals,
  onTogglePortal,
  onSelectAll,
  onDeselectAll,
}: PortalSelectionProps) {
  const connectedPortals = portals.filter(p => p.connected);
  const disconnectedPortals = portals.filter(p => !p.connected);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm md:text-base font-semibold">Select Portals</h3>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={onSelectAll}>
            Select All
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={onDeselectAll}>
            Clear
          </Button>
        </div>
      </div>

      {/* Connected Portals */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
        {connectedPortals.map((portal) => {
          const isSelected = selectedPortals.includes(portal.id);
          return (
            <Card
              key={portal.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                isSelected
                  ? "ring-2 ring-primary border-primary bg-primary/5"
                  : "hover:border-primary/50"
              )}
              onClick={() => onTogglePortal(portal.id)}
            >
              <CardContent className="p-2.5 md:p-3">
                <div className="flex items-start justify-between">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onTogglePortal(portal.id)}
                    className="h-4 w-4"
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5">
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="font-medium mb-1 text-xs">Requirements:</p>
                      <ul className="text-[10px] space-y-0.5">
                        {portal.requirements.map((req, i) => (
                          <li key={i}>• {req}</li>
                        ))}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="mt-2 flex flex-col items-center text-center">
                  <div className="h-8 flex items-center justify-center mb-1">
                    {(() => {
                      const logoUrl = getPortalLogo(portal);
                      return logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={portal.name}
                          className="max-h-6 max-w-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null;
                    })()}
                    <Globe className={cn("h-5 w-5 text-muted-foreground", getPortalLogo(portal) && "hidden")} />
                  </div>
                  <p className="font-medium text-xs md:text-sm leading-tight">{portal.name}</p>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <Check className="h-2.5 w-2.5 text-emerald-600" />
                    <span className="text-[10px] text-emerald-600">Connected</span>
                  </div>
                  {portal.lastPublished && (
                    <p className="text-[9px] text-muted-foreground mt-0.5 hidden md:block">
                      Last: {portal.lastPublished}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Disconnected Portals */}
      {disconnectedPortals.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Not Connected</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {disconnectedPortals.map((portal) => (
              <Card key={portal.id} className="opacity-60 cursor-not-allowed">
                <CardContent className="p-2.5">
                  <div className="flex items-start justify-end">
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                      Not Connected
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-col items-center text-center">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <p className="font-medium text-xs text-muted-foreground mt-1">{portal.name}</p>
                    <Button variant="link" size="sm" className="mt-0.5 h-auto p-0 text-[10px]">
                      Connect
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {selectedPortals.length > 0 && (
        <div className="flex items-center gap-2 p-2 md:p-3 bg-primary/10 rounded-lg">
          <AlertCircle className="h-3.5 w-3.5 text-primary flex-shrink-0" />
          <p className="text-xs md:text-sm">
            <strong>{selectedPortals.length}</strong> portal{selectedPortals.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      )}
    </div>
  );
}
