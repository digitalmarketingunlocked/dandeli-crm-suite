import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, Target, LogOut, Menu, X, Sparkles, Moon, Sun } from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/contacts", icon: Users, label: "Contacts" },
  { to: "/deals", icon: Target, label: "Deals" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 glass-sidebar transform transition-all duration-300 lg:relative lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-heading font-bold text-sidebar-foreground">
                Dandeli<span className="text-sidebar-primary">CRM</span>
              </h1>
            </div>
            <p className="text-xs text-sidebar-foreground/50 mt-2 truncate">{user?.email}</p>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-sidebar-primary/20 text-sidebar-primary shadow-sm"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="p-4 border-t border-sidebar-border space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-xl"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-xl"
              onClick={signOut}
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-foreground/10 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 glass px-6 py-4 flex items-center lg:hidden bg-card">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="rounded-xl">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <div className="ml-3 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg gradient-primary flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-lg">Dandeli<span className="text-primary">CRM</span></span>
          </div>
        </header>
        <div className="p-6 lg:p-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
