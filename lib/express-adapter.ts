import { NextResponse, type NextRequest } from "next/server";
import { cookies as nextCookies } from "next/headers";

type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
};

type ExpressLikeRequest = {
  body: any;
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  file?: {
    fieldname: string;
    originalname: string;
    mimetype: string;
    buffer: Buffer;
    size: number;
  };
  files?: Array<{
    fieldname: string;
    originalname: string;
    mimetype: string;
    buffer: Buffer;
    size: number;
  }>;
};

type ExpressLikeResponse = {
  status: (code: number) => ExpressLikeResponse;
  json: (data: unknown) => NextResponse;
  cookie: (name: string, value: string, options?: CookieOptions) => ExpressLikeResponse;
  clearCookie: (name: string, options?: CookieOptions) => ExpressLikeResponse;
};

type Controller = (req: ExpressLikeRequest, res: ExpressLikeResponse, next?: (err?: unknown) => void) => Promise<void> | void;

const parseCookies = () => {
  const store = nextCookies();
  const out: Record<string, string> = {};
  for (const cookie of store.getAll()) {
    out[cookie.name] = cookie.value;
  }
  return out;
};

const buildQuery = (request: NextRequest) => {
  const url = new URL(request.url);
  const query: Record<string, string | string[]> = {};
  url.searchParams.forEach((value, key) => {
    if (query[key]) {
      const existing = query[key];
      query[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      query[key] = value;
    }
  });
  return query;
};

const buildBodyAndFiles = async (request: NextRequest) => {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    return { body, files: undefined };
  }
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const body: Record<string, any> = {};
    const files: ExpressLikeRequest["files"] = [];

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
    const file = files.length === 1 ? files[0] : undefined;
    return { body, files, file };
  }
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    const body: Record<string, string> = {};
    params.forEach((value, key) => {
      body[key] = value;
    });
    return { body, files: undefined };
  }
  return { body: {}, files: undefined, file: undefined };
};

async function buildReqRes(request: NextRequest, params: Record<string, string>) {
  const { body, files, file } = await buildBodyAndFiles(request);
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let statusCode = 200;
  let responseBody: unknown = null;
  const cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }> = [];

  const req: ExpressLikeRequest = {
    body,
    params,
    query: buildQuery(request),
    headers,
    cookies: parseCookies(),
    files,
    file,
  };

  const res: ExpressLikeResponse = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      responseBody = data;
      const response = NextResponse.json(data, { status: statusCode });
      cookiesToSet.forEach(({ name, value, options }) => {
        const normalized = options?.maxAge
          ? { ...options, maxAge: Math.floor(options.maxAge / 1000) }
          : options;
        response.cookies.set({ name, value, ...normalized });
      });
      return response;
    },
    cookie(name, value, options) {
      cookiesToSet.push({ name, value, options });
      return res;
    },
    clearCookie(name, options) {
      cookiesToSet.push({
        name,
        value: "",
        options: { ...options, expires: new Date(0) },
      });
      return res;
    },
  };

  const finalize = () => {
    const response = NextResponse.json(responseBody ?? {}, { status: statusCode });
    cookiesToSet.forEach(({ name, value, options }) => {
      const normalized = options?.maxAge
        ? { ...options, maxAge: Math.floor(options.maxAge / 1000) }
        : options;
      response.cookies.set({ name, value, ...normalized });
    });
    return response;
  };

  return { req, res, finalize };
}

export async function runController(
  controller: Controller,
  request: NextRequest,
  params: Record<string, string> = {}
) {
  const { req, res, finalize } = await buildReqRes(request, params);
  await controller(req, res);
  return finalize();
}

export async function runHandlers(
  handlers: Controller[],
  request: NextRequest,
  params: Record<string, string> = {}
) {
  const { req, res, finalize } = await buildReqRes(request, params);
  let idx = 0;
  const next = async (err?: unknown) => {
    if (err) throw err;
    const handler = handlers[idx++];
    if (!handler) return;
    await handler(req, res, next);
  };
  await next();
  return finalize();
}
