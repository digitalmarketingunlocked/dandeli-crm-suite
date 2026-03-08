import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Palette, Bell, User, Tag, Settings as SettingsIcon } from "lucide-react";
import AppearanceSettings from "@/components/settings/AppearanceSettings";
import NotificationSettings from "@/components/settings/NotificationSettings";
import AccountSettings from "@/components/settings/AccountSettings";
import LeadStatusSettings from "@/components/settings/LeadStatusSettings";
import CRMSettings from "@/components/settings/CRMSettings";
import TeamInviteSection from "@/components/settings/TeamInviteSection";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-heading font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your business and app preferences.</p>
      </div>

      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="w-full justify-start gap-1 bg-transparent p-0 border-b border-border/50 rounded-none h-auto pb-0">
          <TabsTrigger value="notifications" className="rounded-t-xl rounded-b-none data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2 px-4 py-2.5 text-sm">
            <Bell className="w-4 h-4" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-t-xl rounded-b-none data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2 px-4 py-2.5 text-sm">
            <Palette className="w-4 h-4" /> Appearance
          </TabsTrigger>
          <TabsTrigger value="account" className="rounded-t-xl rounded-b-none data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2 px-4 py-2.5 text-sm">
            <User className="w-4 h-4" /> Account
          </TabsTrigger>
          <TabsTrigger value="lead-statuses" className="rounded-t-xl rounded-b-none data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2 px-4 py-2.5 text-sm">
            <Tag className="w-4 h-4" /> Lead Statuses
          </TabsTrigger>
          <TabsTrigger value="crm" className="rounded-t-xl rounded-b-none data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2 px-4 py-2.5 text-sm">
            <SettingsIcon className="w-4 h-4" /> CRM Config
          </TabsTrigger>
        </TabsList>

        <div className="pt-6">
          <TabsContent value="notifications">
            <NotificationSettings />
          </TabsContent>
          <TabsContent value="appearance">
            <AppearanceSettings />
          </TabsContent>
          <TabsContent value="account">
            <AccountSettings />
            <div className="mt-6">
              <TeamInviteSection />
            </div>
          </TabsContent>
          <TabsContent value="lead-statuses">
            <LeadStatusSettings />
          </TabsContent>
          <TabsContent value="crm">
            <CRMSettings />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
