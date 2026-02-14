import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const url = new URL(req.url);

  if (url.searchParams.get('app') === 'true') {
    return new Response(null, { status: 302, headers: { Location: '/index.html' } });
  }

  let name = 'Darfiny CRM';
  let bio = 'Consultora e Especialista em Imóveis de Alto Padrão.';
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
    console.error('Bio Script Error:', e);
  }

  // Simplified and direct URL
  const ogImageUrl = `https://crm.darfinyavila.com.br/api/og?v=${Date.now()}`;

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
    url.searchParams.set('app', 'true');
    window.location.replace(url.toString());
  </script>
</head>
<body style="background: #020617; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
  <img src="${avatar}" style="width: 100px; height: 100px; border-radius: 50%; border: 3px solid #22c55e; margin-bottom: 20px;">
  <h1 style="margin: 0;">${name}</h1>
  <p style="opacity: 0.7;">Carregando perfil...</p>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
