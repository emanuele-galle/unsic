import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/content/manual-publish - Mark content as published (human operator will publish manually)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { news_id } = body;

    if (!news_id) {
      return NextResponse.json(
        { error: 'news_id is required' },
        { status: 400 }
      );
    }

    // Get all content posts for this news with status 'ready'
    const contentPosts = await prisma.unsicContent.findMany({
      where: {
        news_id,
        status: 'ready',
      },
    });

    if (contentPosts.length === 0) {
      return NextResponse.json(
        { error: 'No ready content found for this news' },
        { status: 404 }
      );
    }

    // Update all posts to 'published' status
    const updateResult = await prisma.unsicContent.updateMany({
      where: {
        news_id,
        status: 'ready',
      },
      data: {
        status: 'published',
        published_at: new Date(),
        platform_post_id: `manual_${Date.now()}`, // Mark as manual publish
      },
    });

    // Update news status to published
    await prisma.unsicNews.update({
      where: { id: news_id },
      data: { status: 'published' },
    });

    return NextResponse.json({
      success: true,
      news_id,
      updated: updateResult.count,
      message: `${updateResult.count} contenuti marcati come pubblicati`,
    });
  } catch (error: unknown) {
    console.error('Error in manual-publish:', error);
    return NextResponse.json(
      { error: 'Failed to mark as published', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
