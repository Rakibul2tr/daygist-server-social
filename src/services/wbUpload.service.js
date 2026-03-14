// FILE: src/services/wasabiUpload.service.js
import { DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import { wasabiS3 } from "../config/wasabi.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import fs from "fs";

const safeExt = (name = "") => {
  const p = String(name).split(".");
  const ext = p.length > 1 ? p.pop() : "";
  return (ext || "").toLowerCase().replace(/[^a-z0-9]/g, "");
};

export default async function uploadToWasabi({
  buffer,
  mimetype,
  originalname,
  folder = "uploads",
}) {
  const bucket = process.env.WASABI_BUCKET;
  if (!bucket) throw new Error("WASABI_BUCKET missing");

  const ext = safeExt(originalname);
  const key = `${folder}/${Date.now()}-${crypto.randomUUID()}${
    ext ? "." + ext : ""
  }`;

  await wasabiS3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    })
  );

  const base = process.env.WASABI_PUBLIC_BASE;
  const url = base
    ? `${base}/${key}`
    : `${process.env.WASABI_ENDPOINT}/${bucket}/${key}`;

  return { key, url };
}


/* ✅ NEW: stream uploader for big files (video) */
export async function uploadToWasabiStream({
  stream,
  mimetype,
  originalname,
  folder = "uploads",
}) {
  const bucket = process.env.WASABI_BUCKET;
  if (!bucket) throw new Error("WASABI_BUCKET missing");

  const ext = safeExt(originalname);
  const key = `${folder}/${Date.now()}-${crypto.randomUUID()}${ext ? "." + ext : ""}`;

  await wasabiS3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: stream, // ✅ stream
      ContentType: mimetype,
    })
  );

  const base = process.env.WASABI_PUBLIC_BASE;
  const url = base ? `${base}/${key}` : `${process.env.WASABI_ENDPOINT}/${bucket}/${key}`;

  return { key, url };
}



export async function deleteFromWasabi(key) {
  if (!key) return;
  const bucket = process.env.WASABI_BUCKET;
  if (!bucket) throw new Error("WASABI_BUCKET missing");

  await wasabiS3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function deleteManyFromWasabi(keys = []) {
  const bucket = process.env.WASABI_BUCKET;
  if (!bucket) throw new Error("WASABI_BUCKET missing");

  const uniq = [...new Set(keys.filter(Boolean))];
  if (!uniq.length) return { deleted: 0 };

  // S3 DeleteObjects max 1000 keys/call
  const chunkSize = 1000;
  let deleted = 0;

  for (let i = 0; i < uniq.length; i += chunkSize) {
    const chunk = uniq.slice(i, i + chunkSize);
    const out = await wasabiS3.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: chunk.map((Key) => ({ Key })) },
      })
    );

    deleted += out?.Deleted?.length || 0;
  }

  return { deleted };
}


// for image show
export async function getWasabiSignedUrl(key, expiresInSec = 3600) {
  const bucket = process.env.WASABI_BUCKET;
  if (!bucket) throw new Error("WASABI_BUCKET missing");
  if (!key) throw new Error("key missing");

  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  const signedUrl = await getSignedUrl(wasabiS3, cmd, {
    expiresIn: expiresInSec,
  });
  return signedUrl;
}

// for long video

// ✅ BEST for big video
export async function uploadToWasabiFilePath({
  filePath,
  mimetype,
  originalname,
  folder = "uploads",
}) {
  const bucket = process.env.WASABI_BUCKET;
  if (!bucket) throw new Error("WASABI_BUCKET missing");

  const ext = safeExt(originalname);
  const key = `${folder}/${Date.now()}-${crypto.randomUUID()}${
    ext ? "." + ext : ""
  }`;

  const uploader = new Upload({
    client: wasabiS3,
    params: {
      Bucket: bucket,
      Key: key,
      Body: fs.createReadStream(filePath),
      ContentType: mimetype || "application/octet-stream",
    },
    partSize: 10 * 1024 * 1024, // 10MB
    queueSize: 4,
    leavePartsOnError: false,
  });

  await uploader.done();

  const base = process.env.WASABI_PUBLIC_BASE;
  const url = base
    ? `${base}/${key}`
    : `${process.env.WASABI_ENDPOINT}/${bucket}/${key}`;

  return { key, url };
}