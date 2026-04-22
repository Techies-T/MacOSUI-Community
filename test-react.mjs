import React from 'react';
import ReactDOMServer from 'react-dom/server';

const selectedArticle = {
    content: `**実行日時:** 2026/4/18 9:12:26
- [🌐 **Webページとして開く (Secure URL)**](https://macosui-staging.techiespod.co.jp/reports/3491bf4a-c7fc-4183-9d4f-3ecec750ab19.html)
*   **業績の急回復:** 2024年3月期は純損失を計上したものの`
};

const renderMarkdownLinks = (text) => {
    try {
        if (!text) return React.createElement('em', {className: "text-gray-500"}, "No content provided.");
        
        return text.split('\n').map((line, i) => {
            const processText = (str, idxContext) => {
                if (!str) return null;
                const parts = str.split(/(\[.*?\]\(.*?\))/g);
                return parts.map((part, pIdx) => {
                    if (!part) return null;
                    const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
                    if (match) {
                        return React.createElement('a', {key: `${idxContext}-a-${pIdx}`, href: match[2]}, match[1]);
                    }
                    
                    const boldParts = part.split(/(\*\*.*?\*\*)/g);
                    return boldParts.map((bp, bIdx) => {
                        if (!bp) return null;
                        if (bp.startsWith('**') && bp.endsWith('**') && bp.length > 4) {
                            return React.createElement('strong', {key: `${idxContext}-b-${pIdx}-${bIdx}`}, bp.slice(2, -2));
                        }
                        return React.createElement('span', {key: `${idxContext}-s-${pIdx}-${bIdx}`}, bp);
                    });
                });
            };

            if (line.startsWith('- ')) return React.createElement('li', {key: i}, processText(line.substring(2), i));
            return React.createElement('div', {key: i}, processText(line, i));
        });
    } catch (error) {
        return React.createElement('div', null, "Error");
    }
};

const elements = React.createElement('div', null, renderMarkdownLinks(selectedArticle.content));
try {
    const html = ReactDOMServer.renderToString(elements);
    console.log("SUCCESS:", html);
} catch (e) {
    console.log("CRASH:", e);
}
