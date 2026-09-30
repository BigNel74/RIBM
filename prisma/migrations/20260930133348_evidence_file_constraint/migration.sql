-- Uploaded evidence files are capped at 10 MB and always carry their metadata together.
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_file_metadata" CHECK (
  ("fileRef" IS NULL AND "fileName" IS NULL AND "fileMimeType" IS NULL AND "fileSize" IS NULL)
  OR ("fileRef" IS NOT NULL AND "fileName" IS NOT NULL AND "fileMimeType" IS NOT NULL AND "fileSize" BETWEEN 1 AND 10485760)
);
