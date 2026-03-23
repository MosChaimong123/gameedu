"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authConfig = void 0;
exports.authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            var _a;
            const isLoggedIn = !!(auth === null || auth === void 0 ? void 0 : auth.user);
            const role = (_a = auth === null || auth === void 0 ? void 0 : auth.user) === null || _a === void 0 ? void 0 : _a.role;
            const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
            const isOnAdmin = nextUrl.pathname.startsWith('/admin');
            const isOnStudentHome = nextUrl.pathname.startsWith('/student/home');
            // /admin → ADMIN only
            if (isOnAdmin) {
                if (!isLoggedIn)
                    return false;
                if (role !== 'ADMIN')
                    return Response.redirect(new URL('/dashboard', nextUrl));
                return true;
            }
            // /dashboard → TEACHER or ADMIN only
            if (isOnDashboard) {
                if (!isLoggedIn)
                    return false;
                if (role === 'STUDENT')
                    return Response.redirect(new URL('/student/home', nextUrl));
                return true;
            }
            // /student/home → authenticated users
            if (isOnStudentHome) {
                if (!isLoggedIn)
                    return false;
                return true;
            }
            return true;
        },
        async jwt({ token, user, trigger, session: sessionData }) {
            if (user) {
                token.id = user.id;
                // @ts-ignore
                token.role = user.role;
                // @ts-ignore
                token.school = user.school;
                token.name = user.name;
                token.picture = user.image;
            }
            if (trigger === "update" && sessionData) {
                if (sessionData.name)
                    token.name = sessionData.name;
                if (sessionData.image)
                    token.picture = sessionData.image;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                if (token.id)
                    session.user.id = token.id;
                // @ts-ignore
                if (token.role)
                    session.user.role = token.role;
                // @ts-ignore
                if (token.school)
                    session.user.school = token.school;
                session.user.name = token.name;
                session.user.image = token.picture;
            }
            return session;
        }
    },
    providers: [], // Providers configured in auth.ts
};
