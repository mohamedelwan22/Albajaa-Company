import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useListTickets, useDeleteTicket, getListTicketsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Plus, Trash2, Eye, ArrowUpDown, ChevronLeft, ChevronRight,
  FileText, Plane, Loader2, X,
} from "lucide-react";
import type { Ticket } from "@workspace/api-client-react";

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: "معلق", color: "bg-amber-50 text-amber-700 border-amber-200" },
  EDITING: { label: "قيد التعديل", color: "bg-blue-50 text-blue-700 border-blue-200" },
  GENERATED: { label: "مولّدة", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  SENT: { label: "مُرسلة", color: "bg-purple-50 text-purple-700 border-purple-200" },
};

type SortField = "passengerName" | "flightFrom" | "departureDate" | "status" | "createdAt";
type SortDir = "asc" | "desc";
const PAGE_SIZE = 10;

export default function Tickets() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useListTickets();
  const deleteTicket = useDeleteTicket();

  const tickets = data?.tickets ?? [];

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Sort state
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Delete confirm modal
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deletingMany, setDeletingMany] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let result = [...tickets];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((t) =>
        t.passengerName?.toLowerCase().includes(q) ||
        t.bookingReference?.toLowerCase().includes(q) ||
        t.ticketNumber?.toLowerCase().includes(q) ||
        t.flightFrom?.toLowerCase().includes(q) ||
        t.flightTo?.toLowerCase().includes(q) ||
        t.airline?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

    result.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      let va = (a as any)[sortField] ?? "";
      let vb = (b as any)[sortField] ?? "";
      if (sortField === "createdAt") {
        return dir * (new Date(va).getTime() - new Date(vb).getTime());
      }
      return dir * String(va).localeCompare(String(vb));
    });

    return result;
  }, [tickets, search, statusFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageTickets = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <ArrowUpDown className={`h-3.5 w-3.5 mr-1 opacity-40 ${sortField === field ? "opacity-100 text-accent" : ""}`} />
  );

  // Selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(pageTickets.map((t) => t.id)));
      setSelectAll(true);
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectAll(false);
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    setDeletingMany(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((id) => deleteTicket.mutateAsync({ id })));
      toast({ title: "تم الحذف", description: `تم حذف ${ids.length} تذكرة بنجاح` });
      queryClient.invalidateQueries({ queryKey: getListTicketsQueryKey() });
      clearSelection();
    } catch {
      toast({ title: "خطأ", description: "فشل حذف بعض التذاكر", variant: "destructive" });
    } finally {
      setDeletingMany(false);
    }
  };

  // Single delete
  const handleDelete = async (id: string) => {
    try {
      await deleteTicket.mutateAsync({ id });
      toast({ title: "تم الحذف", description: "تم حذف التذكرة بنجاح" });
      queryClient.invalidateQueries({ queryKey: getListTicketsQueryKey() });
    } catch {
      toast({ title: "خطأ", description: "فشل حذف التذكرة", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const renderSortHeader = (label: string, field: SortField) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
    >
      <SortIcon field={field} />
      {label}
    </button>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">التذاكر</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              إدارة جميع التذاكر — {tickets.length} تذكرة
            </p>
          </div>
          <Link href="/dashboard/tickets/new">
            <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm">
              <Plus className="h-4 w-4" />
              تذكرة جديدة
            </Button>
          </Link>
        </div>

        {/* Search + Filter + Bulk bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-1 gap-3 w-full sm:max-w-md">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم، PNR، رقم التذكرة..."
                className="pr-9 h-10 bg-card border-border"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px] h-10 bg-card border-border">
                <SelectValue placeholder="جميع الحالات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="PENDING">معلق</SelectItem>
                <SelectItem value="EDITING">قيد التعديل</SelectItem>
                <SelectItem value="GENERATED">مولّدة</SelectItem>
                <SelectItem value="SENT">مُرسلة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{selectedIds.size} محددة</span>
              <Button variant="ghost" size="sm" onClick={clearSelection} className="h-9 text-xs">
                <X className="h-3.5 w-3.5 ml-1" />
                إلغاء
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-9 text-xs gap-1"
                onClick={() => setDeleteTarget("__bulk__")}
                disabled={deletingMany}
              >
                {deletingMany ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                حذف المحدد
              </Button>
            </div>
          )}
        </div>

        {/* Table Card */}
        <Card className="border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectAll && pageTickets.length > 0}
                      onCheckedChange={toggleSelectAll}
                      aria-label="تحديد الكل"
                    />
                  </TableHead>
                  <TableHead>{renderSortHeader("المسافر", "passengerName")}</TableHead>
                  <TableHead>{renderSortHeader("الرحلة", "flightFrom")}</TableHead>
                  <TableHead className="hidden md:table-cell">شركة الطيران</TableHead>
                  <TableHead className="hidden md:table-cell">PNR</TableHead>
                  <TableHead>{renderSortHeader("الحالة", "status")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{renderSortHeader("التاريخ", "createdAt")}</TableHead>
                  <TableHead className="text-left w-24">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : pageTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-40 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">لا توجد تذاكر</p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {search || statusFilter !== "all"
                              ? "لم يتم العثور على نتائج للبحث. جرب معايير أخرى."
                              : "لم يتم رفع أي تذاكر بعد. ابدأ برفع أول تذكرة."}
                          </p>
                        </div>
                        {!search && statusFilter === "all" && (
                          <Link href="/dashboard/tickets/new">
                            <Button size="sm" className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                              <Plus className="h-4 w-4" />
                              رفع تذكرة
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pageTickets.map((ticket: Ticket) => {
                    const status = statusConfig[ticket.status] || { label: ticket.status, color: "bg-gray-50 text-gray-700" };
                    return (
                      <TableRow
                        key={ticket.id}
                        className="border-b border-border hover:bg-muted/30 transition-colors"
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(ticket.id)}
                            onCheckedChange={() => toggleSelect(ticket.id)}
                            aria-label="تحديد"
                          />
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-foreground text-sm">
                            {ticket.passengerName || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <span className="font-medium text-foreground">{ticket.flightFrom || "—"}</span>
                            <span className="text-muted-foreground">←</span>
                            <span className="font-medium text-foreground">{ticket.flightTo || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {ticket.airline || "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="font-mono text-xs font-bold text-secondary tracking-wider">
                            {ticket.bookingReference || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs font-semibold border ${status.color}`}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {new Date(ticket.createdAt).toLocaleDateString("ar-IQ", {
                            year: "numeric", month: "short", day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => setLocation(`/dashboard/tickets/${ticket.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteTarget(ticket.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-border">
              <span className="text-sm text-muted-foreground">
                صفحة {safePage} من {totalPages} ({filtered.length} نتيجة)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }).map((_, i) => {
                  const p = i + 1;
                  const show = p === 1 || p === totalPages || Math.abs(p - safePage) <= 1;
                  if (!show) return i === 1 ? <span key={p} className="text-muted-foreground px-1">...</span> : null;
                  return (
                    <Button
                      key={p}
                      variant={p === safePage ? "default" : "outline"}
                      size="sm"
                      className={`h-8 min-w-[2rem] px-2 text-xs ${p === safePage ? "bg-primary text-primary-foreground" : ""}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(safePage + 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Delete confirmation modal */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget === "__bulk__"
                ? `هل أنت متأكد من حذف ${selectedIds.size} تذكرة؟ لا يمكن التراجع عن هذا الإجراء.`
                : "هل أنت متأكد من حذف هذه التذكرة؟ لا يمكن التراجع عن هذا الإجراء."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget === "__bulk__") {
                  handleBulkDelete();
                } else if (deleteTarget) {
                  handleDelete(deleteTarget);
                }
              }}
            >
              {deleteTarget === "__bulk__" && deletingMany ? (
                <Loader2 className="h-4 w-4 animate-spin ml-1" />
              ) : null}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
