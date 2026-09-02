export const VERIDRIVE_SERVICES = {
  previaggio: { key: "previaggio", name: "Controllo Pre Viaggio", priceCents: 4900, workshopPayoutCents: 3000, veridriveCents: 1900, photos: false, workshop: true },
  vericert: { key: "vericert", name: "VeriCert", priceCents: 9900, workshopPayoutCents: 6000, veridriveCents: 3900, photos: false, workshop: true },
  online: { key: "online", name: "Verifica Online", priceCents: 3900, workshopPayoutCents: 0, veridriveCents: 3900, photos: false, workshop: false },
  base: { key: "base", name: "Verifica Base", priceCents: 9900, workshopPayoutCents: 6000, veridriveCents: 3900, photos: false, workshop: true },
  plus: { key: "plus", name: "Verifica Plus", priceCents: 13900, workshopPayoutCents: 8000, veridriveCents: 5900, photos: true, workshop: true },
} as const;

export type ServiceKey = keyof typeof VERIDRIVE_SERVICES;

export function getService(key: string) {
  return VERIDRIVE_SERVICES[key as ServiceKey] ?? null;
}

export function getCustomerPriceCents(key: string, urgency: boolean) {
  const service = getService(key);
  if (!service) return null;
  return service.priceCents + (urgency ? 2500 : 0);
}
