/**
 * Future integration contracts — implement adapters when wiring external services.
 */

export type PushNotificationPayload = {
  title: string;
  body: string;
  route?: string;
  data?: Record<string, string>;
};

export type SmsMessage = {
  to: string;
  body: string;
};

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
};

export type WeatherSnapshot = {
  locationLabel: string;
  tempF: number;
  condition: string;
  fetchedAt: number;
};

export type PaymentIntentStub = {
  amountCents: number;
  currency: "USD";
  description: string;
  metadata?: Record<string, string>;
};

export interface PlatformIntegrations {
  sendPush?(uid: string, payload: PushNotificationPayload): Promise<void>;
  sendSms?(message: SmsMessage): Promise<void>;
  sendEmail?(message: EmailMessage): Promise<void>;
  fetchWeather?(propertyId: string): Promise<WeatherSnapshot | null>;
  createPaymentIntent?(intent: PaymentIntentStub): Promise<{ clientSecret: string }>;
  summarizeFeed?(postIds: string[]): Promise<string>;
}

/** No-op registry until integrations ship */
let integrations: PlatformIntegrations = {};

export function registerIntegrations(adapter: PlatformIntegrations): void {
  integrations = { ...integrations, ...adapter };
}

export function getIntegrations(): PlatformIntegrations {
  return integrations;
}
