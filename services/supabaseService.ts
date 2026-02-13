import { supabase } from '../lib/supabase';
import { Contact, Campaign, CampaignLog, Message, Property } from '../types';

export const supabaseService = {
    // --- Contacts ---
    async syncContacts(contacts: Contact[]) {
        if (!contacts.length) return;

        // 1. Upsert Contacts
        const contactRecords = contacts.map(c => ({
            id: c.id,
            name: c.name,
            phone_number: c.phoneNumber,
            email: c.email,
            avatar: c.avatar,
            status: c.status,
            tags: c.tags,
            pipeline_stage: c.pipelineStage,
            last_seen: c.lastSeen ? new Date().toISOString() : null,
            // unread_count is not in Contact type
        }));

        const { error: contactError } = await supabase
            .from('contacts')
            .upsert(contactRecords, { onConflict: 'id' });

        if (contactError) throw contactError;
    },

    async fetchContacts(): Promise<Contact[]> {
        const { data, error } = await supabase
            .from('contacts')
            .select('*');

        if (error) throw error;
        if (!data) return [];

        return data.map(d => ({
            id: d.id,
            name: d.name,
            phoneNumber: d.phone_number,
            email: d.email,
            avatar: d.avatar,
            status: d.status,
            tags: d.tags || [],
            pipelineStage: d.pipeline_stage || 'lead',
            lastSeen: d.last_seen || undefined,
            // messages are fetched separately to avoid huge payload
        }));
    },

    async fetchMessages(): Promise<Record<string, Message[]>> {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .order('timestamp', { ascending: true }); // Ensure order

        if (error) throw error;
        if (!data) return {};

        const messagesMap: Record<string, Message[]> = {};

        data.forEach((m: any) => {
            const msg: Message = {
                id: m.id,
                chatId: m.contact_id, // Map contact_id to chatId
                senderId: m.sender === 'user' ? 'me' : m.sender, // Normalize sender
                content: m.text,
                timestamp: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), // Format time
                status: m.status,
                type: m.type as any
            };

            if (!messagesMap[msg.chatId]) {
                messagesMap[msg.chatId] = [];
            }
            messagesMap[msg.chatId].push(msg);
        });

        return messagesMap;
    },

    // --- Properties ---
    async syncProperties(properties: Property[]) {
        if (!properties.length) return;

        const records = properties.map(p => ({
            id: p.id,
            title: p.title,
            price: p.price,
            location: p.address, // mapping address -> location
            image: p.photos?.[0] || '',
            specs: p.specs,
            tags: p.features, // mapping features -> tags
            stage: p.status,
            // Extra fields might be lost if not in schema (e.g. description, type)
            // Ideally schema should match perfectly, but for now we map what we have
        }));

        const { error } = await supabase
            .from('properties')
            .upsert(records, { onConflict: 'id' });

        if (error) throw error;
    },

    async fetchProperties(): Promise<Property[]> {
        const { data, error } = await supabase
            .from('properties')
            .select('*');

        if (error) throw error;
        if (!data) return [];

        return data.map((p: any) => ({
            id: p.id,
            code: 'N/A', // Schema missing code
            title: p.title,
            description: '', // Schema missing description
            type: 'house', // Schema missing type, default to house
            status: p.stage || 'available',
            price: p.price,
            address: p.location,
            neighborhood: '', // Schema missing
            city: '', // Schema missing
            features: p.tags || [],
            specs: p.specs || { area: 0, bedrooms: 0, bathrooms: 0, parking: 0 },
            photos: p.image ? [p.image] : [],
        }));
    },

    // --- Campaigns ---
    async syncCampaigns(campaigns: Campaign[]) {
        if (!campaigns.length) return;

        const records = campaigns.map(c => ({
            id: c.id,
            name: c.name,
            status: c.status,
            created_at: c.createdAt,
            scheduled_for: c.scheduledFor,
            template_name: c.templateName,
            stats: c.stats,
            audience_snapshot: c.audienceSnapshot,
        }));

        const { error } = await supabase
            .from('campaigns')
            .upsert(records, { onConflict: 'id' });

        if (error) throw error;

        // Sync Logs
        const allLogs: any[] = [];
        campaigns.forEach(c => {
            if (c.logs && c.logs.length > 0) {
                c.logs.forEach(l => {
                    allLogs.push({
                        id: l.id || crypto.randomUUID(),
                        campaign_id: c.id,
                        contact_id: l.contactId,
                        contact_name: l.contactName,
                        contact_phone: l.phone,
                        status: l.status,
                        sent_at: l.timestamp, // map timestamp -> sent_at
                        error: l.error
                    });
                });
            }
        });

        if (allLogs.length > 0) {
            const { error: logError } = await supabase
                .from('campaign_logs')
                .upsert(allLogs, { onConflict: 'id' });

            if (logError) console.error('Error syncing logs:', logError);
        }
    },
    async fetchCampaigns(): Promise<Campaign[]> {
        const { data, error } = await supabase
            .from('campaigns')
            .select('*, campaign_logs(*)'); // logs might be renamed to campaign_logs

        if (error) throw error;
        if (!data) return [];

        return data.map(c => ({
            id: c.id,
            name: c.name,
            status: c.status,
            createdAt: c.created_at,
            scheduledFor: c.scheduled_for,
            templateName: c.template_name,
            stats: c.stats,
            audienceSnapshot: c.audience_snapshot,
            logs: Array.isArray(c.campaign_logs) ? c.campaign_logs.map((l: any) => ({
                id: l.id,
                contactId: l.contact_id,
                contactName: l.contact_name,
                phone: l.contact_phone,
                status: l.status,
                timestamp: l.sent_at,
                error: l.error
            }) as CampaignLog) : []
        }));
    }
};
