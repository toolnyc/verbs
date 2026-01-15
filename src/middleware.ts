import { defineMiddleware } from 'astro:middleware';
import { supabaseAdmin } from './lib/supabase';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin/login';

  // Get session token from cookie
  const accessToken = context.cookies.get('sb-access-token')?.value;
  const refreshToken = context.cookies.get('sb-refresh-token')?.value;

  // Try to authenticate user for all routes (required for admin, optional for public)
  if (accessToken && supabaseAdmin) {
    try {
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
            if (isAdminRoute) {
              return context.redirect('/admin/login');
            }
          } else {
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
          }
        } else if (isAdminRoute) {
          return context.redirect('/admin/login');
        }
      } else {
        // Store user in locals for page access
        context.locals.user = user;
      }
    } catch (err) {
      console.error('Auth middleware error:', err);
      if (isAdminRoute) {
        return context.redirect('/admin/login');
      }
    }
  } else if (isAdminRoute) {
    // No token but trying to access admin route
    return context.redirect('/admin/login');
  }

  return next();
});
