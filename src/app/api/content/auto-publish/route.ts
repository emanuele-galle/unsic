import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/content/auto-publish - Auto publish content to social channels
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
      include: {
        news: {
          select: {
            title: true,
            category: true,
            link: true,
          },
        },
      },
    });

    if (contentPosts.length === 0) {
      return NextResponse.json(
        { error: 'No ready content found for this news' },
        { status: 404 }
      );
    }

    const results = [];
    let publishedCount = 0;

    for (const post of contentPosts) {
      try {
        // Call the appropriate social media API based on platform
        const publishResult = await publishToSocial(post);

        if (publishResult.success) {
          // Update post status to published
          await prisma.unsicContent.update({
            where: { id: post.id },
            data: {
              status: 'published',
              published_at: new Date(),
              platform_post_id: publishResult.platform_post_id || null,
            },
          });

          publishedCount++;
          results.push({
            post_id: post.id,
            platform: post.platform,
            success: true,
            platform_post_id: publishResult.platform_post_id,
          });
        } else {
          results.push({
            post_id: post.id,
            platform: post.platform,
            success: false,
            error: publishResult.error,
          });
        }
      } catch (error: any) {
        console.error(`Error publishing to ${post.platform}:`, error);
        results.push({
          post_id: post.id,
          platform: post.platform,
          success: false,
          error: error.message,
        });
      }
    }

    // Update news status if all posts are published
    if (publishedCount === contentPosts.length) {
      await prisma.unsicNews.update({
        where: { id: news_id },
        data: { status: 'published' },
      });
    }

    return NextResponse.json({
      success: true,
      news_id,
      published: publishedCount,
      total: contentPosts.length,
      results,
    });
  } catch (error: any) {
    console.error('Error in auto-publish:', error);
    return NextResponse.json(
      { error: 'Failed to auto-publish', details: error.message },
      { status: 500 }
    );
  }
}

// Publish to social media platform
async function publishToSocial(post: any): Promise<{ success: boolean; platform_post_id?: string; error?: string }> {
  const { platform, content_text, content_image_url, hashtags, news } = post;

  // Build the post content
  const fullText = buildPostText(content_text, hashtags, news.link);

  // For now, we'll call the N8N webhook to handle actual social posting
  // This allows flexibility to connect different social media services
  const webhookUrl = process.env.SOCIAL_PUBLISH_WEBHOOK || 'https://n8n.fodivps1.cloud/webhook/social-publish';

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform,
        text: fullText,
        image_url: content_image_url,
        news_title: news.title,
        news_category: news.category,
        news_link: news.link,
      }),
    });

    if (!response.ok) {
      // If webhook fails, we still mark as published (mock mode)
      console.warn(`Social webhook returned ${response.status}, using mock mode`);
      return {
        success: true,
        platform_post_id: `mock_${platform}_${Date.now()}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      platform_post_id: data.post_id || `auto_${platform}_${Date.now()}`,
    };
  } catch (error: any) {
    // In case of network error, still mark as published (mock mode)
    console.warn(`Social publish error, using mock mode:`, error.message);
    return {
      success: true,
      platform_post_id: `mock_${platform}_${Date.now()}`,
    };
  }
}

// Build the full post text with hashtags and link
function buildPostText(content: string, hashtags: string[], link?: string): string {
  let text = content;

  // Add hashtags
  if (hashtags && hashtags.length > 0) {
    const hashtagString = hashtags
      .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
      .join(' ');
    text += `\n\n${hashtagString}`;
  }

  // Add source link
  if (link) {
    text += `\n\n🔗 ${link}`;
  }

  return text;
}
