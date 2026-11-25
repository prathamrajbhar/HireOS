const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4012/api/v1";
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const NEXT_PUBLIC_AI_BASE_URL = process.env.NEXT_PUBLIC_AI_BASE_URL || "http://localhost:8012";

export const siteConfig = {
  apiBaseUrl: NEXT_PUBLIC_API_URL,
  appName: 'HireOS',
  appUrl: NEXT_PUBLIC_APP_URL,
  aiServiceUrl: NEXT_PUBLIC_AI_BASE_URL,
  /** Presentation-only floating "AI solve" button on the coding screen. On by default; set NEXT_PUBLIC_DEMO_AI_SOLVE=false to hide. */
  demoAiSolve: process.env.NEXT_PUBLIC_DEMO_AI_SOLVE !== 'false',
};

export const API_BASE_URL = siteConfig.apiBaseUrl;
