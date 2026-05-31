import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { 
  useGetTicket, getGetTicketQueryKey, 
  useUpdateTicket,
  useGetCompany
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  ArrowRight, Save, FileText, ChevronDown, 
  CheckCircle2, Download, Loader2, Zap, Plane,
  User, BookOpen, MapPin, DollarSign, Share2, Eye,
} from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const ticketSchema = z.object({
  passengerName: z.string().nullable().optional(),
  passengerArabicName: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  passengerType: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  passportNumber: z.string().nullable().optional(),
  ticketNumber: z.string().nullable().optional(),
  bookingReference: z.string().nullable().optional(),
  flightFrom: z.string().nullable().optional(),
  flightTo: z.string().nullable().optional(),
  departureDate: z.string().nullable().optional(),
  departureTime: z.string().nullable().optional(),
  arrivalDate: z.string().nullable().optional(),
  arrivalTime: z.string().nullable().optional(),
  airline: z.string().nullable().optional(),
  flightNumber: z.string().nullable().optional(),
  cabinClass: z.string().nullable().optional(),
  baggageAllowance: z.string().nullable().optional(),
  gate: z.string().nullable().optional(),
  seatNumber: z.string().nullable().optional(),
  price: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  issueDate: z.string().nullable().optional(),
  hidePrice: z.boolean().optional()
});

const statusMap: Record<string, { label: string, color: string }> = {
  PENDING: { label: "معلق", color: "bg-amber-50 text-amber-700 border-amber-200" },
  EDITING: { label: "قيد التعديل", color: "bg-blue-50 text-blue-700 border-blue-200" },
  GENERATED: { label: "مولّدة", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  SENT: { label: "مُرسلة للعميل", color: "bg-purple-50 text-purple-700 border-purple-200" },
};

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export default function TicketDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showEmailInput, setShowEmailInput] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [returnTicket, setReturnTicket] = useState<any | null>(null);

  const { data: ticketRes, isLoading } = useGetTicket(id || "", { 
    query: { enabled: !!id, queryKey: getGetTicketQueryKey(id || "") } 
  });
  
  const ticket = ticketRes?.ticket;
  const updateTicket = useUpdateTicket();

  const isRoundTrip = (ticket as any)?.isRoundTrip === true || (ticket as any)?.linkedTicketId != null;

  const form = useForm<z.infer<typeof ticketSchema>>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      passengerName: "", passengerArabicName: "", nationality: "", passengerType: "",
      dateOfBirth: "", passportNumber: "", ticketNumber: "", bookingReference: "",
      flightFrom: "", flightTo: "", departureDate: "", departureTime: "",
      arrivalDate: "", arrivalTime: "", airline: "", flightNumber: "",
      cabinClass: "", baggageAllowance: "", gate: "", seatNumber: "",
      price: "", currency: "USD", issueDate: "", hidePrice: false
    }
  });

  useEffect(() => {
    if (ticket) {
      form.reset({
        passengerName: ticket.passengerName || "", passengerArabicName: ticket.passengerArabicName || "",
        nationality: ticket.nationality || "", passengerType: ticket.passengerType || "",
        dateOfBirth: ticket.dateOfBirth || "", passportNumber: ticket.passportNumber || "",
        ticketNumber: ticket.ticketNumber || "", bookingReference: ticket.bookingReference || "",
        flightFrom: ticket.flightFrom || "", flightTo: ticket.flightTo || "",
        departureDate: ticket.departureDate || "", departureTime: ticket.departureTime || "",
        arrivalDate: ticket.arrivalDate || "", arrivalTime: ticket.arrivalTime || "",
        airline: ticket.airline || "", flightNumber: ticket.flightNumber || "",
        cabinClass: ticket.cabinClass || "", baggageAllowance: ticket.baggageAllowance || "",
        gate: ticket.gate || "", seatNumber: ticket.seatNumber || "",
        price: ticket.price || "", currency: ticket.currency || "USD",
        issueDate: ticket.issueDate || "", hidePrice: ticket.hidePrice || false
      });
    }
  }, [ticket, form]);

  useEffect(() => {
    const linkedId = (ticket as any)?.linkedTicketId;
    if (!linkedId) { setReturnTicket(null); return; }
    fetch(`/api/tickets/${linkedId}`)
      .then(r => r.json())
      .then(data => setReturnTicket(data.ticket))
      .catch(() => {});
  }, [ticket]);

  const onSubmit = (values: z.infer<typeof ticketSchema>) => {
    if (!id) return;
    updateTicket.mutate(
      { id, data: values },
      {
        onSuccess: (data) => {
          toast({ title: "تم الحفظ", description: "تم حفظ بيانات التذكرة بنجاح" });
          queryClient.setQueryData(getGetTicketQueryKey(id), data);
        },
        onError: () => {
          toast({ title: "خطأ", description: "تعذر حفظ التذكرة", variant: "destructive" });
        }
      }
    );
  };

  const handleGeneratePdf = async () => {
    if (!id) return;
    setIsGenerating(true);
    try {
      const outboundValues = form.getValues();
      await new Promise<void>((resolve, reject) => {
        updateTicket.mutate(
          { id, data: outboundValues },
          {
            onSuccess: (data) => {
              queryClient.setQueryData(getGetTicketQueryKey(id), data);
              resolve();
            },
            onError: () => reject(new Error("Save failed"))
          }
        );
      });
      const res = await fetch(`/api/tickets/${id}/generate`, { method: "POST" });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      toast({ title: "تم توليد التذكرة", description: "تذكرة البجع جاهزة للمشاركة الآن" });
      queryClient.setQueryData(getGetTicketQueryKey(id), data);
    } catch (e) {
      toast({ title: "خطأ", description: "فشل في توليد الـ PDF", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (!ticket?.generatedFileUrl) return;
    const passengerName = ticket.passengerName ?? "العميل";
    const from = ticket.flightFrom ?? "";
    const to = ticket.flightTo ?? "";
    const date = ticket.departureDate ?? "";
    const pdfUrl = ticket.generatedFileUrl;
    const message = `✈️ تذكرة سفرك جاهزة - البجع للسفر والسياحة\n\n👤 المسافر: ${passengerName}\n🛫 من: ${from} إلى: ${to}\n📅 التاريخ: ${date}\n\n📎 رابط التذكرة:\n${pdfUrl}\n\n⚠️ تعليمات السفر الهامة:\n- الحضور للمطار قبل 3 ساعات\n- صلاحية الجواز أكثر من 6 أشهر\n- التأكد من صلاحية التأشيرة\n- الالتزام بوزن الأمتعة المسموح\n\nالبجع للسفر والسياحة\n📞 07708809825\n🌐 www.albaja.com.iq`.trim();
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleEmailShare = () => {
    if (!ticket?.generatedFileUrl || !emailInput.includes("@")) return;
    const passengerName = ticket.passengerName ?? "العميل";
    const pdfUrl = ticket.generatedFileUrl;
    const subject = encodeURIComponent(`تذكرة سفرك - ${passengerName} - البجع للسفر والسياحة`);
    const body = encodeURIComponent(`مرحباً ${passengerName}،\n\nنرسل لكم تذكرة سفركم عبر الرابط التالي:\n${pdfUrl}\n\nمع تحيات،\nالبجع للسفر والسياحة\n📞 07708809825\n🌐 www.albaja.com.iq`);
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailInput)}&su=${subject}&body=${body}`, "_blank");
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    );
  }
  if (!ticket) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <p className="font-semibold text-foreground">التذكرة غير موجودة</p>
          <Link href="/dashboard/tickets">
            <Button variant="outline" className="gap-2">
              <ArrowRight className="h-4 w-4" />
              العودة للتذاكر
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard/tickets")} className="text-foreground">
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-foreground">بيانات التذكرة</h1>
                <Badge variant="outline" className={`text-xs font-semibold border ${statusMap[ticket.status]?.color}`}>
                  {statusMap[ticket.status]?.label || ticket.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{ticket.id}</p>
            </div>
          </div>
        </div>

        {/* Round trip banner */}
        {isRoundTrip && returnTicket && (
          <Card className="border-border bg-gradient-to-r from-primary/5 to-transparent shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <span className="font-bold text-sm text-foreground">{ticket.flightFrom || "---"}</span>
                  <span className="text-accent mx-2">✈</span>
                  <span className="font-bold text-sm text-foreground">{ticket.flightTo || "---"}</span>
                  <span className="text-xs text-muted-foreground mr-3">
                    {ticket.departureTime || "--:--"} ← {ticket.arrivalTime || "--:--"}
                  </span>
                  {(ticket as any).transitAirports && (
                    <span className="text-xs text-muted-foreground mr-2">(ترانزيت: {(ticket as any).transitAirports})</span>
                  )}
                </div>
                <div className="flex-1">
                  <span className="font-bold text-sm text-foreground">{returnTicket.flightFrom || "---"}</span>
                  <span className="text-accent mx-2">✈</span>
                  <span className="font-bold text-sm text-foreground">{returnTicket.flightTo || "---"}</span>
                  <span className="text-xs text-muted-foreground mr-3">
                    {returnTicket.departureTime || "--:--"} ← {returnTicket.arrivalTime || "--:--"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* Left: Form sections */}
          <div className="lg:col-span-3 space-y-5">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* Section 1: Passenger Information */}
                <Card className="border-border bg-card shadow-sm">
                  <CardHeader className="px-5 py-4 border-b border-border">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-accent" />
                      <CardTitle className="text-sm font-bold text-foreground">معلومات المسافر</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="passengerName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-muted-foreground">اسم المسافر (English)</FormLabel>
                        <FormControl><Input className="border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="passengerArabicName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-muted-foreground">اسم المسافر (عربي)</FormLabel>
                        <FormControl><Input className="border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="nationality" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-muted-foreground">الجنسية</FormLabel>
                        <FormControl><Input className="border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="passengerType" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-muted-foreground">نوع المسافر</FormLabel>
                        <FormControl><Input placeholder="Adult / Child / Infant" className="border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-muted-foreground">تاريخ الميلاد</FormLabel>
                        <FormControl><Input type="date" className="border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="passportNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-muted-foreground">رقم الجواز</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left font-mono uppercase border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>

                {/* Section 2: Booking Information */}
                <Card className="border-border bg-card shadow-sm">
                  <CardHeader className="px-5 py-4 border-b border-border">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-accent" />
                      <CardTitle className="text-sm font-bold text-foreground">معلومات الحجز</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="bookingReference" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-muted-foreground">مرجع الحجز (PNR)</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left font-mono uppercase border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="ticketNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-muted-foreground">رقم التذكرة الإلكترونية</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left font-mono border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="issueDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-muted-foreground">تاريخ الإصدار</FormLabel>
                        <FormControl><Input type="date" className="border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="seatNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-muted-foreground">رقم المقعد</FormLabel>
                        <FormControl><Input className="border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>

                {/* Section 3: Flight Information */}
                <Card className="border-border bg-card shadow-sm">
                  <CardHeader className="px-5 py-4 border-b border-border">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-accent" />
                      <CardTitle className="text-sm font-bold text-foreground">معلومات الرحلة</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="airline" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground">شركة الطيران</FormLabel>
                          <FormControl><Input className="border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="flightNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground">رقم الرحلة</FormLabel>
                          <FormControl><Input dir="ltr" className="text-left font-mono border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="flightFrom" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground">محطة المغادرة (من)</FormLabel>
                          <FormControl><Input className="border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="flightTo" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground">محطة الوصول (إلى)</FormLabel>
                          <FormControl><Input className="border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <FormField control={form.control} name="departureDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground">تاريخ المغادرة</FormLabel>
                          <FormControl><Input type="date" className="border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="departureTime" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground">وقت المغادرة</FormLabel>
                          <FormControl><Input type="time" className="border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="arrivalDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground">تاريخ الوصول</FormLabel>
                          <FormControl><Input type="date" className="border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="arrivalTime" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground">وقت الوصول</FormLabel>
                          <FormControl><Input type="time" className="border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="cabinClass" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground">الدرجة</FormLabel>
                          <FormControl><Input placeholder="Economy / Business" className="border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="baggageAllowance" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground">الوزن المسموح</FormLabel>
                          <FormControl><Input placeholder="30KG / 2PC" className="border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="gate" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground">بوابة الصعود</FormLabel>
                          <FormControl><Input className="border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                  </CardContent>
                </Card>

                {/* Section 4: Pricing Information */}
                <Card className="border-border bg-card shadow-sm">
                  <CardHeader className="px-5 py-4 border-b border-border">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-accent" />
                      <CardTitle className="text-sm font-bold text-foreground">معلومات السعر</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5">
                    <div className="grid md:grid-cols-3 gap-4">
                      <FormField control={form.control} name="price" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground">السعر</FormLabel>
                          <FormControl><Input type="number" dir="ltr" className="text-left border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="currency" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground">العملة</FormLabel>
                          <FormControl><Input dir="ltr" className="text-left border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="hidePrice" render={({ field }) => (
                        <FormItem className="flex items-center gap-3 space-y-0 pt-6">
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          <Label className="text-sm font-semibold text-foreground cursor-pointer">إخفاء السعر من التذكرة</Label>
                        </FormItem>
                      )} />
                    </div>
                  </CardContent>
                </Card>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    type="button" 
                    onClick={handleGeneratePdf} 
                    className="flex-1 h-12 bg-accent text-accent-foreground hover:bg-accent/90 font-bold rounded-lg gap-2 shadow-sm"
                    disabled={isGenerating || updateTicket.isPending}
                  >
                    {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                    {isRoundTrip ? "🖨 توليد التذكرة (PDF)" : "توليد التذكرة"}
                  </Button>
                  <Button 
                    type="submit" 
                    variant="outline" 
                    className="sm:w-[180px] h-12 border-2 border-border hover:border-accent text-foreground hover:text-accent hover:bg-accent/5 font-bold rounded-lg gap-2"
                    disabled={updateTicket.isPending || isGenerating}
                  >
                    {updateTicket.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                    حفظ التعديلات
                  </Button>
                </div>
              </form>
            </Form>

            {/* Raw text collapse */}
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="p-4">
                <Collapsible className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      النص المستخرج من الـ PDF
                    </span>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground">
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <div className="bg-muted p-4 rounded-lg text-xs font-mono whitespace-pre-wrap max-h-[300px] overflow-auto text-left border border-border" dir="ltr">
                      {ticket.rawText || "لا يوجد نص مستخرج"}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          </div>

          {/* Right: Preview + Actions */}
          <div className="lg:col-span-2 space-y-5">
            {/* PDF Preview */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-accent" />
                  <CardTitle className="text-sm font-bold text-foreground">معاينة التذكرة</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {ticket.generatedFileUrl ? (
                  <div className="space-y-4">
                    <div className="relative w-full h-[600px] bg-muted border border-border rounded-lg overflow-hidden">
                      <iframe 
                        src={ticket.generatedFileUrl} 
                        className="w-full h-full" 
                        title="PDF Preview"
                      />
                    </div>
                    <Button 
                      asChild
                      className="w-full h-11 bg-accent text-accent-foreground hover:bg-accent/90 font-bold rounded-lg gap-2 shadow-sm"
                    >
                      <a href={ticket.generatedFileUrl} target="_blank" rel="noopener noreferrer" download>
                        <Download className="h-4 w-4" />
                        تحميل PDF
                      </a>
                    </Button>
                  </div>
                ) : (
                  <div className="w-full h-[300px] bg-muted border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center p-6 text-center">
                    <div className="h-14 w-14 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-4">
                      <Plane className="h-7 w-7" />
                    </div>
                    <h4 className="font-bold text-sm text-foreground">لم تولّد بعد</h4>
                    <p className="text-xs text-muted-foreground mt-1.5 max-w-[200px]">
                      املأ البيانات واضغط على "توليد التذكرة"
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Share actions */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-accent" />
                  <CardTitle className="text-sm font-bold text-foreground">مشاركة التذكرة</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <button
                  onClick={handleWhatsAppShare}
                  disabled={!ticket.generatedFileUrl}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  مشاركة عبر واتساب
                </button>
                {!showEmailInput ? (
                  <button
                    onClick={() => setShowEmailInput(true)}
                    disabled={!ticket.generatedFileUrl}
                    className="w-full flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold py-2.5 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                    إرسال عبر البريد
                  </button>
                ) : (
                  <div className="space-y-2">
                    <Input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="البريد الإلكتروني للعميل"
                      className="border-border bg-background focus:border-accent rounded-lg"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleEmailShare}
                        disabled={!emailInput.includes("@")}
                        className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold h-9 rounded-lg text-xs"
                      >
                        فتح Gmail
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => { setShowEmailInput(false); setEmailInput(""); }}
                        className="h-9 px-3 border-border text-muted-foreground rounded-lg text-xs"
                      >
                        إلغاء
                      </Button>
                    </div>
                  </div>
                )}
                {!ticket.generatedFileUrl && (
                  <p className="text-xs text-center text-muted-foreground">يجب توليد التذكرة أولاً</p>
                )}
              </CardContent>
            </Card>

            {/* Original file */}
            {ticket.originalFileUrl && (
              <Card className="border-border bg-card shadow-sm">
                <CardContent className="p-4">
                  <Button variant="outline" className="w-full h-10 border-border text-muted-foreground hover:text-foreground font-semibold rounded-lg text-sm gap-2" asChild>
                    <a href={ticket.originalFileUrl} target="_blank" rel="noopener noreferrer">
                      <FileText className="h-4 w-4" />
                      الملف الأصلي المرفوع
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
