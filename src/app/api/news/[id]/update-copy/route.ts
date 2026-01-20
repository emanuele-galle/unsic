import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/news/[id]/update-copy - Update AI-generated copy
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.copy_linkedin || !body.copy_twitter || !body.copy_instagram) {
      return NextResponse.json(
        { error: 'Missing required copy fields' },
        { status: 400 }
      );
    }

    // Update news with AI-generated copy
    const newsItem = await prisma.unsicNews.update({
      where: { id },
      data: {
        copy_linkedin: body.copy_linkedin,
        copy_twitter: body.copy_twitter,
        copy_instagram: body.copy_instagram,
        copy_generated_at: new Date(),

        // Optional: Update design assets if provided
        bg_image_url: body.bg_image_url,
        final_image_url: body.final_image_url,
        canva_design_id: body.canva_design_id,
      },
    });

    // Log success
    await prisma.unsicLog.create({
      data: {
        news_id: id,
        workflow: 'publisher',
        level: 'info',
        message: 'Copy generated successfully',
        details: {
          platforms: ['linkedin', 'twitter', 'instagram'],
          has_design: !!body.final_image_url,
        },
      },
    });

    return NextResponse.json({
      success: true,
      news: newsItem,
      message: 'Copy updated successfully',
    });
  } catch (error) {
    console.error('Error updating copy:', error);

    // Log error
    try {
      await prisma.unsicLog.create({
        data: {
          news_id: (await params).id,
          workflow: 'publisher',
          level: 'error',
          message: 'Failed to update copy',
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return NextResponse.json(
      { error: 'Failed to update copy' },
      { status: 500 }
    );
  }
}
