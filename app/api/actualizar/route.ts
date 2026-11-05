import { NextResponse } from "next/server";
import { actualizar } from "@/lib/sync";

export async function POST(req: Request) {
  const { tiendaId, desde, hasta } = await req.json();
  return NextResponse.json(await actualizar(tiendaId, { desde, hasta }));
}
