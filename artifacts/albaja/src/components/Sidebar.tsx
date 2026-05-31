import { Link, useLocation } from "wouter";
import { LayoutDashboard, Plus, Settings, LogOut, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  onLogout: () => void;
}

export function Sidebar({ user, onLogout }: SidebarProps) {
  const [location] = useLocation();

  const menuItems = [
    {
      label: "لوحة التحكم",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "التذاكر",
      href: "/dashboard/tickets",
      icon: Ticket,
      matchPrefix: "/dashboard/tickets",
    },
    {
      label: "تذكرة جديدة",
      href: "/dashboard/tickets/new",
      icon: Plus,
    },
    {
      label: "الإعدادات",
      href: "/settings",
      icon: Settings,
    },
  ];

  return (
    <div className="hidden md:flex fixed top-0 right-0 w-[260px] h-screen flex-col bg-sidebar text-sidebar-foreground z-30 border-l border-sidebar-border">
      {/* Header */}
      <div className="flex flex-col items-center justify-center py-8 border-b border-sidebar-border gap-3 shrink-0">
        <Link href="/dashboard" className="cursor-pointer">
          <img 
            src="/ticket-logo.png" 
            alt="ALBAJA Logo" 
            className="h-16 w-auto object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </Link>
        <span className="text-lg font-bold tracking-wide text-white/90">البجع للسفر والسياحة</span>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isExactActive = location === item.href;
            const isPrefixActive = item.matchPrefix && location.startsWith(item.matchPrefix);
            const isActive = isExactActive || isPrefixActive;
            const Icon = item.icon;

            return (
              <Link key={item.label} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground border-r-2 border-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50"}`} />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary font-bold text-sm shrink-0">
            {user.name?.charAt(0) || "B"}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold truncate text-sidebar-foreground/90">{user.name}</span>
            <span className="text-xs text-sidebar-foreground/50 truncate">{user.email}</span>
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent h-9 text-sm" 
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );
}
