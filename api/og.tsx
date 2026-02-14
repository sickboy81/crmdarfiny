import { ImageResponse } from '@vercel/og';

export const config = {
    runtime: 'edge',
};

export default function handler(req: Request) {
    const { searchParams } = new URL(req.url);

    // Get dynamic data from query params
    const name = searchParams.get('name') || 'Darfiny CRM';
    const bio = searchParams.get('bio') || 'Consultora de Vendas e Especialista em Imóveis de Alto Padrão.';
    const avatar = searchParams.get('avatar') || 'https://ui-avatars.com/api/?name=D&background=random&color=fff';
    // Use user provided avatar or fallback

    return new ImageResponse(
        (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#020617', // slate-950
                    fontFamily: 'sans-serif',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Ambient Gradients - CSS-in-JS for ImageResponse */}
                <div
                    style={{
                        position: 'absolute',
                        top: '-20%',
                        left: '-10%',
                        width: '600px',
                        height: '600px',
                        background: 'rgba(34, 197, 94, 0.1)', // green-500/10
                        borderRadius: '50%',
                        filter: 'blur(100px)',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        bottom: '-20%',
                        right: '-10%',
                        width: '600px',
                        height: '600px',
                        background: 'rgba(168, 85, 247, 0.1)', // purple-500/10
                        borderRadius: '50%',
                        filter: 'blur(100px)',
                    }}
                />

                {/* Card Container */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(15, 23, 42, 0.8)', // slate-900/80
                        border: '1px solid rgba(30, 41, 59, 1)', // slate-800
                        borderRadius: '32px',
                        padding: '40px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        width: '90%',
                        maxWidth: '1000px',
                        gap: '40px',
                        position: 'relative',
                    }}
                >
                    {/* Top Line Accent */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '4px',
                            background: 'linear-gradient(90deg, transparent 0%, #22c55e 50%, transparent 100%)', // green-500
                            opacity: 0.5,
                        }}
                    />

                    {/* Profile Image */}
                    <div
                        style={{
                            display: 'flex',
                            width: '250px',
                            height: '250px',
                            borderRadius: '24px',
                            overflow: 'hidden',
                            border: '2px solid rgba(34, 197, 94, 0.3)', // Green border
                            boxShadow: '0 0 40px rgba(34, 197, 94, 0.2)',
                        }}
                    >
                        <img
                            src={avatar}
                            alt="Profile"
                            width="250"
                            height="250"
                            style={{
                                objectFit: 'cover',
                                width: '100%',
                                height: '100%',
                            }}
                        />
                    </div>

                    {/* Text Content */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            flex: 1,
                            gap: '10px',
                        }}
                    >
                        {/* Logo / Brand */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                            <span style={{ fontSize: '16px', color: '#22c55e', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700 }}>
                                Link na Bio
                            </span>
                        </div>

                        <h1
                            style={{
                                fontSize: '64px',
                                fontWeight: 800,
                                color: 'white',
                                margin: 0,
                                lineHeight: 1.1,
                                letterSpacing: '-1px',
                            }}
                        >
                            {name}
                        </h1>

                        <p
                            style={{
                                fontSize: '28px',
                                color: '#94a3b8', // slate-400
                                margin: '10px 0 0 0',
                                lineHeight: 1.5,
                                fontWeight: 500,
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                            }}
                        >
                            {bio}
                        </p>

                        {/* Footer */}
                        <div style={{ marginTop: '30px', display: 'flex', alignItems: 'center' }}>
                            <div style={{ background: '#1e293b', padding: '10px 20px', borderRadius: '12px', color: '#cbd5e1', fontSize: '18px', display: 'flex', gap: '10px' }}>
                                <span>👉</span> Confira meus links
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
}
