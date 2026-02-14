import { ImageResponse } from '@vercel/og';
import { createClient } from '@supabase/supabase-js';

export const config = {
    runtime: 'edge',
};

export default async function handler() {
    let name = 'Darfiny CRM';
    let bio = 'Consultora e Especialista em Imóveis de Alto Padrão.';
    let avatar = 'https://ui-avatars.com/api/?name=D&background=22c55e&color=fff';

    try {
        // Busca os dados direto no Supabase para evitar URLs gigantes
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
        console.error('OG Image Fetch Error:', e);
    }

    return new ImageResponse(
        (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#020617',
                    padding: '40px',
                    position: 'relative',
                }}
            >
                {/* Background Accents */}
                <div style={{ position: 'absolute', top: -100, left: -100, width: 500, height: 500, background: 'rgba(34, 197, 94, 0.1)', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', bottom: -100, right: -100, width: 500, height: 500, background: 'rgba(168, 85, 247, 0.1)', borderRadius: '50%' }} />

                {/* Card */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#0f172a',
                        border: '2px solid #1e293b',
                        borderRadius: '48px',
                        padding: '60px',
                        width: '1040px',
                        gap: '50px',
                        borderTop: '6px solid #22c55e',
                    }}
                >
                    {/* Avatar */}
                    <div style={{ display: 'flex', width: 260, height: 260, borderRadius: 32, overflow: 'hidden', border: '4px solid #22c55e' }}>
                        <img src={avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>

                    {/* Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 5, background: '#22c55e', marginRight: 10 }} />
                            <span style={{ fontSize: 20, color: '#22c55e', fontWeight: 700, letterSpacing: 2 }}>DARFINY CRM</span>
                        </div>
                        <div style={{ fontSize: 72, fontWeight: 900, color: 'white', marginBottom: 15, lineHeight: 1.1 }}>{name}</div>
                        <div style={{ fontSize: 32, color: '#94a3b8', lineHeight: 1.4, fontWeight: 500 }}>{bio}</div>
                    </div>
                </div>
            </div>
        ),
        { width: 1200, height: 630 }
    );
}
