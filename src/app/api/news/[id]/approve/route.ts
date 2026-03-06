import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/news/[id]/approve - Approve and send to N8N
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Update status to approved
    const newsItem = await prisma.unsicNews.update({
      where: { id },
      data: { status: 'approved' },
    });

    // Send to N8N webhook
    const n8nUrl = process.env.N8N_WEBHOOK_URL || 'https://n8n.muscarivps.cloud/webhook/unsic-approve';

    const n8nResponse = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newsItem),
    });

    if (!n8nResponse.ok) {
      console.error('N8N webhook failed:', await n8nResponse.text());
    }

    return NextResponse.json({
      success: true,
      news: newsItem,
      n8nStatus: n8nResponse.status,
    });
  } catch (error) {
    console.error('Error approving news:', error);
    return NextResponse.json(
      { error: 'Failed to approve news' },
      { status: 500 }
    );
  }
}
