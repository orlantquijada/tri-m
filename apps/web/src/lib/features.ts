import { env } from "./env";

const isDemo = env.VITE_DEMO_MODE;

const flag = (key: string, defaultOn: boolean): boolean => {
  const raw = (import.meta.env as Record<string, string | undefined>)[key];
  if (raw === "true") {
    return true;
  }
  if (raw === "false") {
    return false;
  }
  return defaultOn;
};

export const features = {
  audit: flag("VITE_FEATURE_AUDIT", !isDemo),
  blacklist: flag("VITE_FEATURE_BLACKLIST", !isDemo),
  collectionRoutes: flag("VITE_FEATURE_COLLECTION_ROUTES", !isDemo),
  intakeWizard: flag("VITE_FEATURE_INTAKE_WIZARD", !isDemo),
  mobileBottomNav: flag("VITE_FEATURE_MOBILE_BOTTOM_NAV", !isDemo),
  passwordReset: flag("VITE_FEATURE_PASSWORD_RESET", !isDemo),
  quickActions: flag("VITE_FEATURE_QUICK_ACTIONS", !isDemo),
  reports: flag("VITE_FEATURE_REPORTS", !isDemo),
  timeline: flag("VITE_FEATURE_TIMELINE", !isDemo),
  today: flag("VITE_FEATURE_TODAY", !isDemo),
  visits: flag("VITE_FEATURE_VISITS", !isDemo),
  voidPayment: flag("VITE_FEATURE_VOID_PAYMENT", !isDemo),
} as const;

export type FeatureKey = keyof typeof features;
