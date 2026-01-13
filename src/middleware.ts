import { defineMiddleware } from 'astro:middleware';
import { supabaseAdmin } from './lib/supabase';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Only protect /admin routes (except login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    // Get session token from cookie
    const accessToken = context.cookies.get('sb-access-token')?.value;
    const refreshToken = context.cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !supabaseAdmin) {
      return context.redirect('/admin/login');
    }

    try {
      // Verify session with Supabase
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);

      if (error || !user) {
        // Try to refresh the session
        if (refreshToken) {
          const { data: refreshData, error: refreshError } = await supabaseAdmin.auth.refreshSession({
            refresh_token: refreshToken,
          });

          if (refreshError || !refreshData.session) {
            // Clear invalid cookies
            context.cookies.delete('sb-access-token', { path: '/' });
            context.cookies.delete('sb-refresh-token', { path: '/' });
            return context.redirect('/admin/login');
          }

          // Update cookies with new tokens
          context.cookies.set('sb-access-token', refreshData.session.access_token, {
            path: '/',
            httpOnly: true,
            secure: import.meta.env.PROD,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24, // 1 day
          });

          context.cookies.set('sb-refresh-token', refreshData.session.refresh_token, {
            path: '/',
            httpOnly: true,
            secure: import.meta.env.PROD,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
          });

          // Store user in locals for page access
          context.locals.user = refreshData.user;
        } else {
          return context.redirect('/admin/login');
        }
      } else {
        // Store user in locals for page access
        context.locals.user = user;
      }
    } catch (err) {
      console.error('Auth middleware error:', err);
      return context.redirect('/admin/login');
    }
  }

  return next();
});
