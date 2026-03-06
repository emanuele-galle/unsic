import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/news/[id]/regenerate-copy - Re-trigger Gemini copywriting
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get news item
    const newsItem = await prisma.unsicNews.findUnique({
      where: { id },
    });

    if (!newsItem) {
      return NextResponse.json(
        { error: 'News not found' },
        { status: 404 }
      );
    }

    // Clear existing copy
    await prisma.unsicNews.update({
      where: { id },
      data: {
        copy_linkedin: null,
        copy_twitter: null,
        copy_instagram: null,
        copy_generated_at: null,
      },
    });

    // Trigger N8N copywriting workflow (same as publish but only copywriting step)
    const n8nUrl = process.env.N8N_WEBHOOK_PUBLISHER || 'https://n8n.muscarivps.cloud/webhook/unsic-publish';

    const n8nPayload = {
      news_id: id,
      news: newsItem,
      regenerate: true, // Flag to only run copywriting, not publishing
    };

    const n8nResponse = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(n8nPayload),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('N8N regenerate webhook failed:', errorText);

      // Log error
      await prisma.unsicLog.create({
        data: {
          news_id: id,
          workflow: 'publisher',
          level: 'error',
          message: 'Copy regeneration failed',
          details: {
            status: n8nResponse.status,
            error: errorText,
          },
        },
      });

      return NextResponse.json(
        { error: 'Copy regeneration failed', details: errorText },
        { status: 500 }
      );
    }

    // Log success
    await prisma.unsicLog.create({
      data: {
        news_id: id,
        workflow: 'publisher',
        level: 'info',
        message: 'Copy regeneration triggered',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Copy regeneration triggered successfully',
      n8nStatus: n8nResponse.status,
    });
  } catch (error) {
    console.error('Error regenerating copy:', error);

    // Log error
    try {
      await prisma.unsicLog.create({
        data: {
          news_id: (await params).id,
          workflow: 'publisher',
          level: 'error',
          message: 'Failed to regenerate copy',
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return NextResponse.json(
      { error: 'Failed to regenerate copy' },
      { status: 500 }
    );
  }
}
