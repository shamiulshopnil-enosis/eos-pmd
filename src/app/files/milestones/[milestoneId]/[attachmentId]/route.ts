import { cookies } from "next/headers";
import { apiBaseUrl } from "@/lib/api-client";
import { SESSION_COOKIE } from "@/lib/session";

// Streams a milestone attachment from the NestJS API back to the browser. The
// API is a separate origin and the session lives in an httpOnly cookie, so the
// browser can't call it directly — this handler forwards the session as a Bearer
// token and pipes the response through. Auth is already enforced by middleware.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ milestoneId: string; attachmentId: string }> },
) {
  const { milestoneId, attachmentId } = await params;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;

  const upstream = await fetch(
    `${apiBaseUrl}/milestones/${milestoneId}/attachments/${attachmentId}/raw`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    },
  );

  if (!upstream.ok || !upstream.body) {
    return new Response("File not available.", { status: upstream.status || 404 });
  }

  const headers = new Headers();
  for (const h of ["content-type", "content-disposition", "content-length"]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  headers.set("Cache-Control", "private, no-store");

  return new Response(upstream.body, { status: 200, headers });
}
