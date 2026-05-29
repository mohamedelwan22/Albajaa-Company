import { Link, useLocation } from "wouter";
import { LayoutDashboard, Plane, Plus, Settings, LogOut } from "lucide-react";
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
      href: "/dashboard", // Since dashboard holds the tickets table
      icon: Plane,
      // If we are on ticket detail page, we might want to highlight Tickets as well
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
    <div 
      className="hidden md:flex flex-col h-screen w-[260px] text-white shrink-0 border-l border-white/10"
      style={{ background: "linear-gradient(180deg, #0077B6 0%, #00AEEF 100%)" }}
    >
      {/* Header */}
      <div className="flex flex-col items-center justify-center py-8 border-b border-white/10 gap-3">
        <Link href="/dashboard" className="cursor-pointer">
          <img 
            src="/logo.png" 
            alt="شعار البجع" 
            className="w-[140px] object-contain drop-shadow-md"
            onError={(e) => {
              // Fallback if logo.png doesn't exist
              e.currentTarget.style.display = "none";
            }}
          />
        </Link>
        <span className="text-xl font-bold tracking-wide text-white drop-shadow">البجع للسفر والسياحة</span>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const isExactActive = location === item.href;
            const isPrefixActive = item.matchPrefix && location.startsWith(item.matchPrefix) && location !== "/dashboard/tickets/new";
            const isActive = isExactActive || isPrefixActive;
            const Icon = item.icon;

            return (
              <Link key={item.label} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-[rgba(247,147,30,0.20)] border-r-[4px] border-[#F7931E] text-[#F7931E] shadow-sm font-bold scale-[1.02]"
                      : "text-white/90 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "text-[#F7931E]" : "text-white/80"}`} />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 bg-black/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold border border-white/10 shadow-sm shrink-0">
            {user.name?.charAt(0) || "B"}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold truncate text-white">{user.name}</span>
            <span className="text-xs text-white/70 truncate">{user.email}</span>
            <div className="mt-1">
              <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-[#F7931E] text-white font-bold">
                {user.role === "SUPER_ADMIN" ? "مدير عام" : user.role === "ADMIN" ? "مدير" : "موظف"}
              </span>
            </div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2 text-white hover:bg-white/10 hover:text-white font-medium border border-white/20 bg-white/5" 
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );
}
