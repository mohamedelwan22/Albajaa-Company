import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { 
  useGetTicket, getGetTicketQueryKey, 
  useUpdateTicket,
  useGetCompany
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  ArrowRight, Save, FileText, ChevronDown, 
  CheckCircle2, Download, Loader2, Zap, Plane
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
  PENDING: { label: "معلق", color: "bg-amber-100 text-amber-800 border-amber-200" },
  EDITING: { label: "قيد التعديل", color: "bg-blue-100 text-blue-800 border-blue-200" },
  GENERATED: { label: "مولّدة / جاهزة", color: "bg-[#E8F7FD] text-[#0077B6] border-[#00AEEF]/20" },
  SENT: { label: "مُرسلة للعميل", color: "bg-green-100 text-green-800 border-green-200" },
};

export default function TicketDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showEmailInput, setShowEmailInput] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: ticketRes, isLoading } = useGetTicket(id || "", { 
    query: { enabled: !!id, queryKey: getGetTicketQueryKey(id || "") } 
  });
  
  const ticket = ticketRes?.ticket;
  const updateTicket = useUpdateTicket();

  const form = useForm<z.infer<typeof ticketSchema>>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      passengerName: "",
      passengerArabicName: "",
      nationality: "",
      passengerType: "",
      dateOfBirth: "",
      passportNumber: "",
      ticketNumber: "",
      bookingReference: "",
      flightFrom: "",
      flightTo: "",
      departureDate: "",
      departureTime: "",
      arrivalDate: "",
      arrivalTime: "",
      airline: "",
      flightNumber: "",
      cabinClass: "",
      baggageAllowance: "",
      gate: "",
      seatNumber: "",
      price: "",
      currency: "USD",
      issueDate: "",
      hidePrice: false
    }
  });

  useEffect(() => {
    if (ticket) {
      form.reset({
        passengerName: ticket.passengerName || "",
        passengerArabicName: ticket.passengerArabicName || "",
        nationality: ticket.nationality || "",
        passengerType: ticket.passengerType || "",
        dateOfBirth: ticket.dateOfBirth || "",
        passportNumber: ticket.passportNumber || "",
        ticketNumber: ticket.ticketNumber || "",
        bookingReference: ticket.bookingReference || "",
        flightFrom: ticket.flightFrom || "",
        flightTo: ticket.flightTo || "",
        departureDate: ticket.departureDate || "",
        departureTime: ticket.departureTime || "",
        arrivalDate: ticket.arrivalDate || "",
        arrivalTime: ticket.arrivalTime || "",
        airline: ticket.airline || "",
        flightNumber: ticket.flightNumber || "",
        cabinClass: ticket.cabinClass || "",
        baggageAllowance: ticket.baggageAllowance || "",
        gate: ticket.gate || "",
        seatNumber: ticket.seatNumber || "",
        price: ticket.price || "",
        currency: ticket.currency || "USD",
        issueDate: ticket.issueDate || "",
        hidePrice: ticket.hidePrice || false
      });
    }
  }, [ticket, form]);

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
      // First save changes automatically to make sure generation has fresh inputs
      const currentValues = form.getValues();
      await new Promise<void>((resolve, reject) => {
        updateTicket.mutate(
          { id, data: currentValues },
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
      toast({ title: "خطأ", description: "فشل في توليد الـ PDF بالهوية البصرية", variant: "destructive" });
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

    const message = `✈️ تذكرة سفرك جاهزة - البجع للسفر والسياحة

👤 المسافر: ${passengerName}
🛫 من: ${from} إلى: ${to}
📅 التاريخ: ${date}

📎 رابط التذكرة:
${pdfUrl}

⚠️ تعليمات السفر الهامة:
- الحضور للمطار قبل 3 ساعات
- صلاحية الجواز أكثر من 6 أشهر
- التأكد من صلاحية التأشيرة
- الالتزام بوزن الأمتعة المسموح

البجع للسفر والسياحة
📞 07708809825
🌐 www.albaja.com.iq`.trim();

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleEmailShare = () => {
    if (!ticket?.generatedFileUrl) return;
    const passengerName = ticket.passengerName ?? "العميل";
    const from = ticket.flightFrom ?? "";
    const to = ticket.flightTo ?? "";
    const date = ticket.departureDate ?? "";
    const pdfUrl = ticket.generatedFileUrl;

    const subject = encodeURIComponent(
      `تذكرة سفرك - ${passengerName} - البجع للسفر والسياحة`
    );

    const body = encodeURIComponent(`مرحباً ${passengerName}،

نرسل لكم تذكرة سفركم عبر الرابط التالي:
${pdfUrl}

تفاصيل الرحلة:
من: ${from}
إلى: ${to}
التاريخ: ${date}

⚠️ تعليمات السفر الهامة:
- الحضور إلى المطار قبل موعد الرحلة بثلاث ساعات
- أن تكون صلاحية جواز السفر أكثر من 6 أشهر
- التأكد من صلاحية التأشيرة
- الالتزام بوزن الأمتعة المسموح به
- التأكد من متطلبات الدولة المسافر إليها

مع تحيات،
البجع للسفر والسياحة
📞 07708809825
🌐 www.albaja.com.iq`.trim());

    const toEmail = encodeURIComponent(emailInput);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${toEmail}&su=${subject}&body=${body}`;
    window.open(gmailUrl, "_blank");
  };

  if (isLoading) return <DashboardLayout><div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>;
  if (!ticket) return <DashboardLayout><div>التذكرة غير موجودة</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")} className="text-[#1A1A2E]">
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#1A1A2E]">إدارة بيانات التذكرة</h1>
                <Badge variant="outline" className={`px-2 py-0.5 font-bold rounded-lg border ${statusMap[ticket.status]?.color}`}>
                  {statusMap[ticket.status]?.label || ticket.status}
                </Badge>
              </div>
              <p className="text-xs text-[#6B7280] font-mono mt-1">{ticket.id}</p>
            </div>
          </div>
        </div>

        {/* Two column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* Right column: Form (60%) */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="border border-gray-100 shadow-sm rounded-xl overflow-hidden bg-white">
              <CardHeader className="bg-gradient-to-r from-[#0077B6] to-[#00AEEF] text-white py-4 px-6">
                <CardTitle className="text-lg font-bold">بيانات التذكرة المستخرجة</CardTitle>
                <CardDescription className="text-white/80 text-xs font-medium">قم بتعديل أو تأكيد البيانات أدناه التي تظهر في التذكرة بهوية البجع</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Section 1: Passenger Info */}
                    <div className="border-r-4 border-[#F7931E] pr-4 space-y-4">
                      <h3 className="font-bold text-[#1A1A2E] text-base mb-2">بيانات المسافر الأساسية</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="passengerName" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-[#6B7280]">اسم المسافر (English)</FormLabel>
                            <FormControl><Input className="border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="passengerArabicName" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-[#6B7280]">اسم المسافر (عربي)</FormLabel>
                            <FormControl><Input className="border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="nationality" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-[#6B7280]">الجنسية</FormLabel>
                            <FormControl><Input className="border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="passengerType" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-[#6B7280]">نوع المسافر</FormLabel>
                            <FormControl><Input placeholder="Adult / Child / Infant" className="border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-[#6B7280]">تاريخ الميلاد</FormLabel>
                            <FormControl><Input type="date" className="border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="passportNumber" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-[#6B7280]">رقم الجواز</FormLabel>
                            <FormControl><Input dir="ltr" className="text-left font-mono uppercase border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="bookingReference" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-[#6B7280]">مرجع الحجز (PNR)</FormLabel>
                            <FormControl><Input dir="ltr" className="text-left font-mono uppercase border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="ticketNumber" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-[#6B7280]">رقم التذكرة الإلكترونية</FormLabel>
                            <FormControl><Input dir="ltr" className="text-left font-mono border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                          </FormItem>
                        )} />
                      </div>
                    </div>

                    {/* Section 2: Flights Info */}
                    <div className="border-r-4 border-[#00AEEF] pr-4 space-y-4 pt-2">
                      <h3 className="font-bold text-[#1A1A2E] text-base mb-2 font-cairo">تفاصيل رحلة الطيران</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="airline" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-[#6B7280]">شركة الطيران الناقلة</FormLabel>
                            <FormControl><Input className="border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="flightNumber" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-[#6B7280]">رقم الرحلة</FormLabel>
                            <FormControl><Input dir="ltr" className="text-left font-mono border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="flightFrom" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-[#6B7280]">محطة المغادرة (من)</FormLabel>
                            <FormControl><Input className="border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="flightTo" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-[#6B7280]">محطة الوصول (إلى)</FormLabel>
                            <FormControl><Input className="border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                          </FormItem>
                        )} />
                        
                        <div className="grid grid-cols-2 gap-2">
                          <FormField control={form.control} name="departureDate" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold text-[#6B7280]">تاريخ المغادرة</FormLabel>
                              <FormControl><Input type="date" className="border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="departureTime" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold text-[#6B7280]">وقت المغادرة</FormLabel>
                              <FormControl><Input type="time" className="border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                            </FormItem>
                          )} />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <FormField control={form.control} name="arrivalDate" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold text-[#6B7280]">تاريخ الوصول</FormLabel>
                              <FormControl><Input type="date" className="border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="arrivalTime" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold text-[#6B7280]">وقت الوصول</FormLabel>
                              <FormControl><Input type="time" className="border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                            </FormItem>
                          )} />
                        </div>

                        <FormField control={form.control} name="cabinClass" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-[#6B7280]">الدرجة</FormLabel>
                            <FormControl><Input placeholder="Economy / Business" className="border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="baggageAllowance" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-[#6B7280]">الوزن المسموح</FormLabel>
                            <FormControl><Input placeholder="30KG / 2PC" className="border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="gate" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-[#6B7280]">بوابة الصعود</FormLabel>
                            <FormControl><Input className="border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="seatNumber" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-[#6B7280]">رقم المقعد</FormLabel>
                            <FormControl><Input className="border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="issueDate" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-[#6B7280]">تاريخ إصدار التذكرة</FormLabel>
                            <FormControl><Input type="date" className="border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                          </FormItem>
                        )} />
                      </div>
                    </div>

                    {/* Section 3: Price Info */}
                    <div className="border-r-4 border-gray-400 pr-4 space-y-4 pt-2">
                      <h3 className="font-bold text-[#1A1A2E] text-base mb-2">معلومات الأسعار والظهور</h3>
                      <div className="grid md:grid-cols-3 gap-4 items-end">
                        <FormField control={form.control} name="price" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-[#6B7280]">السعر الرقمي</FormLabel>
                            <FormControl><Input type="number" dir="ltr" className="text-left border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="currency" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-[#6B7280]">العملة</FormLabel>
                            <FormControl><Input dir="ltr" className="text-left border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="hidePrice" render={({ field }) => (
                          <FormItem className="flex items-center gap-3 space-y-0 pb-3">
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <Label className="text-sm font-bold text-[#1A1A2E] cursor-pointer">إخفاء السعر من التذكرة</Label>
                          </FormItem>
                        )} />
                      </div>
                    </div>

                    {/* Form actions */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-100">
                      <Button 
                        type="button" 
                        onClick={handleGeneratePdf} 
                        className="flex-1 h-12 bg-gradient-to-r from-[#F7931E] to-[#E07B0A] hover:scale-[1.01] text-white font-bold rounded-xl shadow-md shadow-[#F7931E]/30 gap-2"
                        disabled={isGenerating || updateTicket.isPending}
                      >
                        {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                        توليد تذكرة الهوية البصرية ⚡
                      </Button>
                      <Button 
                        type="submit" 
                        variant="outline" 
                        className="sm:w-[200px] h-12 border-2 border-[#00AEEF] text-[#00AEEF] hover:bg-[#E8F7FD] hover:text-[#0077B6] font-bold rounded-xl gap-2"
                        disabled={updateTicket.isPending || isGenerating}
                      >
                        {updateTicket.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                        حفظ التعديلات
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Extracted text collapse */}
            <Card className="border border-gray-100 shadow-sm rounded-xl overflow-hidden bg-white">
              <CardContent className="p-4">
                <Collapsible className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#1A1A2E] flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#00AEEF]" />
                      نص الـ PDF الخام المستخرج
                    </span>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#00AEEF]">
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <div className="bg-slate-50 p-4 rounded-xl text-xs font-mono whitespace-pre-wrap max-h-[300px] overflow-auto text-left border border-gray-100" dir="ltr">
                      {ticket.rawText || "لا يوجد نص مستخرج"}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          </div>

          {/* Left column: PDF view and share actions (40%) */}
          <div className="lg:col-span-2 space-y-6">
            {/* PDF Preview Card */}
            <Card className="border border-gray-100 shadow-sm rounded-xl overflow-hidden bg-white p-5 space-y-4">
              <h3 className="font-bold text-[#1A1A2E] text-base border-r-4 border-[#0077B6] pr-2.5">
                معاينة ملف التذكرة
              </h3>
              
              {ticket.generatedFileUrl ? (
                <div className="space-y-4">
                  <div className="relative w-full h-[400px] bg-slate-50 border border-gray-100 rounded-xl overflow-hidden shadow-inner">
                    <iframe 
                      src={ticket.generatedFileUrl} 
                      className="w-full h-full" 
                      title="PDF Preview"
                    />
                  </div>
                  <Button 
                    asChild
                    className="w-full h-12 bg-gradient-to-r from-[#F7931E] to-[#E07B0A] hover:scale-[1.01] text-white font-bold rounded-xl shadow-md shadow-[#F7931E]/20 gap-2"
                  >
                    <a href={ticket.generatedFileUrl} target="_blank" rel="noopener noreferrer" download>
                      <Download className="h-5 w-5" />
                      تحميل ملف التذكرة PDF
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="w-full h-[320px] bg-slate-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-6 text-center">
                  <div className="h-16 w-16 rounded-full bg-[#E8F7FD] flex items-center justify-center text-[#00AEEF] mb-4 animate-pulse">
                    <Plane className="h-8 w-8" />
                  </div>
                  <h4 className="font-bold text-[#1A1A2E] text-sm">التذكرة لم تولّد بعد</h4>
                  <p className="text-xs text-[#6B7280] font-medium leading-relaxed max-w-[220px] mx-auto mt-2">
                    يرجى ملء البيانات المطلوبة والضغط على زر "توليد التذكرة" لتوليد ملف PDF بهوية البجع.
                  </p>
                </div>
              )}
            </Card>

            {/* Sharing actions card */}
            <Card className="border border-gray-100 shadow-sm rounded-xl overflow-hidden bg-white p-5 space-y-4">
              <h3 className="font-bold text-[#1A1A2E] text-base border-r-4 border-[#00AEEF] pr-2.5">
                إرسال ومشاركة التذكرة
              </h3>
              
              {/* Send via WhatsApp */}
              <div className="space-y-2">
                <button
                  onClick={handleWhatsAppShare}
                  disabled={!ticket.generatedFileUrl}
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20BA5C] text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  مشاركة عبر واتساب
                </button>
                {!ticket.generatedFileUrl && (
                  <p className="text-xs text-center text-gray-400 mt-1">
                    يجب توليد التذكرة أولاً
                  </p>
                )}
              </div>

              {/* Send via Email (Gmail) */}
              <div className="space-y-2">
                {!showEmailInput ? (
                  <button
                    onClick={() => setShowEmailInput(true)}
                    disabled={!ticket.generatedFileUrl}
                    className="w-full flex items-center justify-center gap-2 bg-[#00AEEF] hover:bg-[#0099D4] text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                    إرسال عبر البريد الإلكتروني
                  </button>
                ) : (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="أدخل البريد الإلكتروني للعميل"
                      className="w-full border-2 border-[#00AEEF] rounded-xl px-4 py-2 text-right focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/20 text-sm"
                      dir="rtl"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleEmailShare}
                        disabled={!emailInput.includes("@")}
                        className="flex-1 bg-[#00AEEF] hover:bg-[#0099D4] text-white font-semibold py-2 px-4 rounded-xl transition-all disabled:opacity-50"
                      >
                        فتح Gmail وإرسال
                      </button>
                      <button
                        onClick={() => { setShowEmailInput(false); setEmailInput(""); }}
                        className="px-4 py-2 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-all"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
                {!ticket.generatedFileUrl && !showEmailInput && (
                  <p className="text-xs text-center text-gray-400 mt-1">
                    يجب توليد التذكرة أولاً
                  </p>
                )}
              </div>
            </Card>

            {/* Original uploaded file preview if any */}
            {ticket.originalFileUrl && (
              <Card className="border border-gray-100 shadow-sm rounded-xl overflow-hidden bg-white p-5 space-y-3">
                <h4 className="font-bold text-sm text-[#1A1A2E]">الملف الأصلي المرفوع</h4>
                <Button variant="outline" className="w-full h-11 border-gray-200 text-[#6B7280] hover:bg-slate-50 font-bold rounded-xl" asChild>
                  <a href={ticket.originalFileUrl} target="_blank" rel="noopener noreferrer">
                    عرض وتنزيل التذكرة الأصلية
                  </a>
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
