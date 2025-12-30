import { useState } from "react";
import { MapPin, Bed, Bath, Ruler, Building2, ChevronLeft, ChevronRight, Edit2, Check, X, Loader2, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ListingSummary as ListingSummaryType, Agent, PortalAgent } from "./types";

export type { PortalAgent };

interface ListingSummaryProps {
  listing: ListingSummaryType;
  agents: Agent[];
  portalAgents?: PortalAgent[];
  isLoadingPortalAgents?: boolean;
  selectedPortalName?: string;
  onAgentChange: (agentId: string, isPortalAgent?: boolean, portalAgentData?: PortalAgent) => void;
  onListingChange?: (updates: Partial<ListingSummaryType>) => void;
}

const statusStyles = {
  Draft: "bg-muted text-muted-foreground border-border",
  Ready: "bg-amber-100 text-amber-700 border-amber-200",
  Published: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const sourceStyles = {
  local: "bg-secondary text-secondary-foreground",
  property_finder: "bg-red-100 text-red-700",
  bayut: "bg-blue-100 text-blue-700",
  dubizzle: "bg-orange-100 text-orange-700",
};

const sourceLabels = {
  local: "CRM",
  property_finder: "Property Finder",
  bayut: "Bayut",
  dubizzle: "Dubizzle",
};

export function ListingSummaryCard({ 
  listing, 
  agents, 
  portalAgents = [],
  isLoadingPortalAgents = false,
  selectedPortalName,
  onAgentChange, 
  onListingChange 
}: ListingSummaryProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isEditingAgent, setIsEditingAgent] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editTitle, setEditTitle] = useState(listing.title);
  const [editPrice, setEditPrice] = useState(listing.price);
  const [editLocation, setEditLocation] = useState(listing.location);

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? listing.images.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === listing.images.length - 1 ? 0 : prev + 1
    );
  };

  // Find selected agent (could be local or portal agent)
  const selectedLocalAgent = agents.find(a => a.id === listing.agentId);
  const selectedPortalAgent = portalAgents.find(a => a.id === listing.agentId);
  const selectedAgent = selectedLocalAgent || selectedPortalAgent;

  // Group portal agents by source
  const portalAgentsBySource = portalAgents.reduce((acc, agent) => {
    if (!acc[agent.source]) {
      acc[agent.source] = [];
    }
    acc[agent.source].push(agent);
    return acc;
  }, {} as Record<string, PortalAgent[]>);

  const handleSaveDetails = () => {
    onListingChange?.({
      title: editTitle,
      price: editPrice,
      location: editLocation,
    });
    setIsEditingDetails(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(listing.title);
    setEditPrice(listing.price);
    setEditLocation(listing.location);
    setIsEditingDetails(false);
  };

  const handleAgentSelect = (value: string) => {
    // Check if it's a portal agent
    const portalAgent = portalAgents.find(a => a.id === value);
    if (portalAgent) {
      onAgentChange(value, true, portalAgent);
    } else {
      onAgentChange(value, false);
    }
    setIsEditingAgent(false);
  };

  return (
    <Card className="shadow-card overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          {/* Image Gallery */}
          <div className="md:w-56 lg:w-72 flex-shrink-0">
            <div className="relative aspect-[16/10] md:aspect-auto md:h-40 lg:h-full">
              <img
                src={listing.images[currentImageIndex]}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
              {listing.images.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full opacity-80 hover:opacity-100"
                    onClick={handlePrevImage}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full opacity-80 hover:opacity-100"
                    onClick={handleNextImage}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                  <div className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {currentImageIndex + 1} / {listing.images.length}
                  </div>
                </>
              )}
            </div>
            {/* Thumbnail strip - hidden on mobile */}
            {listing.images.length > 1 && (
              <div className="hidden md:flex p-1.5 bg-secondary/30 gap-1 overflow-x-auto">
                {listing.images.slice(0, 4).map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={cn(
                      "flex-shrink-0 w-10 h-7 rounded overflow-hidden border-2 transition-all",
                      currentImageIndex === index
                        ? "border-primary"
                        : "border-transparent hover:border-primary/50"
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
                {listing.images.length > 4 && (
                  <div className="flex-shrink-0 w-10 h-7 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                    +{listing.images.length - 4}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Listing Info */}
          <div className="flex-1 p-3 md:p-4 space-y-2 md:space-y-3">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Ref: {listing.refNumber}
                  </Badge>
                  <Badge className={cn("border text-[10px] px-1.5 py-0", statusStyles[listing.status])}>
                    {listing.status}
                  </Badge>
                  {!isEditingDetails && onListingChange && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1.5 ml-auto text-[10px]"
                      onClick={() => setIsEditingDetails(true)}
                    >
                      <Edit2 className="h-2.5 w-2.5 mr-0.5" />
                      Edit
                    </Button>
                  )}
                </div>
                
                {isEditingDetails ? (
                  <div className="space-y-2 mt-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground">Title</label>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="mt-0.5 h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Location</label>
                      <Input
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        className="mt-0.5 h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Price</label>
                      <Input
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="mt-0.5 h-8 text-sm"
                      />
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" className="h-7 text-xs" onClick={handleSaveDetails}>
                        <Check className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleCancelEdit}>
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-sm md:text-base lg:text-lg font-semibold leading-tight truncate">{listing.title}</h2>
                    <p className="text-muted-foreground flex items-center gap-1 text-xs mt-0.5 truncate">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{listing.location}</span>
                    </p>
                  </>
                )}
              </div>
              {!isEditingDetails && (
                <p className="text-base md:text-lg lg:text-xl font-bold text-primary whitespace-nowrap">{listing.price}</p>
              )}
            </div>

            {/* Key Details */}
            <div className="grid grid-cols-4 gap-1.5 md:gap-2">
              <div className="flex flex-col items-center p-1.5 md:p-2 bg-secondary/30 rounded-lg text-center">
                <Bed className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                <p className="text-xs md:text-sm font-medium mt-0.5">{listing.bedrooms}</p>
                <p className="text-[9px] md:text-[10px] text-muted-foreground">Beds</p>
              </div>
              <div className="flex flex-col items-center p-1.5 md:p-2 bg-secondary/30 rounded-lg text-center">
                <Bath className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                <p className="text-xs md:text-sm font-medium mt-0.5">{listing.bathrooms}</p>
                <p className="text-[9px] md:text-[10px] text-muted-foreground">Baths</p>
              </div>
              <div className="flex flex-col items-center p-1.5 md:p-2 bg-secondary/30 rounded-lg text-center">
                <Ruler className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                <p className="text-xs md:text-sm font-medium mt-0.5 truncate w-full">{listing.size}</p>
                <p className="text-[9px] md:text-[10px] text-muted-foreground">Size</p>
              </div>
              <div className="flex flex-col items-center p-1.5 md:p-2 bg-secondary/30 rounded-lg text-center">
                <Building2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                <p className="text-xs md:text-sm font-medium mt-0.5 truncate w-full">{listing.type}</p>
                <p className="text-[9px] md:text-[10px] text-muted-foreground">Type</p>
              </div>
            </div>

            {/* Assigned Agent */}
            <div className="flex items-center justify-between p-2 md:p-2.5 bg-secondary/20 rounded-lg">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Avatar className="h-8 w-8 md:h-10 md:w-10 shrink-0">
                  <AvatarImage src={selectedAgent?.avatar} />
                  <AvatarFallback className="text-[10px] bg-primary/10">
                    {selectedAgent?.name?.split(' ').map(n => n[0]).join('') || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs md:text-sm font-medium truncate">
                      {selectedAgent?.name || 'No Agent Assigned'}
                    </p>
                    {selectedPortalAgent && (
                      <Badge className={cn("text-[9px] px-1 py-0 shrink-0", sourceStyles[selectedPortalAgent.source])}>
                        <ExternalLink className="h-2 w-2 mr-0.5" />
                        {sourceLabels[selectedPortalAgent.source]}
                      </Badge>
                    )}
                  </div>
                  {selectedPortalAgent?.brn && (
                    <p className="text-[9px] text-muted-foreground">BRN: {selectedPortalAgent.brn}</p>
                  )}
                  {!selectedPortalAgent && (
                    <p className="text-[9px] md:text-[10px] text-muted-foreground">
                      {selectedLocalAgent ? 'CRM Agent' : 'Select an agent for publishing'}
                    </p>
                  )}
                </div>
              </div>
              
              {isEditingAgent ? (
                <div className="flex items-center gap-1.5">
                  {isLoadingPortalAgents && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  <Select
                    value={listing.agentId}
                    onValueChange={handleAgentSelect}
                  >
                    <SelectTrigger className="w-40 md:w-52 h-8 text-xs">
                      <SelectValue placeholder="Select agent" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {/* Local CRM Agents */}
                      {agents.length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="text-[10px] text-muted-foreground">CRM Agents</SelectLabel>
                          {agents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id} className="text-xs">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={agent.avatar} />
                                  <AvatarFallback className="text-[8px]">
                                    {agent.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{agent.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      
                      {/* Portal Agents grouped by source */}
                      {Object.entries(portalAgentsBySource).map(([source, sourceAgents]) => (
                        <SelectGroup key={source}>
                          <SelectLabel className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            {sourceLabels[source as keyof typeof sourceLabels] || source} Agents
                          </SelectLabel>
                          {sourceAgents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id} className="text-xs">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={agent.avatar} />
                                  <AvatarFallback className="text-[8px]">
                                    {agent.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span>{agent.name}</span>
                                  {agent.brn && (
                                    <span className="text-[9px] text-muted-foreground">BRN: {agent.brn}</span>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                      
                      {agents.length === 0 && portalAgents.length === 0 && !isLoadingPortalAgents && (
                        <div className="py-4 text-center text-xs text-muted-foreground">
                          No agents available
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0" 
                    onClick={() => setIsEditingAgent(false)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2 shrink-0" onClick={() => setIsEditingAgent(true)}>
                  <Edit2 className="h-3 w-3 mr-1" />
                  Change
                </Button>
              )}
            </div>
            
            {/* Portal agents hint */}
            {selectedPortalName && portalAgents.length > 0 && !isEditingAgent && (
              <p className="text-[10px] text-muted-foreground text-center">
                {portalAgents.length} agent(s) available from {selectedPortalName}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
