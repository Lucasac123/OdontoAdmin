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

      if (!apiKey) {
        return res.status(500).json({ error: "BREVO_API_KEY is not configured on the server." });
      }

      const results = [];

      // Email
      if ((type === 'email' || type === 'both' || type === 'all') && patient.email) {
        const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "accept": "application/json",
            "api-key": apiKey,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            sender: { name: "OdontoAdmin", email: "contato@odontoadmin.com" },
            to: [{ email: patient.email, name: patient.name }],
            subject: "Lembrete de Consulta Odontológica",
            htmlContent: `<html><body><h2>Olá ${patient.name},</h2><p>${message}</p><p>Data: ${date} às ${time}</p></body></html>`
          })
        });
        const emailData = await emailResponse.json();
        results.push({ channel: 'email', status: emailResponse.ok ? 'success' : 'error', data: emailData });
      }

      // SMS
      if ((type === 'sms' || type === 'both' || type === 'all') && patient.phone) {
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
        results.push({ channel: 'sms', status: smsResponse.ok ? 'success' : 'error', data: smsData });
      }

      // WhatsApp
      if ((type === 'whatsapp' || type === 'all') && patient.phone) {
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
            // Note: Brevo requires a registered senderNumber for WhatsApp. 
            // If not provided or configured in the Brevo dashboard, this might fail.
          })
        });
        const waData = await waResponse.json();
        results.push({ channel: 'whatsapp', status: waResponse.ok ? 'success' : 'error', data: waData });
      }

      res.json({ success: true, results });
    } catch (error) {
      console.error("Error sending reminder:", error);
      res.status(500).json({ error: "Internal server error" });
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
