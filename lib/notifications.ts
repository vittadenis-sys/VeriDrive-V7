import { Resend } from "resend";

function getSender() {
  return process.env.EMAIL_FROM ?? "VeriDrive <onboarding@resend.dev>";
}

export async function sendBookingConfirmation(to: string, bookingId: string) {
  if (!process.env.RESEND_API_KEY || !to) return { sent: false, reason: "Email non configurata" };
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: getSender(),
    to,
    subject: `Conferma pratica VeriDrive ${bookingId}`,
    html: `<h1>Prenotazione ricevuta</h1><p>Codice pratica: <b>${bookingId}</b></p><p>La tua richiesta è stata registrata.</p>`,
  });
  return { sent: true };
}

export async function sendWorkshopAssignment(to: string, booking: { id: string; plate: string; vehicleMake?: string | null; vehicleModel?: string | null; service: string; date?: string | null; slot?: string | null; urgency?: boolean }) {
  if (!process.env.RESEND_API_KEY || !to) return { sent: false, reason: "Email non configurata" };
  const resend = new Resend(process.env.RESEND_API_KEY);
  const vehicle = [booking.vehicleMake, booking.vehicleModel].filter(Boolean).join(" ") || "Veicolo non specificato";
  await resend.emails.send({
    from: getSender(),
    to,
    subject: `Nuovo incarico VeriDrive ${booking.id}`,
    html: `<h1>Nuovo incarico</h1><p>Pratica: <b>${booking.id}</b></p><p>Veicolo: <b>${vehicle}</b></p><p>Targa: <b>${booking.plate}</b></p><p>Servizio: <b>${booking.service}</b></p><p>Data: <b>${booking.date ?? "-"}</b></p><p>Ora: <b>${booking.slot ?? "-"}</b></p>${booking.urgency ? "<p><b>Urgenza</b></p>" : ""}`,
  });
  return { sent: true };
}

export async function sendAdminOrderNotification(to: string, booking: { id: string; amountCents: number; service: string; customerName: string; taxCode: string; residence: string; phone: string; email: string; workshop: string; date?: string | null; slot?: string | null }) {
  if (!process.env.RESEND_API_KEY || !to) return { sent: false, reason: "Email non configurata" };
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: getSender(),
    to,
    subject: `Nuovo ordine ${booking.id} – Da emettere`,
    html: `<h1>Nuovo ordine VeriDrive</h1><p>Pratica: <b>${booking.id}</b></p><p>Importo: <b>€${(booking.amountCents / 100).toFixed(2)}</b></p><p>Servizio: <b>${booking.service}</b></p><hr/><p>Cliente: ${booking.customerName}</p><p>Codice fiscale: ${booking.taxCode}</p><p>Residenza: ${booking.residence}</p><p>Telefono: ${booking.phone}</p><p>Email: ${booking.email}</p><p>Officina: ${booking.workshop}</p><p>Data/ora: ${booking.date ?? "-"} ${booking.slot ?? ""}</p>`
  });
  return { sent: true };
}
