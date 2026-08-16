const ENVIRONMENT = import.meta.env.MODE || "development";

export const API_BASE_URL = import.meta.env.VITE_API_URL;
export const VITE_BLINKIT_REPORT_PIN = import.meta.env.VITE_BLINKIT_REPORT_PIN || "";
export const APP_ENV = ENVIRONMENT;
