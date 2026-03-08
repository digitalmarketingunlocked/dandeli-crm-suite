import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon } from "lucide-react";

export default function CRMSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">CRM Configuration</h3>
        <p className="text-sm text-muted-foreground">Fine-tune how leads are categorized and followed up.</p>
      </div>

      <div className="glass-card bg-card p-5 space-y-6 rounded-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔥</span>
              <p className="font-medium text-sm">Hot Lead Definition</p>
            </div>
            <p className="text-xs text-muted-foreground">A lead is considered "Hot" if contacted within:</p>
            <select className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
              <option>3 Hours</option>
              <option>6 Hours</option>
              <option>12 Hours</option>
              <option>24 Hours</option>
              <option>3 Days</option>
            </select>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">❄️</span>
              <p className="font-medium text-sm">Cold Lead Follow-up Visibility</p>
            </div>
            <p className="text-xs text-muted-foreground">Show leads in Cold Follow-up list:</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="cold-visibility" defaultChecked className="accent-primary" />
                Up to 1 month from lead date
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="cold-visibility" className="accent-primary" />
                Until Check-in date
              </label>
            </div>
          </div>
        </div>
        <Button className="rounded-xl">Apply CRM Settings</Button>
      </div>
    </div>
  );
}
