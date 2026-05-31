import { Link } from "wouter";
import { useGetTicketStats } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, Clock, CheckCircle2, Edit, Plus, ArrowLeft, Plane,
  TrendingUp, Users, Ticket,
} from "lucide-react";
import type { Ticket as TicketType } from "@workspace/api-client-react/generated/api.schemas";

const statusMap: Record<string, { label: string, color: string }> = {
  PENDING: { label: "معلق", color: "bg-amber-50 text-amber-700 border-amber-200" },
  EDITING: { label: "قيد التعديل", color: "bg-blue-50 text-blue-700 border-blue-200" },
  GENERATED: { label: "مولّدة", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  SENT: { label: "مُرسلة", color: "bg-purple-50 text-purple-700 border-purple-200" },
};

export default function Dashboard() {
  const { data: stats, isLoading } = useGetTicketStats();

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">لوحة التحكم</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              نظرة عامة على التذاكر المصدرة والمستخرجة بالذكاء الاصطناعي
            </p>
          </div>
          <Link href="/dashboard/tickets/new">
            <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm">
              <Plus className="h-4 w-4" />
              تذكرة جديدة
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "إجمالي التذاكر", value: stats?.total ?? 0, icon: Ticket, color: "text-primary", bg: "bg-primary/5" },
            { label: "معلقة", value: stats?.pending ?? 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "قيد التعديل", value: stats?.editing ?? 0, icon: Edit, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "جاهزة / مولّدة", value: (stats?.generated ?? 0) + (stats?.sent ?? 0), icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="border-border bg-card shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-6 w-6 ${item.color}`} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                      <p className="text-2xl font-bold text-foreground mt-0.5">
                        {isLoading ? <Skeleton className="h-7 w-12" /> : item.value}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions + Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Activity (2/3) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">أحدث التذاكر</h2>
              <Link href="/dashboard/tickets">
                <Button variant="ghost" size="sm" className="text-sm text-muted-foreground hover:text-foreground gap-1">
                  عرض الكل
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            <Card className="border-border bg-card shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : !stats?.recentTickets?.length ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
                    <FileText className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="font-semibold text-foreground">لا توجد تذاكر بعد</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    ارفع أول تذكرة طيران PDF وسيقوم النظام باستخراج البيانات تلقائياً.
                  </p>
                  <Link href="/dashboard/tickets/new">
                    <Button className="mt-4 gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                      <Plus className="h-4 w-4" />
                      رفع تذكرة
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {stats.recentTickets.map((ticket: TicketType) => {
                    const status = statusMap[ticket.status] || { label: ticket.status, color: "bg-gray-50 text-gray-700" };
                    return (
                      <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`}>
                        <div className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer">
                          <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                            <Plane className="h-5 w-5 text-primary/60" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">
                              {ticket.passengerName || "مسافر غير محدد"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {ticket.flightFrom || "—"} ← {ticket.flightTo || "—"}
                              {ticket.departureDate ? ` — ${ticket.departureDate}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <Badge variant="outline" className={`text-xs font-semibold border ${status.color}`}>
                              {status.label}
                            </Badge>
                            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Quick Actions (1/3) */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">إجراءات سريعة</h2>
            <div className="grid gap-3">
              <Link href="/dashboard/tickets/new">
                <Card className="border-border bg-card shadow-sm hover:shadow-md hover:border-accent/30 transition-all cursor-pointer group">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                      <Plus className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">رفع تذكرة جديدة</p>
                      <p className="text-xs text-muted-foreground">PDF مع استخراج تلقائي</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/dashboard/tickets">
                <Card className="border-border bg-card shadow-sm hover:shadow-md hover:border-accent/30 transition-all cursor-pointer group">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <Ticket className="h-5 w-5 text-primary/60" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">جميع التذاكر</p>
                      <p className="text-xs text-muted-foreground">عرض وإدارة التذاكر</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/settings">
                <Card className="border-border bg-card shadow-sm hover:shadow-md hover:border-accent/30 transition-all cursor-pointer group">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-muted/80 transition-colors">
                      <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">الإعدادات</p>
                      <p className="text-xs text-muted-foreground">الهوية البصرية للشركة</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Summary mini-card */}
            {!isLoading && stats && (
              <Card className="border-border bg-gradient-to-br from-primary/5 to-transparent shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Users className="h-5 w-5 text-primary/60" />
                    <span className="text-sm font-bold text-foreground">ملخص سريع</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">تم الرفع</span>
                      <span className="font-semibold text-foreground">{stats.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">قيد المعالجة</span>
                      <span className="font-semibold text-foreground">{stats.pending + stats.editing}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">مكتملة</span>
                      <span className="font-semibold text-emerald-600">{stats.generated + stats.sent}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
