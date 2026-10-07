import { describe, expect, it } from "vitest";
import { upiPartyHint, upiPartyHintLabel } from "@/helpers/upiHint";

describe("upiPartyHint", () => {
  it("reads a 10-digit local part as a person", () => {
    expect(upiPartyHint("9876543210@ybl")).toBe("person");
    expect(upiPartyHint("9876543210@okaxis")).toBe("person");
    expect(upiPartyHint(" 9876543210@YBL ")).toBe("person");
  });

  it("reads Google Pay and Paytm business handles as a business", () => {
    expect(upiPartyHint("shop@okbizaxis")).toBe("business");
    expect(upiPartyHint("shop@okbizicici")).toBe("business");
    expect(upiPartyHint("store@ptaxis")).toBe("business");
    expect(upiPartyHint("store@ptyes")).toBe("business");
    expect(upiPartyHint("store@ptsbi")).toBe("business");
    expect(upiPartyHint("store@pthdfc")).toBe("business");
    expect(upiPartyHint("store@pticici")).toBe("business");
  });

  it("lets a business handle win over a phone-shaped local part", () => {
    expect(upiPartyHint("9876543210@okbizaxis")).toBe("business");
  });

  it("stays silent for consumer handles and unknown names", () => {
    expect(upiPartyHint("friend@ybl")).toBeNull();
    expect(upiPartyHint("friend@okaxis")).toBeNull();
    expect(upiPartyHint("swiggy@icici")).toBeNull();
    expect(upiPartyHint("shop@paytm")).toBeNull();
    expect(upiPartyHint("12345678901@ybl")).toBeNull();
    expect(upiPartyHint(null)).toBeNull();
    expect(upiPartyHint("not-an-id")).toBeNull();
  });

  it("labels the guess for the row", () => {
    expect(upiPartyHintLabel("person")).toBe("Likely a person");
    expect(upiPartyHintLabel("business")).toBe("Likely a business");
    expect(upiPartyHintLabel(null)).toBeNull();
  });
});
