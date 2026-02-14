import { supabase } from '../lib/supabase';

export const bioService = {
    async getBioConfig(userId: string) {
        const { data, error } = await supabase
            .from('bio_configs')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching bio config:', error);
            return null;
        }

        return data;
    },

    async getPublicBio() {
        // For now, fetch the first active bio found (assuming single user or admin bio for /bio)
        // In a multi-tenant system, this would fetch by slug or userId in path
        const { data, error } = await supabase
            .from('bio_configs')
            .select('*')
            .eq('active', true)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            console.error('Error fetching public bio:', error);
            return null;
        }

        return data;
    },

    async saveBioConfig(userId: string, config: any) {
        console.log('bioService.saveBioConfig called for:', userId);
        const { data, error } = await supabase
            .from('bio_configs')
            .upsert({
                user_id: userId,
                profile_name: config.profileName,
                bio: config.bio,
                avatar_url: config.avatarUrl,
                og_title: config.ogTitle,
                og_description: config.ogDescription,
                og_image_url: config.ogImageUrl,
                theme: config.theme,
                links: config.links,
                socials: config.socials,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })
            .select();

        if (error) {
            console.error('Supabase error in saveBioConfig:', error);
            throw error;
        }
        console.log('Supabase save success, returned data:', data);
        return data;
    }
};
