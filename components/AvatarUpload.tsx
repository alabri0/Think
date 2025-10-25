import React, { useState, useRef } from 'react';

interface AvatarUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onAvatarSelect: (dataUrl: string) => void;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({ isOpen, onClose, onAvatarSelect }) => {
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('الرجاء اختيار ملف صورة.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('حجم الصورة كبير جداً (الحد الأقصى 5MB).');
      return;
    }
    
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            setError("Could not process image.");
            return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/webp', 0.85); // Use webp for better compression
        onAvatarSelect(dataUrl);
        onClose();
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl shadow-lg p-8 space-y-4 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-center text-cyan-400">تغيير الصورة الرمزية</h2>
        <p className="text-center text-gray-400">اختر صورة من جهازك. سيتم تغيير حجمها تلقائيًا.</p>
        
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full bg-cyan-600 hover:bg-cyan-700 p-3 rounded-lg text-lg font-bold transition-transform transform hover:scale-105"
        >
          اختر صورة...
        </button>
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
        />

        {error && <p className="text-red-500 text-center">{error}</p>}
        
        <button onClick={onClose} className="w-full text-gray-400 hover:text-white transition mt-2">
          إلغاء
        </button>
      </div>
    </div>
  );
};

export default AvatarUpload;
