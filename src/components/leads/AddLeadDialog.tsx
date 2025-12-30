import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Phone, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const leadFormSchema = z.object({
  name: z.string().min(2, "Name required").max(100),
  phone: z.string().min(10, "Valid phone required").max(20),
  email: z.string().email("Valid email required").optional().or(z.literal("")),
  source: z.enum(["Facebook", "Google Ads", "Website", "WhatsApp", "Referral", "Other"]),
  stage: z.enum(["Uncontacted", "New", "Contacted", "Follow Up", "Meeting", "Closed", "Lost"]),
  assignedAgent: z.string().optional(),
});

type LeadFormValues = z.infer<typeof leadFormSchema>;

interface AddLeadDialogProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onLeadAdded?: () => void;
}

const sources = ["Facebook", "Google Ads", "Website", "WhatsApp", "Referral", "Other"] as const;
const stages = ["Uncontacted", "New", "Contacted", "Follow Up", "Meeting", "Closed", "Lost"] as const;
const agents = [
  { id: "sarah", name: "Sarah Mitchell" },
  { id: "mike", name: "Mike Roberts" },
  { id: "emma", name: "Emma Khan" },
  { id: "james", name: "James Lee" },
];

export function AddLeadDialog({ children, open: controlledOpen, onOpenChange, onLeadAdded }: AddLeadDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (isControlled) {
      onOpenChange?.(value);
    } else {
      setInternalOpen(value);
    }
  };

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      source: "Website",
      stage: "Uncontacted",
      assignedAgent: "",
    },
  });

  const onSubmit = async (data: LeadFormValues) => {
    if (!user) {
      toast.error("Please sign in to add leads");
      return;
    }

    setIsSubmitting(true);
    try {
      // First get the user's company_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      const { error } = await supabase
        .from('leads')
        .insert({
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          source: data.source,
          stage: data.stage,
          company_id: profile?.company_id || null,
        });

      if (error) throw error;

      toast.success("Lead created successfully!", {
        description: `${data.name} has been added.`,
      });
      form.reset();
      setOpen(false);
      onLeadAdded?.();
    } catch (error: any) {
      console.error('Error creating lead:', error);
      toast.error("Failed to create lead", {
        description: error.message || "Please try again",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <ResponsiveDialogTrigger asChild>
          {children || (
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Lead
            </Button>
          )}
        </ResponsiveDialogTrigger>
      )}
      <ResponsiveDialogContent className="sm:max-w-[400px]">
        <ResponsiveDialogHeader className="pb-2">
          <ResponsiveDialogTitle className="text-base">Add New Lead</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="pb-0">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter name" className="h-9 text-sm" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">Phone *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input placeholder="+971..." className="pl-8 h-9 text-sm" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input placeholder="email@..." className="pl-8 h-9 text-sm" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">Source *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sources.map((source) => (
                            <SelectItem key={source} value={source} className="text-sm">
                              {source}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stage"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">Stage *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stages.map((stage) => (
                            <SelectItem key={stage} value={stage} className="text-sm">
                              {stage}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="assignedAgent"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">Assign Agent</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select agent (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {agents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id} className="text-sm">
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <ResponsiveDialogFooter className="pt-3 gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => setOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="flex-1 sm:flex-none" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5 mr-1" />
                  )}
                  {isSubmitting ? "Creating..." : "Create"}
                </Button>
              </ResponsiveDialogFooter>
            </form>
          </Form>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
