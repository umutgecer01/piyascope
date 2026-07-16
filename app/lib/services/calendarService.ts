import type { EconomicEvent, ServiceResult, SiteLocale } from "../types";

type CalendarPayload = { events?: EconomicEvent[]; updatedAt?: string; error?: string };

export const calendarService = {
  async getEvents(locale: SiteLocale = "tr"): Promise<ServiceResult<EconomicEvent[]>> {
    try {
      const response = await fetch(`/api/calendar?lang=${locale}`);
      const payload = await response.json() as CalendarPayload;
      if (!response.ok) throw new Error(payload.error || `Takvim servisi ${response.status} yanıtı verdi.`);
      return { data: payload.events ?? [], updatedAt: payload.updatedAt ?? new Date().toISOString() };
    } catch (error) {
      return { data: [], updatedAt: new Date().toISOString(), error: error instanceof Error ? error.message : "Ekonomik takvim alınamadı." };
    }
  },
};
