import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { detectFromProviders } from "../../src/rules/engine.js";
import { INDIA_RETAIL_BRANDS } from "../../src/providers/indiaRetail.js";
import type { ProviderRow } from "../../src/db/types.js";

const providers: ProviderRow[] = INDIA_RETAIL_BRANDS.map((brand, index) => ({
  id: String(index),
  userId: null,
  canonicalName: brand.canonicalName,
  aliases: brand.aliases,
  upiHandles: brand.upiHandles,
  senderDomains: brand.senderDomains,
  websiteDomain: brand.websiteDomain,
  logoUrl: `/providers/${brand.logoFile}`,
  categorySlug: brand.categorySlug,
  isGlobal: true,
}));

function pay(description: string, upiId: string | null = null) {
  return detectFromProviders(
    { description, upiId, merchant: null, payee: null },
    providers,
  );
}

describe("india retail brands", () => {
  it("recognises Nykaa, Pantaloons, and Levi's", () => {
    assert.equal(pay("UPI NYKAA FASHION").merchant, "Nykaa");
    assert.equal(pay("UPI", "pantaloons@ybl").merchant, "Pantaloons");
    assert.equal(pay("LEVI STRAUSS INDIA").categorySlug, "shopping");
    assert.equal(pay("LEVI STRAUSS INDIA").merchant, "Levi's");
  });

  it("keeps a Trends payment on Trends rather than Reliance Retail", () => {
    const hit = pay("RELIANCE TRENDS BORIVALI");
    assert.equal(hit.merchant, "Reliance Trends");
    assert.equal(pay("RELIANCE RETAIL VENTURES").merchant, "Reliance Retail");
  });

  it("sends JioMart and DMart to grocery", () => {
    assert.equal(pay("JIOMART ORDER").categorySlug, "grocery");
    assert.equal(pay("DMART DAILY").merchant, "DMart");
  });

  it("is listed in the catalog migration", () => {
    const sql = readFileSync(
      new URL("../../src/db/migrations/046_india_retail_brands.up.sql", import.meta.url),
      "utf8",
    );
    for (const brand of INDIA_RETAIL_BRANDS) {
      assert.ok(
        sql.includes(brand.canonicalName.replace(/'/g, "''")),
        brand.canonicalName,
      );
    }
  });
});
