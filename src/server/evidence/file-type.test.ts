import { describe, expect, it } from "vitest";
import { detectEvidenceFileType, sanitizeFileName } from "./file-type";

const bytes = (...xs: number[]) => new Uint8Array(xs);
const text = (s: string) => new TextEncoder().encode(s);

describe("detectEvidenceFileType", () => {
  it("detects allowed types by content", () => {
    expect(detectEvidenceFileType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))?.mime).toBe("image/png");
    expect(detectEvidenceFileType(bytes(0xff, 0xd8, 0xff, 0xe0))?.mime).toBe("image/jpeg");
    expect(detectEvidenceFileType(text("RIFF\0\0\0\0WEBPVP8 "))?.mime).toBe("image/webp");
    expect(detectEvidenceFileType(text("%PDF-1.7"))?.mime).toBe("application/pdf");
  });

  it("rejects everything else, whatever the name claims", () => {
    expect(detectEvidenceFileType(text("<svg xmlns=...>"))).toBeNull();
    expect(detectEvidenceFileType(text("<html><script>"))).toBeNull();
    expect(detectEvidenceFileType(bytes(0x4d, 0x5a))).toBeNull(); // Windows executable
    expect(detectEvidenceFileType(bytes())).toBeNull();
  });
});

describe("sanitizeFileName", () => {
  it("strips paths and unsafe characters", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFileName('C:\\x\\home "page".png')).toBe("home _page_.png");
    expect(sanitizeFileName("")).toBe("file");
  });
});
