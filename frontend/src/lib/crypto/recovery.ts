/**
 * Emergency Recovery Kit generator and helpers for Karu E2EE.
 */

import { generateRandomBytes } from "./encoding";

/**
 * Generates a cryptographically random Emergency Recovery Code formatted with chunked blocks.
 * Example: KARU-7F3A-8C2D-E91B-4402-9B7C
 */
export function generateEmergencyRecoveryKey(): string {
  const bytes = generateRandomBytes(15);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join("");

  const chunks = [];
  for (let i = 0; i < hex.length; i += 4) {
    chunks.push(hex.slice(i, i + 4));
  }

  return `KARU-${chunks.join("-")}`;
}

/**
 * Generates the plain text document for the downloaded Emergency Recovery Kit.
 */
export function generateRecoveryKitDocument(options: {
  email: string;
  recoveryKey: string;
  createdAt?: string;
}): string {
  const dateStr = options.createdAt || new Date().toUTCString();

  return `================================================================================
                    KARU ZERO-KNOWLEDGE ENCRYPTION RECOVERY KIT
================================================================================

Account Email : ${options.email}
Generated At  : ${dateStr}
Security Tier : Client-Side End-to-End Encryption (AES-256-GCM + PBKDF2)

--------------------------------------------------------------------------------
YOUR EMERGENCY RECOVERY CODE:
--------------------------------------------------------------------------------

  ${options.recoveryKey}

--------------------------------------------------------------------------------
IMPORTANT SECURITY INSTRUCTIONS:
--------------------------------------------------------------------------------
1. Karu utilizes strict Zero-Knowledge End-to-End Encryption (E2EE).
   Karu employees and servers DO NOT hold your master secret or encryption keys.

2. If you forget your master encryption passphrase, this Emergency Recovery Code
   is your ONLY method to verify your cryptographic identity and regain access
   to your encrypted screenplay drafts.

3. Store this file securely:
   - Print a physical copy and keep it in a safe place.
   - Or store in an encrypted password manager.
   - NEVER email or share this recovery code with anyone.

================================================================================
`;
}

/**
 * Initiates a client-side text file download of the Recovery Kit.
 */
export function downloadRecoveryKit(
  recoveryKey: string,
  email: string
): void {
  if (typeof window === "undefined") return;

  const doc = generateRecoveryKitDocument({ email, recoveryKey });
  const blob = new Blob([doc], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `karu-recovery-kit-${email.replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
