/** Central config. Every external dependency reads from here and degrades gracefully. */
export const config = {
  openaiKey: process.env.OPENAI_API_KEY || "",
  imageProvider: process.env.IMAGE_PROVIDER || "openai",
  ghlWebhookUrl: process.env.GHL_WEBHOOK_URL || "",
  ghlApiKey: process.env.GHL_API_KEY || "",
  ghlLocationId: process.env.GHL_LOCATION_ID || "",
  dropboxToken: process.env.DROPBOX_ACCESS_TOKEN || "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
};
