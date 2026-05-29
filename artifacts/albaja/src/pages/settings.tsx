import { useEffect, useRef, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useGetCompany, useUpdateCompany, getGetCompanyQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

const companySchema = z.object({
  name: z.string().min(1, "اسم الشركة مطلوب"),
  logoUrl: z.string().nullable().optional(),
  email: z.string().email("بريد إلكتروني غير صالح").nullable().optional(),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "يجب أن يكون كود لون سداسي (Hex)").optional(),
  secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "يجب أن يكون كود لون سداسي (Hex)").optional(),
  travelNotes: z.string().nullable().optional()
});

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: company, isLoading } = useGetCompany();
  const updateCompany = useUpdateCompany();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const form = useForm<z.infer<typeof companySchema>>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      logoUrl: "",
      email: "",
      phone: "",
      website: "",
      address: "",
      primaryColor: "#F7931E",
      secondaryColor: "#00AEEF",
      travelNotes: ""
    }
  });

  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name,
        logoUrl: company.logoUrl || "",
        email: company.email || "",
        phone: company.phone || "",
        website: company.website || "",
        address: company.address || "",
        primaryColor: company.primaryColor || "#F7931E",
        secondaryColor: company.secondaryColor || "#00AEEF",
        travelNotes: company.travelNotes || ""
      });
    }
  }, [company, form]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "صيغة غير مدعومة", description: "يرجى اختيار ملف صورة صالح", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsUploadingLogo(true);
    try {
      const res = await fetch("/api/company/upload-logo", {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error("Logo upload failed");
      const data = await res.json();
      toast({ title: "تم تحديث الشعار", description: "تم رفع شعار الشركة وحفظه بنجاح" });
      
      // Update form state
      form.setValue("logoUrl", data.logoUrl);
      
      // Invalidate queries so logo displays correctly in layout and sidebar
      queryClient.invalidateQueries({ queryKey: getGetCompanyQueryKey() });
    } catch (err) {
      toast({ title: "خطأ", description: "فشل في رفع شعار الشركة الجديد", variant: "destructive" });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const onSubmit = (values: z.infer<typeof companySchema>) => {
    updateCompany.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          toast({ title: "تم الحفظ", description: "تم تحديث إعدادات الشركة بنجاح" });
          queryClient.setQueryData(getGetCompanyQueryKey(), data);
        },
        onError: () => {
          toast({ title: "خطأ", description: "تعذر حفظ الإعدادات", variant: "destructive" });
        }
      }
    );
  };

  if (isLoading) return <DashboardLayout><div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A2E]">إعدادات الشركة</h1>
          <p className="text-muted-foreground">تكوين الهوية البصرية ومعلومات التواصل التي ستظهر في التذاكر</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="border border-gray-100 shadow-sm rounded-xl overflow-hidden bg-white">
              <CardHeader className="bg-gradient-to-r from-[#0077B6] to-[#00AEEF] text-white py-4 px-6">
                <CardTitle className="text-lg font-bold">الهوية البصرية واللوجو</CardTitle>
                <CardDescription className="text-white/80 text-xs font-medium">اسم الشركة، الشعار الخاص بكم، والألوان الأساسية للهوية</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2 p-6">
                
                {/* Logo Upload Section */}
                <div className="flex flex-col items-center justify-center md:col-span-2 pb-6 border-b border-gray-100">
                  <FormLabel className="mb-3 text-[#1A1A2E] font-bold text-sm">شعار الشركة (Logo)</FormLabel>
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-[120px] h-[120px] rounded-full border-2 border-dashed border-[#00AEEF] hover:border-[#F7931E] bg-[#E8F7FD] overflow-hidden flex items-center justify-center transition-all">
                      {form.watch("logoUrl") ? (
                        <img 
                          src={form.watch("logoUrl") || undefined} 
                          alt="شعار الشركة" 
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <div className="text-center p-4">
                          <span className="text-xs text-[#0077B6] font-bold">رفع صورة الشعار</span>
                        </div>
                      )}
                    </div>
                    {isUploadingLogo && (
                      <div className="absolute inset-0 bg-white/80 rounded-full flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-[#F7931E]" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-white font-bold">تغيير الشعار</span>
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleLogoUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <p className="text-[11px] text-[#6B7280] mt-2 font-medium">يفضل استخدام صورة بخلفية شفافة (PNG) بحجم أقصى 2 ميجا</p>
                </div>

                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-xs font-semibold text-[#6B7280]">اسم الشركة</FormLabel>
                    <FormControl><Input className="border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="primaryColor" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-[#6B7280]">اللون الأساسي</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input type="color" className="w-12 p-1 h-10 border-gray-200 rounded-lg" {...field} />
                        <Input dir="ltr" className="text-left font-mono border-gray-200 rounded-lg" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="secondaryColor" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-[#6B7280]">اللون الثانوي</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input type="color" className="w-12 p-1 h-10 border-gray-200 rounded-lg" {...field} />
                        <Input dir="ltr" className="text-left font-mono border-gray-200 rounded-lg" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <Card className="border border-gray-100 shadow-sm rounded-xl overflow-hidden bg-white">
              <CardHeader className="bg-gradient-to-r from-[#0077B6] to-[#00AEEF] text-white py-4 px-6">
                <CardTitle className="text-lg font-bold">معلومات التواصل</CardTitle>
                <CardDescription className="text-white/80 text-xs font-medium">طرق التواصل والعنوان الرسمي للظهور في الفواتير والتذاكر</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 p-6">
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-[#6B7280]">رقم الهاتف</FormLabel>
                    <FormControl><Input dir="ltr" className="text-left border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-[#6B7280]">البريد الإلكتروني</FormLabel>
                    <FormControl><Input type="email" dir="ltr" className="text-left border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-xs font-semibold text-[#6B7280]">الموقع الإلكتروني</FormLabel>
                    <FormControl><Input dir="ltr" className="text-left border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-xs font-semibold text-[#6B7280]">العنوان</FormLabel>
                    <FormControl><Input className="border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <Card className="border border-gray-100 shadow-sm rounded-xl overflow-hidden bg-white">
              <CardHeader className="bg-gradient-to-r from-[#0077B6] to-[#00AEEF] text-white py-4 px-6">
                <CardTitle className="text-lg font-bold">ملاحظات السفر الهامة</CardTitle>
                <CardDescription className="text-white/80 text-xs font-medium">الشروط والأحكام والتعليمات العامة التي تطبع أسفل التذكرة</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <FormField control={form.control} name="travelNotes" render={({ field }) => (
                  <FormItem>
                    <FormControl><Textarea className="min-h-[150px] border-gray-200 focus:border-[#00AEEF] rounded-lg" {...field} value={field.value || ""} /></FormControl>
                    <FormDescription className="text-xs text-[#6B7280] font-medium mt-1">تظهر هذه الملاحظات في التذكرة النهائية المولدّة بالهوية البصرية.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <div className="flex justify-end pt-2">
              <Button 
                type="submit" 
                size="lg" 
                className="h-12 bg-gradient-to-r from-[#F7931E] to-[#E07B0A] hover:scale-[1.01] text-white font-bold rounded-xl shadow-md gap-2"
                disabled={updateCompany.isPending}
              >
                {updateCompany.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                حفظ الإعدادات والتغييرات
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
