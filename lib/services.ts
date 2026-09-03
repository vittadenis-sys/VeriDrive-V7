export const VERIDRIVE_SERVICES = {
  previaggio: { key: "previaggio", name: "Controllo Viaggio", priceCents: 4900, workshopPayoutCents: 3000, veridriveCents: 1900, photos: false, certificate: false, veriscore: false, workshop: true },
  vericert: { key: "vericert", name: "Check-up + VeriScore", priceCents: 9900, workshopPayoutCents: 6000, veridriveCents: 3900, photos: false, certificate: true, veriscore: true, workshop: true },
  online: { key: "online", name: "Verifica Online", priceCents: 3900, workshopPayoutCents: 0, veridriveCents: 3900, photos: false, certificate: false, veriscore: false, workshop: false },
  base: { key: "base", name: "Controllo Base", priceCents: 9900, workshopPayoutCents: 6000, veridriveCents: 3900, photos: false, certificate: true, veriscore: true, workshop: true },
  plus: { key: "plus", name: "Verifica Plus", priceCents: 14900, workshopPayoutCents: 8000, veridriveCents: 6900, photos: true, certificate: true, veriscore: true, repairEstimate: true, workshop: true },
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
