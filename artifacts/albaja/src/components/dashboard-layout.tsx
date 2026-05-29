import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, Plane } from "lucide-react";
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
          <Plane className="h-12 w-12 animate-bounce text-[#F7931E]" />
          <span className="text-lg font-bold text-[#1A1A2E] animate-pulse">جاري تحميل المنصة...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen w-full bg-[#F8FAFC]">
      {/* Desktop Sidebar */}
      <Sidebar user={user} onLogout={handleLogout} />

      {/* Main Panel */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile Header */}
        <header 
          className="flex h-16 items-center justify-between border-b border-border bg-white px-4 md:hidden shrink-0"
        >
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-[#1A1A2E]">
                <Menu className="h-6 w-6" />
                <span className="sr-only">فتح القائمة</span>
              </Button>
            </SheetTrigger>
            <SheetContent 
              side="right" 
              className="flex flex-col p-0 w-[260px] text-white border-l border-white/10"
              style={{ background: "linear-gradient(180deg, #0077B6 0%, #00AEEF 100%)" }}
            >
              {/* Reuse Desktop Sidebar inside Sheet for consistency */}
              <div className="flex flex-col h-full">
                <div className="flex flex-col items-center justify-center py-6 border-b border-white/10 gap-2">
                  <img 
                    src="/logo.png" 
                    alt="شعار البجع" 
                    className="w-[110px] object-contain drop-shadow"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                  <span className="text-lg font-bold text-white drop-shadow">البجع للسفر والسياحة</span>
                </div>
                <div className="flex-1 overflow-y-auto py-4 px-3">
                  <nav className="space-y-1">
                    <Link href="/dashboard">
                      <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-white/10 cursor-pointer text-white">
                        <span>لوحة التحكم</span>
                      </div>
                    </Link>
                    <Link href="/dashboard">
                      <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-white/10 cursor-pointer text-white">
                        <span>التذاكر</span>
                      </div>
                    </Link>
                    <Link href="/dashboard/tickets/new">
                      <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-white/10 cursor-pointer text-white">
                        <span>تذكرة جديدة</span>
                      </div>
                    </Link>
                    <Link href="/settings">
                      <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-white/10 cursor-pointer text-white">
                        <span>الإعدادات</span>
                      </div>
                    </Link>
                  </nav>
                </div>
                <div className="p-4 border-t border-white/10 bg-black/10">
                  <p className="text-sm font-semibold truncate text-white mb-2">{user.name}</p>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-2 text-white hover:bg-white/10 hover:text-white font-medium border border-white/20" 
                    onClick={handleLogout}
                  >
                    تسجيل الخروج
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo and Brand Name */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#1A1A2E]">البجع للسفر</span>
          </Link>
          <div className="w-8 h-8 rounded-full bg-[#E8F7FD] flex items-center justify-center text-[#0077B6] font-bold text-xs shadow-sm">
            {user.name?.charAt(0) || "B"}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
