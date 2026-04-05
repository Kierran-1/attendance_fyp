import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Seed not available - use SQL import' });
}

export async function POST() {
  return NextResponse.json({ message: 'Seed not available - use SQL import' });
}
