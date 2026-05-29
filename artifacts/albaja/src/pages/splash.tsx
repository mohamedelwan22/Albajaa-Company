import { Link, useLocation } from "wouter";
import { Plane, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetMe } from "@workspace/api-client-react";

export default function Splash() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = useGetMe({ query: { retry: false, queryKey: ["me"] } });

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full bg-secondary/5 blur-3xl pointer-events-none" />
      
      <div className="z-10 flex flex-col items-center text-center animate-in fade-in zoom-in duration-700 space-y-8 max-w-lg px-4">
        <div className="h-24 w-24 rounded-3xl bg-card border border-border shadow-xl flex items-center justify-center transform rotate-3 hover:rotate-0 transition-transform duration-300">
          <Plane className="h-12 w-12 text-primary" />
        </div>
        
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
            منصة <span className="text-primary">البجع</span>
          </h1>
          <p className="text-xl text-muted-foreground font-medium">
            للسفر والسياحة
          </p>
          <p className="text-sm md:text-base text-muted-foreground/80 mt-4 leading-relaxed max-w-md mx-auto">
            النظام الداخلي لإدارة وتوليد تذاكر الطيران باحترافية وسرعة. 
            مصمم خصيصاً لوكالات السفر لتقديم أفضل خدمة للعملاء.
          </p>
        </div>

        {!isLoading && (
          <div className="flex flex-col sm:flex-row gap-4 w-full mt-8">
            {user ? (
              <Button size="lg" className="w-full text-lg h-14" onClick={() => setLocation("/dashboard")}>
                الدخول إلى لوحة القيادة
                <ArrowLeft className="ml-2 h-5 w-5" />
              </Button>
            ) : (
              <Button size="lg" className="w-full text-lg h-14" onClick={() => setLocation("/login")}>
                تسجيل الدخول
                <ArrowLeft className="ml-2 h-5 w-5" />
              </Button>
            )}
          </div>
        )}
      </div>
      
      <div className="absolute bottom-8 text-sm text-muted-foreground/50">
        الإصدار 1.0.0
      </div>
    </div>
  );
}
