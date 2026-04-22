const regexTest = () => {
    const text = "**実行日時:** 2026/4/18 9:12:26\n" +
    "- [🌐 **Webページとして開く (Secure URL)**](https://macosui-staging.techiespod.co.jp/reports/3491bf4a-c7fc-4183-9d4f-3ecec750ab19.html)\n" +
    "*   **業績の急回復:** 2024年3月期は純損失を計上したものの\n";

    return text.split('\n').map((line, i) => {
        if (line.startsWith('## ')) return 'h2';
        if (line.startsWith('# ')) return 'h1';
        if (line.startsWith('> ')) return 'blockquote';
        if (line.startsWith('- ')) {
            let parts = line.substring(2).split(/(\[.*?\]\(.*?\))/g);
            return parts.map((sub, k) => {
                const match = sub.match(/\[(.*?)\]\((.*?)\)/);
                if (match) {
                    return 'a';
                }
                const boldParts = sub.split(/(\*\*.*?\*\*)/g);
                return boldParts.map((bp, l) => {
                    if (bp.startsWith('**') && bp.endsWith('**')) return 'strong';
                    return 'span';
                });
            });
        }
        
        let parts = line.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, j) => {
            if (part && part.startsWith('**') && part.endsWith('**')) {
                return 'strong';
            }
            let subParts = part.split(/(\[.*?\]\(.*?\))/g);
            return subParts.map((sub, k) => {
                let match;
                if (sub) {
                    match = sub.match(/\[(.*?)\]\((.*?)\)/);
                }
                if (match) return 'a';
                return 'span';
            });
        });
    });
};
console.log(JSON.stringify(regexTest(), null, 2));
