'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { MessageTemplate } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, FileText, ArrowRight, Plus, X } from 'lucide-react';

const categoryColors: Record<string, string> = {
  Marketing: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Utility: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Authentication: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

interface Step1Props {
  selectedTemplate: MessageTemplate | null;
  onSelect: (template: MessageTemplate) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step1ChooseTemplate({ selectedTemplate, onSelect, onNext, onBack }: Step1Props) {
  const t = useTranslations('broadcasts');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: 'Marketing',
    language: 'pt_BR',
    body_text: '',
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('message_templates')
        .select('*')
        .eq('status', 'APPROVED')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setTemplates(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTemplate() {
    if (!newTemplate.name.trim() || !newTemplate.body_text.trim()) return;

    setCreating(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('message_templates')
        .insert({
          name: newTemplate.name.trim(),
          category: newTemplate.category,
          language: newTemplate.language,
          body_text: newTemplate.body_text.trim(),
          status: 'DRAFT',
          user_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh the list
      await fetchTemplates();

      // Auto-select the new template
      if (data) {
        onSelect(data);
      }

      setShowCreateDialog(false);
      setNewTemplate({ name: '', category: 'Marketing', language: 'pt_BR', body_text: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t('chooseTemplate')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('chooseTemplateDesc')}
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-border bg-card/50">
          <FileText className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t('noTemplatesAvailable')}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('createTemplate') ?? 'Criar Modelo'}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {templates.length} {templates.length === 1 ? 'modelo disponível' : 'modelos disponíveis'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('createTemplate') ?? 'Criar Modelo'}
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const isSelected = selectedTemplate?.id === template.id;
            const catColor = categoryColors[template.category] ?? categoryColors.Utility;

            return (
              <button
                key={template.id}
                onClick={() => onSelect(template)}
                className={`flex flex-col gap-3 rounded-xl border p-4 text-left transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border bg-card/50 hover:border-border hover:bg-card'
                }`}
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-medium text-foreground">{template.name}</h3>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${catColor}`}
                  >
                    {template.category}
                  </span>
                </div>
                <p className="line-clamp-3 text-xs text-muted-foreground">{template.body_text}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{template.language ?? 'en_US'}</span>
                  {/* Status is omitted on purpose — every template
                      shown here is already filtered to APPROVED,
                      so the chip carried no information. */}
                </div>
              </button>
            );
          })}
        </div>
        </>
      )}

      {/* Create Template Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('createTemplate') ?? 'Criar Modelo'}</h3>
              <button onClick={() => setShowCreateDialog(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground">Nome</label>
                <Input
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Promoção de Verão"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground">Categoria</label>
                  <select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate((p) => ({ ...p, category: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background"
                  >
                    <option value="Marketing">Marketing</option>
                    <option value="Utility">Utility</option>
                    <option value="Authentication">Authentication</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground">Idioma</label>
                  <select
                    value={newTemplate.language}
                    onChange={(e) => setNewTemplate((p) => ({ ...p, language: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background"
                  >
                    <option value="pt_BR">Português (BR)</option>
                    <option value="en_US">English (US)</option>
                    <option value="es_ES">Español (ES)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground">Corpo da mensagem</label>
                <textarea
                  value={newTemplate.body_text}
                  onChange={(e) => setNewTemplate((p) => ({ ...p, body_text: e.target.value }))}
                  placeholder="Digite o texto da mensagem. Use {{1}}, {{2}} para variáveis."
                  rows={4}
                  className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background resize-none"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Use {'{{1}}'}, {'{{2}}'} etc. para variáveis personalizáveis
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                {tc('cancel')}
              </Button>
              <Button
                onClick={handleCreateTemplate}
                disabled={!newTemplate.name.trim() || !newTemplate.body_text.trim() || creating}
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                {tc('create')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button variant="outline" onClick={onBack} className="border-border text-muted-foreground">
          {tc('back')}
        </Button>
        <Button
          onClick={onNext}
          disabled={!selectedTemplate}
          className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {tc('next')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
