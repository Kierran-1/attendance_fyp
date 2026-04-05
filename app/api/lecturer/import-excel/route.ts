import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Use /api/lecturer/import instead' },
    { status: 410 }
  );
}
