import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/news/[id]/publish - Trigger N8N social publishing workflow
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Get news item with copy
    const newsItem = await prisma.unsicNews.findUnique({
      where: { id },
    });

    if (!newsItem) {
      return NextResponse.json(
        { error: 'News not found' },
        { status: 404 }
      );
    }

    // Verify copy exists (or manual_copy provided)
    const hasCopy = newsItem.copy_linkedin || body.manual_copy?.linkedin;
    if (!hasCopy) {
      return NextResponse.json(
        { error: 'No copy available. Generate copy first.' },
        { status: 400 }
      );
    }

    // Prepare payload for N8N
    const n8nPayload = {
      news_id: id,
      news: newsItem,
      platforms: body.platforms || ['linkedin', 'twitter', 'instagram'],
      manual_copy: body.manual_copy, // If user edited copy manually
    };

    // Trigger N8N publishing workflow
    const n8nUrl = process.env.N8N_WEBHOOK_PUBLISHER || 'https://n8n.fodivps1.cloud/webhook/unsic-publish';

    const n8nResponse = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(n8nPayload),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('N8N publishing webhook failed:', errorText);

      // Log error
      await prisma.unsicLog.create({
        data: {
          news_id: id,
          workflow: 'publisher',
          level: 'error',
          message: 'N8N webhook failed',
          details: {
            status: n8nResponse.status,
            error: errorText,
          },
        },
      });

      return NextResponse.json(
        { error: 'Publishing workflow failed', details: errorText },
        { status: 500 }
      );
    }

    // Update news status to publishing (N8N will update to published)
    await prisma.unsicNews.update({
      where: { id },
      data: {
        status: 'approved', // Keep as approved, N8N will set to published
      },
    });

    // Log success
    await prisma.unsicLog.create({
      data: {
        news_id: id,
        workflow: 'publisher',
        level: 'info',
        message: 'Publishing workflow triggered',
        details: {
          platforms: n8nPayload.platforms,
          manual_copy: !!body.manual_copy,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Publishing workflow triggered successfully',
      platforms: n8nPayload.platforms,
      n8nStatus: n8nResponse.status,
    });
  } catch (error) {
    console.error('Error triggering publish:', error);

    // Log error
    try {
      await prisma.unsicLog.create({
        data: {
          news_id: (await params).id,
          workflow: 'publisher',
          level: 'error',
          message: 'Failed to trigger publishing',
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return NextResponse.json(
      { error: 'Failed to trigger publishing' },
      { status: 500 }
    );
  }
}

// PATCH /api/news/[id]/publish - Update social post IDs after publishing
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Update with social post IDs from N8N
    const newsItem = await prisma.unsicNews.update({
      where: { id },
      data: {
        linkedin_post_id: body.linkedin_post_id,
        twitter_post_id: body.twitter_post_id,
        instagram_post_id: body.instagram_post_id,
        publish_error: body.publish_error, // If partial failure
        status: body.publish_error ? 'partial_published' : 'published',
        published_at: new Date(),
      },
    });

    // Log publication
    await prisma.unsicLog.create({
      data: {
        news_id: id,
        workflow: 'publisher',
        level: body.publish_error ? 'warning' : 'info',
        message: body.publish_error ? 'Partial publication' : 'Published successfully',
        details: {
          linkedin: !!body.linkedin_post_id,
          twitter: !!body.twitter_post_id,
          instagram: !!body.instagram_post_id,
          error: body.publish_error,
        },
      },
    });

    return NextResponse.json({
      success: true,
      news: newsItem,
    });
  } catch (error) {
    console.error('Error updating publication status:', error);
    return NextResponse.json(
      { error: 'Failed to update publication status' },
      { status: 500 }
    );
  }
}
