import { NextResponse } from "next/server";
import { getCompanies } from "@/lib/data";

export async function GET() {
  const companies = await getCompanies();
  return NextResponse.json(companies);
}
