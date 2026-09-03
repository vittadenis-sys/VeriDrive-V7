export const VERIDRIVE_SERVICES = {
  check_viaggio: { key: "check_viaggio", name: "Check Viaggio", priceCents: 4900, workshopPayoutCents: 3000, veridriveCents: 1900, photos: false, certificate: false, veriscore: false, workshop: true },
  veriscore: { key: "veriscore", name: "Check-up + VeriScore", priceCents: 9900, workshopPayoutCents: 6000, veridriveCents: 3900, photos: false, certificate: true, veriscore: true, workshop: true },
  check_online: { key: "check_online", name: "Check Online", priceCents: 3900, workshopPayoutCents: 0, veridriveCents: 3900, photos: false, certificate: false, veriscore: false, workshop: false },
  veriscore_plus: { key: "veriscore_plus", name: "Check-up + VeriScorePlus", priceCents: 14900, workshopPayoutCents: 8000, veridriveCents: 6900, photos: true, certificate: true, veriscore: true, repairEstimate: true, workshop: true },
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

export const CUSTOMER_SERVICE_GROUPS = {
  own_car: ["check_viaggio", "veriscore"],
  buying_used: ["check_online", "veriscore", "veriscore_plus"],
} as const;

export const MERCHANT_SERVICE_KEY: ServiceKey = "veriscore";
