import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";

const loginSchema = z.object({
  email: z.string().email({ message: "البريد الإلكتروني غير صالح" }),
  password: z.string().min(1, { message: "كلمة المرور مطلوبة" }),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        throw new Error("فشل تسجيل الدخول");
      }

      toast({ title: "تم تسجيل الدخول", description: "مرحباً بك في منصة البجع" });
      setLocation("/dashboard");
    } catch (error) {
      toast({ 
        title: "خطأ في تسجيل الدخول", 
        description: "تأكد من صحة البريد الإلكتروني وكلمة المرور.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="flex min-h-[100dvh] items-center justify-center p-4 relative overflow-hidden select-none"
      style={{ background: "linear-gradient(135deg, #0077B6, #00AEEF)" }}
    >
      {/* Decorative blurred circles */}
      <div className="absolute top-[-10%] right-[-10%] w-[450px] h-[450px] rounded-full bg-white/20 blur-3xl opacity-30" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-black/10 blur-3xl opacity-35" />
      <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] rounded-full bg-white/10 blur-2xl opacity-20" />

      <Card className="w-full max-w-[420px] z-10 border-0 shadow-2xl rounded-2xl bg-white p-6 md:p-8 animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center text-center mb-8">
          <img 
            src="/logo.png" 
            alt="البجع" 
            className="h-20 w-auto object-contain mb-4 drop-shadow-md"
            onError={(e) => {
              // fallback if missing
              e.currentTarget.style.display = "none";
            }}
          />
          <h1 className="text-2xl font-bold text-[#1A1A2E]">مرحباً بك في البجع</h1>
          <p className="text-sm text-[#6B7280] mt-1 font-medium">منصة إدارة تذاكر السفر</p>
        </div>

        <CardContent className="p-0">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#1A1A2E] font-semibold text-sm">البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="info@albaja.com.iq" 
                        type="email" 
                        dir="ltr" 
                        className="text-left border-2 border-gray-200 h-11 focus:border-[#00AEEF] focus:ring-2 focus:ring-[#00AEEF]/20 rounded-xl transition-all" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#1A1A2E] font-semibold text-sm">كلمة المرور</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder="••••••••" 
                          type={showPassword ? "text" : "password"} 
                          dir="ltr" 
                          className="text-left border-2 border-gray-200 h-11 focus:border-[#00AEEF] focus:ring-2 focus:ring-[#00AEEF]/20 rounded-xl pl-10 transition-all" 
                          {...field} 
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-bold text-white transition-all duration-200 bg-gradient-to-r from-[#F7931E] to-[#E07B0A] hover:scale-[1.02] hover:shadow-lg hover:shadow-[#F7931E]/30 rounded-xl"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "تسجيل الدخول"}
              </Button>
            </form>
          </Form>
        </CardContent>

        {/* Corporate details footer inside card */}
        <div className="border-t border-gray-100 mt-8 pt-4 text-center">
          <p className="text-[11px] text-[#6B7280] font-medium leading-relaxed">
            شركة البجع للسفر والسياحة المحدودة
            <br />
            بغداد – المنصور – شارع الأميرات – مبنى أعمال
            <br />
            الهاتف: 07708809825 | الموقع: albaja.com.iq
          </p>
        </div>
      </Card>
    </div>
  );
}
