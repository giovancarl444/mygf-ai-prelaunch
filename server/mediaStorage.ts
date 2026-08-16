import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Keeps what the customer paid for.
 *
 * Provider result links live about seven days; a gallery that quietly empties
 * itself after a week is a product defect, not a hosting detail. When a
 * generation completes, its bytes are copied to our own S3-compatible bucket
 * (DigitalOcean Spaces or anything else speaking the same protocol) and the
 * job's result URL is pointed at the durable copy.
 *
 * Everything here degrades to the provider link: with no storage configured,
 * or a copy that fails, the customer still sees their result — for as long as
 * the provider serves it — and the failure is logged rather than surfaced.
 */

function config() {
  return {
    endpoint: process.env.STORAGE_ENDPOINT?.trim() ?? "",
    region: process.env.STORAGE_REGION?.trim() ?? "",
    bucket: process.env.STORAGE_BUCKET?.trim() ?? "",
    accessKeyId: process.env.STORAGE_ACCESS_KEY?.trim() ?? "",
    secretAccessKey: process.env.STORAGE_SECRET_KEY?.trim() ?? "",
    publicBase: (process.env.STORAGE_PUBLIC_BASE?.trim() ?? "").replace(/\/$/, ""),
  };
}

export function isMediaStorageConfigured() {
  const { endpoint, bucket, accessKeyId, secretAccessKey, publicBase } = config();
  return Boolean(endpoint && bucket && accessKeyId && secretAccessKey && publicBase);
}

let client: S3Client | null = null;

function getClient() {
  const { endpoint, region, accessKeyId, secretAccessKey } = config();
  client ??= new S3Client({ endpoint, region, credentials: { accessKeyId, secretAccessKey } });
  return client;
}

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "audio/wav": "wav",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
};

export function extensionForContentType(contentType: string | null) {
  const normalized = (contentType ?? "").split(";")[0].trim().toLowerCase();
  return EXTENSIONS[normalized] ?? "bin";
}

/**
 * Downloads the provider's result and stores it under a stable, per-customer
 * key. Returns the durable public URL, or null when the copy could not
 * happen — never throws, because a finished generation must not be lost to a
 * storage hiccup on the way to the gallery.
 */
export async function copyMediaResult(input: {
  sourceUrl: string;
  userId: number;
  kind: "image" | "audio" | "video";
  providerJobId: string;
}): Promise<string | null> {
  if (!isMediaStorageConfigured()) return null;

  try {
    const response = await fetch(input.sourceUrl);
    if (!response.ok) {
      console.error(`[Storage] The provider result could not be fetched (HTTP ${response.status}).`);
      return null;
    }
    const body = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type");
    const key = `media/${input.userId}/${input.kind}/${input.providerJobId}.${extensionForContentType(contentType)}`;

    await getClient().send(new PutObjectCommand({
      Bucket: config().bucket,
      Key: key,
      Body: body,
      ContentType: contentType ?? "application/octet-stream",
      ACL: "public-read",
    }));

    return `${config().publicBase}/${key}`;
  } catch (error) {
    console.error("[Storage] Copying a completed generation to durable storage failed:", error);
    return null;
  }
}
