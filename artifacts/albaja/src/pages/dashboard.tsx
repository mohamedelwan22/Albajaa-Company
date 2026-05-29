import { Link } from "wouter";
import { useGetTicketStats } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Clock, CheckCircle2, Edit, Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const statusMap: Record<string, { label: string, colorClass: string }> = {
  PENDING: { label: "معلق", colorClass: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  EDITING: { label: "قيد التعديل", colorClass: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  GENERATED: { label: "جاهزة / مولّدة", colorClass: "bg-[#E8F7FD] text-[#0077B6] border-[#00AEEF]/20" },
  SENT: { label: "مُرسلة", colorClass: "bg-green-100 text-green-800 border-green-200" },
};

export default function Dashboard() {
  const { data: stats, isLoading } = useGetTicketStats();

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#1A1A2E]">لوحة التحكم</h1>
            <p className="text-[#6B7280] mt-1 font-medium">مرحباً بك في منصة البجع. نظرة عامة على التذاكر المصدرة والمستخرجة بالـ AI.</p>
          </div>
          <Link href="/dashboard/tickets/new">
            <Button 
              size="lg" 
              className="gap-2 bg-gradient-to-r from-[#F7931E] to-[#E07B0A] text-white font-bold transition-transform duration-200 hover:scale-[1.02] shadow-lg shadow-[#F7931E]/30 rounded-xl"
            >
              <Plus className="h-5 w-5" />
              تذكرة جديدة
            </Button>
          </Link>
        </div>

        {/* Stats Cards Section */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total */}
          <Card className="bg-white rounded-xl border border-gray-100 shadow-md shadow-slate-100/50 p-5 flex flex-row items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-[#E8F7FD] flex items-center justify-center text-[#00AEEF] shrink-0">
              <FileText className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#6B7280]">إجمالي التذاكر</span>
              <span className="text-3xl font-extrabold text-[#1A1A2E] mt-1">
                {isLoading ? "-" : stats?.total || 0}
              </span>
            </div>
          </Card>

          {/* Card 2: Pending */}
          <Card className="bg-white rounded-xl border border-gray-100 shadow-md shadow-slate-100/50 p-5 flex flex-row items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center text-[#F7931E] shrink-0">
              <Clock className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#6B7280]">تذاكر معلقة</span>
              <span className="text-3xl font-extrabold text-[#1A1A2E] mt-1">
                {isLoading ? "-" : stats?.pending || 0}
              </span>
            </div>
          </Card>

          {/* Card 3: Editing */}
          <Card className="bg-white rounded-xl border border-gray-100 shadow-md shadow-slate-100/50 p-5 flex flex-row items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center text-[#E07B0A] shrink-0">
              <Edit className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#6B7280]">قيد التعديل</span>
              <span className="text-3xl font-extrabold text-[#1A1A2E] mt-1">
                {isLoading ? "-" : stats?.editing || 0}
              </span>
            </div>
          </Card>

          {/* Card 4: Ready/Generated */}
          <Card className="bg-white rounded-xl border border-gray-100 shadow-md shadow-slate-100/50 p-5 flex flex-row items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center text-green-600 shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#6B7280]">تذاكر جاهزة / مرسلة</span>
              <span className="text-3xl font-extrabold text-[#1A1A2E] mt-1">
                {isLoading ? "-" : (stats?.generated || 0) + (stats?.sent || 0)}
              </span>
            </div>
          </Card>
        </div>

        {/* Table Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#1A1A2E]">أحدث التذاكر المرفوعة</h2>
          <Card className="border border-gray-100 shadow-sm rounded-xl overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-gradient-to-r from-[#0077B6] to-[#00AEEF] hover:bg-none">
                <TableRow className="hover:bg-transparent border-0">
                  <TableHead className="w-[120px] text-right font-bold text-white h-12">رمز الحجز PNR</TableHead>
                  <TableHead className="text-right font-bold text-white h-12">اسم المسافر</TableHead>
                  <TableHead className="text-right font-bold text-white h-12">الرحلة والوجهة</TableHead>
                  <TableHead className="text-right font-bold text-white h-12">تاريخ المغادرة</TableHead>
                  <TableHead className="text-right font-bold text-white h-12">الحالة</TableHead>
                  <TableHead className="text-left font-bold text-white h-12 px-6">الخيارات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-[#6B7280] font-medium">
                      جاري تحميل بيانات التذاكر...
                    </TableCell>
                  </TableRow>
                ) : !stats?.recentTickets?.length ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-[#6B7280] font-medium">
                      لا توجد تذاكر مسجلة حالياً. قم برفع أول تذكرة الآن!
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.recentTickets.map((ticket, index) => {
                    const status = statusMap[ticket.status] || { label: ticket.status, colorClass: "bg-gray-100 text-gray-700" };
                    return (
                      <TableRow 
                        key={ticket.id} 
                        className={`transition-colors duration-150 hover:bg-[#E8F7FD] border-b border-gray-50 ${
                          index % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]"
                        }`}
                      >
                        <TableCell className="font-bold font-mono text-[#0077B6] uppercase">
                          {ticket.bookingReference || "-"}
                        </TableCell>
                        <TableCell className="font-semibold text-[#1A1A2E]">
                          {ticket.passengerName || "غير محدد"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <span className="text-[#1A1A2E]">{ticket.flightFrom || "-"}</span>
                            <span className="text-[#6B7280] font-bold">←</span>
                            <span className="text-[#1A1A2E]">{ticket.flightTo || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-[#6B7280]">
                          {ticket.departureDate || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${status.colorClass}`}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-left px-6">
                          <Link href={`/dashboard/tickets/${ticket.id}`}>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-[#0077B6] hover:text-[#00AEEF] hover:bg-[#E8F7FD] font-bold rounded-lg gap-1.5"
                            >
                              <span>تعديل ومعاينة</span>
                              <ArrowLeft className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
