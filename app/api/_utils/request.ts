import type { NextRequest } from "next/server";

export type UploadedFile = {
  fieldname: string;
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
};

export type ParsedBody = {
  body: Record<string, any>;
  files: UploadedFile[];
};

export const parseBodyAndFiles = async (request: NextRequest): Promise<ParsedBody> => {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    return { body, files: [] };
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const body: Record<string, any> = {};
    const files: UploadedFile[] = [];

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        const arrayBuffer = await value.arrayBuffer();
        files.push({
          fieldname: key,
          originalname: value.name,
          mimetype: value.type,
          buffer: Buffer.from(arrayBuffer),
          size: value.size,
        });
      } else {
        body[key] = value;
      }
    }

    return { body, files };
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    const body: Record<string, any> = {};
    params.forEach((value, key) => {
      body[key] = value;
    });
    return { body, files: [] };
  }

  return { body: {}, files: [] };
};

