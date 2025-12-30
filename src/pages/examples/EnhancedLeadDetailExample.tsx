/**
 * Example: Enhanced Lead Detail Page with all improvements
 * 
 * This demonstrates:
 * 1. React Query integration (via useLead hook)
 * 2. Unsaved changes warning
 * 3. Accessibility improvements (ARIA labels, focus management, screen reader announcements)
 * 4. Virtual scrolling for activities list
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useLead } from "@/hooks/useLeadsQuery";
import { useUpdateLead } from "@/hooks/useLeadsQuery";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { useScreenReader, useAccessibleId } from "@/hooks/useAccessibility";
import { VirtualList } from "@/components/ui/VirtualList";

interface Activity {
    id: string;
    type: string;
    description: string;
    created_at: string;
}

export default function EnhancedLeadDetailExample() {
    const { id } = useParams();
    const navigate = useNavigate();

    // React Query - automatic caching and refetching
    const { data: lead, isLoading, error } = useLead(id);
    const updateLead = useUpdateLead();

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        notes: "",
    });

    // Track if form has unsaved changes
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Accessibility hooks
    const { announce } = useScreenReader();
    const nameFieldIds = useAccessibleId("lead-name");
    const emailFieldIds = useAccessibleId("lead-email");
    const phoneFieldIds = useAccessibleId("lead-phone");

    // Unsaved changes warning
    useUnsavedChanges({
        hasUnsavedChanges,
        message: "You have unsaved changes to this lead. Are you sure you want to leave?",
        onConfirm: () => {
            announce("Changes discarded", "assertive");
        },
    });

    // Initialize form when lead data loads
    useEffect(() => {
        if (lead) {
            setFormData({
                name: lead.name || "",
                email: lead.email || "",
                phone: lead.phone || "",
                notes: lead.notes || "",
            });
            announce(`Lead details loaded for ${lead.name}`, "polite");
        }
    }, [lead, announce]);

    // Track changes
    const handleFieldChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setHasUnsavedChanges(true);
    };

    // Save changes
    const handleSave = async () => {
        if (!id) return;

        setIsSaving(true);
        try {
            await updateLead.mutateAsync({
                id,
                updates: formData,
            });
            setHasUnsavedChanges(false);
            announce("Lead updated successfully", "assertive");
        } catch (error) {
            announce("Failed to update lead", "assertive");
        } finally {
            setIsSaving(false);
        }
    };

    // Mock activities for virtual scrolling demo
    const activities: Activity[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `activity-${i}`,
        type: "note",
        description: `Activity ${i + 1}`,
        created_at: new Date().toISOString(),
    }));

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error || !lead) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p>Lead not found</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            {/* Header with accessibility */}
            <header className="flex items-center justify-between mb-6">
                <Button
                    variant="ghost"
                    onClick={() => navigate(-1)}
                    aria-label="Go back to leads list"
                    className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>

                <Button
                    onClick={handleSave}
                    disabled={!hasUnsavedChanges || isSaving}
                    aria-label={hasUnsavedChanges ? "Save changes" : "No changes to save"}
                    className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                        </>
                    )}
                </Button>
            </header>

            {/* Unsaved changes indicator */}
            {hasUnsavedChanges && (
                <div
                    role="alert"
                    aria-live="polite"
                    className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800"
                >
                    You have unsaved changes
                </div>
            )}

            {/* Form with accessibility improvements */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle id="lead-details-heading">Lead Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4" aria-labelledby="lead-details-heading">
                    {/* Name field with full accessibility */}
                    <div className="space-y-2">
                        <Label htmlFor={nameFieldIds.id} id={nameFieldIds.labelId}>
                            Name <span className="text-red-500" aria-label="required">*</span>
                        </Label>
                        <Input
                            id={nameFieldIds.id}
                            value={formData.name}
                            onChange={(e) => handleFieldChange("name", e.target.value)}
                            aria-labelledby={nameFieldIds.labelId}
                            aria-required="true"
                            className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        />
                    </div>

                    {/* Email field */}
                    <div className="space-y-2">
                        <Label htmlFor={emailFieldIds.id} id={emailFieldIds.labelId}>
                            Email
                        </Label>
                        <Input
                            id={emailFieldIds.id}
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleFieldChange("email", e.target.value)}
                            aria-labelledby={emailFieldIds.labelId}
                            aria-describedby={emailFieldIds.descriptionId}
                            className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        />
                        <p id={emailFieldIds.descriptionId} className="text-sm text-muted-foreground">
                            We'll never share your email
                        </p>
                    </div>

                    {/* Phone field */}
                    <div className="space-y-2">
                        <Label htmlFor={phoneFieldIds.id} id={phoneFieldIds.labelId}>
                            Phone
                        </Label>
                        <Input
                            id={phoneFieldIds.id}
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleFieldChange("phone", e.target.value)}
                            aria-labelledby={phoneFieldIds.labelId}
                            className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Virtual scrolling for activities */}
            <Card>
                <CardHeader>
                    <CardTitle id="activities-heading">
                        Activities ({activities.length.toLocaleString()})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <VirtualList
                        items={activities}
                        estimateSize={80}
                        className="h-[400px] border rounded-lg"
                        renderItem={(activity) => (
                            <div className="p-4 border-b hover:bg-muted/50 transition-colors">
                                <p className="font-medium">{activity.description}</p>
                                <p className="text-sm text-muted-foreground">
                                    {new Date(activity.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        )}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
