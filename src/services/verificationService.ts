// src/services/verificationService.ts

/**
 * Service to handle 2-step verification code sending.
 * 
 * NOTE: This is a placeholder implementation.
 */

export type VerificationMethod = 'email' | 'sms' | 'whatsapp';

export const sendVerificationCode = async (
  method: VerificationMethod,
  recipient: string,
  code: string
): Promise<{ success: boolean; error?: string }> => {
  console.log(`Sending verification code ${code} via ${method} to ${recipient}`);

  // TODO: Integrate with real provider API here.

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Return success for simulation
  return { success: true };
};
