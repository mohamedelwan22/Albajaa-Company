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
import { Loader2, Save, Building, Palette, Phone, FileText, Image } from "lucide-react";

const companySchema = z.object({
  name: z.string().min(1, "اسم الشركة مطلوب"),
  logoUrl: z.string().nullable().optional(),
  email: z.string().email("بريد إلكتروني غير صالح").nullable().optional(),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "يجب أن يكون كود لون سداسي").optional(),
  secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "يجب أن يكون كود لون سداسي").optional(),
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
      name: "", logoUrl: "", email: "", phone: "", website: "",
      address: "", primaryColor: "#F5A623", secondaryColor: "#123A66", travelNotes: ""
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
        primaryColor: company.primaryColor || "#F5A623",
        secondaryColor: company.secondaryColor || "#123A66",
        travelNotes: company.travelNotes || ""
      });
    }
  }, [company, form]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "صيغة غير مدعومة", description: "يرجى اختيار ملف صورة", variant: "destructive" });
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    setIsUploadingLogo(true);
    try {
      const res = await fetch("/api/company/upload-logo", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Logo upload failed");
      const data = await res.json();
      toast({ title: "تم تحديث الشعار", description: "تم رفع شعار الشركة" });
      form.setValue("logoUrl", data.logoUrl);
      queryClient.invalidateQueries({ queryKey: getGetCompanyQueryKey() });
    } catch {
      toast({ title: "خطأ", description: "فشل رفع الشعار", variant: "destructive" });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const onSubmit = (values: z.infer<typeof companySchema>) => {
    updateCompany.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          toast({ title: "تم الحفظ", description: "تم تحديث إعدادات الشركة" });
          queryClient.setQueryData(getGetCompanyQueryKey(), data);
        },
        onError: () => {
          toast({ title: "خطأ", description: "تعذر حفظ الإعدادات", variant: "destructive" });
        }
      }
    );
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

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">إعدادات الشركة</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            إعدادات الهوية البصرية ومعلومات الشركة
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Brand Settings */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-accent" />
                  <CardTitle className="text-sm font-bold text-foreground">العلامة التجارية</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                {/* Logo Upload */}
                <div className="flex flex-col items-center justify-center pb-5 border-b border-border">
                  <FormLabel className="mb-3 text-foreground font-bold text-sm">شعار الشركة</FormLabel>
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-[120px] h-[120px] rounded-xl border-2 border-dashed border-border hover:border-accent bg-muted overflow-hidden flex items-center justify-center transition-all">
                      {form.watch("logoUrl") ? (
                        <img src={form.watch("logoUrl") || undefined} alt="شعار الشركة" className="w-full h-full object-contain p-2" />
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <Image className="h-6 w-6 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground font-bold">رفع الشعار</span>
                        </div>
                      )}
                    </div>
                    {isUploadingLogo && (
                      <div className="absolute inset-0 bg-card/80 rounded-xl flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-accent" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-foreground/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-white font-bold">تغيير</span>
                    </div>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                  <p className="text-[11px] text-muted-foreground mt-2">يفضل PNG بخلفية شفافة — أقصى 2 ميجابايت</p>
                </div>

                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground">اسم الشركة</FormLabel>
                    <FormControl><Input className="border-border bg-background focus:border-accent rounded-lg" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {/* Theme Settings */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-accent" />
                  <CardTitle className="text-sm font-bold text-foreground">الألوان</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-5 grid md:grid-cols-2 gap-4">
                <FormField control={form.control} name="primaryColor" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground">اللون الأساسي</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input type="color" className="w-12 p-1 h-10 border-border rounded-lg cursor-pointer" {...field} />
                        <Input dir="ltr" className="text-left font-mono border-border bg-background focus:border-accent rounded-lg" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="secondaryColor" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground">اللون الثانوي</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input type="color" className="w-12 p-1 h-10 border-border rounded-lg cursor-pointer" {...field} />
                        <Input dir="ltr" className="text-left font-mono border-border bg-background focus:border-accent rounded-lg" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-accent" />
                  <CardTitle className="text-sm font-bold text-foreground">معلومات التواصل</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-5 grid gap-4 md:grid-cols-2">
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground">رقم الهاتف</FormLabel>
                    <FormControl><Input dir="ltr" className="text-left border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground">البريد الإلكتروني</FormLabel>
                    <FormControl><Input type="email" dir="ltr" className="text-left border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-xs font-semibold text-muted-foreground">الموقع الإلكتروني</FormLabel>
                    <FormControl><Input dir="ltr" className="text-left border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-xs font-semibold text-muted-foreground">العنوان</FormLabel>
                    <FormControl><Input className="border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {/* Travel Notes */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-accent" />
                  <CardTitle className="text-sm font-bold text-foreground">ملاحظات السفر</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <FormField control={form.control} name="travelNotes" render={({ field }) => (
                  <FormItem>
                    <FormControl><Textarea className="min-h-[150px] border-border bg-background focus:border-accent rounded-lg" {...field} value={field.value || ""} /></FormControl>
                    <FormDescription className="text-xs text-muted-foreground mt-1.5">
                      تظهر هذه الملاحظات في التذكرة النهائية المولّدة
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                size="lg"
                className="h-12 bg-accent text-accent-foreground hover:bg-accent/90 font-bold rounded-lg shadow-sm gap-2 min-w-[180px]"
                disabled={updateCompany.isPending}
              >
                {updateCompany.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                حفظ الإعدادات
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
