import React from "react";
import { Plane, Briefcase, CalendarDays, Hash, Armchair, AlertCircle, Info, ShieldCheck } from "lucide-react";

export default function PremiumTicket() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EAEAEA] p-6 font-['Inter',sans-serif]" dir="rtl">
      {/* Outer Container for Shadow and Depth */}
      <div className="relative w-full max-w-[850px] drop-shadow-2xl hover:scale-[1.01] transition-transform duration-500">
        
        {/* Ticket Main Body */}
        <div className="relative rounded-3xl overflow-hidden bg-white shadow-xl ring-1 ring-black/5">
          
          {/* Top Section - Dark Navy with Gradient */}
          <div className="bg-gradient-to-br from-[#003B6F] to-[#0A5A8C] p-8 relative overflow-hidden">
            {/* Subtle background pattern/glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#F5A623]/10 rounded-full blur-2xl translate-y-1/4 -translate-x-1/4" />

            <div className="relative z-10 flex justify-between items-start">
              {/* Left (Logo & Passenger) */}
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                  {/* Mock Logo */}
                  <div className="relative w-12 h-12 flex items-center justify-center bg-gradient-to-br from-[#F5A623] to-[#d48c1a] rounded-full shadow-lg shadow-black/20">
                    <Plane className="w-6 h-6 text-white absolute -rotate-45" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-white tracking-wider leading-none">ALBAJA</h1>
                    <p className="text-[#F5A623] text-sm font-bold mt-1">البجع للسفر والسياحة</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-white/60 text-xs font-semibold mb-1">اسم المسافر / PASSENGER</p>
                  <p className="text-white text-xl font-bold tracking-wide uppercase">MRS AYAT SALIH</p>
                </div>
              </div>

              {/* Middle (Title) */}
              <div className="text-center self-center flex-1 hidden md:block">
                <h2 className="text-white text-xl font-bold mb-1">تذكرة طيران إلكترونية</h2>
                <p className="text-white/70 text-xs font-medium tracking-widest uppercase">Electronic Airline Ticket</p>
              </div>

              {/* Right (Ticket & Booking Ref Box) */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 min-w-[200px] shadow-lg">
                <div className="text-center mb-3">
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider mb-1">رقم التذكرة / TICKET NO</p>
                  <p className="text-white text-lg font-bold font-mono tracking-wider">386230682177</p>
                </div>
                <div className="w-full h-px bg-white/20 my-2" />
                <div className="text-center mt-3">
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider mb-1">رقم الحجز / BOOKING REF</p>
                  <p className="text-[#F5A623] text-xl font-black font-mono tracking-widest">C29VGE</p>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Section - Flight Route (White) */}
          <div className="relative bg-white px-8 py-10">
            {/* Cutout circles on edges */}
            <div className="absolute top-1/2 -right-4 w-8 h-8 bg-[#EAEAEA] rounded-full -translate-y-1/2 shadow-inner" />
            <div className="absolute top-1/2 -left-4 w-8 h-8 bg-[#EAEAEA] rounded-full -translate-y-1/2 shadow-inner" />

            <div className="flex justify-between items-center px-4 md:px-12 relative z-10">
              
              {/* Departure */}
              <div className="text-center w-32">
                <h2 className="text-4xl font-black text-[#003B6F] mb-1">DAM</h2>
                <p className="text-sm font-bold text-gray-800 mb-1">دمشق</p>
                <p className="text-xs text-gray-500 mb-3">Damascus</p>
                <div className="inline-block bg-gray-50 border border-gray-100 rounded-lg px-4 py-2">
                  <p className="text-lg font-bold text-[#003B6F]">23:00</p>
                  <p className="text-[10px] font-semibold text-gray-500 mt-0.5">2026-06-11</p>
                </div>
              </div>

              {/* Route line */}
              <div className="flex-1 px-8 relative flex flex-col items-center justify-center">
                <div className="w-full flex items-center">
                  <div className="w-2 h-2 rounded-full border-2 border-[#0A5A8C] bg-white z-10" />
                  <div className="flex-1 border-t-2 border-dashed border-[#0A5A8C]/30 relative" />
                  <Plane className="w-6 h-6 text-[#0A5A8C] mx-2 -rotate-90" />
                  <div className="flex-1 border-t-2 border-dashed border-[#0A5A8C]/30 relative" />
                  <div className="w-2 h-2 rounded-full border-2 border-[#0A5A8C] bg-[#0A5A8C] z-10" />
                </div>
                
                <div className="mt-4 bg-[#0A5A8C]/5 text-[#0A5A8C] font-semibold text-xs px-4 py-1.5 rounded-full border border-[#0A5A8C]/10 flex items-center gap-2 shadow-sm">
                  <Plane className="w-3 h-3" />
                  Fly Cham 1962
                </div>
              </div>

              {/* Arrival */}
              <div className="text-center w-32">
                <h2 className="text-4xl font-black text-[#003B6F] mb-1">BGW</h2>
                <p className="text-sm font-bold text-gray-800 mb-1">بغداد</p>
                <p className="text-xs text-gray-500 mb-3">Baghdad</p>
                <div className="inline-block bg-gray-50 border border-gray-100 rounded-lg px-4 py-2">
                  <p className="text-lg font-bold text-[#003B6F]">21:30</p>
                  <p className="text-[10px] font-semibold text-gray-500 mt-0.5">2026-06-11</p>
                </div>
              </div>
            </div>
          </div>

          {/* Details Bar - Dark Navy */}
          <div className="bg-[#003B6F] flex justify-between items-center py-4 px-8 border-y border-[#0A5A8C]/50 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            
            <div className="flex-1 flex justify-between relative z-10 divide-x divide-x-reverse divide-white/10 text-center">
              <div className="px-4 flex flex-col items-center">
                <Armchair className="w-5 h-5 text-[#F5A623] mb-2" />
                <p className="text-white/60 text-[9px] uppercase tracking-wide font-bold mb-1">درجة السفر</p>
                <p className="text-white font-semibold text-xs">Economy Class</p>
              </div>
              <div className="px-4 flex flex-col items-center">
                <Briefcase className="w-5 h-5 text-[#F5A623] mb-2" />
                <p className="text-white/60 text-[9px] uppercase tracking-wide font-bold mb-1">الوزن المسموح</p>
                <p className="text-white font-semibold text-xs">Kgs 30</p>
              </div>
              <div className="px-4 flex flex-col items-center">
                <Plane className="w-5 h-5 text-[#F5A623] mb-2" />
                <p className="text-white/60 text-[9px] uppercase tracking-wide font-bold mb-1">شركة الطيران</p>
                <p className="text-white font-semibold text-xs">Fly Cham</p>
              </div>
              <div className="px-4 flex flex-col items-center">
                <Hash className="w-5 h-5 text-[#F5A623] mb-2" />
                <p className="text-white/60 text-[9px] uppercase tracking-wide font-bold mb-1">رقم الرحلة</p>
                <p className="text-white font-semibold text-xs">XH502</p>
              </div>
              <div className="px-4 flex flex-col items-center">
                <CalendarDays className="w-5 h-5 text-[#F5A623] mb-2" />
                <p className="text-white/60 text-[9px] uppercase tracking-wide font-bold mb-1">تاريخ الإصدار</p>
                <p className="text-white font-semibold text-xs">2026-05-10</p>
              </div>
            </div>
          </div>

          {/* Bottom Section - Instructions and Barcode */}
          <div className="bg-white p-8 flex flex-col md:flex-row justify-between items-center md:items-start gap-8">
            {/* Barcode Area */}
            <div className="flex flex-col items-center justify-center bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              <p className="text-gray-800 font-mono font-bold tracking-widest text-lg mb-2">386230682177</p>
              {/* SVG Mock Barcode */}
              <svg width="220" height="40" viewBox="0 0 220 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 0H4V40H0V0ZM6 0H8V40H6V0ZM12 0H18V40H12V0ZM22 0H26V40H22V0ZM28 0H30V40H28V0ZM34 0H40V40H34V0ZM42 0H44V40H42V0ZM48 0H54V40H48V0ZM58 0H60V40H58V0ZM64 0H72V40H64V0ZM74 0H76V40H74V0ZM78 0H86V40H78V0ZM90 0H94V40H90V0ZM98 0H100V40H98V0ZM104 0H110V40H104V0ZM114 0H116V40H114V0ZM120 0H128V40H120V0ZM132 0H136V40H132V0ZM140 0H142V40H140V0ZM146 0H152V40H146V0ZM156 0H160V40H156V0ZM162 0H164V40H162V0ZM168 0H174V40H168V0ZM178 0H180V40H178V0ZM184 0H192V40H184V0ZM196 0H200V40H196V0ZM204 0H206V40H204V0ZM210 0H216V40H210V0Z" fill="#1A1A2E"/>
              </svg>
            </div>

            {/* Instructions */}
            <div className="flex-1 w-full text-right">
              <h3 className="text-[#003B6F] font-bold text-lg mb-3 flex items-center gap-2 justify-start flex-row-reverse">
                <AlertCircle className="w-5 h-5 text-[#F5A623]" />
                تعليمات السفر الهامة
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 flex-row-reverse text-sm font-medium text-gray-700">
                  <ShieldCheck className="w-4 h-4 text-[#0A5A8C] mt-0.5 shrink-0" />
                  <span>الحضور إلى المطار قبل موعد الرحلة بثلاث ساعات.</span>
                </li>
                <li className="flex items-start gap-3 flex-row-reverse text-sm font-medium text-gray-700">
                  <ShieldCheck className="w-4 h-4 text-[#0A5A8C] mt-0.5 shrink-0" />
                  <span>أن تكون صلاحية جواز السفر أكثر من 6 أشهر.</span>
                </li>
                <li className="flex items-start gap-3 flex-row-reverse text-sm font-medium text-gray-700">
                  <ShieldCheck className="w-4 h-4 text-[#0A5A8C] mt-0.5 shrink-0" />
                  <span>التأكد من صلاحية التأشيرة إن وجدت.</span>
                </li>
              </ul>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
