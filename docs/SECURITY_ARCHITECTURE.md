# Karu — End-to-End Encryption (E2EE) Security Architecture & Threat Model

---

## 1. Executive Summary & Security Philosophy

Karu is an End-to-End Encrypted (E2EE), zero-knowledge collaborative screenplay and filmmaking workspace. 

The security architecture guarantees that **screenplay content, character descriptions, dialogue, scene notes, and revisions are encrypted client-side in the user's browser before ever being transmitted over the network or stored in the database**. The server and database operators hold zero knowledge of screenwriting data and have no cryptographic capability to read, index, or decrypt screenplay content.

---

## 2. Cryptographic Key Hierarchy

Karu implements a **3-Tier Cryptographic Key Hierarchy** separating identity, project scopes, and document versions:

```text
               +----------------------------------+
               |        Master Passphrase         |
               +----------------------------------+
                                |
                                | PBKDF2-SHA256 (600,000 iterations)
                                v
               +----------------------------------+
               |   User Encryption Key (UEK)      |  (Tier 1: In-Memory Only)
               +----------------------------------+
                     /                      \
      AES-256-GCM   /                        \  AES-256-GCM
                   v                          v
    +---------------------------+     +-----------------------------+
    | User Identity Keypair     |     | Project Encryption Key (PEK)|  (Tier 2: Scoped Key)
    | (ECDH P-256 Private Key)  |     | (Random AES-256-GCM Key)    |
    +---------------------------+     +-----------------------------+
                                                     |
                                                     | AES-256-GCM
                                                     v
                                      +-----------------------------+
                                      | Screenplay Content Key (SCK)|  (Tier 3: Document Key)
                                      | (Random AES-256-GCM Key)    |
                                      +-----------------------------+
                                                     |
                                                     | AES-256-GCM (Fresh 12-byte IV)
                                                     v
                                      +-----------------------------+
                                      | Serialized TipTap JSON      |
                                      | (Ciphertext + 128-bit Tag)  |
                                      +-----------------------------+
```

---

## 3. Cryptographic Primitives & Specifications

| Component | Standard / Algorithm | Parameters / Configuration | Key Size / Strength |
| :--- | :--- | :--- | :--- |
| **Symmetric Encryption** | AES-GCM (NIST SP 800-38D) | 12-byte CSPRNG IV, 128-bit Authentication Tag | 256-bit |
| **Key Derivation (KDF)** | PBKDF2 (RFC 8018) | HMAC-SHA-256, 32-byte CSPRNG salt, 600,000 rounds | 256-bit output |
| **Asymmetric Identity** | ECDH (NIST P-256 / secp256r1) | SPKI (Public Key) / PKCS#8 (Encrypted Private Key) | 256-bit curve |
| **Emergency Recovery** | BIP-39 / Base32 Checksummed | `KARU-XXXX-XXXX-XXXX-...` format | 128-bit entropy |
| **Random Number Generator** | Web Crypto CSPRNG | `crypto.getRandomValues()` | Cryptographic Grade |

---

## 4. Threat Model & Attack Surface Mitigation

### Threat 1: Database Exfiltration / Compromised Backend
* **Attack**: Adversary gains full unauthorized access to PostgreSQL dumps, disk snapshots, or database backups.
* **Mitigation**:
  * All rows in `screenplay_content`, `screenplay_versions`, and `projects.screenplay_content` contain solely AES-256-GCM ciphertexts with random IVs and GCM authentication tags.
  * No decryption keys exist in database storage.
  * Private identity keys and project keys are double-wrapped with user master keys (`UEK`).
  * **Result**: Compromised database yields zero readable screenwriting or creative assets.

### Threat 2: Man-in-the-Middle (MITM) & Network Interception
* **Attack**: Malicious proxy or rogue TLS terminator inspects HTTP payloads.
* **Mitigation**:
  * Screenplay text and TipTap nodes are transformed to ciphertext before JSON serialization and HTTP transmission.
  * Plaintext never leaves browser memory.
  * **Result**: Intercepted HTTP payloads contain only ciphertext blobs.

### Threat 3: Passphrase Brute-Force & Offline Dictionary Attacks
* **Attack**: Adversary attempts dictionary attacks against intercepted salts and wrapped keys.
* **Mitigation**:
  * High-work-factor PBKDF2-SHA256 (600,000 rounds) increases per-hash computational cost to ~60–150ms on modern CPU hardware.
  * Dedicated 32-byte cryptographically random salt prevents rainbow table precomputations.

### Threat 4: Browser Memory Snooping & Session Hijacking
* **Attack**: Malicious scripts attempt to read persistent browser storage for raw keys.
* **Mitigation**:
  * Unwrapped `CryptoKey` instances are stored **strictly in non-persistent JavaScript memory (Zustand state)**.
  * `localStorage` and `sessionStorage` store zero raw cryptographic key material.
  * When logging out or explicitly locking the workspace (`clearEncryptionSession()`), all `CryptoKey` references are set to `null` and dereferenced for immediate garbage collection.

---

## 5. Security Headers & Network Transport

The backend enforces defense-in-depth HTTP security headers across all endpoints:

* `X-Content-Type-Options: nosniff`
* `X-Frame-Options: DENY`
* `X-XSS-Protection: 1; mode=block`
* `Referrer-Policy: strict-origin-when-cross-origin`
* `Permissions-Policy: geolocation=(), camera=(), microphone=()`
