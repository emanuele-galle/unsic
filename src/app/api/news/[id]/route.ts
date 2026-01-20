import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const news = await prisma.unsicNews.findUnique({ where: { id } });
  if (!news) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(news);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  
  const updated = await prisma.unsicNews.update({
    where: { id },
    data: {
      ...body,
      updated_at: new Date(),
      ...(body.status === 'approved' && { approved_at: new Date() }),
    },
  });

  return NextResponse.json({ success: true, news: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.unsicNews.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
