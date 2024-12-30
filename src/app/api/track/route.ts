import { NextResponse } from 'next/server';
import { track } from '@/lib/analytics';

export async function POST(req: Request) {
  const { eventName, properties } = await req.json();
  
  try {
    track(eventName, properties);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to track event' }, { status: 500 });
  }
} 