import React, { useState } from 'react';
import {
  X,
  Phone,
  Video,
  Calendar,
  Briefcase,
  DollarSign,
  Tag,
  Plus,
  StickyNote,
} from 'lucide-react';
import { Contact } from '../../types';
import { PIPELINE_STAGES } from '../../constants';
import { useAppStore } from '../../stores/useAppStore';

interface ChatCRMSidebarProps {
  contact: Contact;
  onClose: () => void;
  onAvatarClick: (url: string) => void;
}

export const ChatCRMSidebar: React.FC<ChatCRMSidebarProps> = ({
  contact,
  onClose,
  onAvatarClick,
}) => {
  const { updateContact } = useAppStore();
  const [newTagInput, setNewTagInput] = useState('');

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full shadow-2xl z-20 animate-in slide-in-from-right-10 duration-200 shrink-0">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-bold text-gray-800">Informações do Contato</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600" title="Fechar painel">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Profile */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => onAvatarClick(contact.avatar)}
            className="rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            title="Ver foto em tamanho real"
          >
            <img
              src={contact.avatar}
              className="w-20 h-20 rounded-full mb-3 object-cover shadow-md hover:opacity-90 transition-opacity cursor-pointer"
              alt={contact.name}
            />
          </button>
          <h2 className="text-xl font-bold text-gray-900">{contact.name}</h2>
          <p className="text-sm text-gray-500">{contact.company || 'Empresa não informada'}</p>
          <div className="mt-4 w-full flex justify-center gap-2">
            <a
              href={`tel:${contact.phoneNumber}`}
              className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-green-100 hover:text-green-600 transition-colors"
              title="Ligar para contato"
            >
              <Phone size={18} />
            </a>
            <button
              className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-colors"
              title="Chamada de vídeo"
            >
              <Video size={18} />
            </button>
            <button
              className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-purple-100 hover:text-purple-600 transition-colors"
              title="Agendar reunião"
            >
              <Calendar size={18} />
            </button>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Pipeline Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide">
            <Briefcase size={16} className="text-blue-500" /> Pipeline de Vendas
          </h4>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Estágio do Funil
            </label>
            <select
              value={contact.pipelineStage || 'new'}
              onChange={(e) => updateContact(contact.id, { pipelineStage: e.target.value as any })}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
              title="Estágio do Funil"
              aria-label="Estágio do Funil"
            >
              {PIPELINE_STAGES.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Valor do Negócio (R$)
            </label>
            <div className="relative">
              <DollarSign size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="number"
                value={contact.dealValue || 0}
                onChange={(e) => updateContact(contact.id, { dealValue: Number(e.target.value) })}
                className="w-full pl-9 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-green-500 outline-none"
                title="Valor do Negócio"
                aria-label="Valor do Negócio"
              />
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Tags Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide">
            <Tag size={16} className="text-orange-500" /> Tags
          </h4>
          <div className="flex flex-wrap gap-2">
            {contact.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100"
              >
                {tag}
                <button
                  onClick={() =>
                    updateContact(contact.id, { tags: contact.tags.filter((t) => t !== tag) })
                  }
                  className="hover:text-red-500"
                  title="Remover tag"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              placeholder="Add tag..."
              className="flex-1 p-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newTagInput.trim()) {
                  if (!contact.tags.includes(newTagInput.trim())) {
                    updateContact(contact.id, { tags: [...contact.tags, newTagInput.trim()] });
                  }
                  setNewTagInput('');
                }
              }}
            />
            <button
              onClick={() => {
                if (newTagInput.trim() && !contact.tags.includes(newTagInput.trim())) {
                  updateContact(contact.id, { tags: [...contact.tags, newTagInput.trim()] });
                  setNewTagInput('');
                }
              }}
              className="p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200"
              title="Adicionar tag"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Notes Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide">
            <StickyNote size={16} className="text-yellow-500" /> Notas Internas
          </h4>
          <textarea
            value={contact.notes || ''}
            onChange={(e) => updateContact(contact.id, { notes: e.target.value })}
            placeholder="Escreva observações importantes sobre este cliente..."
            className="w-full h-32 p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-yellow-400 outline-none resize-none"
          />
        </div>
      </div>
    </div>
  );
};
