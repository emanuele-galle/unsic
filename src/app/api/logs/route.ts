import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/logs - Create activity log (called by N8N)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.workflow || !body.level || !body.message) {
      return NextResponse.json(
        { error: 'Missing required fields: workflow, level, message' },
        { status: 400 }
      );
    }

    // Validate level
    const validLevels = ['info', 'warning', 'error', 'critical'];
    if (!validLevels.includes(body.level)) {
      return NextResponse.json(
        { error: `Invalid level. Must be one of: ${validLevels.join(', ')}` },
        { status: 400 }
      );
    }

    // Create log entry
    const log = await prisma.unsicLog.create({
      data: {
        news_id: body.news_id || null,
        workflow: body.workflow,
        level: body.level,
        message: body.message,
        details: body.details || null,
      },
    });

    // If critical error, could trigger email notification here
    // (or let N8N Error Monitor workflow handle it)

    return NextResponse.json({
      success: true,
      log,
    });
  } catch (error) {
    console.error('Error creating log:', error);
    return NextResponse.json(
      { error: 'Failed to create log' },
      { status: 500 }
    );
  }
}

// GET /api/logs - Get activity logs with filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Filters
    const workflow = searchParams.get('workflow');
    const level = searchParams.get('level');
    const news_id = searchParams.get('news_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = {};
    if (workflow) where.workflow = workflow;
    if (level) where.level = level;
    if (news_id) where.news_id = news_id;

    // Fetch logs
    const logs = await prisma.unsicLog.findMany({
      where,
      orderBy: {
        created_at: 'desc',
      },
      take: limit,
      skip: offset,
      include: {
        news: {
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
          },
        },
      },
    });

    // Count total
    const total = await prisma.unsicLog.count({ where });

    return NextResponse.json({
      success: true,
      logs,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
