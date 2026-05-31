import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, Plane, LayoutDashboard, Plus, Settings, LogOut, Ticket } from "lucide-react";
import { useGetMe, logout } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: user, isLoading, isError } = useGetMe({ query: { retry: false, queryKey: ["me"] } });

  useEffect(() => {
    if (isError && !isLoading) {
      setLocation("/login");
    }
  }, [isError, isLoading, setLocation]);

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/login");
    } catch (e) {
      toast({ title: "حدث خطأ", description: "تعذر تسجيل الخروج", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Plane className="h-12 w-12 animate-bounce text-accent" />
          <span className="text-lg font-bold text-foreground animate-pulse">جاري تحميل المنصة...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar - fixed */}
      <Sidebar user={user} onLogout={handleLogout} />

      {/* Main Panel - offset for sidebar */}
      <div className="md:mr-[260px] flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:hidden shrink-0 sticky top-0 z-20">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground">
                <Menu className="h-6 w-6" />
                <span className="sr-only">فتح القائمة</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col p-0 w-[260px] bg-sidebar text-sidebar-foreground border-l border-sidebar-border">
              <div className="flex flex-col h-full">
                <div className="flex flex-col items-center justify-center py-6 border-b border-sidebar-border gap-2">
                  <img 
                    src="/logo.png" 
                    alt="شعار البجع" 
                    className="w-[110px] object-contain brightness-0 invert"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                  <span className="text-lg font-bold text-white/90">البجع للسفر والسياحة</span>
                </div>
                <div className="flex-1 overflow-y-auto py-4 px-3">
                  <nav className="space-y-1">
                    <Link href="/dashboard">
                      <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer">
                        <LayoutDashboard className="h-5 w-5 text-sidebar-foreground/50" />
                        <span>لوحة التحكم</span>
                      </div>
                    </Link>
                    <Link href="/dashboard/tickets">
                      <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer">
                        <Ticket className="h-5 w-5 text-sidebar-foreground/50" />
                        <span>التذاكر</span>
                      </div>
                    </Link>
                    <Link href="/dashboard/tickets/new">
                      <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer">
                        <Plus className="h-5 w-5 text-sidebar-foreground/50" />
                        <span>تذكرة جديدة</span>
                      </div>
                    </Link>
                    <Link href="/settings">
                      <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer">
                        <Settings className="h-5 w-5 text-sidebar-foreground/50" />
                        <span>الإعدادات</span>
                      </div>
                    </Link>
                  </nav>
                </div>
                <div className="p-4 border-t border-sidebar-border">
                  <p className="text-sm font-semibold truncate text-sidebar-foreground/90 mb-2">{user.name}</p>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent" 
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    تسجيل الخروج
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground">البجع للسفر</span>
          </Link>
          <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xs">
            {user.name?.charAt(0) || "B"}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-[1600px] w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
