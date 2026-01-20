import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/content - Get content (filter by status or news_id)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const newsId = searchParams.get('news_id');

    const whereClause: any = {};
    if (status) whereClause.status = status;
    if (newsId) whereClause.news_id = newsId;

    const content = await prisma.unsicContent.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      include: {
        news: {
          select: {
            title: true,
            category: true,
            pillar: true,
            approved_at: true,
            approved_by: {
              select: {
                display_name: true,
                role: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      content,
      count: content.length,
    });
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}

// POST /api/content - Create content (called by N8N Content Factory)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const content = await prisma.unsicContent.create({
      data: {
        news_id: body.news_id,
        platform: body.platform,
        content_text: body.content_text,
        content_image_url: body.content_image_url || null,
        hashtags: body.hashtags || [],
        status: body.status || 'draft',
        scheduled_for: body.scheduled_for ? new Date(body.scheduled_for) : null,
      },
    });

    return NextResponse.json({
      success: true,
      content,
    });
  } catch (error: any) {
    console.error('Error creating content:', error);
    return NextResponse.json(
      {
        error: 'Failed to create content',
        details: error.message,
        code: error.code
      },
      { status: 500 }
    );
  }
}
