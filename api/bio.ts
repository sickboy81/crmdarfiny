import { createClient } from '@supabase/supabase-js';

export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.VITE_SUPABASE_ANON_KEY!
    );

    // Fetch the public bio data
    const { data: publicBio } = await supabase
        .from('bio_configs')
        .select('*')
        .eq('active', true)
        .single();

    const name = publicBio?.profile_name || 'Darfiny CRM';
    const bio = publicBio?.bio || 'Consultora e Especialista em Imóveis.';
    const avatar = publicBio?.avatar_url || 'https://ui-avatars.com/api/?name=D&background=random';

    // Use absolute URL for the OG image generator
    const ogImageUrl = `https://crm.darfinyavila.com.br/api/og?name=${encodeURIComponent(name)}&bio=${encodeURIComponent(bio)}&avatar=${encodeURIComponent(avatar)}`;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${name} | Link na Bio</title>
  <meta name="description" content="${bio}">
  
  <!-- Open Graph / Meta Tags -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${name}">
  <meta property="og:description" content="${bio}">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:url" content="${req.url}">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${name}">
  <meta name="twitter:description" content="${bio}">
  <meta name="twitter:image" content="${ogImageUrl}">

  <script>
    // Se for um navegador (não crawler), redireciona para a versão app com bypass
    const url = new URL(window.location.href);
    url.searchParams.set('app', 'true');
    window.location.replace(url.toString());
  </script>
  
  <style>
    body { background: #020617; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; margin: 0; }
    .card { text-align: center; max-width: 400px; padding: 20px; }
    img { width: 100px; height: 100px; borderRadius: 50%; marginBottom: 20px; border: 2px solid #22c55e; }
  </style>
</head>
<body>
  <div class="card">
    <img src="${avatar}" alt="Avatar">
    <h1>${name}</h1>
    <p>${bio}</p>
    <p>Carregando perfil...</p>
  </div>
</body>
</html>`;

    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}
