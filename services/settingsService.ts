import { supabase } from '../lib/supabase';

export const getDBSettings = async (userId: string) => {
    const { data, error } = await supabase
        .from('settings')
        .select('data')
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is 'no rows returned'
        console.error('Error fetching settings:', error);
        return null;
    }

    return data?.data || null;
};

export const saveDBSettings = async (userId: string, data: any) => {
    const { error } = await supabase
        .from('settings')
        .upsert({ user_id: userId, data, updated_at: new Date().toISOString() });

    if (error) {
        console.error('Error saving settings:', error);
        throw error;
    }
};
