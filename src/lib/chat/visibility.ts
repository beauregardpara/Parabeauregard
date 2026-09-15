/** Routes that are authentication-only and must stay distraction free. */
const AUTH_ONLY_ROUTE = /^\/(?:connexion|login|admin\/login|compte\/(?:connexion|inscription)|mot-de-passe(?:\/|$)|forgot-password(?:\/|$)|reset-password(?:\/|$)|auth(?:\/|$))/;

export function isAssistantHiddenRoute(pathname: string): boolean {
  return AUTH_ONLY_ROUTE.test(pathname.split("?")[0] ?? pathname);
}
