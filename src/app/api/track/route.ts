import { NextResponse } from 'next/server';
import { track } from '@/lib/analytics';

const MIXPANEL_TOKEN = process.env.MIXPANEL_TOKEN;

export async function POST(req: Request) {
  const { eventName, properties } = await req.json();
  
  if (!MIXPANEL_TOKEN) {
    console.error('Mixpanel token not found');
    return NextResponse.json(
      { error: 'Mixpanel configuration missing' }, 
      { status: 500 }
    );
  }
  
  try {
    await track(eventName, properties);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to track event:', error);
    return NextResponse.json(
      { error: 'Failed to track event', details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    );
  }
} 