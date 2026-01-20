import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/news/cleanup - Delete news older than 72h that are still pending
export async function POST(request: NextRequest) {
  try {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - 72 * 60 * 60 * 1000); // 72 hours ago

    // Find and delete news that are:
    // - status = 'pending' (not approved)
    // - created more than 72 hours ago
    const result = await prisma.unsicNews.deleteMany({
      where: {
        status: 'pending',
        created_at: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`[CLEANUP] Deleted ${result.count} expired pending news older than 72h`);

    return NextResponse.json({
      success: true,
      deleted: result.count,
      cutoff_date: cutoffDate.toISOString(),
      message: `Deleted ${result.count} pending news older than 72 hours`,
    });
  } catch (error: any) {
    console.error('Error cleaning up news:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup news', details: error.message },
      { status: 500 }
    );
  }
}

// GET /api/news/cleanup - Get count of news that would be deleted (preview)
export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - 72 * 60 * 60 * 1000); // 72 hours ago

    const count = await prisma.unsicNews.count({
      where: {
        status: 'pending',
        created_at: {
          lt: cutoffDate,
        },
      },
    });

    return NextResponse.json({
      success: true,
      pending_deletion: count,
      cutoff_date: cutoffDate.toISOString(),
      message: `${count} pending news older than 72 hours will be deleted`,
    });
  } catch (error: any) {
    console.error('Error checking cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to check cleanup', details: error.message },
      { status: 500 }
    );
  }
}
