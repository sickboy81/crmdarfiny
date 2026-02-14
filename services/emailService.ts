import { toast } from 'sonner';

export interface SendEmailParams {
    to: string;
    subject: string;
    content: string;
    apiKey?: string;
}

/**
 * Service to handle real email sending.
 * For production, this should be called via a backend/edge function to hide the API Key.
 */
export const emailService = {
    sendEmail: async ({ to, subject, content, apiKey }: SendEmailParams) => {
        if (!apiKey) {
            console.warn('E-mail simulation: No API Key provided. Sending mock email.');
            return new Promise((resolve) => {
                setTimeout(() => resolve({ success: true, message: 'Mock sent' }), 1000);
            });
        }

        try {
            // Example using Resend API (standard in modern TS apps)
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: 'CRM <contato@seudominio.com.br>',
                    to: [to],
                    subject: subject,
                    html: content.replace(/\n/g, '<br>'),
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Erro ao enviar e-mail via Resend');
            }

            return { success: true };
        } catch (error: any) {
            console.error('Email sending error:', error);
            throw error;
        }
    }
};
