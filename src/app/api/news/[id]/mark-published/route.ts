import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/news/:id/mark-published
// Marca tutti i contenuti di una notizia come "published" (per pubblicazione manuale tramite Stackposts)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: newsId } = await params;

    // Update all content posts for this news to 'published'
    const updatedContent = await prisma.unsicContent.updateMany({
      where: {
        news_id: newsId,
        status: 'ready', // Solo quelli pronti
      },
      data: {
        status: 'published',
        published_at: new Date(),
      },
    });

    // Update news status
    await prisma.unsicNews.update({
      where: { id: newsId },
      data: { status: 'published' },
    });

    return NextResponse.json({
      success: true,
      message: 'Content marked as published',
      updated_count: updatedContent.count,
    });
  } catch (error: any) {
    console.error('Error marking content as published:', error);
    return NextResponse.json(
      {
        error: 'Failed to mark content as published',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
