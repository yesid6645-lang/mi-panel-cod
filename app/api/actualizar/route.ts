import { NextResponse } from "next/server";
import { actualizar } from "@/lib/sync";

export async function POST(req: Request) {
  const { desde, hasta } = await req.json();
  return NextResponse.json(await actualizar({ desde, hasta }));
}
