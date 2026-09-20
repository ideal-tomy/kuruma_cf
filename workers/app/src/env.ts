export type AppEnv = {
  Bindings: {
    DB: D1Database;
    ASSETS: Fetcher;
    SESSION_SECRET: string;
    DEMO_EMAIL?: string;
    DEMO_PASSWORD?: string;
    AUTO_SEND_ENABLED?: string;
    SITE_URL?: string;
    ISSUER_JSON?: string;
    CUSTOMER_PORTAL_SECRET?: string;
    QUOTE_SHARE_SECRET?: string;
    OPT_OUT_SECRET?: string;
    LINE_CHANNEL_ACCESS_TOKEN?: string;
    LINE_CHANNEL_SECRET?: string;
    NOTIFICATION_IDEMPOTENCY_DISABLED?: string;
  };
  Variables: {
    sessionEmail: string;
  };
};
