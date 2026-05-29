import nodemailer from "nodemailer";
import fs from "fs";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface SendTicketEmailOptions {
  to: string;
  passengerName: string;
  pdfPath?: string;
  pdfBuffer?: Buffer;
  companyName: string;
  companyPhone: string;
  companyEmail: string;
}

export async function sendTicketEmail(opts: SendTicketEmailOptions) {
  const html = `
  <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px;">
    <div style="background: linear-gradient(135deg, #0077B6, #00AEEF); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">البجع للسفر والسياحة</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">ALBAJA Travel & Tourism</p>
    </div>
    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
      <p style="font-size: 16px; color: #1a1a2e;">مرحباً <strong>${opts.passengerName}</strong>،</p>
      <p style="color: #6b7280; line-height: 1.8;">
        نرجو أن تكون بخير. نرسل لكم في المرفق تذكرة سفركم الخاصة بكم.<br/>
        يسعدنا خدمتكم دائماً في شركة البجع للسفر والسياحة.
      </p>
      <div style="background: #E8F7FD; border-right: 4px solid #00AEEF; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #0077B6; font-weight: bold;">⚠️ تعليمات السفر الهامة</p>
        <ul style="color: #374151; margin: 10px 0 0; padding-right: 20px; line-height: 2;">
          <li>الحضور إلى المطار قبل موعد الرحلة بثلاث ساعات</li>
          <li>أن تكون صلاحية جواز السفر أكثر من 6 أشهر</li>
          <li>التأكد من صلاحية التأشيرة</li>
          <li>الالتزام بوزن الأمتعة المسموح به</li>
          <li>التأكد من متطلبات الدولة المسافر إليها</li>
        </ul>
      </div>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;"/>
      <p style="color: #9ca3af; font-size: 13px; text-align: center;">
        ${opts.companyName} | ${opts.companyPhone} | ${opts.companyEmail}
      </p>
    </div>
  </div>`;

  const attachments = [];
  if (opts.pdfBuffer) {
    attachments.push({
      filename: `تذكرة-${opts.passengerName}.pdf`,
      content: opts.pdfBuffer,
      contentType: "application/pdf",
    });
  } else if (opts.pdfPath && fs.existsSync(opts.pdfPath)) {
    attachments.push({
      filename: `تذكرة-${opts.passengerName}.pdf`,
      path: opts.pdfPath,
      contentType: "application/pdf",
    });
  }

  await transporter.sendMail({
    from: `"${opts.companyName}" <${process.env.SMTP_USER}>`,
    to: opts.to,
    subject: `تذكرة سفرك - ${opts.passengerName} - ${opts.companyName}`,
    html,
    attachments,
  });
}
