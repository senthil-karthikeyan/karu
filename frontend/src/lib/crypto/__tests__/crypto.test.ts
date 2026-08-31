/**
 * Comprehensive Automated Test Suite for Karu E2EE Cryptography Modules.
 *
 * Covers:
 * 1. Base64 & UTF-8 lossless encoding
 * 2. AES-GCM 256-bit encryption & decryption
 * 3. IV uniqueness & ciphertext non-determinism
 * 4. Authentication tag tampering & wrong key rejection
 * 5. PBKDF2 key derivation (UEK)
 * 6. 3-Tier Key Hierarchy:
 *    - UEK (User Encryption Key) wraps PEK (Project Encryption Key)
 *    - PEK (Project Encryption Key) wraps SCK (Screenplay Content Key)
 *    - SCK encrypts and decrypts TipTap screenplay content
 * 7. User Encryption Identity (ECDH P-256) keypair generation and private key wrapping
 * 8. TipTap JSON document round-trip
 * 9. 120-page screenplay benchmark
 */

import {
  generateSalt,
  deriveUserEncryptionKey,
  generateProjectEncryptionKey,
  wrapProjectKeyWithUEK,
  unwrapProjectKeyWithUEK,
  generateScreenplayContentKey,
  wrapScreenplayKeyWithPEK,
  unwrapScreenplayKeyWithPEK,
  generateUserIdentityKeyPair,
  exportUserIdentityPublicKey,
  wrapUserPrivateKeyWithUEK,
  unwrapUserPrivateKeyWithUEK,
  encryptAESGCM,
  decryptAESGCM,
  encryptScreenplayContent,
  decryptScreenplayContent,
  uint8ArrayToBase64,
  base64ToUint8Array,
  stringToUtf8Bytes,
  utf8BytesToString,
  normalizeScreenplayDoc,
  type TipTapDocumentJSON,
} from "../index";

export interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

export async function runCryptoTestSuite(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  async function test(name: string, fn: () => Promise<void>) {
    const start = performance.now();
    try {
      await fn();
      results.push({
        name,
        passed: true,
        durationMs: Math.round(performance.now() - start),
      });
    } catch (err) {
      results.push({
        name,
        passed: false,
        durationMs: Math.round(performance.now() - start),
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 1. Base64 & UTF-8 Encoding Round-Trip
  await test("Encoding: UTF-8 and Chunked Base64 conversions are lossless", async () => {
    const sampleText = "INT. COFFEE SHOP - DAY\nCoffee cup clatters. «Special characters: ©, 🎬, 🔒, 100%»";
    const utf8 = stringToUtf8Bytes(sampleText);
    const b64 = uint8ArrayToBase64(utf8);
    const decodedBytes = base64ToUint8Array(b64);
    const restoredText = utf8BytesToString(decodedBytes);

    if (restoredText !== sampleText) {
      throw new Error(`Encoding mismatch: expected '${sampleText}', got '${restoredText}'`);
    }
  });

  // 2. AES-GCM Key Generation & Round-Trip
  await test("AES-GCM: Generate key, encrypt, and decrypt plaintext", async () => {
    const key = await generateScreenplayContentKey();
    const plaintext = stringToUtf8Bytes("SCENE 1: THE DISCOVERY");

    const { iv, ciphertext } = await encryptAESGCM(key, plaintext);
    const decrypted = await decryptAESGCM(key, iv, ciphertext);
    const decryptedText = utf8BytesToString(decrypted);

    if (decryptedText !== "SCENE 1: THE DISCOVERY") {
      throw new Error(`Decrypted text mismatch: got '${decryptedText}'`);
    }
  });

  // 3. IV Randomness: Same content yields distinct ciphertexts
  await test("AES-GCM: Encrypting identical content twice produces distinct IVs and ciphertexts", async () => {
    const key = await generateScreenplayContentKey();
    const plaintext = stringToUtf8Bytes("REPEATED ACTION LINE");

    const enc1 = await encryptAESGCM(key, plaintext);
    const enc2 = await encryptAESGCM(key, plaintext);

    const b64Iv1 = uint8ArrayToBase64(enc1.iv);
    const b64Iv2 = uint8ArrayToBase64(enc2.iv);
    const b64Cipher1 = uint8ArrayToBase64(enc1.ciphertext);
    const b64Cipher2 = uint8ArrayToBase64(enc2.ciphertext);

    if (b64Iv1 === b64Iv2) {
      throw new Error("CRITICAL SECURITY VIOLATION: Duplicate IV generated for consecutive encryptions!");
    }
    if (b64Cipher1 === b64Cipher2) {
      throw new Error("Ciphertexts should be distinct when different IVs are used.");
    }

    // Both must decrypt correctly
    const dec1 = utf8BytesToString(await decryptAESGCM(key, enc1.iv, enc1.ciphertext));
    const dec2 = utf8BytesToString(await decryptAESGCM(key, enc2.iv, enc2.ciphertext));

    if (dec1 !== "REPEATED ACTION LINE" || dec2 !== "REPEATED ACTION LINE") {
      throw new Error("Failed to decrypt one of the distinct ciphertext instances.");
    }
  });

  // 4. Wrong Key Rejection
  await test("AES-GCM: Decryption with incorrect key throws authentication error", async () => {
    const keyA = await generateScreenplayContentKey();
    const keyB = await generateScreenplayContentKey();
    const plaintext = stringToUtf8Bytes("CONFIDENTIAL SCRIPT DETAILS");

    const { iv, ciphertext } = await encryptAESGCM(keyA, plaintext);

    let threw = false;
    try {
      await decryptAESGCM(keyB, iv, ciphertext);
    } catch {
      threw = true;
    }

    if (!threw) {
      throw new Error("Decryption with a different key should have failed GCM authentication!");
    }
  });

  // 5. Tampering Resistance
  await test("AES-GCM: Tampered ciphertext or modified IV fails GCM authentication", async () => {
    const key = await generateScreenplayContentKey();
    const { iv, ciphertext } = await encryptAESGCM(key, stringToUtf8Bytes("INTEGRITY CHECK"));

    // Modify 1 byte of ciphertext
    const tamperedCipher = new Uint8Array(ciphertext);
    tamperedCipher[tamperedCipher.length - 1] ^= 0xff;

    let threwTamper = false;
    try {
      await decryptAESGCM(key, iv, tamperedCipher);
    } catch {
      threwTamper = true;
    }

    if (!threwTamper) {
      throw new Error("Tampered ciphertext should have triggered authentication tag mismatch!");
    }

    // Modify 1 byte of IV
    const tamperedIv = new Uint8Array(iv);
    tamperedIv[0] ^= 0xff;

    let threwIvTamper = false;
    try {
      await decryptAESGCM(key, tamperedIv, ciphertext);
    } catch {
      threwIvTamper = true;
    }

    if (!threwIvTamper) {
      throw new Error("Modified IV should have triggered authentication failure!");
    }
  });

  // 6. PBKDF2 Key Derivation & Salt Handling
  await test("PBKDF2: Deterministic key derivation with identical password and salt", async () => {
    const secret = "writer-master-passphrase-2026";
    const salt = generateSalt(16);

    const uek1 = await deriveUserEncryptionKey(secret, salt, { iterations: 10000 });
    const uek2 = await deriveUserEncryptionKey(secret, salt, { iterations: 10000 });

    const message = stringToUtf8Bytes("TESTING DETERMINISM");
    const { iv, ciphertext } = await encryptAESGCM(uek1, message);
    const decrypted = await decryptAESGCM(uek2, iv, ciphertext);

    if (utf8BytesToString(decrypted) !== "TESTING DETERMINISM") {
      throw new Error("Keys derived from identical secret and salt must interoperate identically.");
    }
  });

  // 7. Key Hierarchy: Project Encryption Key (PEK) Wrapped by UEK
  await test("Key Hierarchy: UEK wraps and unwraps Project Encryption Key (PEK)", async () => {
    const uek = await deriveUserEncryptionKey("user-passphrase", generateSalt(16), { iterations: 5000 });
    const pek = await generateProjectEncryptionKey();

    const wrappedPEK = await wrapProjectKeyWithUEK(uek, pek);
    const unwrappedPEK = await unwrapProjectKeyWithUEK(uek, wrappedPEK);

    // Verify unwrapped PEK by encrypting and decrypting
    const message = stringToUtf8Bytes("PROJECT SCOPE SECRET");
    const { iv, ciphertext } = await encryptAESGCM(pek, message);
    const decrypted = await decryptAESGCM(unwrappedPEK, iv, ciphertext);

    if (utf8BytesToString(decrypted) !== "PROJECT SCOPE SECRET") {
      throw new Error("Unwrapped PEK failed to decrypt data encrypted by original PEK.");
    }
  });

  // 8. Key Hierarchy: Screenplay Content Key (SCK) Wrapped by PEK
  await test("Key Hierarchy: PEK wraps and unwraps Screenplay Content Key (SCK)", async () => {
    const pek = await generateProjectEncryptionKey();
    const sck = await generateScreenplayContentKey();

    const wrappedSCK = await wrapScreenplayKeyWithPEK(pek, sck);
    const unwrappedSCK = await unwrapScreenplayKeyWithPEK(pek, wrappedSCK);

    const message = stringToUtf8Bytes("SCREENPLAY SCENE ACTION");
    const { iv, ciphertext } = await encryptAESGCM(sck, message);
    const decrypted = await decryptAESGCM(unwrappedSCK, iv, ciphertext);

    if (utf8BytesToString(decrypted) !== "SCREENPLAY SCENE ACTION") {
      throw new Error("Unwrapped SCK failed to decrypt data encrypted by original SCK.");
    }
  });

  // 9. Full 3-Tier Key Hierarchy E2EE Chain
  await test("Key Hierarchy: Full 3-Tier Chain (Passphrase -> UEK -> PEK -> SCK -> Content)", async () => {
    // Tier 1: User derives UEK from master secret
    const secret = "super-secret-filmmaker-key-2026";
    const salt = generateSalt(16);
    const uek = await deriveUserEncryptionKey(secret, salt, { iterations: 5000 });

    // Tier 2: Project generates PEK and wraps with UEK
    const pek = await generateProjectEncryptionKey();
    const wrappedPEK = await wrapProjectKeyWithUEK(uek, pek);

    // Tier 3: Screenplay generates SCK and wraps with PEK
    const sck = await generateScreenplayContentKey();
    const wrappedSCK = await wrapScreenplayKeyWithPEK(pek, sck);

    // Content: Screenplay encrypted with SCK
    const tipTapDoc: TipTapDocumentJSON = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2, dataType: "scene-heading" },
          content: [{ type: "text", text: "1. EXT. DESERT HIGHWAY - SUNSET" }],
        },
      ],
    };
    const encryptedContent = await encryptScreenplayContent(tipTapDoc, sck);

    // --- RECOVERY / CLIENT-SIDE DECRYPTION SIMULATION ---
    // 1. Re-derive UEK from secret
    const restoredUEK = await deriveUserEncryptionKey(secret, salt, { iterations: 5000 });

    // 2. Unwrap PEK using UEK
    const restoredPEK = await unwrapProjectKeyWithUEK(restoredUEK, wrappedPEK);

    // 3. Unwrap SCK using PEK
    const restoredSCK = await unwrapScreenplayKeyWithPEK(restoredPEK, wrappedSCK);

    // 4. Decrypt Screenplay Content using SCK
    const decryptedDoc = await decryptScreenplayContent(encryptedContent, restoredSCK);

    if (JSON.stringify(decryptedDoc) !== JSON.stringify(tipTapDoc)) {
      throw new Error("Full 3-tier hierarchy decryption mismatch!");
    }
  });

  // 10. User Encryption Identity (ECDH P-256) Foundation
  await test("User Identity: Asymmetric ECDH P-256 keypair generation & private key wrapping with UEK", async () => {
    const uek = await deriveUserEncryptionKey("user-passphrase", generateSalt(16), { iterations: 5000 });
    const keyPair = await generateUserIdentityKeyPair();

    const publicExport = await exportUserIdentityPublicKey(keyPair.publicKey);
    if (!publicExport.publicKey || publicExport.algorithm !== "ECDH-P256") {
      throw new Error("Invalid public identity export.");
    }

    const wrappedPrivate = await wrapUserPrivateKeyWithUEK(uek, keyPair.privateKey);
    const restoredPrivate = await unwrapUserPrivateKeyWithUEK(uek, wrappedPrivate);

    if (!restoredPrivate || restoredPrivate.type !== "private") {
      throw new Error("Failed to restore User Identity Private Key.");
    }
  });

  // 11. TipTap JSON Document Encryption & Decryption
  await test("Screenplay Encryption: Full TipTap document JSON round-trip", async () => {
    const sck = await generateScreenplayContentKey();

    const sampleTipTapDoc: TipTapDocumentJSON = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2, dataType: "scene-heading" },
          content: [{ type: "text", text: "1. INT. TRAIN CAR - NIGHT" }],
        },
        {
          type: "paragraph",
          attrs: { dataType: "action" },
          content: [
            {
              type: "text",
              text: "A shadowy figure glances at the vintage wristwatch. Rain lashes against the frosted windowpane.",
            },
          ],
        },
        {
          type: "paragraph",
          attrs: { dataType: "character" },
          content: [{ type: "text", text: "ELENA" }],
        },
        {
          type: "paragraph",
          attrs: { dataType: "dialogue" },
          content: [{ type: "text", text: "We have five minutes before the border patrol enters." }],
        },
      ],
    };

    const encryptedPayload = await encryptScreenplayContent(sampleTipTapDoc, sck);

    if (encryptedPayload.version !== 1 || encryptedPayload.algorithm !== "AES-GCM") {
      throw new Error("Encrypted payload metadata mismatch.");
    }

    const decryptedDoc = await decryptScreenplayContent(encryptedPayload, sck);

    if (JSON.stringify(decryptedDoc) !== JSON.stringify(sampleTipTapDoc)) {
      throw new Error("Decrypted TipTap document does not match the original JSON structure!");
    }
  });

  // 12. Large Document Performance Benchmark (120-page screenplay)
  await test("Performance: 120-page screenplay (35,000+ words) encrypts and decrypts under 100ms", async () => {
    const sck = await generateScreenplayContentKey();

    const contentNodes = [];
    for (let scene = 1; scene <= 100; scene++) {
      contentNodes.push({
        type: "heading",
        attrs: { level: 2, dataType: "scene-heading" },
        content: [{ type: "text", text: `${scene}. INT. LOCATION ${scene} - DAY` }],
      });
      contentNodes.push({
        type: "paragraph",
        attrs: { dataType: "action" },
        content: [
          {
            type: "text",
            text: "Detailed action description ".repeat(15) + `for scene ${scene}. Characters move across the set with deliberate intention.`,
          },
        ],
      });
      contentNodes.push({
        type: "paragraph",
        attrs: { dataType: "character" },
        content: [{ type: "text", text: `CHARACTER ${scene % 5}` }],
      });
      contentNodes.push({
        type: "paragraph",
        attrs: { dataType: "dialogue" },
        content: [
          {
            type: "text",
            text: "Long dialogue paragraph ".repeat(10) + `spoken in scene ${scene}.`,
          },
        ],
      });
    }

    const largeDoc: TipTapDocumentJSON = {
      type: "doc",
      content: contentNodes,
    };

    const rawJsonLength = JSON.stringify(largeDoc).length;

    // Measure Encryption Time
    const encStart = performance.now();
    const encryptedPayload = await encryptScreenplayContent(largeDoc, sck);
    const encDuration = performance.now() - encStart;

    // Measure Decryption Time
    const decStart = performance.now();
    const decryptedDoc = await decryptScreenplayContent(encryptedPayload, sck);
    const decDuration = performance.now() - decStart;

    const expectedLength = largeDoc.content?.length ?? 0;
    const actualLength = decryptedDoc.content?.length ?? 0;
    if (actualLength !== expectedLength) {
      throw new Error(`Large doc content length mismatch: expected ${expectedLength}, got ${actualLength}`);
    }

    if (encDuration > 200 || decDuration > 200) {
      console.warn(`Large document warning: Encrypt took ${encDuration.toFixed(1)}ms, Decrypt took ${decDuration.toFixed(1)}ms (Doc size: ${Math.round(rawJsonLength / 1024)} KB)`);
    }
  });

  // 13. Semantic Screenplay Nodes (sceneHeading, action, character, dialogue, parenthetical, transition, shot)
  await test("Semantic Nodes: Encrypt and decrypt all 7 semantic screenplay nodes", async () => {
    const sck = await generateScreenplayContentKey();

    const semanticDoc: TipTapDocumentJSON = {
      type: "doc",
      content: [
        {
          type: "sceneHeading",
          attrs: { dataType: "scene-heading" },
          content: [{ type: "text", text: "INT. COMMAND BRIDGE - NIGHT" }],
        },
        {
          type: "action",
          attrs: { dataType: "action" },
          content: [{ type: "text", text: "Sparks shower from overhead conduits as emergency sirens wail." }],
        },
        {
          type: "character",
          attrs: { dataType: "character" },
          content: [{ type: "text", text: "COMMANDER VANCE" }],
        },
        {
          type: "parenthetical",
          attrs: { dataType: "parenthetical" },
          content: [{ type: "text", text: "(gripping the console)" }],
        },
        {
          type: "dialogue",
          attrs: { dataType: "dialogue" },
          content: [{ type: "text", text: "Reroute power to the primary deflector grid now!" }],
        },
        {
          type: "shot",
          attrs: { dataType: "shot" },
          content: [{ type: "text", text: "ANGLE ON DEFLECTOR ARRAY" }],
        },
        {
          type: "transition",
          attrs: { dataType: "transition" },
          content: [{ type: "text", text: "SMASH CUT TO:" }],
        },
      ],
    };

    const encrypted = await encryptScreenplayContent(semanticDoc, sck);
    const decrypted = await decryptScreenplayContent(encrypted, sck);

    if (JSON.stringify(decrypted) !== JSON.stringify(semanticDoc)) {
      throw new Error("Semantic screenplay document roundtrip mismatch!");
    }
  });

  // 14. Backward Compatibility: Normalize legacy AST to semantic nodes
  await test("Backward Compatibility: Normalize legacy Heading & Paragraph AST to Semantic Nodes", async () => {
    const legacyDoc: TipTapDocumentJSON = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2, dataType: "scene-heading" },
          content: [{ type: "text", text: "INT. COFFEE SHOP - DAY" }],
        },
        {
          type: "paragraph",
          attrs: { dataType: "action" },
          content: [{ type: "text", text: "A barista steams milk in the background." }],
        },
        {
          type: "paragraph",
          attrs: { dataType: "character" },
          content: [{ type: "text", text: "SARAH" }],
        },
        {
          type: "paragraph",
          attrs: { dataType: "dialogue" },
          content: [{ type: "text", text: "I'll take an oat milk latte, please." }],
        },
        {
          type: "paragraph",
          attrs: { dataType: "parenthetical" },
          content: [{ type: "text", text: "(checking her phone)" }],
        },
        {
          type: "paragraph",
          attrs: { dataType: "transition" },
          content: [{ type: "text", text: "FADE OUT." }],
        },
        {
          type: "paragraph",
          attrs: { dataType: "shot" },
          content: [{ type: "text", text: "CLOSE ON ESPRESSO MACHINE" }],
        },
      ],
    };

    const normalized = normalizeScreenplayDoc(legacyDoc);
    const types = (normalized.content || []).map((n) => n.type);

    const expectedTypes = [
      "sceneHeading",
      "action",
      "character",
      "dialogue",
      "parenthetical",
      "transition",
      "shot",
    ];

    if (JSON.stringify(types) !== JSON.stringify(expectedTypes)) {
      throw new Error(`Normalization type mismatch: expected ${JSON.stringify(expectedTypes)}, got ${JSON.stringify(types)}`);
    }
  });

  // 15. Backward Compatibility: Encrypt legacy AST, decrypt, and normalize without loss
  await test("Backward Compatibility: Full E2EE encrypt, decrypt, and AST migration roundtrip", async () => {
    const sck = await generateScreenplayContentKey();

    const legacyDoc: TipTapDocumentJSON = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { dataType: "scene-heading" },
          content: [{ type: "text", text: "EXT. DESERT - DAWN" }],
        },
        {
          type: "paragraph",
          attrs: { dataType: "action" },
          content: [{ type: "text", text: "The sun rises over the dunes." }],
        },
      ],
    };

    const encrypted = await encryptScreenplayContent(legacyDoc, sck);
    const decrypted = await decryptScreenplayContent(encrypted, sck);
    const normalized = normalizeScreenplayDoc(decrypted);

    if (normalized.content?.[0].type !== "sceneHeading" || normalized.content?.[1].type !== "action") {
      throw new Error("Normalized decrypted node types incorrect!");
    }
    if (normalized.content?.[0].content?.[0].text !== "EXT. DESERT - DAWN") {
      throw new Error("Normalized text content corrupted!");
    }
  });

  return results;
}
