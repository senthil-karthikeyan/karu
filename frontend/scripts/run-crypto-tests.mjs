import { runCryptoTestSuite } from "../src/lib/crypto/__tests__/crypto.test.ts";

console.log("\n🔐 Starting Karu E2EE Cryptographic Test Suite...\n");

try {
  const results = await runCryptoTestSuite();
  let allPassed = true;

  console.log("----------------------------------------------------------------------");
  console.log("  TEST NAME                                                STATUS  TIME");
  console.log("----------------------------------------------------------------------");

  for (const r of results) {
    const status = r.passed ? "✅ PASS" : "❌ FAIL";
    if (!r.passed) allPassed = false;
    const time = `${r.durationMs}ms`.padStart(6);
    console.log(`  ${r.name.padEnd(56)} ${status} ${time}`);
    if (r.error) {
      console.error(`     Error: ${r.error}`);
    }
  }

  console.log("----------------------------------------------------------------------");
  if (allPassed) {
    console.log(`\n🎉 ALL ${results.length} CRYPTOGRAPHIC TESTS PASSED SUCCESSFULLY!\n`);
    process.exit(0);
  } else {
    console.error(`\n❌ SOME TESTS FAILED.\n`);
    process.exit(1);
  }
} catch (err) {
  console.error("Test runner error:", err);
  process.exit(1);
}
