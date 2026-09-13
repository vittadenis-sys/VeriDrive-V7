import { Resend } from "resend";

function getEnv(name: string) {
  return process.env[name] ?? "";
}

function getSender() {
  return getEnv("MAIL_FROM") || getEnv("EMAIL_FROM") || "VeriDrive <prenotazioni@veridrive.it>";
}

async function sendEmail({ to, cc, subject, html }: { to: string; cc?: string[]; subject: string; html: string }) {
  const apiKey = getEnv("RESEND_API_KEY");
  if (!apiKey || !to) return { sent: false, reason: "Email non configurata" };
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({ from: getSender(), to, ...(cc?.length ? { cc } : {}), subject, html });
  if (result.error) return { sent: false, reason: result.error.message };
  return { sent: true };
}

export async function sendBookingConfirmation(to: string, bookingId: string) {
  return sendEmail({
    to,
    subject: `Conferma pratica VeriDrive ${bookingId}`,
    html: `<h1>Prenotazione ricevuta</h1><p>Codice pratica: <b>${bookingId}</b></p><p>La tua richiesta è stata registrata.</p>`,
  });
}

export async function sendWorkshopAssignment(
  to: string,
  booking: { id: string; plate: string; vehicleMake?: string | null; vehicleModel?: string | null; service: string; date?: string | null; slot?: string | null; urgency?: boolean },
  cc: string[] = [],
) {
  const vehicle = [booking.vehicleMake, booking.vehicleModel].filter(Boolean).join(" ") || "Veicolo non specificato";
  return sendEmail({
    to,
    cc,
    subject: `Nuovo incarico VeriDrive ${booking.id}`,
    html: `<h1>Nuovo incarico</h1><p>Pratica: <b>${booking.id}</b></p><p>Veicolo: <b>${vehicle}</b></p><p>Targa: <b>${booking.plate}</b></p><p>Servizio: <b>${booking.service}</b></p><p>Data: <b>${booking.date ?? "-"}</b></p><p>Ora: <b>${booking.slot ?? "-"}</b></p>${booking.urgency ? "<p><b>Urgenza</b></p>" : ""}`,
  });
}

export async function sendAdminOrderNotification(to: string, booking: { id: string; amountCents: number; service: string; customerName: string; taxCode: string; residence: string; phone: string; email: string; workshop: string; date?: string | null; slot?: string | null }) {
  return sendEmail({
    to,
    subject: `Nuovo ordine ${booking.id} – Da emettere`,
    html: `<h1>Nuovo ordine VeriDrive</h1><p>Pratica: <b>${booking.id}</b></p><p>Importo: <b>€${(booking.amountCents / 100).toFixed(2)}</b></p><p>Servizio: <b>${booking.service}</b></p><hr/><p>Cliente: ${booking.customerName}</p><p>Codice fiscale: ${booking.taxCode}</p><p>Residenza: ${booking.residence}</p><p>Telefono: ${booking.phone}</p><p>Email: ${booking.email}</p><p>Officina: ${booking.workshop}</p><p>Data/ora: ${booking.date ?? "-"} ${booking.slot ?? ""}</p>`,
  });
}

export async function sendBookingOperationalNotifications(booking: {
  id: string;
  plate: string;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  service: string;
  customerEmail?: string | null;
  workshopEmail?: string | null;
  date?: string | null;
  slot?: string | null;
  urgency?: boolean;
}) {
  const recipients = [booking.workshopEmail, getEnv("BOOKINGS_INBOX") || "prenotazioni@veridrive.it"].filter((email): email is string => Boolean(email));
  const uniqueRecipients = [...new Set(recipients)];
  const customerEmail = booking.customerEmail?.trim();
  const vehicle = [booking.vehicleMake, booking.vehicleModel].filter(Boolean).join(" ") || "Veicolo non specificato";
  const subject = `Nuova prenotazione VeriDrive ${booking.id}`;
  const html = `<h1>Nuova prenotazione VeriDrive</h1><p>Pratica: <b>${booking.id}</b></p><p>Veicolo: <b>${vehicle}</b></p><p>Targa: <b>${booking.plate}</b></p><p>Servizio: <b>${booking.service}</b></p><p>Data: <b>${booking.date ?? "-"}</b></p><p>Ora: <b>${booking.slot ?? "-"}</b></p>${booking.urgency ? "<p><b>Urgenza</b></p>" : ""}`;

  const results = [];
  for (const to of uniqueRecipients) results.push(await sendEmail({ to, subject, html }));
  if (customerEmail) results.push(await sendEmail({ to: customerEmail, subject: `Ricezione prenotazione VeriDrive ${booking.id}`, html: `<h1>Prenotazione ricevuta</h1><p>La pratica <b>${booking.id}</b> è stata registrata.</p><p>Ti aggiorneremo sulla conferma dell'appuntamento.</p>` }));
  return results;
}

export async function sendCertificateIssuedEmail(to: string, certificate: { publicCode: string; bookingId: string; veriscore: number; vehicleMake?: string | null; vehicleModel?: string | null }) {
  const vehicle = [certificate.vehicleMake, certificate.vehicleModel].filter(Boolean).join(" ") || "la tua auto";
  const baseUrl = getEnv("NEXT_PUBLIC_APP_URL") || "https://veridrive.it";
  const verificationUrl = `${baseUrl}/verifica/${encodeURIComponent(certificate.publicCode)}`;
  const html = `<h1>Certificato VeriScore disponibile</h1><p>La verifica della pratica <b>${certificate.bookingId}</b> è stata conclusa.</p><p>Veicolo: <b>${vehicle}</b></p><p>VeriScore: <b>${certificate.veriscore}/100</b></p><p>Il tuo certificato digitale è disponibile nella tua area cliente.</p><p><a href="${verificationUrl}">Apri e verifica il certificato</a></p>`;
  return sendEmail({ to, subject: `Certificato VeriScore ${certificate.publicCode}`, html });
}
