import { ImageResponse } from '@vercel/og';

export const config = {
    runtime: 'edge',
};

export default function handler(req: Request) {
    try {
        const { searchParams } = new URL(req.url);

        const name = searchParams.get('name') || 'Darfiny CRM';
        const bio = searchParams.get('bio') || 'Especialista em Imóveis de Alto Padrão.';
        const avatar = searchParams.get('avatar') || 'https://ui-avatars.com/api/?name=D&background=22c55e&color=fff';

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
                        backgroundColor: '#020617', // slate-950
                        padding: '40px',
                        position: 'relative',
                    }}
                >
                    {/* Background Accents (Circles instead of blurs which are not supported) */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '-100px',
                            left: '-100px',
                            width: '400px',
                            height: '400px',
                            backgroundColor: 'rgba(34, 197, 94, 0.15)', // green
                            borderRadius: '200px',
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '-100px',
                            right: '-100px',
                            width: '400px',
                            height: '400px',
                            backgroundColor: 'rgba(168, 85, 247, 0.15)', // purple
                            borderRadius: '200px',
                        }}
                    />

                    {/* Main Content Card */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#0f172a', // slate-900 (Solid color, no transparency/blur)
                            border: '2px solid #1e293b', // slate-800
                            borderRadius: '40px',
                            padding: '60px',
                            width: '1000px',
                            gap: '50px',
                            borderTop: '4px solid #22c55e', // Green accent line
                        }}
                    >
                        {/* Avatar Container */}
                        <div
                            style={{
                                display: 'flex',
                                width: '280px',
                                height: '280px',
                                borderRadius: '30px',
                                overflow: 'hidden',
                                backgroundColor: '#020617',
                                border: '4px solid #22c55e',
                            }}
                        >
                            <img
                                src={avatar}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                }}
                            />
                        </div>

                        {/* Info Container */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                flex: 1,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '5px', backgroundColor: '#22c55e', marginRight: '10px' }} />
                                <span style={{ fontSize: '20px', color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>
                                    DARFINY CRM
                                </span>
                            </div>

                            <div
                                style={{
                                    fontSize: '72px',
                                    fontWeight: 900,
                                    color: 'white',
                                    marginBottom: '15px',
                                    lineHeight: 1,
                                }}
                            >
                                {name}
                            </div>

                            <div
                                style={{
                                    fontSize: '32px',
                                    color: '#94a3b8', // slate-400
                                    lineHeight: 1.4,
                                    fontWeight: 500,
                                }}
                            >
                                {bio}
                            </div>

                            <div style={{ display: 'flex', marginTop: '40px' }}>
                                <div
                                    style={{
                                        backgroundColor: '#1e293b',
                                        padding: '12px 30px',
                                        borderRadius: '15px',
                                        color: '#f8fafc',
                                        fontSize: '22px',
                                        fontWeight: 600,
                                    }}
                                >
                                    🌐 Acesse meus links
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            },
        );
    } catch (e: any) {
        console.error(e.message);
        return new Response(`Failed to generate the image`, {
            status: 500,
        });
    }
}
