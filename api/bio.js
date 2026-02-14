import { createClient } from '@supabase/supabase-js';

export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    let name = 'Darfiny';
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

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>${name} | Link na Bio</title>
    <meta name="description" content="${bio}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${ogTitle}">
    <meta property="og:description" content="${ogDescription}">
    <meta property="og:image" content="${ogImage}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${ogTitle}">
    <meta name="twitter:description" content="${ogDescription}">
    <meta name="twitter:image" content="${ogImage}">
</head>
<body style="background:#020617;color:white;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
    <p>Carregando perfil...</p>
</body>
</html>`;

    return new Response(html, {
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 's-maxage=60, stale-while-revalidate'
        },
    });
}
