import { useState, useRef, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { UploadCloud, FileText, CheckCircle2, Loader2, ArrowRight, AlertCircle, X } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCreateTicket } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

type UploadState = "idle" | "dragging" | "selected" | "uploading" | "success" | "error";

export default function NewTicket() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isCreatingManual, setIsCreatingManual] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const createTicket = useCreateTicket();

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const validateAndSetFile = useCallback((file: File) => {
    if (file.type !== "application/pdf") {
      setErrorMessage("الرجاء رفع ملف PDF فقط");
      setUploadState("error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("حجم الملف يتجاوز 5 ميجابايت");
      setUploadState("error");
      return;
    }
    setSelectedFile(file);
    setUploadState("selected");
    setErrorMessage("");
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    validateAndSetFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadState("dragging");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadState(selectedFile ? "selected" : "idle");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    validateAndSetFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadState("uploading");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/tickets/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to upload");

      const data = await res.json();
      if (data.ticket?.id) {
        setUploadState("success");
        toast({ title: "تم رفع الملف", description: "جاري استخراج البيانات..." });
        setTimeout(() => setLocation(`/dashboard/tickets/${data.ticket.id}`), 800);
      }
    } catch (err) {
      setErrorMessage("حدث خطأ أثناء معالجة الملف");
      setUploadState("error");
      toast({ title: "خطأ في الرفع", description: "حدث خطأ أثناء معالجة الملف.", variant: "destructive" });
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

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadState("idle");
    setErrorMessage("");
  };

  const dropZoneBorder = () => {
    switch (uploadState) {
      case "dragging": return "border-accent bg-accent/5";
      case "selected": return "border-success bg-success/5";
      case "error": return "border-destructive bg-destructive/5";
      case "uploading": return "border-accent bg-accent/5";
      default: return "border-border bg-muted hover:border-accent/50";
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard/tickets")} className="text-foreground">
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">إصدار تذكرة جديدة</h1>
            <p className="text-sm text-muted-foreground">قم برفع ملف تذكرة PDF أو إنشاء تذكرة يدوياً</p>
          </div>
        </div>

        <div className="grid md:grid-cols-5 gap-6">
          {/* Upload Section */}
          <Card className="md:col-span-3 border-border bg-card shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-foreground">رفع تذكرة الطيران PDF</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                سيقوم نظام الذكاء الاصطناعي باستخراج كافة تفاصيل الرحلة فوراً
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                ref={dropZoneRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 ${dropZoneBorder()}`}
              >
                <input
                  type="file"
                  accept=".pdf"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  onChange={handleFileChange}
                  disabled={uploadState === "uploading"}
                />

                {/* Idle / Dragging */}
                {(uploadState === "idle" || uploadState === "dragging") && (
                  <div className="flex flex-col items-center gap-3">
                    <div className={`h-16 w-16 rounded-xl flex items-center justify-center transition-colors ${
                      uploadState === "dragging" ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
                    }`}>
                      <UploadCloud className={`h-8 w-8 ${uploadState === "dragging" ? "animate-bounce" : ""}`} />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-sm">
                        {uploadState === "dragging" ? "أفلت الملف هنا" : "اسحب ملف PDF هنا أو انقر للاختيار"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        PDF فقط — حد أقصى 5 ميجابايت
                      </p>
                    </div>
                  </div>
                )}

                {/* Selected */}
                {uploadState === "selected" && selectedFile && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-16 w-16 rounded-xl bg-success/10 flex items-center justify-center text-success">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-foreground text-sm truncate max-w-[280px] mx-auto">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {formatSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Uploading */}
                {uploadState === "uploading" && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-16 w-16 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-sm">جاري الرفع ومعالجة البيانات...</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        يتم استخراج المعلومات بالذكاء الاصطناعي
                      </p>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full max-w-xs h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full animate-pulse" style={{ width: "60%" }} />
                    </div>
                  </div>
                )}

                {/* Error */}
                {uploadState === "error" && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-16 w-16 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive">
                      <AlertCircle className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-sm">فشل الرفع</p>
                      <p className="text-xs text-muted-foreground mt-1">{errorMessage}</p>
                    </div>
                  </div>
                )}

                {/* Success */}
                {uploadState === "success" && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-16 w-16 rounded-xl bg-success/10 flex items-center justify-center text-success">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="font-bold text-success text-sm">تم الرفع بنجاح</p>
                      <p className="text-xs text-muted-foreground mt-1">جاري التوجيه إلى صفحة التذكرة...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {(uploadState === "selected" || uploadState === "error") && (
                <div className="flex gap-2">
                  {uploadState === "selected" && (
                    <Button
                      className="flex-1 h-12 bg-accent text-accent-foreground hover:bg-accent/90 font-bold rounded-lg shadow-sm"
                      onClick={handleUpload}
                    >
                      رفع التذكرة واستخراج البيانات
                    </Button>
                  )}
                  {uploadState === "error" && (
                    <Button
                      className="flex-1 h-12 bg-accent text-accent-foreground hover:bg-accent/90 font-bold rounded-lg shadow-sm"
                      onClick={resetUpload}
                    >
                      إعادة المحاولة
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="h-12 border-border text-muted-foreground hover:text-foreground rounded-lg"
                    onClick={resetUpload}
                  >
                    <X className="h-4 w-4 ml-1" />
                    إلغاء
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manual Entry Section */}
          <Card className="md:col-span-2 border-border bg-card shadow-sm flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-foreground">إدخال يدوي</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                ابدأ بتذكرة فارغة وقم بإدخال البيانات بنفسك
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center py-8">
              <div className="h-16 w-16 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-6">
                <FileText className="h-8 w-8" />
              </div>
              <Button
                size="lg"
                className="w-full h-12 border-2 border-accent text-accent bg-transparent hover:bg-accent/10 font-bold rounded-lg transition-all"
                onClick={handleManualEntry}
                disabled={isCreatingManual}
              >
                {isCreatingManual ? (
                  <Loader2 className="h-5 w-5 animate-spin ml-2" />
                ) : (
                  "إنشاء تذكرة فارغة"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
