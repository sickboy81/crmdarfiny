import { createClient } from '@supabase/supabase-js';

export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    let name = 'Darfiny CRM';
    let bio = 'Especialista em Imóveis de Alto Padrão.';
    let avatar = 'https://ui-avatars.com/api/?name=D&background=22c55e&color=fff&size=600';

    let ogTitle = '';
    let ogDescription = '';
    let ogImage = '';

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

                // OG specifics
                ogTitle = data.og_title || name;
                ogDescription = data.og_description || bio;
                ogImage = data.og_image_url || avatar;
            }
        }
    } catch (e) {
        console.error('Bio fetch error:', e);
    }

    // Default OG if not set by DB
    ogTitle = ogTitle || name;
    ogDescription = ogDescription || bio;
    ogImage = ogImage || avatar;

    const html = '<!DOCTYPE html>' +
        '<html lang="pt-BR">' +
        '<head>' +
        '<meta charset="UTF-8">' +
        '<title>' + name + ' | Link na Bio</title>' +
        '<meta name="description" content="' + bio + '">' +
        '<meta property="og:type" content="website">' +
        '<meta property="og:title" content="' + ogTitle + '">' +
        '<meta property="og:description" content="' + ogDescription + '">' +
        '<meta property="og:image" content="' + ogImage + '">' +
        '<meta property="og:image:width" content="1200">' +
        '<meta property="og:image:height" content="630">' +
        '<meta name="twitter:card" content="summary_large_image">' +
        '<meta name="twitter:title" content="' + ogTitle + '">' +
        '<meta name="twitter:description" content="' + ogDescription + '">' +
        '<meta name="twitter:image" content="' + ogImage + '">' +
        '<script>' +
        'var u = new URL(window.location.href);' +
        'if (!u.searchParams.has("app")) {' +
        '  u.searchParams.set("app", "true");' +
        '  window.location.replace(u.toString());' +
        '}' +
        '</script>' +
        '</head>' +
        '<body style="background:#020617;color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;margin:0;text-align:center;padding:20px;">' +
        '<img src="' + avatar + '" style="width:120px;height:120px;border-radius:50%;border:4px solid #3b82f6;margin-bottom:20px;object-fit:cover;box-shadow:0 10px 30px rgba(59,130,246,0.3);">' +
        '<h1 style="margin:0;font-size:28px;letter-spacing:-0.5px;">' + name + '</h1>' +
        '<p style="opacity:0.6;margin-top:10px;font-size:14px;">Redirecionando para o perfil completo...</p>' +
        '</body>' +
        '</html>';

    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}
