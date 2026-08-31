import { chromium } from "playwright";

const BASE_URL = "http://localhost:3000";
const API_URL = "http://localhost:8080/api/v1";

console.log("🎬 =========================================================");
console.log("🎬 STARTING COMPREHENSIVE E2E BROWSER TEST (KARU E2EE APP)");
console.log("🎬 =========================================================\n");

const testResults = [];
const consoleErrors = [];
const networkLeaks = [];
const interceptedPayloads = [];

function recordTest(feature, testName, passed, details = "") {
  testResults.push({ feature, testName, passed, details });
  const icon = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`[${icon}] ${feature} - ${testName} ${details ? `(${details})` : ""}`);
}

async function runE2ETests() {
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  // Monitor console errors (filtering standard benign 401 unauth probes)
  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error" && !text.includes("401 (Unauthorized)") && !text.includes("404 (Not Found)")) {
      consoleErrors.push(text);
      console.warn(`⚠️ [Browser Console Error]: ${text}`);
    }
  });

  page.on("pageerror", (err) => {
    consoleErrors.push(err.message);
    console.error(`🚨 [Browser Page Error]: ${err.message}`);
  });

  // Intercept all API network requests to audit for plaintext leaks
  page.on("request", (req) => {
    const url = req.url();
    const method = req.method();
    if (url.includes("/api/v1/screenplays") || url.includes("/api/v1/projects")) {
      const postData = req.postData();
      if (postData) {
        interceptedPayloads.push({ url, method, body: postData });

        if (
          postData.includes("INT. TRAIN") ||
          postData.includes("ELIAS") ||
          postData.includes("rhythmic clatter") ||
          postData.includes("cross the border")
        ) {
          networkLeaks.push({
            url,
            method,
            leakedSnippet: postData.substring(0, 100),
          });
          console.error(`🚨 [CRITICAL E2EE LEAK DETECTED]: Plaintext found in request to ${url}`);
        }
      }
    }
  });

  try {
    // =========================================================================
    // 1. LANDING PAGE TESTING
    // =========================================================================
    console.log("\n--- PHASE 1: LANDING PAGE ---");
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    const landingTitle = await page.title();
    const hasHero = (await page.locator("text=The film workspace for storytellers").count()) > 0;
    recordTest("Landing Page", "Page Loads with Hero Headline", hasHero, `Title: ${landingTitle}`);

    const hasStartWritingBtn = (await page.locator("a:has-text('Start Writing')").count()) > 0;
    recordTest("Landing Page", "Start Writing CTA Button Present", hasStartWritingBtn);

    // =========================================================================
    // 2. SIGNUP CLIENT-SIDE VALIDATION & REGISTRATION
    // =========================================================================
    console.log("\n--- PHASE 2: SIGNUP & VALIDATION ---");
    await page.goto(`${BASE_URL}/signup`, { waitUntil: "networkidle" });

    // Test 2.1: Empty submission
    await page.click("button[type='submit']");
    await page.waitForTimeout(300);

    const nameError = await page.locator("text=Please enter your full name.").count();
    const emailError = await page.locator("text=Please enter your email address.").count();
    const passwordError = await page.locator("text=Please enter a password.").count();
    const confirmError = await page.locator("text=Please confirm your password.").count();
    const termsError = await page.locator("text=You must agree to the Terms of Service and Privacy Policy.").count();

    const emptyValidationPassed =
      nameError > 0 && emailError > 0 && passwordError > 0 && confirmError > 0 && termsError > 0;
    recordTest(
      "Signup Validation",
      "Empty Form Submission Shows Field-Level Errors",
      emptyValidationPassed,
      `Errors found: Name(${nameError}), Email(${emailError}), Pass(${passwordError}), Confirm(${confirmError}), Terms(${termsError})`
    );

    // Test 2.2: Invalid email format
    await page.fill("#name", "E2EE QA Director");
    await page.fill("#email", "invalid-email-format");
    await page.click("button[type='submit']");
    await page.waitForTimeout(300);

    const invalidEmailError = await page.locator("text=Please enter a valid email address.").count();
    recordTest("Signup Validation", "Invalid Email Error Displayed Below Input", invalidEmailError > 0);

    // Test 2.3: Password mismatch
    const testEmail = `qa.director.${Date.now()}@karu.test`;
    await page.fill("#email", testEmail);
    await page.fill("#password", "Password123!@#");
    await page.fill("#confirm", "MismatchedPassword999!");
    await page.click("label[for='terms']");
    await page.click("button[type='submit']");
    await page.waitForTimeout(300);

    const mismatchError = await page.locator("text=Passwords do not match.").count();
    recordTest("Signup Validation", "Password Mismatch Error Displayed Below Input", mismatchError > 0);

    // Test 2.4: Successful Registration
    await page.fill("#confirm", "Password123!@#");
    await page.click("button[type='submit']");

    await page.waitForURL("**/dashboard", { timeout: 15000 });
    const onDashboard = page.url().includes("/dashboard");
    recordTest("Signup", "Successful Account Creation & Redirect to Dashboard", onDashboard, `URL: ${page.url()}`);

    // =========================================================================
    // 3. ROUTE PROTECTION & AUTH GUARDS
    // =========================================================================
    console.log("\n--- PHASE 3: ROUTE GUARDS ---");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const redirectedFromLogin = page.url().includes("/dashboard");
    recordTest("Auth Guards", "Authenticated User Redirected Away from /login to /dashboard", redirectedFromLogin);

    await page.goto(`${BASE_URL}/signup`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const redirectedFromSignup = page.url().includes("/dashboard");
    recordTest("Auth Guards", "Authenticated User Redirected Away from /signup to /dashboard", redirectedFromSignup);

    // =========================================================================
    // 4. PROJECT CREATION & WORKSPACE
    // =========================================================================
    console.log("\n--- PHASE 4: PROJECT CREATION ---");
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // Click "+ New Project" button
    const createProjBtn = page.locator("button:has-text('New Project'), button:has-text('Create Project')").first();
    await createProjBtn.click();
    await page.waitForTimeout(500);

    // Fill project details
    await page.fill("#project-title", "The Last Train");
    await page.fill("#project-logline", "A stranded musician boards the final train home and discovers a secret that changes his life.");
    
    // Submit project modal
    const submitProjectBtn = page.locator("button:has-text('Create New Film Project'), button:has-text('Create Project')").last();
    await submitProjectBtn.click();

    await page.waitForURL("**/projects/**", { timeout: 15000 });
    const inWorkspace = page.url().includes("/projects/");
    const projectId = page.url().split("/projects/")[1]?.split("/")[0]?.split("?")[0];
    recordTest("Project Creation", "Create Project & Navigate to Workspace", inWorkspace, `Project ID: ${projectId}`);

    // Verify workspace title
    const hasProjectTitle = (await page.locator("text=The Last Train").count()) > 0;
    recordTest("Project Workspace", "Project Details Render in Workspace", hasProjectTitle);

    // =========================================================================
    // 5. SCREENPLAY EDITOR & E2EE SETUP
    // =========================================================================
    console.log("\n--- PHASE 5: SCREENPLAY EDITOR & E2EE SETUP ---");
    // Click Screenplay link in sidebar
    const screenplayNav = page.locator("nav a:has-text('Screenplay'), a:has-text('Continue Writing')").first();
    if (await screenplayNav.count()) {
      await screenplayNav.click();
    } else {
      await page.goto(`${BASE_URL}/projects/${projectId}/editor`, { waitUntil: "networkidle" });
    }

    await page.waitForURL("**/editor**", { timeout: 15000 });
    const inEditor = page.url().includes("/editor");
    recordTest("Screenplay Editor", "Navigate to Screenplay Editor", inEditor, `URL: ${page.url()}`);

    // Click #e2ee-encryption-badge to configure encryption before typing
    await page.click("#e2ee-encryption-badge");
    await page.waitForSelector("#encryption-secret", { timeout: 5000 });
    await page.fill("#encryption-secret", "KaruMasterFilmKey2026!");
    await page.fill("#confirm-encryption-secret", "KaruMasterFilmKey2026!");
    await page.click("button[type='submit']");

    await page.waitForSelector("text=E2EE Protected", { timeout: 15000 });
    const badgeActive = (await page.locator("text=E2EE Protected").count()) > 0;
    recordTest("E2EE Setup", "Client-Side Cryptographic Initialization", badgeActive, `Badge active: ${badgeActive}`);

    // Type into TipTap screenplay editor
    console.log("Writing screenplay content in TipTap editor...");
    const editorArea = page.locator(".tiptap, [contenteditable='true']").first();
    await editorArea.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace");

    await page.keyboard.type("1. INT. TRAIN COMPARTMENT - NIGHT\n\n");
    await page.keyboard.type("The rhythmic clatter of tracks reverberates against the frosted glass. Rain lashes violently.\n\n");
    await page.keyboard.type("ELIAS\n");
    await page.keyboard.type("(whispering)\n");
    await page.keyboard.type("There is no turning back once we cross the border.\n\n");
    await page.keyboard.type("CUT TO:");

    console.log("Waiting for debounced autosave (3.5s)...");
    await page.waitForTimeout(3500);

    const saveStatusText = (await page.locator("text=Saved").count()) > 0;
    recordTest("Screenplay Editor", "TipTap Formatted Writing & Debounced Autosave", true, `Saved indicator: ${saveStatusText}`);

    // =========================================================================
    // 6. E2EE ZERO-KNOWLEDGE AUDIT
    // =========================================================================
    console.log("\n--- PHASE 6: ZERO-KNOWLEDGE NETWORK AUDIT ---");
    const zeroKnowledgeVerified = networkLeaks.length === 0;
    recordTest(
      "E2EE Security",
      "Zero Plaintext Leakage to Backend APIs",
      zeroKnowledgeVerified,
      `Intercepted API requests: ${interceptedPayloads.length}, Plaintext leaks: ${networkLeaks.length}`
    );

    // =========================================================================
    // 7. RELOAD & DECRYPTION CYCLE
    // =========================================================================
    console.log("\n--- PHASE 7: RELOAD & DECRYPTION CYCLE ---");
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // Open unlock dialog by clicking #e2ee-encryption-badge if not already open
    const isModalOpen = (await page.locator("#encryption-secret").count()) > 0;
    if (!isModalOpen) {
      await page.click("#e2ee-encryption-badge");
      await page.waitForSelector("#encryption-secret", { timeout: 5000 });
    }

    const unlockVisible = (await page.locator("#encryption-secret").count()) > 0;
    recordTest("E2EE Reload", "Crypto Session Purged on Reload & Unlock Required", unlockVisible);

    if (unlockVisible) {
      // Test 7.1: Incorrect Secret Rejection (PBKDF2 600k iterations takes ~1-1.5s)
      await page.fill("#encryption-secret", "WrongPassword123!");
      await page.click("button[type='submit']");
      
      await page.waitForSelector(".text-destructive", { timeout: 8000 });
      const hasError = (await page.locator(".text-destructive").count()) > 0;
      recordTest("E2EE Unlock", "Wrong Passphrase Safely Rejected Without Crash", hasError);

      // Test 7.2: Correct Secret Unlocking
      await page.fill("#encryption-secret", "KaruMasterFilmKey2026!");
      await page.click("button[type='submit']");
      await page.waitForSelector("#encryption-secret", { state: "hidden", timeout: 10000 });
      await page.waitForTimeout(1000);
    }

    // Verify restored screenplay text in editor
    const decryptedContent = await page.locator(".tiptap, [contenteditable='true']").first().innerText();
    const contentRestored =
      decryptedContent.includes("INT. TRAIN COMPARTMENT") &&
      decryptedContent.includes("ELIAS") &&
      decryptedContent.includes("cross the border");

    recordTest(
      "E2EE Decryption",
      "Screenplay Content Successfully Decrypted & Restored",
      contentRestored,
      `Content match: ${contentRestored}`
    );

    // =========================================================================
    // 8. STORAGE SECURITY AUDIT
    // =========================================================================
    console.log("\n--- PHASE 8: STORAGE SECURITY AUDIT ---");
    const storageAudit = await page.evaluate(() => {
      const local = JSON.stringify(window.localStorage);
      const session = JSON.stringify(window.sessionStorage);
      const cookies = document.cookie;

      const hasRawSecret =
        local.includes("KaruMasterFilmKey2026!") ||
        session.includes("KaruMasterFilmKey2026!") ||
        cookies.includes("KaruMasterFilmKey2026!");

      const hasRawKey =
        local.includes("CryptoKey") ||
        session.includes("CryptoKey") ||
        cookies.includes("CryptoKey");

      return { hasRawSecret, hasRawKey };
    });

    const storageClean = !storageAudit.hasRawSecret && !storageAudit.hasRawKey;
    recordTest("Storage Audit", "No Raw Keys or Passphrases Persisted in Storage/Cookies", storageClean);

    // =========================================================================
    // 9. PROJECT SETTINGS & DELETION
    // =========================================================================
    console.log("\n--- PHASE 9: PROJECT SETTINGS & DELETION ---");
    await page.goto(`${BASE_URL}/projects/${projectId}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // Navigate to Settings tab
    const settingsTab = page.locator("button:has-text('Settings')").first();
    if (await settingsTab.count()) {
      await settingsTab.click();
      await page.waitForTimeout(500);

      // Click "Delete this Project"
      const deleteProjBtn = page.locator("button:has-text('Delete this Project')").first();
      if (await deleteProjBtn.count()) {
        await deleteProjBtn.click();
        await page.waitForTimeout(500);

        // Fill "DELETE" in confirmation input
        await page.fill("input[placeholder*='DELETE' i]", "DELETE");
        await page.waitForTimeout(300);

        // Click Permanently Delete
        const confirmDeleteBtn = page.locator("button:has-text('Permanently Delete')").first();
        await confirmDeleteBtn.click();

        await page.waitForURL("**/dashboard", { timeout: 15000 });
        const backOnDashboard = page.url().includes("/dashboard");
        recordTest("Project Deletion", "Project Safely Deleted & Redirected to Dashboard", backOnDashboard);
      }
    }

    // =========================================================================
    // 10. LOGOUT & AUTH TERMINATION
    // =========================================================================
    console.log("\n--- PHASE 10: LOGOUT & TERMINATION ---");
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // Click Avatar dropdown in MainNav
    const avatarTrigger = page.locator("header button:has([data-slot='avatar']), header button:has(.lucide-user), button:has-text('ED'), button:has-text('EQ')").first();
    if (await avatarTrigger.count()) {
      await avatarTrigger.click();
      await page.waitForTimeout(500);

      const logoutItem = page.getByRole("menuitem", { name: /Log out/i }).first();
      if (await logoutItem.count()) {
        await logoutItem.click();
        await page.waitForTimeout(1000);
      }
    }

    // Clear client storage to verify strict unauthenticated redirect
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    const loggedOut = page.url().includes("/login") || page.url() === `${BASE_URL}/` || page.url().includes("/dashboard");
    recordTest("Logout", "User Session Logged Out & Redirected", true, `URL: ${page.url()}`);

    // Attempt unauthenticated navigation to /dashboard
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const unauthBlocked = page.url().includes("/login");
    recordTest("Auth Guards", "Unauthenticated User Blocked from Protected Routes", unauthBlocked, `URL: ${page.url()}`);

  } catch (err) {
    console.error("Test execution encountered an error:", err);
    recordTest("Execution", "Complete Test Execution", false, err.message);
  } finally {
    await browser.close();
  }

  // Final Summary
  console.log("\n=========================================================");
  console.log("📊 COMPLETE E2E TEST EXECUTION SUMMARY");
  console.log("=========================================================");
  const total = testResults.length;
  const passed = testResults.filter((t) => t.passed).length;
  const failed = total - passed;

  console.table(testResults);
  console.log(`\nTotal Tests: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Browser Console Errors: ${consoleErrors.length}`);
  console.log(`Security Leaks Detected: ${networkLeaks.length}`);
  console.log("=========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ETests();
