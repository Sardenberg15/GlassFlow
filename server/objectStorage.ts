import { createClient } from "@supabase/supabase-js";
import { Response } from "express";
import { randomUUID } from "crypto";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY");
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const BUCKET_NAME = "uploads";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() { }

  async getObjectEntityUploadURL(): Promise<string> {
    if (!supabase) {
      console.error("Supabase client is not initialized. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
      throw new Error("Supabase not configured");
    }

    const objectId = randomUUID();
    const path = `${objectId}`;

    console.log(`Attempting to create signed upload URL for bucket '${BUCKET_NAME}' and path '${path}'`);

    const { data, error } = await supabase
      .storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(path);

    if (error) {
      console.error("Supabase createSignedUploadUrl error:", error);
      throw error;
    }
    console.log("Successfully generated upload URL");
    return data.signedUrl;
  }

  async getObjectEntityFile(objectPath: string): Promise<{ bucket: string, path: string }> {
    // objectPath comes from /objects/:objectPath(*)
    // We expect /objects/uuid or similar

    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const path = objectPath.replace("/objects/", "");
    return { bucket: BUCKET_NAME, path };
  }

  async downloadObject(file: { bucket: string, path: string }, res: Response) {
    if (!supabase) {
      res.status(500).json({ error: "Supabase not configured" });
      return;
    }

    const { data, error } = await supabase
      .storage
      .from(file.bucket)
      .download(file.path);

    if (error) {
      console.error("Supabase download error:", error);
      res.sendStatus(404);
      return;
    }

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', data.type || 'application/octet-stream');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  normalizeObjectEntityPath(rawPath: string): string {
    // If the client sends the full signed URL, we might want to extract the path.
    // Supabase signed URLs contain the path.
    // But for simplicity, we'll assume the client might send the path or we just return it as is if it's not a known URL format.
    // If it's a URL, we try to extract the last part.

    if (rawPath.startsWith("http")) {
      try {
        const url = new URL(rawPath);
        // Try to find the object ID from the path
        // Supabase URL: .../storage/v1/object/upload/sign/uploads/uuid?...
        const parts = url.pathname.split('/');
        const uuid = parts[parts.length - 1];
        if (uuid) {
          return `/objects/${uuid}`;
        }
      } catch {
        // ignore
      }
    }
    return rawPath;
  }
}
