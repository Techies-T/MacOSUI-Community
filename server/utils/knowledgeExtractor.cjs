/**
 * Knowledge Base Content Extractor & Summarizer for Gemini Live
 * Markdown、HTML、SVG、Chart.js を含むナレッジ記事から、
 * AI が理解しやすい高密度のセマンティックコンテキストを抽出・生成します。
 */

function sanitizeHtmlToText(html) {
    if (!html) return '';

    // 1. スクリプト、スタイル、SVGパス等の不要なバイナリ/定義を除去
    let text = html
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, (match) => {
            // Chart.js などのデータセット定義があれば抽出
            const chartDataMatch = match.match(/(?:labels|datasets|data):\s*(\[[^\]]+\])/gi);
            if (chartDataMatch) {
                return ` [Chart Data: ${chartDataMatch.slice(0, 3).join(', ')}] `;
            }
            return '';
        })
        .replace(/<path\b[^>]*>/gi, '') // SVG path 除去
        .replace(/<!--[\s\S]*?-->/g, ''); // コメント除去

    // 2. 見出しやテーブル、改行タグを明示的なテキスト区切りに変換
    text = text
        .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n### $1\n')
        .replace(/<tr[^>]*>/gi, '\n')
        .replace(/<t[hd][^>]*>(.*?)<\/t[hd]>/gi, ' | $1')
        .replace(/<p[^>]*>/gi, '\n')
        .replace(/<li[^>]*>/gi, '\n- ')
        .replace(/<br\s*\/?>/gi, '\n');

    // 3. 残りの全HTMLタグを除去
    text = text.replace(/<[^>]+>/g, ' ');

    // 4. HTML エンティティのデコード
    text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

    // 5. 連続する空白・改行を整理
    return text.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

/**
 * ナレッジ記事レコードから Gemini Live 向けのセマンティックコンテキストを生成
 * @param {Object} article - knowledge_articles レコード
 * @param {number} maxChars - 最大文字数 (デフォルト: 4000)
 * @returns {Object} { title, tags, formattedContext }
 */
function extractKnowledgeContext(article, maxChars = 4000) {
    if (!article) return null;

    const title = article.title || '無題のナレッジ記事';
    let tags = [];
    try {
        tags = typeof article.tags === 'string' ? JSON.parse(article.tags) : (article.tags || []);
    } catch (_) {
        tags = (article.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    }

    const rawContent = article.content || '';

    // Markdown 本文と HTML コードブロックの分離
    const htmlBlocks = [];
    const markdownWithoutHtml = rawContent.replace(/```(?:html|svg|xml)?\s*([\s\S]*?)```/gi, (_, code) => {
        htmlBlocks.push(code);
        return '\n[インタラクティブ・ダッシュボード (HTML/SVG)]\n';
    });

    // 各パートのテキスト化
    const markdownText = markdownWithoutHtml
        .replace(/!\[.*?\]\(.*?\)/g, '') // 画像リンク除去
        .trim();

    const extractedHtmlText = htmlBlocks.map(html => sanitizeHtmlToText(html)).join('\n\n');

    // 統合テキスト構築
    let body = `${markdownText}\n\n${extractedHtmlText}`.trim();
    if (body.length > maxChars) {
        body = body.substring(0, maxChars) + '\n... (以降のデータは省略)';
    }

    const formattedContext = [
        `【レポートタイトル】: ${title}`,
        tags.length > 0 ? `【タグ】: ${tags.join(', ')}` : null,
        article.created_at ? `【作成日時】: ${article.created_at}` : null,
        article.author_name ? `【作成者】: ${article.author_name}` : null,
        '----------------------------------------',
        '【主要な分析内容・データ要約】',
        body
    ].filter(Boolean).join('\n');

    return {
        id: article.id,
        title,
        tags,
        pod_id: article.pod_id,
        created_at: article.created_at,
        formattedContext
    };
}

module.exports = {
    sanitizeHtmlToText,
    extractKnowledgeContext
};
