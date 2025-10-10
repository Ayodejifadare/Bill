import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

import { toast } from "sonner";
import { showContactError, contactsAPI, WhatsAppAPI } from "./contacts-api";

const parseCSVContacts = (
  (contactsAPI as any).parseCSVContacts as (csvText: string) => any
).bind(contactsAPI);
const parseVCFContacts = (
  (contactsAPI as any).parseVCFContacts as (vcfText: string) => any
).bind(contactsAPI);
const normalizeContacts = (
  (contactsAPI as any).normalizeContacts as (rawContacts: any[]) => any
).bind(contactsAPI);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("showContactError", () => {
  it("prefers predefined messages for known codes even when fallback is provided", () => {
    showContactError("network-failure", "Fallback message");

    expect(toast.error).toHaveBeenCalledWith(
      "Network error. Please check your connection and try again.",
    );
  });

  it("uses fallback message when code is unknown but fallback exists", () => {
    showContactError("unexpected-error", "Graceful fallback");

    expect(toast.error).toHaveBeenCalledWith("Graceful fallback");
  });

  it("falls back to provided string when neither code nor fallback message matches", () => {
    showContactError("Explicit message");

    expect(toast.error).toHaveBeenCalledWith("Explicit message");
  });
});

describe("ContactsAPI parsing helpers", () => {
  it("parses CSV contact data and filters entries without names or contact methods", () => {
    const csv = [
      "Name,Phone,Email,Mobile",
      "John Doe,+123456789,john@example.com,",
      "Jane Roe,,jane@example.com,",
      "Mark Moe,555-2222,,",
      ",,nameless@example.com,",
      "Ghost,,,",
    ].join("\n");

    const result = parseCSVContacts(csv);

    expect(result).toEqual([
      {
        id: "csv_1",
        name: "John Doe",
        displayName: "John Doe",
        phoneNumbers: ["+123456789"],
        emails: ["john@example.com"],
      },
      {
        id: "csv_2",
        name: "Jane Roe",
        displayName: "Jane Roe",
        phoneNumbers: [],
        emails: ["jane@example.com"],
      },
      {
        id: "csv_3",
        name: "Mark Moe",
        displayName: "Mark Moe",
        phoneNumbers: ["555-2222"],
        emails: [],
      },
    ]);
  });

  it("parses VCF contact data and filters entries lacking names or contact information", () => {
    const vcf = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "FN:Jane Smith",
      "TEL:+1 (555) 123-4567",
      "EMAIL:jane@example.com",
      "END:VCARD",
      "BEGIN:VCARD",
      "VERSION:3.0",
      "FN:Bob Brown",
      "EMAIL:bob@example.com",
      "END:VCARD",
      "BEGIN:VCARD",
      "VERSION:3.0",
      "FN:Missing Info",
      "END:VCARD",
    ].join("\n");

    const result = parseVCFContacts(vcf);

    expect(result).toEqual([
      {
        id: "vcf_1",
        name: "Jane Smith",
        displayName: "Jane Smith",
        phoneNumbers: ["+1 (555) 123-4567"],
        emails: ["jane@example.com"],
      },
      {
        id: "vcf_2",
        name: "Bob Brown",
        displayName: "Bob Brown",
        phoneNumbers: [],
        emails: ["bob@example.com"],
      },
    ]);
  });

  it("normalizes raw contacts and removes entries without identifiers", () => {
    const rawContacts = [
      {
        id: "alpha",
        displayName: "Alice Example",
        phoneNumbers: [{ value: "+1 (555) 111-2222" }],
        emails: [{ value: "alice@example.com" }],
      },
      {
        name: { givenName: "Bob", familyName: "Builder" },
        phoneNumbers: ["5558889999"],
        emails: [],
      },
      {
        id: "ghost",
        displayName: "",
        name: { givenName: "", familyName: "" },
        phoneNumbers: [],
        emails: [],
      },
    ];

    const result = normalizeContacts(rawContacts);

    expect(result).toEqual([
      {
        id: "alpha",
        name: "Alice Example",
        displayName: "Alice Example",
        phoneNumbers: ["+1 (555) 111-2222"],
        emails: ["alice@example.com"],
      },
      {
        id: "contact_1",
        name: "Bob Builder",
        displayName: "Bob Builder",
        phoneNumbers: ["5558889999"],
        emails: [],
      },
    ]);
  });
});

describe("WhatsAppAPI helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("formatPhoneNumber", () => {
    it("normalizes phone numbers by stripping non-digits and adding country codes when missing", () => {
      const formatPhoneNumber = (
        WhatsAppAPI as unknown as {
          formatPhoneNumber: (phone: string) => string;
        }
      ).formatPhoneNumber.bind(WhatsAppAPI);

      expect(formatPhoneNumber("+1 (555) 123-4567")).toBe("15551234567");
      expect(formatPhoneNumber("0044 7700 900123")).toBe("447700900123");
      expect(formatPhoneNumber("5551234567")).toBe("15551234567");
    });
  });

  describe("createWhatsAppInviteLink", () => {
    it("creates invite links with normalized phone numbers and encoded messages", () => {
      const link = WhatsAppAPI.createWhatsAppInviteLink(
        "+1 555 000 1234",
        "Hello there!",
      );

      expect(link).toBe("https://wa.me/15550001234?text=Hello%20there!");
    });

    it("uses the default invite message when custom message is not provided", () => {
      const message = WhatsAppAPI.generateInviteMessage();
      const link = WhatsAppAPI.createWhatsAppInviteLink("5551234567");

      expect(link).toBe(
        `https://wa.me/15551234567?text=${encodeURIComponent(message)}`,
      );
    });
  });

  describe("sendInvite", () => {
    it("opens WhatsApp link and resolves to true when successful", async () => {
      const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

      const result = await WhatsAppAPI.sendInvite("+1 (555) 000-1234", "Sam");

      const expectedMessage = WhatsAppAPI.generateInviteMessage("Sam");
      expect(openSpy).toHaveBeenCalledWith(
        `https://wa.me/15550001234?text=${encodeURIComponent(expectedMessage)}`,
        "_blank",
      );
      expect(result).toBe(true);
    });

    it("returns false when window.open throws an error", async () => {
      vi.spyOn(window, "open").mockImplementation(() => {
        throw new Error("blocked");
      });

      const success = await WhatsAppAPI.sendInvite("5551234567");

      expect(success).toBe(false);
    });
  });

  describe("sendBulkInvites", () => {
    it("tracks successes and failures while sending invites in bulk", async () => {
      vi.useFakeTimers();
      const openSpy = vi
        .spyOn(window, "open")
        .mockImplementationOnce(() => null)
        .mockImplementationOnce(() => {
          throw new Error("fail");
        })
        .mockImplementation(() => null);
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const contacts = [
        { phone: "+1 (555) 100-2000", name: "Alice" },
        { phone: "+1 (555) 200-3000", name: "Bob" },
        { phone: "+1 (555) 300-4000", name: "Cara" },
      ];

      const promise = WhatsAppAPI.sendBulkInvites(contacts);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(openSpy).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ success: 2, failed: 1 });

      consoleErrorSpy.mockRestore();
    });
  });
});
