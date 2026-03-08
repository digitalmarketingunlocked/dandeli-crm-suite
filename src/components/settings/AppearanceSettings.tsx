import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Moon, Sun, Palette, Monitor } from "lucide-react";
import { useState, useEffect } from "react";

const ACCENT_COLORS = [
  { label: "Teal", value: "teal", color: "162 72% 32%", darkColor: "162 60% 50%" },
  { label: "Blue", value: "blue", color: "210 85% 48%", darkColor: "210 70% 58%" },
  { label: "Purple", value: "purple", color: "270 70% 50%", darkColor: "270 60% 60%" },
  { label: "Orange", value: "orange", color: "28 95% 50%", darkColor: "28 80% 55%" },
  { label: "Rose", value: "rose", color: "350 80% 50%", darkColor: "350 70% 60%" },
];

export default function AppearanceSettings() {
  const { theme, toggleTheme } = useTheme();
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem("accent_color") || "teal");
  const [compactMode, setCompactMode] = useState(() => localStorage.getItem("compact_mode") === "true");

  useEffect(() => {
    const accent = ACCENT_COLORS.find((c) => c.value === accentColor);
    if (accent) {
      document.documentElement.style.setProperty("--primary", theme === "dark" ? accent.darkColor : accent.color);
      document.documentElement.style.setProperty("--ring", theme === "dark" ? accent.darkColor : accent.color);
      document.documentElement.style.setProperty("--sidebar-primary", theme === "dark" ? accent.darkColor : accent.color.replace(/32%$/, "48%"));
      document.documentElement.style.setProperty("--sidebar-ring", theme === "dark" ? accent.darkColor : accent.color.replace(/32%$/, "48%"));
    }
    localStorage.setItem("accent_color", accentColor);
  }, [accentColor, theme]);

  useEffect(() => {
    document.documentElement.classList.toggle("compact", compactMode);
    localStorage.setItem("compact_mode", compactMode ? "true" : "false");
  }, [compactMode]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Appearance</h3>
        <p className="text-sm text-muted-foreground">Customize how the application looks.</p>
      </div>

      {/* Theme */}
      <div className="glass-card bg-card p-5 space-y-4 rounded-2xl">
        <Label className="text-sm font-medium">Theme</Label>
        <Select value={theme} onValueChange={(v) => { if (v !== theme) toggleTheme(); }}>
          <SelectTrigger className="rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="glass-strong bg-card rounded-xl">
            <SelectItem value="light">
              <span className="flex items-center gap-2"><Sun className="w-4 h-4" /> Light</span>
            </SelectItem>
            <SelectItem value="dark">
              <span className="flex items-center gap-2"><Moon className="w-4 h-4" /> Dark</span>
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Theme changes apply after saving</p>
      </div>

      {/* Accent Color */}
      <div className="glass-card bg-card p-5 space-y-4 rounded-2xl">
        <Label className="text-sm font-medium">Accent Color</Label>
        <div className="flex flex-wrap gap-2">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => setAccentColor(c.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                accentColor === c.value
                  ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: `hsl(${c.color})` }}
              />
              {c.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Accent color changes require a page refresh after saving</p>
      </div>

      {/* Compact Mode */}
      <div className="glass-card bg-card p-5 rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Compact Mode</p>
            <p className="text-xs text-muted-foreground">Reduce padding and spacing throughout the app</p>
          </div>
          <Switch checked={compactMode} onCheckedChange={setCompactMode} />
        </div>
      </div>
    </div>
  );
}
