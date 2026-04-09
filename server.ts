import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/send-reminder", async (req, res) => {
    try {
      const { type, patient, message, date, time } = req.body;
      const apiKey = process.env.BREVO_API_KEY;
      const senderEmail = process.env.BREVO_SENDER_EMAIL || "contato@odontoadmin.com";
      const senderName = process.env.BREVO_SENDER_NAME || "OdontoAdmin";

      if (!apiKey) {
        console.error("BREVO_API_KEY is missing in environment variables.");
        return res.status(500).json({ error: "Configuração do servidor incompleta (API Key ausente)." });
      }

      const results = [];

      // Email
      if ((type === 'email' || type === 'both' || type === 'all') && patient.email) {
        try {
          const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
              "accept": "application/json",
              "api-key": apiKey,
              "content-type": "application/json"
            },
            body: JSON.stringify({
              sender: { name: senderName, email: senderEmail },
              to: [{ email: patient.email, name: patient.name }],
              subject: "Lembrete de Consulta Odontológica",
              htmlContent: `<html><body><h2>Olá ${patient.name},</h2><p>${message}</p><p>Data: ${date} às ${time}</p></body></html>`
            })
          });
          const emailData = await emailResponse.json();
          if (!emailResponse.ok) console.error("Brevo Email Error:", emailData);
          results.push({ channel: 'email', status: emailResponse.ok ? 'success' : 'error', data: emailData });
        } catch (err) {
          console.error("Fetch Error (Email):", err);
          results.push({ channel: 'email', status: 'error', message: err instanceof Error ? err.message : String(err) });
        }
      }

      // SMS
      if ((type === 'sms' || type === 'both' || type === 'all') && patient.phone) {
        try {
          const phoneFormatted = `+55${patient.phone.replace(/\D/g, '')}`;
          const smsResponse = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
            method: "POST",
            headers: {
              "accept": "application/json",
              "api-key": apiKey,
              "content-type": "application/json"
            },
            body: JSON.stringify({
              type: "transactional",
              unicodeEnabled: true,
              sender: "OdontoAdm",
              recipient: phoneFormatted,
              content: message
            })
          });
          const smsData = await smsResponse.json();
          if (!smsResponse.ok) console.error("Brevo SMS Error:", smsData);
          results.push({ channel: 'sms', status: smsResponse.ok ? 'success' : 'error', data: smsData });
        } catch (err) {
          console.error("Fetch Error (SMS):", err);
          results.push({ channel: 'sms', status: 'error', message: err instanceof Error ? err.message : String(err) });
        }
      }

      // WhatsApp (Transactional API)
      if ((type === 'whatsapp' || type === 'all') && patient.phone) {
        try {
          const phoneFormatted = `+55${patient.phone.replace(/\D/g, '')}`;
          const waResponse = await fetch("https://api.brevo.com/v3/whatsapp/sendMessage", {
            method: "POST",
            headers: {
              "accept": "application/json",
              "api-key": apiKey,
              "content-type": "application/json"
            },
            body: JSON.stringify({
              recipient: phoneFormatted,
              text: message
              // Note: Brevo typically requires a senderNumber or a pre-defined template for WhatsApp.
            })
          });
          const waData = await waResponse.json();
          if (!waResponse.ok) console.error("Brevo WhatsApp Error:", waData);
          results.push({ channel: 'whatsapp', status: waResponse.ok ? 'success' : 'error', data: waData });
        } catch (err) {
          console.error("Fetch Error (WhatsApp):", err);
          results.push({ channel: 'whatsapp', status: 'error', message: err instanceof Error ? err.message : String(err) });
        }
      }

      res.json({ success: true, results });
    } catch (error) {
      console.error("Error in /api/send-reminder:", error);
      res.status(500).json({ error: "Erro interno no servidor ao processar lembretes." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
