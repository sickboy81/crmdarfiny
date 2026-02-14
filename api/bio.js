import { createClient } from '@supabase/supabase-js';

export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    let name = 'Darfiny CRM';
    let bio = 'Especialista em Imóveis de Alto Padrão.';
    let avatar = 'https://ui-avatars.com/api/?name=D&background=22c55e&color=fff&size=600';

    try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey);
            const { data } = await supabase
                .from('bio_configs')
                .select('*')
                .eq('active', true)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();

            if (data) {
                name = data.profile_name || name;
                bio = data.bio || bio;
                avatar = data.avatar_url || avatar;
            }
        }
    } catch (e) {
        console.error('Bio fetch error:', e);
    }

    const html = '<!DOCTYPE html>' +
        '<html lang="pt-BR">' +
        '<head>' +
        '<meta charset="UTF-8">' +
        '<title>' + name + ' | Link na Bio</title>' +
        '<meta name="description" content="' + bio + '">' +
        '<meta property="og:type" content="website">' +
        '<meta property="og:title" content="' + name + '">' +
        '<meta property="og:description" content="' + bio + '">' +
        '<meta property="og:image" content="' + avatar + '">' +
        '<meta property="og:image:width" content="600">' +
        '<meta property="og:image:height" content="600">' +
        '<meta name="twitter:card" content="summary_large_image">' +
        '<meta name="twitter:title" content="' + name + '">' +
        '<meta name="twitter:description" content="' + bio + '">' +
        '<meta name="twitter:image" content="' + avatar + '">' +
        '<script>' +
        'var u = new URL(window.location.href);' +
        'if (!u.searchParams.has("app")) {' +
        '  u.searchParams.set("app", "true");' +
        '  window.location.replace(u.toString());' +
        '}' +
        '</script>' +
        '</head>' +
        '<body style="background:#020617;color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;margin:0;">' +
        '<img src="' + avatar + '" style="width:100px;height:100px;border-radius:50%;border:3px solid #22c55e;margin-bottom:20px;">' +
        '<h1 style="margin:0;">' + name + '</h1>' +
        '<p style="opacity:0.7;">Carregando...</p>' +
        '</body>' +
        '</html>';

    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}
