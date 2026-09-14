import { neonAuth } from "@/lib/neon-auth";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path: string[] }> };

export function GET(request: NextRequest, context: Context) {
  return neonAuth().handler().GET(request, context);
}

export function POST(request: NextRequest, context: Context) {
  return neonAuth().handler().POST(request, context);
}
