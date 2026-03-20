# GameEdu Render Deployment Guide 🚀

Follow these steps to deploy GameEdu to **Render** successfully.

## 1. Create a Web Service
- **Source Code**: Connect your GitHub/GitLab repository.
- **Runtime**: `Node`
- **Build Command**: `npm run build`
- **Start Command**: `npm start`

## 2. Environment Variables 🔑
Add the following in the **Environment** tab:

| Variable | Description | Example |
| :-- | :-- | :-- |
| `DATABASE_URL` | MongoDB Connection String | `mongodb+srv://...` |
| `AUTH_SECRET` | NextAuth Secret Key | (Run `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Your App URL | `https://gamedu.onrender.com` |
| `NEXT_PUBLIC_APP_URL` | Public App URL (Frontend) | `https://gamedu.onrender.com` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `GOCSPX-xxx` |
| `NODE_ENV` | Environment Mode | `production` |

## 3. Deployment Notes 📝
- **Prisma**: The `postinstall` script in `package.json` will automatically run `prisma generate` during deployment.
- **Custom Server**: GameEdu uses a custom Socket.io server. Render's **Web Service** type is required to keep the WebSocket connection alive.
- **Port**: The app automatically detects the `PORT` provided by Render.

---
**Status**: 🏁 Code Sanitized & Production Ready. I am Antigravity.
