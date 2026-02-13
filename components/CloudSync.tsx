import React, { useState } from 'react';
import { Cloud, RotateCw, CheckCircle2, AlertCircle, Download, Upload } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { useRealEstateStore } from '../stores/useRealEstateStore';
import { supabaseService } from '../services/supabaseService';
import { toast } from 'sonner';

export const CloudSync: React.FC = () => {
    const { contacts, campaigns, setContacts, setCampaigns, setMessages } = useAppStore();
    const { properties, setProperties } = useRealEstateStore();
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    const handleUpload = async () => {
        setIsSyncing(true);
        const toastId = toast.loading('Enviando dados para a nuvem...');

        try {
            await Promise.all([
                supabaseService.syncContacts(contacts),
                campaigns ? supabaseService.syncCampaigns(campaigns) : Promise.resolve(),
                supabaseService.syncProperties(properties)
            ]);

            setLastSync(new Date());
            toast.success('Dados enviados com sucesso!', { id: toastId });
        } catch (error) {
            console.error('Upload failed:', error);
            toast.error('Falha ao enviar dados.', { id: toastId });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDownload = async () => {
        if (!confirm('Isso irá mesclar/sobrescrever seus dados locais com os da nuvem. Deseja continuar?')) {
            return;
        }

        setIsSyncing(true);
        const toastId = toast.loading('Baixando dados da nuvem...');

        try {
            // 1. Fetch Remote Data in Parallel
            const [remoteContacts, remoteCampaigns, remoteProperties, remoteMessages] = await Promise.all([
                supabaseService.fetchContacts(),
                supabaseService.fetchCampaigns(),
                supabaseService.fetchProperties(),
                supabaseService.fetchMessages()
            ]);

            // 2. Set Stores (Simple replacement or merge strategy)
            // Ideally we merge, but for restore, let's assume remote is authority for now or simple overwrite/merge

            // Contacts
            const contactMap = new Map(contacts.map(c => [c.id, c]));
            remoteContacts.forEach(rc => contactMap.set(rc.id, rc));
            setContacts(Array.from(contactMap.values()));

            // Campaigns
            const campaignMap = new Map((campaigns || []).map(c => [c.id, c]));
            remoteCampaigns.forEach(rc => campaignMap.set(rc.id, rc));
            setCampaigns(Array.from(campaignMap.values()));

            // Properties
            const propertyMap = new Map(properties.map(p => [p.id, p]));
            remoteProperties.forEach(rp => propertyMap.set(rp.id, rp));
            setProperties(Array.from(propertyMap.values()));

            // Messages
            if (remoteMessages && Object.keys(remoteMessages).length > 0) {
                setMessages(remoteMessages);
            }

            setLastSync(new Date());
            toast.success('Dados restaurados com sucesso!', { id: toastId });
        } catch (error) {
            console.error('Download failed:', error);
            toast.error('Falha ao baixar dados.', { id: toastId });
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Cloud className="text-indigo-600" size={24} />
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Sincronização em Nuvem</h2>
                        <p className="text-sm text-gray-500">Mantenha seus dados seguros no Supabase.</p>
                    </div>
                </div>
                {lastSync && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-green-500" />
                        Última sync: {lastSync.toLocaleTimeString()}
                    </span>
                )}
            </div>

            <div className="bg-indigo-50 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                    <p className="text-sm text-indigo-700 font-medium">Conectado ao Supabase</p>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        onClick={handleUpload}
                        disabled={isSyncing}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-all font-medium text-sm shadow-sm"
                        title="Enviar dados locais para a nuvem"
                    >
                        <Upload size={16} />
                        {isSyncing ? 'Enviando...' : 'Enviar'}
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={isSyncing}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all font-medium text-sm shadow-md hover:shadow-lg"
                        title="Baixar dados da nuvem e mesclar"
                    >
                        <Download size={16} />
                        {isSyncing ? 'Baixando...' : 'Restaurar'}
                    </button>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 rounded border border-gray-100 text-center">
                    <span className="text-xs text-gray-500 uppercase font-bold">Contatos</span>
                    <p className="text-xl font-bold text-gray-800">{contacts.length}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded border border-gray-100 text-center">
                    <span className="text-xs text-gray-500 uppercase font-bold">Campanhas</span>
                    <p className="text-xl font-bold text-gray-800">{campaigns?.length || 0}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded border border-gray-100 text-center">
                    <span className="text-xs text-gray-500 uppercase font-bold">Imóveis</span>
                    <p className="text-xl font-bold text-gray-800">{properties.length}</p>
                </div>
            </div>
        </div>
    );
};
