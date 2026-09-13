/**
 * Navigate the SPA to a route from outside the React tree (e.g. a notification
 * tap handler). The app uses BrowserRouter, so `window.location.hash` does NOT
 * trigger navigation. We use the History API + a popstate event, which React
 * Router v6 listens to, giving a client-side navigation with no full reload.
 * Falls back to a hard navigation if anything goes wrong.
 */
export function navigateFromNotification(route) {
  const target = route && route.startsWith('/') ? route : '/user';
  try {
    if (window.location.pathname === target) return;
    window.history.pushState({}, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
  } catch {
    window.location.href = target;
  }
}
