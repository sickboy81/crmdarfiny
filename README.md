<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1Iggr5Ae_GJr_2_g8H2KlbBfmLaIOAh-r

## Deployment Architecture

- **Backend (API & WhatsApp):** Hosted on **Coolify** (VPS AlexHost).
  - Port: 3001
  - Persistence: `/app/auth_info_baileys` (WhatsApp sessions)
- **Frontend (UI):** Hosted on **Vercel**.
- **Database:** Hosted on **Supabase**.
