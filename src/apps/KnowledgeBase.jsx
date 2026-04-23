import React, { useState, useEffect } from 'react';
import ErrorBoundary from './ErrorBoundary';


const KnowledgeBase = () => {
    const [articles, setArticles] = useState([]);
    const [selectedArticleId, setSelectedArticleId] = useState(null);
    const [selectedTag, setSelectedTag] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    
    // Form state
    const [editForm, setEditForm] = useState({ title: '', content: '', tags: '' });
    
    // Status
    const [isLoading, setIsLoading] = useState(true);

    const fetchArticles = async (tag = null) => {
        setIsLoading(true);
        try {
            const url = tag ? `/api/knowledge?tag=${encodeURIComponent(tag)}` : '/api/knowledge';
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setArticles(data);
            }
        } catch (error) {
            console.error("Failed to fetch articles", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchArticles(selectedTag);
    }, [selectedTag]);

    // Extract unique tags from articles for sidebar (combining with all fetched tags might be better, but doing client side for now just for currently fetched if no tag selected, or re-fetch all)
    const [allTags, setAllTags] = useState([]);
    
    useEffect(() => {
        // Fetch ALL tags once initially or when articles change WITHOUT a tag filter
        if (!selectedTag && articles.length > 0) {
            const tagsSet = new Set();
            articles.forEach(a => {
                if (Array.isArray(a.tags)) {
                    a.tags.forEach(t => tagsSet.add(t));
                }
            });
            setAllTags(Array.from(tagsSet).sort());
        }
    }, [articles, selectedTag]);

    const handleCreateNew = () => {
        setSelectedArticleId(null);
        setEditForm({ title: '', content: '', tags: '' });
        setIsEditing(true);
    };

    const handleSelectArticle = async (article) => {
        // Optimistically set title, content is populated after fetch finishes
        setSelectedArticleId(article.id);
        setEditForm({
            title: article.title,
            content: article.content || '読み込み中...',
            tags: Array.isArray(article.tags) ? article.tags.join(', ') : ''
        });
        setIsEditing(false);

        try {
            const res = await fetch(`/api/knowledge/${article.id}`);
            if (res.ok) {
                const fullArticle = await res.json();
                
                // Update the state with fetched full article
                setArticles(prev => prev.map(a => a.id === fullArticle.id ? { ...a, content: fullArticle.content } : a));
                
                setEditForm({
                    title: fullArticle.title,
                    content: fullArticle.content || '',
                    tags: Array.isArray(fullArticle.tags) ? fullArticle.tags.join(', ') : ''
                });
            }
        } catch (error) {
            console.error("Failed to fetch full article data", error);
        }
    };

    const handleSave = async () => {
        const payload = {
            title: editForm.title,
            content: editForm.content,
            tags: editForm.tags.split(',').map(t => t.trim()).filter(t => t)
        };
        
        try {
            if (selectedArticleId) {
                // Update
                const res = await fetch(`/api/knowledge/${selectedArticleId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    await fetchArticles(selectedTag);
                    setIsEditing(false);
                }
            } else {
                // Create
                const res = await fetch('/api/knowledge', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    const data = await res.json();
                    setSelectedArticleId(data.id);
                    await fetchArticles(selectedTag);
                    setIsEditing(false);
                }
            }
        } catch (error) {
            console.error("Failed to save article", error);
        }
    };

    const handleDelete = async () => {
        if (!selectedArticleId) return;
        if (!window.confirm("このナレッジを削除してもよろしいですか？")) return;
        
        try {
            const res = await fetch(`/api/knowledge/${selectedArticleId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setSelectedArticleId(null);
                setIsEditing(false);
                fetchArticles(selectedTag);
            }
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    const renderMarkdownLinks = (text) => {
        try {
            if (!text) return <em className="text-gray-500">No content provided.</em>;
            
            const processText = (str, idxContext) => {
                if (!str) return null;
                const parts = str.split(/(\[.*?\]\(.*?\))/g);
                return parts.map((part, pIdx) => {
                    if (!part) return null;
                    const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
                    if (match) {
                        return <a key={`${idxContext}-a-${pIdx}`} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">{match[1]}</a>;
                    }
                    
                    // Bold
                    const boldParts = part.split(/(\*\*.*?\*\*)/g);
                    return boldParts.map((bp, bIdx) => {
                        if (!bp) return null;
                        if (bp.startsWith('**') && bp.endsWith('**') && bp.length > 4) {
                            return <strong key={`${idxContext}-b-${pIdx}-${bIdx}`} className="text-white">{bp.slice(2, -2)}</strong>;
                        }
                        return <span key={`${idxContext}-s-${pIdx}-${bIdx}`}>{bp}</span>;
                    });
                });
            };
            
            const lines = text.split('\n');
            const elements = [];
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                if (line.startsWith('## ')) {
                    elements.push(<h2 key={i} className="text-xl font-bold mt-4 mb-2 text-white">{processText(line.replace('## ', ''), i)}</h2>);
                    continue;
                }
                if (line.startsWith('# ')) {
                    elements.push(<h1 key={i} className="text-2xl font-bold mt-4 mb-2 text-white">{processText(line.replace('# ', ''), i)}</h1>);
                    continue;
                }
                if (line.startsWith('> ')) {
                    let blockquoteText = line.replace('> ', '');
                    let j = i + 1;
                    // Lazy blockquote continuation: consume lines until empty line or new block element
                    while (j < lines.length && lines[j].trim() !== '' && !lines[j].startsWith('## ') && !lines[j].startsWith('# ') && !lines[j].startsWith('- ') && !lines[j].startsWith('**')) {
                        blockquoteText += '\n' + (lines[j].startsWith('> ') ? lines[j].replace('> ', '') : lines[j]);
                        j++;
                    }
                    
                    elements.push(
                        <div key={`bq-${i}`} className="relative group my-4 bg-[#2d2d30]/50 rounded-r border border-[#333] border-l-0">
                            <blockquote className="border-l-4 border-blue-500 pl-4 py-3 italic text-gray-300 whitespace-pre-wrap">
                                {processText(blockquoteText, i)}
                            </blockquote>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(blockquoteText);
                                    const btn = document.getElementById(`copy-btn-${i}`);
                                    if (btn) {
                                        const originalText = btn.innerText;
                                        btn.innerText = "Copied!";
                                        setTimeout(() => btn.innerText = originalText, 2000);
                                    }
                                }}
                                id={`copy-btn-${i}`}
                                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#444] hover:bg-[#555] text-xs px-2 py-1 rounded shadow cursor-pointer text-white z-10"
                                title="Copy to clipboard"
                            >
                                Copy
                            </button>
                        </div>
                    );
                    i = j - 1; // Skip consumed lines
                    continue;
                }
                if (line.startsWith('- ')) {
                    elements.push(<li key={i} className="ml-4 list-disc marker:text-gray-500">{processText(line.substring(2), i)}</li>);
                    continue;
                }
                
                elements.push(
                    <div key={i} className="min-h-[1.25em]">
                        {processText(line, i)}
                    </div>
                );
            }
            return elements;
        } catch (error) {
            console.error("Markdown parse error:", error);
            return <div className="text-red-500 p-4 border border-red-500 rounded bg-red-900/20">記事のレンダリング中にエラーが発生しました。</div>;
        }
    };

    const selectedArticle = articles.find(a => a.id === selectedArticleId);

    return (
        <div className="w-full h-full bg-[#1e1e1e] text-[#d4d4d4] flex font-sans overflow-hidden">
            {/* Left Sidebar: Tags */}
            <div className="w-48 border-r border-[#333] bg-[#252526] flex flex-col justify-between">
                <div className="overflow-y-auto p-3">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-2">Tags</h3>
                    
                    <div 
                        className={`px-3 py-1.5 rounded text-sm cursor-pointer mb-1 ${!selectedTag ? 'bg-[#37373d] text-white' : 'hover:bg-[#2a2d2e]'}`}
                        onClick={() => { setSelectedTag(null); setSelectedArticleId(null); setIsEditing(false); }}
                    >
                        # すべての記事
                    </div>

                    {allTags.map(tag => (
                        <div 
                            key={tag}
                            className={`px-3 py-1.5 rounded text-sm flex items-center cursor-pointer mb-1 ${selectedTag === tag ? 'bg-[#007acc] text-white' : 'hover:bg-[#2a2d2e]'}`}
                            onClick={() => { setSelectedTag(tag); setSelectedArticleId(null); setIsEditing(false); }}
                        >
                            <span className="w-2 h-2 rounded-full bg-blue-500 mr-2 opacity-70"></span>
                            {tag}
                        </div>
                    ))}
                </div>
            </div>

            {/* Middle: Article List */}
            <div className="w-64 border-r border-[#333] bg-[#1e1e1e] flex flex-col">
                <div className="p-3 border-b border-[#333] flex justify-between items-center bg-[#252526]">
                    <h2 className="font-semibold text-sm">Articles</h2>
                    <button 
                        onClick={handleCreateNew}
                        className="w-6 h-6 rounded bg-blue-600 hover:bg-blue-500 text-white flex justify-center items-center font-bold"
                        title="New Article"
                    >
                        +
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 p-2">
                    {isLoading ? (
                        <div className="text-xs text-gray-500 text-center mt-4">Loading...</div>
                    ) : articles.length === 0 ? (
                        <div className="text-xs text-gray-500 text-center mt-4">記事がありません</div>
                    ) : (
                        articles.map(article => (
                            <div 
                                key={article.id}
                                className={`p-3 border-b border-[#2d2d2d] cursor-pointer hover:bg-[#2a2d2e] rounded mb-1 transition-colors ${selectedArticleId === article.id ? 'bg-[#37373d]' : ''}`}
                                onClick={() => handleSelectArticle(article)}
                            >
                                <div className="font-medium text-sm truncate">{article.title}</div>
                                <div className="text-xs text-gray-400 mt-1 truncate">
                                    {(article.content || 'No content').substring(0, 50)}
                                </div>
                                <div className="flex gap-1 mt-2 flex-wrap">
                                    {Array.isArray(article.tags) && article.tags.slice(0,3).map(tag => (
                                        <span key={tag} className="text-[10px] bg-[#333] px-1.5 py-0.5 rounded text-gray-300">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                                <div className="text-[10px] text-gray-500 mt-2 text-right">
                                    {new Date(article.updated_at).toLocaleDateString()}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right: Preview / Editor */}
            <div className="flex-1 bg-[#1e1e1e] flex flex-col h-full relative">
                {(selectedArticleId || isEditing) ? (
                    isEditing ? (
                        /* Editor View */
                        <div className="flex flex-col h-full p-6 max-w-4xl mx-auto w-full">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-bold">{selectedArticleId ? 'Edit Article' : 'New Article'}</h2>
                                <div className="flex gap-3">
                                    {selectedArticleId && (
                                        <button onClick={() => setIsEditing(false)} className="px-4 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 rounded">
                                            キャンセル
                                        </button>
                                    )}
                                    <button onClick={handleSave} className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded font-medium">
                                        保存
                                    </button>
                                </div>
                            </div>
                            
                            <input 
                                type="text"
                                placeholder="記事のタイトル"
                                value={editForm.title}
                                onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                                className="w-full bg-[#252526] border border-[#3c3c3c] rounded p-3 mb-4 text-white text-lg focus:outline-none focus:border-blue-500"
                            />
                            
                            <input 
                                type="text"
                                placeholder="タグ カンマ区切り (例: 開発, サーバー, トラブルシューティング)"
                                value={editForm.tags}
                                onChange={(e) => setEditForm({...editForm, tags: e.target.value})}
                                className="w-full bg-[#252526] border border-[#3c3c3c] rounded p-2 mb-4 text-white text-sm focus:outline-none focus:border-blue-500"
                            />
                            
                            <textarea 
                                placeholder="Markdownで記事の内容を記述してください..."
                                value={editForm.content}
                                onChange={(e) => setEditForm({...editForm, content: e.target.value})}
                                className="w-full flex-1 bg-[#1e1e1e] border border-[#3c3c3c] rounded p-4 text-[#d4d4d4] font-mono text-sm resize-none focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    ) : (
                        /* Reader View */
                        <ErrorBoundary>
                        <div className="flex flex-col h-full p-8 max-w-4xl mx-auto w-full overflow-y-auto">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex-1">
                                    <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">{selectedArticle?.title}</h1>
                                    <div className="flex items-center gap-3 text-xs text-gray-400">
                                        <span>Author: {selectedArticle?.author_name || 'System'}</span>
                                        <span>•</span>
                                        <span>{new Date(selectedArticle?.updated_at || Date.now()).toLocaleString()}</span>
                                    </div>
                                    <div className="flex gap-2 mt-4 flex-wrap">
                                        {Array.isArray(selectedArticle?.tags) && selectedArticle.tags.map(tag => (
                                            <span key={tag} className="text-xs bg-[#2a2d2e] border border-[#3c3c3c] px-2 py-1 rounded-full text-blue-300 shadow-sm cursor-pointer hover:bg-[#333]" onClick={() => setSelectedTag(tag)}>
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2 ml-4">
                                    <button onClick={() => setIsEditing(true)} className="px-3 py-1.5 text-sm bg-[#37373d] hover:bg-[#4d4d54] text-white rounded shadow transition-colors">
                                        編集
                                    </button>
                                    <button onClick={handleDelete} className="px-3 py-1.5 text-sm bg-red-900/50 hover:bg-red-800 text-red-100 rounded border border-red-800/50 transition-colors">
                                        削除
                                    </button>
                                </div>
                            </div>
                            
                            <hr className="border-[#333] my-6" />
                            
                            <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed font-sans mt-2">
                                {renderMarkdownLinks(selectedArticle?.content)}
                            </div>
                        </div>
                        </ErrorBoundary>
                    )
                ) : (
                    /* Empty State */
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-[#333]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <p className="text-lg font-medium">ナレッジベース</p>
                        <p className="text-sm mt-2">左のリストから記事を選択するか、新しく作成してください。</p>
                        <button 
                            onClick={handleCreateNew}
                            className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-medium text-sm transition-colors shadow-lg"
                        >
                            新しい記事を作成
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KnowledgeBase;
