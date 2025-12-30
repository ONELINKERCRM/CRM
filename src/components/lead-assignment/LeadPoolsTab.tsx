import { useState } from "react";
import {
  Plus,
  Trash2,
  MoreHorizontal,
  FolderOpen,
  Users,
  ArrowRight,
  Palette
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLeadPools, LeadPool } from "@/hooks/useLeadAssignment";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const POOL_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1"
];

export const LeadPoolsTab = () => {
  const { pools, isLoading, createPool, deletePool } = useLeadPools();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletePoolId, setDeletePoolId] = useState<string | null>(null);
  const [newPool, setNewPool] = useState({
    name: "",
    description: "",
    color: "#3B82F6"
  });

  const handleCreate = async () => {
    if (!newPool.name.trim()) return;
    
    const result = await createPool(newPool.name, newPool.description, newPool.color);
    if (result) {
      setIsCreateOpen(false);
      setNewPool({ name: "", description: "", color: "#3B82F6" });
    }
  };

  const handleDelete = async () => {
    if (deletePoolId) {
      await deletePool(deletePoolId);
      setDeletePoolId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FolderOpen className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium text-foreground">Lead Pool Management</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Group leads into pools for easier organization and bulk assignment. 
                Leads in pools can be assigned using manual, round-robin, or rule-based methods.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Lead Pools ({pools.length})</h3>
        <Button size="sm" className="gap-2" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Pool
        </Button>
      </div>

      {/* Pools Grid */}
      {pools.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Lead Pools Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create pools to organize and manage your leads more effectively.
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Pool
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pools.map((pool) => (
            <PoolCard
              key={pool.id}
              pool={pool}
              onDelete={() => setDeletePoolId(pool.id)}
            />
          ))}
        </div>
      )}

      {/* Create Pool Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Lead Pool</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pool Name</Label>
              <Input
                placeholder="e.g., Hot Leads, VIP Clients"
                value={newPool.name}
                onChange={(e) => setNewPool(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="Describe the purpose of this pool..."
                value={newPool.description}
                onChange={(e) => setNewPool(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Color
              </Label>
              <div className="flex flex-wrap gap-2">
                {POOL_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      newPool.color === color ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewPool(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newPool.name.trim()}>
              Create Pool
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePoolId} onOpenChange={() => setDeletePoolId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead Pool?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the pool but not the leads. Leads will remain in the system 
              and can be added to other pools.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete Pool
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const PoolCard = ({ pool, onDelete }: { pool: LeadPool; onDelete: () => void }) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${pool.color}20` }}
            >
              <FolderOpen className="h-5 w-5" style={{ color: pool.color }} />
            </div>
            <div>
              <CardTitle className="text-base">{pool.pool_name}</CardTitle>
              {pool.description && (
                <CardDescription className="line-clamp-1">{pool.description}</CardDescription>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Pool
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{pool.lead_count || 0} leads</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {formatDistanceToNow(new Date(pool.created_at), { addSuffix: true })}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" className="w-full mt-3 gap-2">
          View Leads
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};
