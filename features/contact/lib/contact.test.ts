import { beforeAll, describe, expect, it, vi } from "vitest";
import { localPhone, parseFields, phoneError, validate, type ContactFields } from "./validation";

vi.mock("server-only", () => ({}));

const valid: ContactFields = {
  fullName: "Asha Verma",
  email: "asha@example.com",
  phone: "+91 98765 43210",
  country: "India",
  service: "AI Brand Films",
  message: "We are launching a new tower in Noida next quarter.",
};

describe("contact validation", () => {
  it("accepts a complete enquiry", () => {
    expect(validate(valid)).toEqual({});
  });

  it("normalises country codes and trunk zeros", () => {
    expect(localPhone("+91 98765 43210", "India")).toBe("9876543210");
    expect(localPhone("09876543210", "India")).toBe("9876543210");
    expect(localPhone("+971 50 123 4567", "UAE")).toBe("501234567");
  });

  it("rejects wrong formats and repeated patterns per country", () => {
    expect(phoneError("5876543210", "India")).toMatch(/Indian/);
    expect(phoneError("9999999999", "India")).toMatch(/real/);
    expect(phoneError("9898989898", "India")).toMatch(/real/);
    expect(phoneError("412345678", "UAE")).toMatch(/UAE/);
    expect(phoneError("81234567", "Singapore")).toBe("");
  });

  it("flags bad names, emails and short messages", () => {
    const errors = validate({ ...valid, fullName: "A1", email: "nope", message: "hi" });
    expect(Object.keys(errors).sort()).toEqual(["email", "fullName", "message"]);
  });

  it("parses untrusted bodies and rejects unknown countries or services", () => {
    expect(parseFields({ ...valid, country: "Mars" })).toBeNull();
    expect(parseFields({ ...valid, service: "<script>" })).toBeNull();
    expect(parseFields("string")).toBeNull();
    expect(parseFields({ ...valid, fullName: `  ${valid.fullName}  `, extra: "x" })).toEqual(valid);
  });
});

describe("otp tokens", () => {
  let otp: typeof import("./otp");
  beforeAll(async () => {
    process.env.OTP_SECRET = "test-secret-that-is-long-enough-for-hmac-signing";
    otp = await import("./otp");
  });

  it("verifies the right code once and rejects reuse", () => {
    const { code, cookie } = otp.issueOtp("919876543210");
    expect(code).toMatch(/^\d{4}$/);
    expect(otp.verifyOtp(cookie, "919876543210", code)).toBe("ok");
    expect(otp.verifyOtp(cookie, "919876543210", code)).toBe("locked");
  });

  it("rejects wrong codes, other numbers, tampering and brute force", () => {
    const { code, cookie } = otp.issueOtp("919876543210");
    const wrong = code === "0000" ? "1111" : "0000";
    expect(otp.verifyOtp(cookie, "919876543211", code)).toBe("invalid");
    expect(otp.verifyOtp(`${cookie}x`, "919876543210", code)).toBe("invalid");
    expect(otp.verifyOtp(undefined, "919876543210", code)).toBe("expired");
    for (let i = 0; i < 5; i++) expect(otp.verifyOtp(cookie, "919876543210", wrong)).toBe("mismatch");
    expect(otp.verifyOtp(cookie, "919876543210", code)).toBe("locked");
  });

  it("enforces the resend cooldown per key", () => {
    const keys = ["phone:test-cooldown"];
    expect(otp.sendWaitSeconds(keys)).toBe(0);
    otp.recordSend(keys);
    expect(otp.sendWaitSeconds(keys)).toBeGreaterThan(40);
  });
});
