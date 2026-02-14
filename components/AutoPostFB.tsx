import React, { useState, useRef, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import {
  Share2,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  Send,
  Image as ImageIcon,
  ExternalLink,
  Search,
  Users,
} from 'lucide-react';
import { getFacebookConfig, getGroups, postToGroup } from '../services/facebookService';
import { View } from '../types';

const CRM_FB_EXTENSION_DRAFT_KEY = 'crm_fb_extension_draft';

interface AutoPostFBProps {
  onNavigate?: (view: View) => void;
}

interface SelectedGroup {
  id: string;
  name: string;
}

interface ExtensionGroup {
  id: string;
  name: string;
  selected: boolean;
}

export const AutoPostFB: React.FC<AutoPostFBProps> = ({ onNavigate }) => {
  const [message, setMessage] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);
  const [delaySeconds, setDelaySeconds] = useState(3);
  const [selectedGroups, setSelectedGroups] = useState<SelectedGroup[]>([]);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [groupIdInput, setGroupIdInput] = useState('');
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupsLoadError, setGroupsLoadError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<
    Array<{ id: string; name: string; success: boolean; error?: string }>
  >([]);
  const [extensionSession, setExtensionSession] = useState<{
    logged: boolean;
    userName: string | null;
  } | null>(null);
  const [extensionGroups, setExtensionGroups] = useState<ExtensionGroup[]>([]);
  const [extensionLoadingGroups, setExtensionLoadingGroups] = useState(false);
  const [extensionGroupsError, setExtensionGroupsError] = useState<string | null>(null);
  const [extensionGroupSearch, setExtensionGroupSearch] = useState('');
  const [extensionGroupsPage, setExtensionGroupsPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);
  previewUrlsRef.current = filePreviewUrls;

  const GROUPS_PER_PAGE = 100;
  const config = getFacebookConfig();
  const postMethod = config?.postMethod ?? 'api';
  const useExtension = postMethod === 'extension';
  const hasToken = !!config?.accessToken?.trim();
  const formEnabled = useExtension || hasToken;
  const extensionSelectedCount = extensionGroups.filter((g) => g.selected).length;

  const filteredExtensionGroups = useMemo(() => {
    if (!extensionGroupSearch.trim()) return extensionGroups;
    const q = extensionGroupSearch.trim().toLowerCase();
    return extensionGroups.filter((g) => g.name.toLowerCase().includes(q) || g.id.includes(q));
  }, [extensionGroups, extensionGroupSearch]);

  const totalGroupsPages = Math.max(1, Math.ceil(filteredExtensionGroups.length / GROUPS_PER_PAGE));
  const paginatedExtensionGroups = useMemo(() => {
    const start = (extensionGroupsPage - 1) * GROUPS_PER_PAGE;
    return filteredExtensionGroups.slice(start, start + GROUPS_PER_PAGE);
  }, [filteredExtensionGroups, extensionGroupsPage]);

  useEffect(() => {
    setExtensionGroupsPage((p) => (p > totalGroupsPages ? 1 : p));
  }, [totalGroupsPages]);

  useEffect(
    () => () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    []
  );

  useEffect(() => {
    if (!useExtension) return;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || event.data?.source !== 'crm-fb-extension') return;
      const d = event.data;
      if (d.type === 'CRM_EXT_SESSION') {
        setExtensionSession({ logged: !!d.logged, userName: d.userName || null });
      }
      if (d.type === 'CRM_EXT_GROUPS_LOADED') {
        setExtensionLoadingGroups(false);
        setExtensionGroupsError(d.error || null);
        if (d.groups && d.groups.length) {
          setExtensionGroups(
            d.groups.map((g: { id: string; name: string }) => ({ ...g, selected: true }))
          );
          setExtensionGroupsPage(1);
        }
      }
      if (d.type === 'CRM_EXT_PROGRESS') {
        setProgress({ current: d.current || 0, total: d.total || 0 });
      }
      if (d.type === 'CRM_EXT_DONE') {
        setPosting(false);
        if (Array.isArray(d.results)) setResults(d.results);
      }
    };
    window.addEventListener('message', onMessage);
    window.postMessage({ type: 'CRM_EXT_CHECK_SESSION' }, '*');
    return () => window.removeEventListener('message', onMessage);
  }, [useExtension]);

  const handleLoadGroups = async () => {
    if (!hasToken) {
      setGroupsLoadError(
        'Para carregar a lista, configure o Access Token em Configurações → Facebook (Auto Post).'
      );
      if (onNavigate) onNavigate(View.SETTINGS);
      return;
    }
    setLoadingGroups(true);
    setGroupsLoadError(null);
    try {
      const result = await getGroups();
      if (result.error) {
        setGroupsLoadError(result.error);
      }
      if (result.groups.length > 0) {
        setSelectedGroups((prev) => {
          const existingIds = new Set(prev.map((g) => g.id));
          const newOnes = result.groups.filter((g) => !existingIds.has(g.id));
          return [...prev, ...newOnes];
        });
      }
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleAddGroupById = () => {
    const id = groupIdInput.trim().replace(/\D/g, '');
    if (!id) return;
    if (selectedGroups.some((g) => g.id === id)) {
      setGroupIdInput('');
      return;
    }
    setSelectedGroups((prev) => [...prev, { id, name: `Grupo ${id}` }]);
    setGroupIdInput('');
  };

  const removeGroup = (id: string) => {
    setSelectedGroups((prev) => prev.filter((g) => g.id !== id));
  };

  const handleBulkImport = () => {
    // 1. Tenta parsear como JSON (formato copiado da extensão)
    try {
      const json = JSON.parse(bulkImportText);
      if (Array.isArray(json)) {
        const newGroups = json
          .filter(g => g.id && g.name)
          .map(g => ({
            id: String(g.id),
            name: g.name,
            selected: true
          }));

        if (newGroups.length > 0) {
          if (useExtension) {
            setExtensionGroups(prev => {
              const existing = new Set(prev.map(p => p.id));
              const unique = newGroups.filter(n => !existing.has(n.id));
              return [...prev, ...unique];
            });
          } else {
            setSelectedGroups(prev => {
              const existing = new Set(prev.map(p => p.id));
              const unique = newGroups.filter(n => !existing.has(n.id));
              return [...prev, ...unique];
            });
          }
          alert(`${newGroups.length} grupos importados via JSON!`);
          setBulkImportText('');
          setShowBulkImport(false);
          return;
        }
      }
    } catch (e) {
      // Não é JSON válido, segue para regex
    }

    // 2. Extrai todos os IDs numéricos do texto (URLs ou IDs puros)
    const ids = new Set<string>();

    // Tenta extrair IDs de URLs (facebook.com/groups/123456789)
    const urlMatches = bulkImportText.matchAll(
      /(?:facebook\.com\/groups\/|^|\s)(\d{10,20})(?:[\/?\s]|$)/gm
    );
    for (const match of urlMatches) {
      if (match[1]) ids.add(match[1]);
    }

    // Também tenta extrair IDs puros (números de 10+ dígitos em cada linha)
    const lines = bulkImportText.split(/[\n,;]+/);
    lines.forEach((line) => {
      const cleaned = line.trim().replace(/\D/g, '');
      if (cleaned.length >= 10 && cleaned.length <= 20) {
        ids.add(cleaned);
      }
    });

    if (ids.size === 0) {
      alert(
        'Nenhum ID de grupo válido encontrado. Cole JSON da extensão, URLs de grupos ou IDs numéricos.'
      );
      return;
    }

    if (useExtension) {
      // Modo Extension: adiciona ao extensionGroups
      setExtensionGroups((prev) => {
        const existingIds = new Set(prev.map((g) => g.id));
        const newGroups = Array.from(ids)
          .filter((id) => !existingIds.has(id))
          .map((id) => ({ id, name: `Grupo ${id}`, selected: true }));
        return [...prev, ...newGroups];
      });
    } else {
      // Modo API: adiciona ao selectedGroups
      setSelectedGroups((prev) => {
        const existingIds = new Set(prev.map((g) => g.id));
        const newGroups = Array.from(ids)
          .filter((id) => !existingIds.has(id))
          .map((id) => ({ id, name: `Grupo ${id}` }));
        return [...prev, ...newGroups];
      });
    }

    alert(`${ids.size} grupo(s) importado(s)!`);
    setBulkImportText('');
    setShowBulkImport(false);
  };

  const addPhotoUrl = () => {
    const url = photoUrlInput.trim();
    if (!url.startsWith('http')) return;
    setPhotoUrls((prev) => (prev.includes(url) ? prev : [...prev, url]));
    setPhotoUrlInput('');
  };

  const removePhotoUrl = (url: string) => {
    setPhotoUrls((prev) => prev.filter((u) => u !== url));
  };

  const addPhotoFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const newFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    setPhotoFiles((prev) => [...prev, ...newFiles]);
    setFilePreviewUrls((prev) => [...prev, ...newFiles.map((f) => URL.createObjectURL(f))]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhotoFile = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviewUrls((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index]);
      next.splice(index, 1);
      return next;
    });
  };

  const handlePostAll = async () => {
    if (!message.trim()) {
      alert('Digite o texto da publicação.');
      return;
    }
    if (selectedGroups.length === 0) {
      alert('Adicione pelo menos um grupo.');
      return;
    }
    setPosting(true);
    setResults([]);
    setProgress({ current: 0, total: selectedGroups.length });
    const outcome: Array<{ id: string; name: string; success: boolean; error?: string }> = [];
    for (let i = 0; i < selectedGroups.length; i++) {
      setProgress({ current: i + 1, total: selectedGroups.length });
      const g = selectedGroups[i];
      const res = await postToGroup(g.id, message.trim(), {
        photoUrls: photoUrls.length ? photoUrls : undefined,
        photoFiles: photoFiles.length ? photoFiles : undefined,
      });
      outcome.push({ id: g.id, name: g.name, success: res.success, error: res.error });
      if (i < selectedGroups.length - 1 && delaySeconds > 0) {
        await new Promise((r) => setTimeout(r, delaySeconds * 1000));
      }
    }
    setResults(outcome);
    setPosting(false);
  };

  const handleExtensionLoadGroups = () => {
    setExtensionLoadingGroups(true);
    setExtensionGroupsError(null);
    window.postMessage({ type: 'CRM_EXT_LOAD_GROUPS' }, '*');
  };

  const handleExtensionPostAll = () => {
    const toPost = extensionGroups
      .filter((g) => g.selected)
      .map((g) => ({ id: g.id, name: g.name }));
    if (!message.trim()) {
      alert('Digite o texto da publicação.');
      return;
    }
    if (toPost.length === 0) {
      alert('Selecione pelo menos um grupo.');
      return;
    }
    setPosting(true);
    setResults([]);
    setProgress({ current: 0, total: toPost.length });
    window.postMessage(
      {
        type: 'CRM_EXT_POST_ALL',
        payload: {
          groups: toPost,
          message: message.trim(),
          delaySeconds: useExtension ? delaySeconds : 3,
        },
      },
      '*'
    );
  };

  const toggleExtensionGroup = (id: string) => {
    setExtensionGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, selected: !g.selected } : g))
    );
  };

  const selectAllGroups = () => {
    setExtensionGroups((prev) => prev.map((g) => ({ ...g, selected: true })));
  };

  const deselectAllGroups = () => {
    setExtensionGroups((prev) => prev.map((g) => ({ ...g, selected: false })));
  };

  return (
    <div className="p-10 h-full flex flex-col overflow-y-auto bg-[#FBFBFD]">
      <header className="shrink-0 mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
              <Share2 className="text-white" size={24} />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter">FACEBOOK GROUP AUTO POST</h1>
          </div>
          <p className="text-gray-400 text-sm font-medium">Automação refinada do Facebook para engajamento premium.</p>
        </div>

        {useExtension && (
          <div className={clsx(
            "px-4 py-2 rounded-2xl border flex items-center gap-3 backdrop-blur-md transition-all",
            extensionSession?.logged ? "bg-green-50/50 border-green-100 text-green-700" : "bg-amber-50/50 border-amber-100 text-amber-700"
          )}>
            <div className={clsx("w-2 h-2 rounded-full animate-pulse", extensionSession?.logged ? "bg-green-500" : "bg-amber-500")} />
            <span className="text-xs font-black uppercase tracking-widest">
              {extensionSession?.logged ? `Active: ${extensionSession.userName}` : "Extension Required"}
            </span>
          </div>
        )}
      </header>

      {(!useExtension && !hasToken) && (
        <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-3xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-4">
            <AlertCircle className="text-amber-500" size={24} />
            <div>
              <p className="font-bold text-amber-900">Configuração Necessária</p>
              <p className="text-sm text-amber-700/80">O Access Token não foi detectado em seu perfil.</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate?.(View.SETTINGS)}
            className="px-6 py-2 bg-amber-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-colors"
          >
            Configurar Agora
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col xl:flex-row gap-8">
        {/* LEFT COLUMN: EDITOR */}
        <div className="flex-[1.5] min-w-0 bg-white rounded-[32px] border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
          <div className="p-8 pb-4 flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Composer Workspace</h3>
            <div className="flex gap-1.5">
              {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-100" />)}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-10 custom-scrollbar">
            <div className="space-y-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Desenhe sua narrativa aqui..."
                aria-label="Corpo da publicação"
                rows={6}
                className="w-full text-2xl font-medium text-gray-800 placeholder:text-gray-300 border-2 border-slate-300 rounded-xl p-4 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 resize-none leading-relaxed transition-all"
                disabled={!formEnabled}
              />
              <div className="flex items-center gap-4 border-t border-gray-100 pt-6">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Anexar arquivos locais"
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 border-2 border-slate-200 hover:border-slate-300 rounded-xl text-gray-700 transition-all active:scale-95 font-bold"
                >
                  <ImageIcon size={18} />
                  <span className="text-xs font-bold uppercase tracking-widest text-[10px]">Upload</span>
                </button>
                <div className="h-4 w-[1px] bg-gray-200" />
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="url"
                    value={photoUrlInput}
                    onChange={(e) => setPhotoUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPhotoUrl())}
                    placeholder="Cole um link de imagem..."
                    title="URL da imagem"
                    className="flex-1 bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-4 focus:ring-blue-100 focus:border-blue-500 placeholder:text-gray-400 transition-all font-medium text-gray-700"
                    disabled={!formEnabled}
                  />
                  {photoUrlInput.trim() && (
                    <button onClick={addPhotoUrl} className="p-2 text-blue-600 hover:bg-blue-50 border-2 border-blue-200 hover:border-blue-300 rounded-lg transition-colors">
                      <Plus size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Media Stack Grid */}
            {(photoFiles.length > 0 || photoUrls.length > 0) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in zoom-in-95 duration-500">
                {photoFiles.map((_, i) => (
                  <div key={`file-${i}`} className="group relative aspect-square rounded-[24px] overflow-hidden bg-gray-100 ring-2 ring-slate-200 border-2 border-white shadow-sm">
                    <img src={filePreviewUrls[i]} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button onClick={() => removePhotoFile(i)} title="Remover" className="p-3 bg-white/20 backdrop-blur-xl rounded-2xl text-white hover:bg-red-500 transition-all border border-white/30">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
                {photoUrls.map((url, i) => (
                  <div key={`url-${i}`} className="group relative aspect-square rounded-[24px] overflow-hidden bg-gray-100 ring-2 ring-slate-200 border-2 border-white shadow-sm">
                    <img src={url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button onClick={() => removePhotoUrl(url)} title="Remover" className="p-3 bg-white/20 backdrop-blur-xl rounded-2xl text-white hover:bg-red-500 transition-all border border-white/30">
                        <Trash2 size={20} />
                      </button>
                    </div>
                    <div className="absolute top-3 left-3 px-2 py-1 bg-blue-600/90 backdrop-blur rounded-lg text-[8px] font-black text-white uppercase tracking-tighter border border-white/20">REMOTE</div>
                  </div>
                ))}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => addPhotoFiles(e.target.files)} className="hidden" />
          </div>

          <div className="p-10 bg-gradient-to-br from-blue-600 to-blue-700 text-white">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1 space-y-4 w-full">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Delay Intensity</span>
                  <span className="text-2xl font-black">{delaySeconds}s</span>
                </div>
                <input
                  type="range" min={1} max={60} value={delaySeconds}
                  onChange={(e) => setDelaySeconds(Number(e.target.value))}
                  title="Intervalo de tempo"
                  className="w-full accent-white h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Selected Targets</p>
                  <p className="text-3xl font-black">{useExtension ? extensionSelectedCount : selectedGroups.length}</p>
                </div>
                <button
                  type="button"
                  onClick={useExtension ? handleExtensionPostAll : handlePostAll}
                  disabled={posting || !message.trim() || (useExtension ? (extensionSelectedCount === 0 || !extensionSession?.logged) : (selectedGroups.length === 0 || !hasToken))}
                  className="h-20 px-12 bg-white text-blue-600 rounded-[28px] font-black uppercase tracking-[0.1em] text-sm hover:translate-y-[-4px] active:scale-95 transition-all shadow-2xl shadow-blue-900/40 disabled:opacity-50 disabled:translate-y-0 border-4 border-white/20 hover:border-white/40"
                >
                  {posting ? (<div className="flex items-center gap-2"><Loader2 size={20} className="animate-spin" /> <span>Dispatching</span></div>) : "Launch Campaign"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: TARGETS & PREVIEW */}
        <div className="flex-1 min-w-0 flex flex-col gap-8">
          {/* Target List Card */}
          <div className="flex-1 bg-white rounded-[32px] border border-gray-100 shadow-[0_10px_40px_rgba(0,0,0,0.01)] overflow-hidden flex flex-col min-h-[400px]">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Groups</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={useExtension ? handleExtensionLoadGroups : handleLoadGroups}
                  title="Sincronizar Grupos"
                  className="p-2 text-blue-600 hover:bg-blue-50 border-2 border-blue-100 hover:border-blue-200 rounded-xl transition-all"
                >
                  {loadingGroups || extensionLoadingGroups ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                </button>
                <button onClick={() => setShowBulkImport(!showBulkImport)} title="Importar lista" className="p-2 text-gray-400 hover:text-gray-600 border-2 border-slate-300 hover:border-slate-400 rounded-xl transition-all">
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              {showBulkImport && (
                <div className="mb-6 p-4 bg-gray-50 border-2 border-slate-300 rounded-[24px] space-y-3 animate-in fade-in slide-in-from-top-2">
                  <textarea
                    value={bulkImportText} onChange={(e) => setBulkImportText(e.target.value)}
                    placeholder="IDs ou URLs (JSON aceito)..."
                    title="Entrada em massa"
                    className="w-full h-32 p-4 bg-white border-2 border-slate-300 rounded-2xl text-xs focus:ring-4 focus:ring-blue-500/10 placeholder:text-gray-300 transition-all font-medium"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleBulkImport} className="flex-1 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-gray-200 hover:shadow-xl transition-all">Importar</button>
                    <button onClick={() => setShowBulkImport(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 border border-gray-200 rounded-xl text-[10px] font-black uppercase hover:bg-gray-200 transition-all">Fechar</button>
                  </div>
                </div>
              )}

              {useExtension ? (
                <div className="space-y-6">
                  <div className="relative group">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text" placeholder="Search groups..." value={extensionGroupSearch}
                      onChange={(e) => { setExtensionGroupSearch(e.target.value); setExtensionGroupsPage(1); }}
                      title="Filtrar grupos"
                      className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-300 rounded-2xl text-xs focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-gray-400 font-medium"
                    />
                  </div>

                  <div className="flex items-center justify-between px-2 animate-in fade-in slide-in-from-top-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {extensionSelectedCount} Selecionados
                    </span>
                    <div className="flex gap-3">
                      <button
                        onClick={selectAllGroups}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider transition-colors"
                      >
                        Marcar Todos
                      </button>
                      <button
                        onClick={deselectAllGroups}
                        className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-wider transition-colors"
                      >
                        Desmarcar
                      </button>
                    </div>
                  </div>

                  <ul className="grid grid-cols-1 gap-2">
                    {paginatedExtensionGroups.map((g) => (
                      <li key={g.id}
                        onClick={() => toggleExtensionGroup(g.id)}
                        className={clsx(
                          "group flex items-center gap-4 p-4 rounded-[20px] border-2 transition-all cursor-pointer select-none",
                          g.selected ? "bg-blue-50/50 border-blue-300 ring-2 ring-blue-100" : "bg-white border-slate-200 hover:border-slate-300"
                        )}>
                        <div className={clsx("w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all", g.selected ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-200" : "border-slate-300")}>
                          {g.selected && <CheckCircle size={12} className="text-white" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-gray-900 truncate tracking-tight">{g.name}</p>
                          <p className="text-[9px] text-gray-400 font-mono tracking-widest mt-0.5">{g.id}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {totalGroupsPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-4 border-t border-gray-50">
                      <button onClick={() => setExtensionGroupsPage(p => Math.max(1, p - 1))} title="Anterior" className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg">&laquo;</button>
                      <span className="text-[10px] font-black text-gray-900 tracking-widest">{extensionGroupsPage} / {totalGroupsPages}</span>
                      <button onClick={() => setExtensionGroupsPage(p => Math.min(totalGroupsPages, p + 1))} title="Próximo" className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg">&raquo;</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex gap-2">
                    <input
                      type="text" value={groupIdInput} onChange={(e) => setGroupIdInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddGroupById()}
                      placeholder="Add ID manually..."
                      title="Adicionar ID de grupo"
                      className="flex-1 px-4 py-3 bg-gray-50/50 border-none rounded-2xl text-xs focus:ring-2 focus:ring-blue-500/10"
                    />
                    <button onClick={handleAddGroupById} className="px-5 bg-gray-900 text-white rounded-2xl text-[10px] font-black">ADD</button>
                  </div>
                  <ul className="space-y-2">
                    {selectedGroups.map((g) => (
                      <li key={g.id} className="group flex items-center justify-between gap-4 p-4 bg-white border border-gray-100 rounded-[20px] hover:border-blue-100 transition-all">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-gray-900 truncate tracking-tight">{g.name}</p>
                          <p className="text-[9px] text-gray-400 font-mono tracking-widest mt-0.5">{g.id}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); removeGroup(g.id); }} title="Remover" className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Live Simulation Card - RESTORED FULL PREVIEW */}
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between shrink-0">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Facebook Preview</h3>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              </div>
            </div>

            {/* Facebook Post Simulation */}
            <div className="p-6 bg-gray-50/50 flex-1 overflow-y-auto custom-scrollbar">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold text-xl shadow-sm">F</div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">Sua Página</div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-1">
                      Agora mesmo · <span className="text-[10px]">🌎</span>
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {message || <span className="text-gray-300 italic">Sua mensagem aparecerá aqui...</span>}
                </div>

                {(photoFiles.length > 0 || photoUrls.length > 0) && (
                  <div className={clsx(
                    "grid gap-0.5 bg-gray-100 border-t border-b border-gray-100",
                    (photoFiles.length + photoUrls.length) === 1 ? "grid-cols-1" : "grid-cols-2"
                  )}>
                    {[...photoFiles.map((_, i) => filePreviewUrls[i]), ...photoUrls].slice(0, 4).map((src, i, arr) => (
                      <div key={i} className={clsx("relative bg-gray-100 overflow-hidden", (arr.length === 3 && i === 0) ? "col-span-2 aspect-[2/1]" : "aspect-square")}>
                        <img src={src} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                        {i === 3 && arr.length > 4 && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-2xl backdrop-blur-sm">
                            +{arr.length - 3}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-3 flex items-center justify-between border-t border-gray-100 bg-gray-50/30 text-gray-500 text-xs font-semibold">
                  <div className="flex gap-6">
                    <span className="hover:underline cursor-pointer">Curtir</span>
                    <span className="hover:underline cursor-pointer">Comentar</span>
                  </div>
                  <span className="hover:underline cursor-pointer">Compartilhar</span>
                </div>
              </div>

              <div className="mt-4 text-center">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Simulação de Renderização</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DISPATCH LOG */}
        <div className="w-full xl:w-[400px] shrink-0 bg-[#121214] rounded-[32px] overflow-hidden flex flex-col shadow-2xl">
          <div className="p-8 pb-4 flex items-center justify-between border-b border-white/5">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Dispatch Log</h3>
            <button
              onClick={() => setResults([])}
              title="Limpar log"
              className="text-[10px] font-black text-white/40 hover:text-white transition-colors"
            >
              CLEAR
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar-dark">
            {results.length === 0 && !posting && (
              <div className="h-full flex flex-col items-center justify-center text-center text-white/20">
                <Send size={40} className="mb-4 opacity-50" />
                <p className="text-xs font-bold uppercase tracking-widest">Waiting for command</p>
              </div>
            )}

            {posting && (
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 animate-pulse">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">In Progress</p>
                  <p className="text-[10px] font-black text-white/60">{progress.current} / {progress.total}</p>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className={clsx(
                  "p-4 rounded-2xl border transition-all animate-in slide-in-from-right-2",
                  r.success ? "bg-green-500/5 border-green-500/10" : "bg-red-500/5 border-red-500/10"
                )}>
                  <div className="flex items-center gap-3">
                    {r.success ? <CheckCircle size={14} className="text-green-500" /> : <AlertCircle size={14} className="text-red-500" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white/90 truncate">{r.name}</p>
                      {r.error && <p className="text-[9px] text-red-400 mt-1 truncate">{r.error}</p>}
                    </div>
                    <span className={clsx(
                      "text-[9px] font-black uppercase tracking-widest",
                      r.success ? "text-green-500" : "text-red-500"
                    )}>
                      {r.success ? "Success" : "Failed"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
