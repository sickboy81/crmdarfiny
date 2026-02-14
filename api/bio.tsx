import { ImageResponse } from '@vercel/og';
import { createClient } from '@supabase/supabase-js';

export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    const url = new URL(req.url);
    const isImageRequest = url.searchParams.get('type') === 'image';

    // Configurações padrão
    let name = 'Darfiny CRM';
    let bio = 'Especialista em Imóveis de Alto Padrão.';
    let avatar = 'https://ui-avatars.com/api/?name=D&background=22c55e&color=fff';

    try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey);
            const { data: publicBio } = await supabase
                .from('bio_configs')
                .select('*')
                .eq('active', true)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();

            if (publicBio) {
                name = publicBio.profile_name || name;
                bio = publicBio.bio || bio;
                avatar = publicBio.avatar_url || avatar;
            }
        }
    } catch (e) {
        console.error('Fetch Error:', e);
    }

    // SE FOR UMA REQUISIÇÃO DE IMAGEM
    if (isImageRequest) {
        return new ImageResponse(
            (
                <div style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#020617',
                    padding: '40px'
                }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#0f172a',
                        border: '2px solid #1e293b',
                        borderRadius: '48px',
                        padding: '60px',
                        width: '1100px',
                        borderTop: '6px solid #22c55e'
                    }}>
                        <img
                            src={avatar}
                            style={{
                                width: '250px',
                                height: '250px',
                                borderRadius: '40px',
                                border: '4px solid #22c55e',
                                marginRight: '50px',
                                objectFit: 'cover'
                            }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <div style={{ fontSize: '20px', color: '#22c55e', fontWeight: 700, marginBottom: '10px' }}>DARFINY CRM</div>
                            <div style={{ fontSize: '80px', fontWeight: 900, color: 'white', lineHeight: 1.1 }}>{name}</div>
                            <div style={{ fontSize: '30px', color: '#94a3b8', marginTop: '10px' }}>{bio}</div>
                        </div>
                    </div>
                </div>
            ),
            { width: 1200, height: 630 }
        );
    }

    // SE FOR UMA REQUISIÇÃO DE PÁGINA (SEO)
    const ogImageUrl = `${url.origin}/api/bio?type=image&v=${Date.now()}`;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${name} | Link na Bio</title>
  <meta name="description" content="${bio}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${name}">
  <meta property="og:description" content="${bio}">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${ogImageUrl}">
  <script>
    const url = new URL(window.location.href);
    if (!url.searchParams.has('app')) {
        url.searchParams.set('app', 'true');
        window.location.replace(url.toString());
    }
  </script>
</head>
<body style="background: #020617; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
  <img src="${avatar}" style="width: 100px; height: 100px; border-radius: 50%; border: 3px solid #22c55e; margin-bottom: 20px;">
  <h1>${name}</h1>
  <p>Carregando perfil...</p>
</body>
</html>`;

    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
