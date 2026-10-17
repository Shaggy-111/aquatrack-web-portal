import { buildReimbursementCreatePayload as build, reimbursementError as message } from "./reimbursementErrors";

const valid = { store_id: "S1", purchase_date: "2026-10-16", total_amount: "12.50", reason: " Water " };
test("valid create uses scalar Store ID and omits blank optional fields", () => {
  expect(build({ ...valid, poc_id: " ", instructed_by_user_id: "", notes: " " })).toEqual({ store_id: "S1", purchase_date: "2026-10-16", total_amount: 12.5, reason: "Water" });
});
test("valid integer IDs preserve zero rather than treating it as blank", () => {
  expect(build({ ...valid, poc_id: 0, instructed_by_user_id: "42" })).toMatchObject({ poc_id: 0, instructed_by_user_id: 42 });
});
test.each(["", " ", "0", "-1", "NaN", "Infinity"])("rejects invalid required amount %s", (total_amount) => expect(() => build({ ...valid, total_amount })).toThrow("greater than zero"));
test.each([{ reason: "ab" }, { reason: "   " }, { purchase_date: "2026-02-30" }, { store_id: { id: "S1" } }, { poc_id: "1.5" }])("rejects schema mismatch %j", (values) => expect(() => build({ ...valid, ...values })).toThrow());
test.each([
  ["Denied", "Denied"],
  [[{ loc: ["body", "reason"], msg: "Too short", type: "string_too_short", input: "x", ctx: {} }], "body.reason: Too short"],
  [{ msg: "Invalid", loc: ["body", "total_amount"] }, "body.total_amount: Invalid"],
  [{ nested: { error: "Invalid" } }, "nested: error: Invalid"],
])("formats backend detail safely", (detail, expected) => expect(message({ response: { data: { detail } } })).toBe(expected));
test("network and generic failures produce text", () => {
  expect(message(new Error("Network Error"))).toBe("Network Error");
  expect(message({}, "Try again")).toBe("Try again");
});
