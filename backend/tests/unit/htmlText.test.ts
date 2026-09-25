import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { htmlToText } from "../../src/gmail/htmlText.js";

describe("htmlToText", () => {
  it("strips HDFC HTML so the amount is readable", () => {
    const text = htmlToText(`
      <html><body>
        <style>.x{color:red}</style>
        Dear Customer, Rs.2,499.00 has been debited from your HDFC Bank A/c
        <br/>on 12-09-26 towards POS txn.
      </body></html>
    `);
    assert.match(text, /Rs\.2,499\.00 has been debited/);
    assert.doesNotMatch(text, /<br/);
  });

  it("turns the rupee entity into Rs.", () => {
    assert.match(htmlToText("Paid &#8377;85 via UPI"), /Rs\.\s*85/);
    assert.match(htmlToText("Paid &rupee;85 via UPI"), /Rs\.\s*85/);
  });

  it("drops scripts and styles and decodes the remaining entities", () => {
    const text = htmlToText(
      "<div>Tom &amp; Jerry&nbsp;paid<script>alert(1)</script></div><p>next</p>&#65;",
    );
    assert.equal(text.includes("alert(1)"), false);
    assert.equal(text.includes("<div"), false);
    assert.match(text, /Tom & Jerry/);
    assert.match(text, /paid/);
    assert.match(text, /next/);
    assert.match(text, /A/);
  });

  it("returns empty text for an empty body", () => {
    assert.equal(htmlToText("   <br/>  "), "");
  });
});
