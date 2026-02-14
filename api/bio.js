import { createClient } from '@supabase/supabase-js';

export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    let name = 'Darfiny';
    let bio = 'Especialista em Imóveis de Alto Padrão.';
    let avatar = 'https://ui-avatars.com/api/?name=D&background=25D366&color=fff&size=600';

    let ogTitle = '';
    let ogDescription = '';
    let ogImage = '';

    let theme = {
        backgroundColor: '#0F172A',
        buttonColor: '#25D366',
        textColor: '#FFFFFF',
        buttonTextColor: '#000000',
        cardStyle: 'rounded',
        fontFamily: 'sans-serif'
    };
    let links = [];
    let socials = {};

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
                theme = data.theme || theme;
                links = data.links || links;
                socials = data.socials || socials;

                ogTitle = data.og_title || name;
                ogDescription = data.og_description || bio;
                ogImage = data.og_image_url || avatar;
            }
        }
    } catch (e) {
        console.error('Bio fetch error:', e);
    }

    ogTitle = ogTitle || name;
    ogDescription = ogDescription || bio;
    ogImage = ogImage || avatar;

    const activeLinks = (links || []).filter(l => l.active !== false);

    let borderRadius = '16px';
    let cardExtra = '';
    if (theme.cardStyle === 'flat') borderRadius = '0';
    if (theme.cardStyle === 'glass') {
        cardExtra = 'background:rgba(255,255,255,0.1)!important;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.2);';
    }
    if (theme.cardStyle === 'shadow') cardExtra = 'box-shadow:0 20px 25px -5px rgba(0,0,0,0.3);';

    const linksHtml = activeLinks.map(link => {
        const bg = theme.cardStyle === 'glass' ? 'transparent' : (theme.buttonColor || '#25D366');
        return `<a href="${link.url}" target="_blank" rel="noopener noreferrer" 
            style="display:block;width:100%;padding:16px 24px;text-align:center;font-size:18px;font-weight:900;letter-spacing:-0.3px;text-decoration:none;transition:transform 0.15s;border-radius:${borderRadius};background:${bg};color:${theme.buttonTextColor || '#000'};${cardExtra}"
            onmousedown="this.style.transform='scale(0.97)'" onmouseup="this.style.transform='scale(1)'" onmouseleave="this.style.transform='scale(1)'"
        >${link.title}</a>`;
    }).join('');

    let socialsHtml = '';
    const socialItems = [];
    if (socials.instagram) socialItems.push(`<a href="https://instagram.com/${socials.instagram}" target="_blank" rel="noopener noreferrer" style="color:${theme.textColor};opacity:0.8;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg></a>`);
    if (socials.facebook) socialItems.push(`<a href="https://facebook.com/${socials.facebook}" target="_blank" rel="noopener noreferrer" style="color:${theme.textColor};opacity:0.8;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>`);
    if (socials.twitter) socialItems.push(`<a href="https://twitter.com/${socials.twitter}" target="_blank" rel="noopener noreferrer" style="color:${theme.textColor};opacity:0.8;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg></a>`);
    if (socials.linkedin) socialItems.push(`<a href="https://linkedin.com/in/${socials.linkedin}" target="_blank" rel="noopener noreferrer" style="color:${theme.textColor};opacity:0.8;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg></a>`);

    if (socialItems.length > 0) {
        socialsHtml = `<div style="display:flex;gap:24px;margin-top:48px;">${socialItems.join('')}</div>`;
    }

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${ogTitle} | Link na Bio</title>
    <meta name="description" content="${ogDescription}">
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
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body {
            background: ${theme.backgroundColor};
            font-family: ${theme.fontFamily || 'system-ui, -apple-system, sans-serif'};
            min-height: 100vh;
            display: flex;
            justify-content: center;
        }
        .container {
            max-width: 480px;
            width: 100%;
            padding: 48px 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .avatar {
            width: 128px;
            height: 128px;
            border-radius: 50%;
            border: 4px solid rgba(255,255,255,0.2);
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);
            object-fit: cover;
            margin-bottom: 24px;
        }
        .name {
            font-size: 24px;
            font-weight: 900;
            letter-spacing: -0.5px;
            color: ${theme.textColor};
            text-align: center;
        }
        .bio-text {
            color: ${theme.textColor};
            opacity: 0.8;
            margin-top: 12px;
            text-align: center;
            line-height: 1.6;
            padding: 0 16px;
        }
        .links {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-top: 48px;
        }
        .footer {
            margin-top: auto;
            padding-top: 48px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 24px;
        }
        .credits {
            display: flex;
            align-items: center;
            gap: 8px;
            color: ${theme.textColor};
            opacity: 0.3;
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 2px;
            text-transform: uppercase;
        }
    </style>
</head>
<body>
    <div class="container">
        <img class="avatar" src="${avatar}" alt="${name}">
        <h1 class="name">${name}</h1>
        <p class="bio-text">${bio}</p>
        <div class="links">
            ${linksHtml}
        </div>
        <div class="footer">
            ${socialsHtml}
            <div class="credits">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                <span>Egeolabs - 2026</span>
            </div>
        </div>
    </div>
</body>
</html>`;

    return new Response(html, {
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 's-maxage=30, stale-while-revalidate=60'
        },
    });
}
