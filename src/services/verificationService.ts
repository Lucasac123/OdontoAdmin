// src/services/verificationService.ts

/**
 * Service to handle 2-step verification code sending.
 * 
 * NOTE: This is a placeholder implementation. To use real SMS/WhatsApp/Email sending,
 * you need to integrate with a provider like Twilio, SendGrid, or similar,
 * and configure the necessary environment variables.
 */

export type VerificationMethod = 'email' | 'sms' | 'whatsapp';

export const sendVerificationCode = async (
  method: VerificationMethod,
  recipient: string,
  code: string
): Promise<{ success: boolean; error?: string }> => {
  console.log(`Sending verification code ${code} via ${method} to ${recipient}`);

  // TODO: Integrate with real provider API here.
  // Example for Twilio (SMS/WhatsApp):
  // const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  // await client.messages.create({ ... });

  // Example for SendGrid (Email):
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  // await sgMail.send({ ... });

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Return success for simulation
  return { success: true };
};
