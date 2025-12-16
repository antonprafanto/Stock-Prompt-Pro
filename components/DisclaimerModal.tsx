import React from 'react';
import { AlertTriangle, BookOpen, ShieldAlert } from 'lucide-react';

interface DisclaimerModalProps {
  onAccept: () => void;
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ onAccept }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex items-center gap-3 flex-shrink-0">
          <div className="bg-amber-100 p-2 rounded-full text-amber-600">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-lg font-bold text-amber-900">Peringatan & Penafian (Disclaimer)</h2>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 space-y-5 text-slate-700 leading-relaxed overflow-y-auto">
          
          <div className="space-y-2">
            <p className="font-medium text-slate-800">
              Assalamu'alaikum Warahmatullahi Wabarakatuh.
            </p>
            <p className="text-sm">
              Tools ini dikembangkan dengan tujuan membantu kontributor microstock menciptakan aset berupa 
              <span className="font-bold text-indigo-600"> landscape, tekstur, arsitektur, dan benda mati</span>.
            </p>
          </div>

          <div className="bg-slate-50 border-l-4 border-indigo-500 p-4 rounded-r-lg space-y-2">
            <div className="flex items-center gap-2 text-indigo-700 font-semibold text-xs uppercase tracking-wider">
              <BookOpen size={14} />
              <span>Nasihat Syariah</span>
            </div>
            <p className="text-sm italic text-slate-600">
              "Siapapun yang membuat gambar (makhluk bernyawa) di dunia ini, maka dia akan dipaksa untuk meniupkan roh padanya pada hari kiamat, padahal dia tidak mampu meniupkannya."
            </p>
            <p className="text-xs font-bold text-slate-500 text-right">— HR. Bukhari no. 5963</p>
          </div>

          <div className="text-sm space-y-2 bg-red-50 p-3 rounded-lg border border-red-100 text-red-800">
            <div className="flex items-center gap-2 font-bold">
              <ShieldAlert size={16} />
              <span>Penafian Tanggung Jawab</span>
            </div>
            <p>
              Kami sangat menyarankan agar tidak menggunakan alat ini untuk men-generate prompt makhluk bernyawa (manusia/hewan). 
              Jika pengguna tetap memutuskan untuk membuat gambar yang mengandung unsur makhluk bernyawa, maka hal tersebut menjadi <strong>tanggung jawab pribadi pengguna</strong> sepenuhnya di hadapan Allah SWT. Pengembang aplikasi berlepas diri dari penggunaan yang menyalahi syariat.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end flex-shrink-0">
          <button
            onClick={onAccept}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors shadow-sm focus:ring-4 focus:ring-indigo-100"
          >
            Saya Mengerti & Lanjutkan
          </button>
        </div>
      </div>
    </div>
  );
};