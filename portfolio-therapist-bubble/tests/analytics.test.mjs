import assert from "node:assert/strict";
import test from "node:test";
import { analysePortfolio, demoPortfolio } from "../src/analytics.js";

test("calculates deterministic scores with evidence", () => {
  const result = analysePortfolio(demoPortfolio);
  assert.equal(result.findings.length, 4);
  assert.ok(result.score >= 0 && result.score <= 100);
  for (const finding of result.findings) {
    assert.ok(finding.score >= 0 && finding.score <= 100);
    assert.ok(finding.evidence.length > 0);
    assert.ok(finding.breakdown);
  }
});

test("does not invent fomo when rally thresholds are absent", () => {
  const portfolio = {
    ...demoPortfolio,
    trades: [{ ticker: "CALM", action: "BUY", price: 101, earlierPrice: 100, recentLow: 90, recentHigh: 110, minutes: 0 }],
    sessionMinutes: 60,
  };
  const fomo = analysePortfolio(portfolio).findings.find((finding) => finding.id === "fomo");
  assert.equal(fomo.score, 0);
});

