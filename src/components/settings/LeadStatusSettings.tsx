import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLeadStatuses, STAGE_COLOR_MAP, COLOR_OPTIONS } from "@/hooks/useLeadStatuses";
import { Plus, Trash2, Pencil, Tag } from "lucide-react";

export default function LeadStatusSettings() {
  const { toast } = useToast();
  const { statuses, addStatus, updateStatus, deleteStatus } = useLeadStatuses();
  const [newStatusLabel, setNewStatusLabel] = useState("");
  const [newStatusValue, setNewStatusValue] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("secondary");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColor, setEditColor] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Lead Statuses</h3>
        <p className="text-sm text-muted-foreground">Customize the status options available for your leads.</p>
      </div>

      <div className="glass-card bg-card p-5 space-y-4 rounded-2xl">
        <div className="space-y-2">
          {statuses.map((status) => (
            <div key={status.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/50">
              {editingId === status.id ? (
                <>
                  <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="flex-1 h-8 text-sm rounded-lg" placeholder="Status label" />
                  <Select value={editColor} onValueChange={setEditColor}>
                    <SelectTrigger className="w-[100px] h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent className="glass-strong bg-card rounded-xl">
                      {COLOR_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-8 rounded-lg" onClick={() => { updateStatus.mutate({ id: status.id, label: editLabel, color: editColor }); setEditingId(null); toast({ title: "Status updated!" }); }}>Save</Button>
                  <Button size="sm" variant="ghost" className="h-8 rounded-lg" onClick={() => setEditingId(null)}>Cancel</Button>
                </>
              ) : (
                <>
                  <Badge variant="outline" className={`${STAGE_COLOR_MAP[status.color] || STAGE_COLOR_MAP.secondary} rounded-md text-[10px] font-bold tracking-wider uppercase`}>{status.label}</Badge>
                  <span className="text-xs text-muted-foreground flex-1">({status.value})</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => { setEditingId(status.id); setEditLabel(status.label); setEditColor(status.color); }}><Pencil className="w-3 h-3" /></Button>
                  {!status.is_default && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-destructive hover:text-destructive" onClick={() => { deleteStatus.mutate(status.id); toast({ title: "Status deleted!" }); }}><Trash2 className="w-3 h-3" /></Button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-border/50 pt-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add New Status</p>
          <div className="flex gap-3">
            <Input placeholder="Label (e.g. Waitlisted)" value={newStatusLabel} onChange={(e) => { setNewStatusLabel(e.target.value); setNewStatusValue(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }} className="flex-1 rounded-xl" />
            <Select value={newStatusColor} onValueChange={setNewStatusColor}>
              <SelectTrigger className="w-[120px] rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="glass-strong bg-card rounded-xl">
                {COLOR_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button className="rounded-xl gap-2" disabled={!newStatusLabel.trim() || !newStatusValue.trim()} onClick={() => { addStatus.mutate({ value: newStatusValue, label: newStatusLabel, color: newStatusColor }, { onSuccess: () => { setNewStatusLabel(""); setNewStatusValue(""); setNewStatusColor("secondary"); toast({ title: "Status added!" }); }, onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }) }); }}>
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
