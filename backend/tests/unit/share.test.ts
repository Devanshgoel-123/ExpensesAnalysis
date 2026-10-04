import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SplitInputError,
  assertSharesFit,
  myShare,
  normalizeFriends,
} from "../../src/splits/share.js";

describe("bill shares", () => {
  it("keeps only your part of a bill split with several friends", () => {
    const friends = normalizeFriends([
      { name: "Asha", amount: 400 },
      { name: "  Rohan ", amount: 350 },
      { name: "asha", amount: 50 },
    ]);
    assert.deepEqual(friends, [
      { name: "Asha", amount: 450 },
      { name: "Rohan", amount: 350 },
    ]);
    assert.equal(myShare(2000, friends), 1200);
  });

  it("is the whole bill when nobody else is on it", () => {
    assert.equal(myShare(840, []), 840);
  });

  it("can be fully someone else's", () => {
    assert.equal(myShare(500, [{ name: "Neel", amount: 500 }]), 0);
  });

  it("refuses shares that add up to more than the bill", () => {
    assert.throws(
      () => assertSharesFit(1000, [{ name: "Asha", amount: 1000.01 }]),
      SplitInputError,
    );
  });

  it("refuses a blank name or a zero share", () => {
    assert.throws(() => normalizeFriends([{ name: "  ", amount: 10 }]), SplitInputError);
    assert.throws(() => normalizeFriends([{ name: "Asha", amount: 0 }]), SplitInputError);
  });
});
