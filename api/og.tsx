import { ImageResponse } from '@vercel/og';

export const config = {
    runtime: 'edge',
};

export default function handler(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const name = searchParams.get('name') || 'Darfiny CRM';
        const bio = searchParams.get('bio') || 'Especialista em Imóveis.';

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
                        color: 'white',
                        fontWeight: 'bold',
                        fontFamily: 'sans-serif',
                    }}
                >
                    {/* Fundo Premium Simples */}
                    <div style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 10, background: '#22c55e' }} />

                    <div style={{ display: 'flex', padding: '60px', backgroundColor: '#0f172a', borderRadius: '30px', border: '2px solid #1e293b', alignItems: 'center', gap: '40px' }}>
                        <div style={{ width: '200px', height: '200px', borderRadius: '100px', background: '#22c55e', display: 'flex', alignItems: 'center', justifyItems: 'center', fontSize: '100px' }}>
                            🏠
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '20px', color: '#22c55e', letterSpacing: '4px', marginBottom: '10px' }}>LINK NA BIO</span>
                            <span style={{ fontSize: '70px', lineHeight: 1 }}>{name}</span>
                            <span style={{ fontSize: '30px', color: '#94a3b8', marginTop: '15px' }}>{bio}</span>
                        </div>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            }
        );
    } catch (e) {
        return new Response(`Erro ao gerar imagem`, { status: 500 });
    }
}
