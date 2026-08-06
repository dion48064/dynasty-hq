import { NextResponse } from 'next/server';

const BIN_ID = process.env.NEXT_PUBLIC_JSONBIN_BIN_ID || "6a73b378f5f4af5e29f04718";
const MASTER_KEY = process.env.JSONBIN_MASTER_KEY || "$2a$10$hnTilVCkc1Yk8AU/9wzyMeieA7lec.oVyU7FutEsPPxt59y9saZSe";

export async function GET() {
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: { 'X-Master-Key': MASTER_KEY },
      cache: 'no-store'
    });
    const data = await res.json();
    return NextResponse.json(data.record || data);
  } catch (error) {
    console.error("GET league-data error:", error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': MASTER_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("JSONBin PUT error response:", errorText);
      return NextResponse.json({ error: 'JSONBin rejected update', details: errorText }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data.record || data);
  } catch (error) {
    console.error("PUT league-data exception:", error);
    return NextResponse.json({ error: 'Failed to update data' }, { status: 500 });
  }
}