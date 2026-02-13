import React, { useRef, useState } from 'react';
import { Upload, FileUp } from 'lucide-react';
import clsx from 'clsx';

interface DropZoneProps {
  onFilesSelect: (files: File[]) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFilesSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files) as File[];
      processFiles(files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      processFiles(files);
    }
  };

  const processFiles = (files: File[]) => {
    const validFiles = files.filter(
      (f) => f.type === 'application/pdf' || f.type === 'image/jpeg' || f.type === 'image/png'
    );
    if (validFiles.length > 0) {
      onFilesSelect(validFiles);
    } else {
      alert('Por favor, selecione apenas arquivos PDF, JPG ou PNG.');
    }

    // Reset input specifically if needed but standard pattern handles duplicates via onChange usually if click again
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={clsx(
        'border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group',
        isDragging
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
      )}
    >
      <input
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        ref={inputRef}
        onChange={handleInputChange}
        title="Upload de arquivos"
      />

      <div
        className={clsx(
          'p-4 rounded-full mb-4 transition-colors duration-300',
          isDragging
            ? 'bg-indigo-100 text-indigo-600'
            : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'
        )}
      >
        <FileUp size={48} strokeWidth={1.5} />
      </div>

      <h3 className="text-lg font-semibold text-slate-700 mb-2">Solte seus arquivos aqui</h3>
      <p className="text-sm text-slate-500 text-center max-w-xs">
        Arquivos PDF e Imagens (JPG, PNG). Múltiplos arquivos permitidos.
      </p>
      <button
        className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.click();
        }}
      >
        Selecionar Arquivos
      </button>
    </div>
  );
};
