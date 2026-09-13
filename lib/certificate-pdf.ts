import QRCode from "qrcode";
import { jsPDF } from "jspdf";

type CertificatePdfInput = {
  publicCode: string;
  bookingId: string;
  vehiclePlate: string;
  vehicleVin: string;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleYear?: number | null;
  vehicleMileage: number;
  veriscore: number;
  workshopName?: string | null;
  issuedAt: string;
};

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://veridrive.it";
}

export async function buildCertificatePdf(certificate: CertificatePdfInput) {
  const verificationUrl = `${getBaseUrl()}/verifica/${encodeURIComponent(certificate.publicCode)}`;
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1, width: 420 });

  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  pdf.setFontSize(24);
  pdf.text("VeriDrive", 20, 22);
  pdf.setFontSize(13);
  pdf.text("CERTIFICATO VERISCORE", 20, 32);

  pdf.setFontSize(11);
  const lines = [
    `Codice certificato: ${certificate.publicCode}`,
    `Pratica: ${certificate.bookingId}`,
    `Veicolo: ${[certificate.vehicleMake, certificate.vehicleModel].filter(Boolean).join(" ") || "Non indicato"}`,
    `Anno: ${certificate.vehicleYear ?? "Non indicato"}`,
    `Targa: ${certificate.vehiclePlate}`,
    `Telaio / VIN: ${certificate.vehicleVin}`,
    `Chilometraggio certificato: ${Number(certificate.vehicleMileage).toLocaleString("it-IT")} km`,
    `VeriScore: ${certificate.veriscore}/100`,
    `Officina: ${certificate.workshopName ?? "Officina VeriDrive"}`,
    `Data emissione: ${new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(certificate.issuedAt))}`,
  ];

  let y = 48;
  for (const line of lines) {
    pdf.text(line, 20, y);
    y += 9;
  }

  pdf.addImage(qrDataUrl, "PNG", 145, 47, 45, 45);
  pdf.setFontSize(8);
  pdf.text("Scansiona per verificare il certificato pubblico", 145, 96, { maxWidth: 45, align: "center" });

  pdf.setFontSize(9);
  pdf.text("Documento emesso da VeriDrive. La verifica pubblica mostra esclusivamente i dati non sensibili del certificato.", 20, 145, { maxWidth: 170 });

  return pdf.output("arraybuffer");
}