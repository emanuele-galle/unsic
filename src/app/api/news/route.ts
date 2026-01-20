import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/news - Get news (supports multiple statuses)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const statusParam = searchParams.get('status');

    // Support multiple statuses: ?status=pending,approved,published
    const statuses = statusParam
      ? statusParam.split(',').map(s => s.trim())
      : ['pending', 'pending_approval', 'approved'];

    const news = await prisma.unsicNews.findMany({
      where: {
        status: { in: statuses },
      },
      orderBy: [
        { rank: 'asc' },
        { created_at: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      news,
      count: news.length,
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}

// POST /api/news - Create news (called by N8N)
export async function POST(request: NextRequest) {
  let body: any;

  try {
    body = await request.json();

    // Parse published_at - accetta ISO string o timestamp
    let publishedAt: Date | undefined;
    if (body.published_at) {
      const parsed = new Date(body.published_at);
      if (!isNaN(parsed.getTime())) {
        publishedAt = parsed;
      }
    }

    const newsItem = await prisma.unsicNews.create({
      data: {
        article_id: body.article_id,
        category: body.category,
        pillar: body.pillar,
        rank: body.rank,
        title: body.title,
        summary: body.summary,
        why_relevant: body.why_relevant,
        source: body.source,
        link: body.link,
        status: 'pending',
        published_at: publishedAt,
      },
    });

    return NextResponse.json({
      success: true,
      news: newsItem,
    });
  } catch (error: any) {
    // Gestione duplicate key error (Prisma P2002)
    if (error.code === 'P2002' && error.meta?.target?.includes('link')) {
      console.log(`[DEDUP] Duplicate link skipped: ${body.link}`);
      return NextResponse.json(
        {
          error: 'Duplicate news link',
          code: 'DUPLICATE_LINK',
          link: body.link,
          skipped: true
        },
        { status: 409 }
      );
    }

    console.error('Error creating news:', error);
    return NextResponse.json(
      { error: 'Failed to create news', details: error.message },
      { status: 500 }
    );
  }
}
