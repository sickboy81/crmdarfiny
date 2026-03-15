// Email Service for Resend Integration

export interface EmailAttachment {
    filename: string;
    content: string; // Base64 content
}

export interface SendEmailParams {
    to: string;
    subject: string;
    content: string;
    apiKey?: string;
    verifiedSender?: string;
    attachments?: EmailAttachment[];
    scheduledAt?: string;
}

/**
 * Service to handle real email sending.
 * For production, this should be called via a backend/edge function to hide the API Key.
 */
export const emailService = {
    sendEmail: async ({ to, subject, content, apiKey, verifiedSender, attachments, scheduledAt }: SendEmailParams) => {
        if (!apiKey) {
            throw new Error('Configuração ausente: API Key do Resend não configurada nas Notificações/Configurações.');
        }

        try {
            // Call our backend proxy to avoid CORS issues and keep API Key safer (though it's still coming from client for now, 
            // the proxy handles the actual request to Resend which often fails on CORS from browsers)
            const response = await fetch('http://localhost:3001/emails/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to,
                    subject,
                    content,
                    apiKey,
                    verifiedSender,
                    attachments,
                    scheduled_at: scheduledAt
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao enviar e-mail via servidor');
            }

            return { success: true, id: data.id };
        } catch (error: any) {
            console.error('Email sending error:', error);
            throw error;
        }
    }
};
