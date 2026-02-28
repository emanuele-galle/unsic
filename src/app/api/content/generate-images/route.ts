import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Platform-specific aspect ratios for NanoBanana
const PLATFORM_ASPECT: Record<string, string> = {
  facebook: '16:9',   // Wide banner
  instagram: '1:1',   // Square
  linkedin: '16:9',   // Wide banner
};

// NanoBanana API URL (internal Docker network)
const NANOBANANA_URL = process.env.NANOBANANA_URL || 'http://172.19.0.1:8100';

// POST /api/content/generate-images - Generate images for all content of a news item
// eslint-disable-next-line sonarjs/cognitive-complexity
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

    // Get news details for prompt context
    const news = await prisma.unsicNews.findUnique({
      where: { id: news_id },
    });

    if (!news) {
      return NextResponse.json(
        { error: 'News not found' },
        { status: 404 }
      );
    }

    // Get all content posts for this news
    const contentPosts = await prisma.unsicContent.findMany({
      where: { news_id },
    });

    if (contentPosts.length === 0) {
      return NextResponse.json(
        { error: 'No content found for this news' },
        { status: 404 }
      );
    }

    // Generate images for each content post
    const results = [];
    let generatedCount = 0;

    for (const post of contentPosts) {
      const aspectRatio = PLATFORM_ASPECT[post.platform] || '16:9';

      // Build a prompt based on the news content
      const prompt = buildImagePrompt(news, post);

      try {
        // Call NanoBanana API (correct endpoint: /generate not /api/generate)
        const response = await fetch(`${NANOBANANA_URL}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            aspect_ratio: aspectRatio,
            resolution: '2k',
            number_of_images: 1,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          const errorMsg = data.error?.message || data.error || 'Image generation failed';
          console.error(`NanoBanana error for ${post.platform}:`, errorMsg);
          results.push({
            post_id: post.id,
            platform: post.platform,
            success: false,
            error: errorMsg,
          });
          continue;
        }

        // NanoBanana returns images array
        const imageUrl = data.images?.[0]?.url || data.image_url;

        if (imageUrl) {
          // Update the content post with the new image URL
          await prisma.unsicContent.update({
            where: { id: post.id },
            data: { content_image_url: imageUrl },
          });

          generatedCount++;
          results.push({
            post_id: post.id,
            platform: post.platform,
            success: true,
            image_url: imageUrl,
          });
        } else {
          results.push({
            post_id: post.id,
            platform: post.platform,
            success: false,
            error: 'No image URL in response',
          });
        }
      } catch (error: unknown) {
        console.error(`Error generating image for ${post.platform}:`, error);
        results.push({
          post_id: post.id,
          platform: post.platform,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      success: true,
      news_id,
      generated: generatedCount,
      total: contentPosts.length,
      results,
    });
  } catch (error: unknown) {
    console.error('Error in generate-images:', error);
    return NextResponse.json(
      { error: 'Failed to generate images', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Build an appropriate image prompt based on news category and content
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildImagePrompt(news: any, post: any): string {
  const category = news.category?.toLowerCase() || 'general';
  const title = news.title || '';

  // Base style for UNSIC branding
  const baseStyle = 'professional corporate design, clean modern layout, subtle gradient background, high quality, 4k';

  // Category-specific visual elements
  const categoryVisuals: Record<string, string> = {
    fisco: 'financial charts, calculator, documents, euro symbols, blue color scheme',
    agricoltura: 'green fields, farming, sustainable agriculture, nature, green color scheme',
    lavoro: 'office environment, professional people, teamwork, business meeting, warm tones',
    pnrr: 'Italy flag colors, infrastructure, innovation, digital transformation, red white green accents',
    incentivi: 'growth arrows, business success, money, investment, gold accents',
    previdenza: 'retirement planning, elderly care, pension documents, calm blue tones',
    imprese: 'business growth, corporate buildings, entrepreneurship, dynamic composition',
  };

  const categoryElement = categoryVisuals[category] || 'professional business imagery, corporate aesthetic';

  // Platform-specific adjustments
  const platformStyle = post.platform === 'instagram'
    ? 'square composition, centered design, social media optimized'
    : 'wide banner format, text-friendly layout';

  // Combine elements into final prompt
  const prompt = `${baseStyle}, ${categoryElement}, ${platformStyle}, topic: ${title.substring(0, 100)}, UNSIC syndicate branding, blue and gold color accents`;

  return prompt;
}
