import React, { forwardRef } from 'react';
import { FileText, Image, ArrowUp, ArrowDown, Trash2, GripVertical } from 'lucide-react';
import clsx from 'clsx';
import { PDFFileItem } from './types'; // Removed .ts extension

interface FileItemProps extends React.HTMLAttributes<HTMLDivElement> {
  item: PDFFileItem;
  index: number;
  total: number;
  onRemove: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  dragHandleProps?: any; // Props for the drag handle
  draggableProps?: any; // Props for the draggable container
}

export const FileItem = forwardRef<HTMLDivElement, FileItemProps>(
  (
    {
      item,
      index,
      total,
      onRemove,
      onMoveUp,
      onMoveDown,
      dragHandleProps,
      draggableProps,
      ...props
    },
    ref
  ) => {
    const formatSize = (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
      <div
        ref={ref}
        {...draggableProps}
        {...dragHandleProps}
        {...props}
        className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-slate-100 mb-2 hover:shadow-md hover:border-indigo-100 transition-all group select-none cursor-grab active:cursor-grabbing"
      >
        {/* Drag Handle (Visual only now) */}
        <div
          className="text-slate-300 group-hover:text-indigo-500 p-1 -ml-1 transition-colors"
          title="Arraste para reordenar"
        >
          <GripVertical size={20} />
        </div>

        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-200 relative">
          <span className="absolute top-0 left-0 bg-indigo-600 text-white text-[9px] font-bold px-1 rounded-br z-10">
            #{index + 1}
          </span>
          {item.type === 'image' && item.previewUrl ? (
            <img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover" />
          ) : item.type === 'image' ? (
            <Image size={24} className="text-indigo-400" />
          ) : (
            <FileText size={24} className="text-red-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
              Documento {index + 1}
            </span>
          </div>
          <h4 className="font-medium text-slate-800 truncate text-sm" title={item.name}>
            {item.name}
          </h4>
          <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
            {formatSize(item.size)}
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span
              className={clsx(
                'font-medium',
                item.type === 'image' ? 'text-indigo-500' : 'text-red-500'
              )}
            >
              {item.type === 'image' ? 'IMAGEM' : 'PDF'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-1 mr-2 hidden sm:flex">
            {' '}
            {/* Ocultar setas em mobile se preferir, mas user pediu apenas drag e number */}
            <button
              onClick={() => onMoveUp(index)}
              disabled={index === 0}
              className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
              title="Mover para cima"
            >
              <ArrowUp size={16} />
            </button>
            <button
              onClick={() => onMoveDown(index)}
              disabled={index === total - 1}
              className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
              title="Mover para baixo"
            >
              <ArrowDown size={16} />
            </button>
          </div>

          <button
            onClick={() => onRemove(item.id)}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Remover arquivo"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>
    );
  }
);
