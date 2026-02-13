import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { DropZone } from './DropZone';
import { FileItem } from './FileItem';
import { GeminiModal } from './GeminiModal';
import { PDFFileItem } from './types';
import { createPDF } from '../../services/uniPdfService';
import { generateIntroText } from '../../services/geminiService';
import { Download, FileStack, X, Plus, AlertCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';
// Use simple id generator

const generateId = () => Math.random().toString(36).substr(2, 9);

export const UniPDF: React.FC = () => {
  const [files, setFiles] = useState<PDFFileItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelect = (newFiles: File[]) => {
    const newItems: PDFFileItem[] = newFiles.map((file) => ({
      id: generateId(),
      file,
      name: file.name,
      type: file.type.includes('image') ? 'image' : 'pdf',
      size: file.size,
      previewUrl: file.type.includes('image') ? URL.createObjectURL(file) : undefined,
    }));
    setFiles((prev) => [...prev, ...newItems]);
    setError(null);
  };

  const handleRemove = (id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newFiles = [...files];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex >= 0 && targetIndex < newFiles.length) {
      [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
      setFiles(newFiles);
    }
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    const newFiles = Array.from(files);
    const [reorderedItem] = newFiles.splice(sourceIndex, 1);
    newFiles.splice(destinationIndex, 0, reorderedItem);

    setFiles(newFiles);
  };

  const handleGenerateValues = async (title: string, description: string) => {
    setIsProcessing(true);
    setProcessingStatus('Gerando texto de capa com IA...');

    try {
      const generatedText = await generateIntroText(description);

      setProcessingStatus('Processando e mesclando arquivos PDF...');
      const date = new Date().toLocaleDateString('pt-BR');

      const pdfBytes = await createPDF(files, {
        title,
        generatedText,
        date,
      });

      downloadPDF(pdfBytes, title);
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setError('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleDirectDownload = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setProcessingStatus('Combinando arquivos...');

    try {
      const pdfBytes = await createPDF(files); // Sem capa
      downloadPDF(pdfBytes, 'documento-unificado');
    } catch (err) {
      console.error(err);
      setError('Erro ao criar PDF.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const downloadPDF = (bytes: Uint8Array, fileName: string) => {
    const blob = new Blob([bytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 relative overflow-hidden">
      {/* Header */}
      <header className="px-8 py-6 bg-white border-b border-slate-200 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span className="bg-indigo-600 text-white p-1.5 rounded-lg">UniPDF</span>
            Organizador Inteligente
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Combine imagens e PDFs com inteligência artificial
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setFiles([])}
            disabled={files.length === 0 || isProcessing}
            className="px-4 py-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            Limpar Tudo
          </button>

          <div className="h-6 w-px bg-slate-200 my-auto mx-2"></div>

          <button
            onClick={handleDirectDownload}
            disabled={files.length === 0 || isProcessing}
            className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 disabled:opacity-50 hover:-translate-y-0.5"
          >
            <Download size={18} />
            Unir e Baixar PDF
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 border border-red-100 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={20} />
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-auto hover:bg-red-100 p-1 rounded-lg"
                title="Fechar aviso"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Empty State / Dropzone */}
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] animate-in fade-in zoom-in duration-500">
              <div className="w-full max-w-2xl">
                <DropZone onFilesSelect={handleFilesSelect} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start animate-in fade-in slide-in-from-bottom-4">
              {/* Lista de Arquivos */}
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                    <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">
                      {files.length}
                    </span>
                    Arquivos na Lista
                  </h2>
                  <span className="text-xs text-slate-400">Arraste para reordenar</span>
                </div>

                <div className="bg-slate-100 rounded-xl p-2 min-h-[100px] border border-slate-200/50">
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="files-list">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="flex flex-col gap-2"
                        >
                          {files.map((file, index) => (
                            <Draggable key={file.id} draggableId={file.id} index={index}>
                              {(provided, snapshot) => (
                                <FileItem
                                  ref={provided.innerRef}
                                  item={file}
                                  index={index}
                                  total={files.length}
                                  onMoveUp={(i) => moveItem(i, 'up')}
                                  onMoveDown={(i) => moveItem(i, 'down')}
                                  onRemove={handleRemove}
                                  draggableProps={provided.draggableProps}
                                  dragHandleProps={provided.dragHandleProps}
                                  style={{
                                    ...provided.draggableProps.style,
                                    zIndex: snapshot.isDragging ? 1000 : 'auto',
                                    opacity: snapshot.isDragging ? 0.9 : 1,
                                    transform: provided.draggableProps.style?.transform,
                                  }}
                                />
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>

                  <div className="mt-4">
                    <DropZone onFilesSelect={handleFilesSelect} />
                  </div>
                </div>
              </div>

              {/* Preview / Instructions */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-4">
                <div className="flex items-center gap-3 mb-4 text-indigo-600">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <FileStack size={24} />
                  </div>
                  <h3 className="font-bold text-lg text-slate-800">Organizador PDF</h3>
                </div>
                <p className="text-slate-600 mb-4 leading-relaxed">
                  Combine múltiplos arquivos em um único PDF organizado.
                </p>
                <ul className="space-y-3 text-sm text-slate-500 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0"></span>
                    Arraste os cartões para reordenar as páginas.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0"></span>
                    Adicione imagens (JPG, PNG) e PDFs.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0"></span>
                    O arquivo final respeitará a ordem da lista.
                  </li>
                </ul>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs font-medium text-slate-400 uppercase mb-2">Resumo</p>
                  <div className="flex justify-between text-sm text-slate-700 mb-1">
                    <span>Total de Arquivos:</span>
                    <span className="font-bold">{files.length}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-700">
                    <span>Tamanho Total:</span>
                    <span className="font-bold">
                      {(files.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Overlay de Processamento */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
          <Loader2 size={48} className="text-indigo-600 animate-spin mb-4" />
          <h3 className="text-xl font-bold text-slate-800 animate-pulse">{processingStatus}</h3>
          <p className="text-slate-500 text-sm mt-2">Isso pode levar alguns segundos...</p>
        </div>
      )}

      <GeminiModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleGenerateValues}
        isLoading={isProcessing}
      />
    </div>
  );
};
