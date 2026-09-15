import nodemailer from "nodemailer";

export interface SendSurveyEmailParams {
  recipientEmail: string;
  route: {
    id: number;
    storeName: string;
    picName: string;
    type: string;
    createdAt: string;
    endTime?: string | null;
    totalDistance?: number | null;
    notes?: string | null;
  };
  summaryInfo?: {
    kelurahan?: string;
    kecamatan?: string;
    city?: string;
    coverageMessage?: string;
    durationStr?: string;
    photoCount?: number;
  };
  docxBuffer: Buffer;
}

export async function sendSurveyEmail({
  recipientEmail,
  route,
  summaryInfo,
  docxBuffer,
}: SendSurveyEmailParams): Promise<{ success: boolean; message: string }> {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || (user ? `"ActiTrack No-Reply" <${user}>` : "ActiTrack No-Reply <no-reply@actitrack.local>");

  if (!user || !pass) {
    return {
      success: false,
      message: "Kredensial SMTP (SMTP_USER & SMTP_PASS) belum disetel di file .env. Silakan konfigurasikan email pengirim di server.",
    };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const distKm = route.totalDistance ? (route.totalDistance / 1000).toFixed(2) : "0";
  const dateStr = new Date(route.createdAt).toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const safeStore = (route.storeName || "survey").replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `Laporan_Survey_${safeStore}_${route.id}.docx`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <div style="background: #1a73e8; color: white; padding: 16px; border-radius: 8px 8px 0 0; text-align: center;">
        <h2 style="margin: 0; font-size: 20px;">Laporan Hasil Survey & Tracking</h2>
        <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.9;">ActiTrack Retail Operations</p>
      </div>

      <div style="padding: 20px 10px;">
        <p>Halo Atasan / Manajer Operasional,</p>
        <p>Berikut adalah ringkasan hasil kegiatan <strong>Survey & Tracking Lapangan</strong> yang baru saja diselesaikan:</p>

        <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px;">
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0; color: #666; width: 40%;">Nama Toko:</td>
            <td style="padding: 8px 0; font-weight: bold;">${route.storeName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0; color: #666;">Petugas / PIC:</td>
            <td style="padding: 8px 0; font-weight: bold;">${route.picName || "-"}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0; color: #666;">Jenis Kegiatan:</td>
            <td style="padding: 8px 0;">${route.type === "observasi" ? "Observasi Toko" : "Sebar Mailer / Brosur"}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0; color: #666;">Tanggal:</td>
            <td style="padding: 8px 0;">${dateStr}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0; color: #666;">Durasi:</td>
            <td style="padding: 8px 0; font-weight: bold;">${summaryInfo?.durationStr || "-"}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0; color: #666;">Jarak Tempuh:</td>
            <td style="padding: 8px 0; font-weight: bold; color: #1a73e8;">${distKm} km</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0; color: #666;">Dokumentasi Foto:</td>
            <td style="padding: 8px 0;">${summaryInfo?.photoCount || 0} titik foto</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0; color: #666;">Kelurahan / Desa:</td>
            <td style="padding: 8px 0; font-weight: bold;">${summaryInfo?.kelurahan || "-"}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0; color: #666;">Kecamatan & Kota:</td>
            <td style="padding: 8px 0; font-weight: bold;">${summaryInfo?.kecamatan || "-"}, ${summaryInfo?.city || "-"}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0; color: #666;">Status Cakupan Toko:</td>
            <td style="padding: 8px 0; font-weight: bold; color: #34a853;">${summaryInfo?.coverageMessage || "Masuk Area Coverage"}</td>
          </tr>
        </table>

        <div style="background: #f8f9fa; border-left: 4px solid #1a73e8; padding: 12px; margin: 15px 0; font-size: 13px; color: #444;">
          <strong>Lampiran Dokumen:</strong> Berkas laporan resmi Word (.docx) lengkap dengan visualisasi peta rute GPS dan matriks foto bukti lapangan terlampir pada email ini.
        </div>

        <p style="font-size: 12px; color: #888; margin-top: 25px;">
          Email ini dikirim otomatis oleh sistem ActiTrack segera setelah petugas lapangan menyelesaikan kegiatan survey.
        </p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from,
      to: recipientEmail,
      replyTo: from,
      subject: `[Laporan Survey] ${route.storeName} - ${distKm} km (${dateStr})`,
      html: htmlContent,
      attachments: [
        {
          filename,
          content: docxBuffer,
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
      ],
    });

    return {
      success: true,
      message: `Laporan survey berhasil dikirimkan ke ${recipientEmail}`,
    };
  } catch (error: any) {
    console.error("Gagal mengirim email survey:", error);
    return {
      success: false,
      message: `Gagal mengirim email: ${error?.message || "Kesalahan jaringan SMTP"}`,
    };
  }
}
