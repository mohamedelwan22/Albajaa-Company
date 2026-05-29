import { useState } from "react";
import { useLocation } from "wouter";
import { UploadCloud, FileText, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCreateTicket } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export default function NewTicket() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingManual, setIsCreatingManual] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const createTicket = useCreateTicket();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== "application/pdf") {
      toast({ title: "صيغة غير مدعومة", description: "الرجاء رفع ملف PDF فقط", variant: "destructive" });
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/tickets/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload");
      }

      const data = await res.json();
      if (data.ticket?.id) {
        toast({ title: "تم رفع الملف بنجاح", description: "جاري استخراج البيانات بالذكاء الاصطناعي..." });
        setLocation(`/dashboard/tickets/${data.ticket.id}`);
      }
    } catch (err) {
      toast({ title: "خطأ في الرفع", description: "حدث خطأ أثناء معالجة الملف.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualEntry = () => {
    setIsCreatingManual(true);
    createTicket.mutate(
      { data: {} },
      {
        onSuccess: (data) => {
          if (data.ticket?.id) {
            setLocation(`/dashboard/tickets/${data.ticket.id}`);
          }
        },
        onError: () => {
          toast({ title: "خطأ", description: "تعذر إنشاء التذكرة", variant: "destructive" });
          setIsCreatingManual(false);
        }
      }
    );
  };

  // Helper to format file size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")} className="text-[#1A1A2E]">
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E]">إصدار تذكرة جديدة</h1>
            <p className="text-[#6B7280] font-medium">قم برفع ملف تذكرة PDF أو إنشاء تذكرة يدوياً</p>
          </div>
        </div>

        <div className="grid md:grid-cols-5 gap-6">
          {/* Upload PDF Section */}
          <Card className="md:col-span-3 border-gray-100 border shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-[#1A1A2E]">رفع تذكرة الطيران PDF</CardTitle>
              <CardDescription className="text-sm font-medium text-[#6B7280]">
                سيقوم نظام الذكاء الاصطناعي باستخراج كافة تفاصيل الرحلة فوراً
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 ${
                  selectedFile
                    ? "border-green-400 bg-green-50/20"
                    : "border-[#00AEEF] bg-[#E8F7FD] hover:border-[#F7931E] hover:bg-[#FEF3E2]"
                }`}
              >
                <input 
                  type="file" 
                  accept=".pdf" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
                
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      <CheckCircle2 className="h-10 w-10 animate-bounce" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-[#1A1A2E] truncate max-w-[280px] mx-auto">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-[#6B7280] font-mono">
                        {formatSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <UploadCloud className="h-14 w-14 text-[#00AEEF]" />
                    <p className="text-sm font-bold text-[#1A1A2E]">
                      اسحب تذكرة الطيران PDF هنا أو انقر لاختيار ملف
                    </p>
                    <p className="text-xs text-[#6B7280] font-medium">الملفات المدعومة: PDF فقط بحد أقصى 5 ميجابايت</p>
                  </div>
                )}

                {isUploading && (
                  <div className="absolute inset-0 bg-white/80 rounded-2xl flex flex-col items-center justify-center gap-3 z-20">
                    <div className="h-10 w-10 border-4 border-[#00AEEF] border-t-transparent animate-spin rounded-full" />
                    <p className="text-sm font-bold text-[#0077B6]">جاري الرفع وتحليل البيانات بالـ AI...</p>
                  </div>
                )}
              </div>

              {selectedFile && !isUploading && (
                <div className="flex gap-2">
                  <Button 
                    className="flex-1 h-12 bg-gradient-to-r from-[#F7931E] to-[#E07B0A] text-white font-bold rounded-xl shadow-md shadow-[#F7931E]/30 hover:scale-[1.01] transition-transform duration-150"
                    onClick={handleUpload}
                  >
                    رفع التذكرة الآن واستخراج البيانات ⚡
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-12 border-gray-300 text-[#6B7280] hover:bg-gray-50 rounded-xl"
                    onClick={() => setSelectedFile(null)}
                  >
                    إلغاء
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manual Entry Section */}
          <Card className="md:col-span-2 border-gray-100 border shadow-sm rounded-2xl bg-white overflow-hidden flex flex-col justify-between">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-[#1A1A2E]">إدخال التذكرة يدوياً</CardTitle>
              <CardDescription className="text-sm font-medium text-[#6B7280]">
                ابدأ بتذكرة فارغة وقم بكتابة البيانات بنفسك دون استخدام ملف
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center items-center py-8">
              <div className="h-16 w-16 rounded-full bg-[#FEF3E2] flex items-center justify-center text-[#F7931E] mb-6">
                <FileText className="h-8 w-8" />
              </div>
              <Button 
                size="lg" 
                className="w-full h-12 border-2 border-[#00AEEF] text-[#00AEEF] bg-transparent hover:bg-[#E8F7FD] hover:text-[#0077B6] font-bold rounded-xl transition-all" 
                onClick={handleManualEntry}
                disabled={isCreatingManual}
              >
                {isCreatingManual ? (
                  <Loader2 className="h-5 w-5 animate-spin ml-2" />
                ) : (
                  "إنشاء تذكرة فارغة للتعديل اليدوي"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
