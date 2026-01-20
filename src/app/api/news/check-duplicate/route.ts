import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/news/check-duplicate?link={url}
// Verifica se una notizia con questo link esiste già (per deduplicazione N8N)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const link = searchParams.get('link');

    if (!link) {
      return NextResponse.json(
        { error: 'Link parameter required' },
        { status: 400 }
      );
    }

    // Cerca notizia con questo link
    const existing = await prisma.unsicNews.findFirst({
      where: { link },
      select: {
        id: true,
        title: true,
        status: true,
        created_at: true,
      },
    });

    return NextResponse.json({
      exists: !!existing,
      duplicate: !!existing,
      news: existing || null,
    });
  } catch (error: any) {
    console.error('Error checking duplicate:', error);
    return NextResponse.json(
      { error: 'Failed to check duplicate', details: error.message },
      { status: 500 }
    );
  }
}
