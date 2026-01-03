import React, { useState, useEffect, useRef } from 'react';

const HtmlEditor = ({ onOpen, fileId: initialFileId, fileName: initialFileName, folderId: initialFolderId }) => {
    const [content, setContent] = useState('<!DOCTYPE html>\n<html>\n<head>\n<title>Page Title</title>\n</head>\n<body>\n\n<h1>This is a Heading</h1>\n<p>This is a paragraph.</p>\n\n</body>\n</html>');
    const [fileName, setFileName] = useState(initialFileName || 'untitled.html');
    const [fileId, setFileId] = useState(initialFileId || null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const [selectedFolderId, setSelectedFolderId] = useState(initialFolderId || null);
    const [selectedFolderName, setSelectedFolderName] = useState('Root');
    // Picker state
    const [showPicker, setShowPicker] = useState(false);
    const [pickerMode, setPickerMode] = useState('save'); // 'save' or 'open'
    const [items, setItems] = useState([]);
    const [currentPickerPath, setCurrentPickerPath] = useState([{ id: 'root', name: 'Root' }]);
    const [loadingFolders, setLoadingFolders] = useState(false);
    const [isSavingInProgress, setIsSavingInProgress] = useState(false);

    useEffect(() => {
        if (initialFileId) {
            loadFile(initialFileId, initialFileName);
        }
    }, [initialFileId]);

    const loadFile = async (id, name = null) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/drive/read?fileId=${id}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setContent(data.content);
                setFileId(id);
                if (name) setFileName(name);
                else if (initialFileName) setFileName(initialFileName);
                setMessage('File loaded successfully');
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage('Failed to load file.');
            }
        } catch (error) {
            console.error("Load error:", error);
            setMessage('Error loading file.');
        } finally {
            setLoading(false);
        }
    };

    const loadFolders = async (folderId) => {
        setLoadingFolders(true);
        try {
            console.log(`Loading folder: ${folderId}`);
            const res = await fetch(`/api/drive/list?folderId=${folderId || 'root'}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                console.log("Loaded items:", data.files);
                setItems(data.files || []);
            } else {
                setMessage('Failed to load path');
            }
        } catch (error) {
            console.error("Error loading path:", error);
            setMessage(`Error: ${error.message}`);
        } finally {
            setLoadingFolders(false);
        }
    };

    const openPicker = (mode) => {
        setPickerMode(mode);
        setShowPicker(true);
        setCurrentPickerPath([{ id: 'root', name: 'Root' }]);
        loadFolders('root');
    };

    const navigateToFolder = (folder) => {
        setCurrentPickerPath(prev => [...prev, { id: folder.id, name: folder.name }]);
        loadFolders(folder.id);
    };

    const navigateToPathIndex = (index) => {
        const newPath = currentPickerPath.slice(0, index + 1);
        setCurrentPickerPath(newPath);
        loadFolders(newPath[newPath.length - 1].id);
    };

    const selectFolder = (folder) => {
        if (pickerMode === 'save') {
            setSelectedFolderId(folder.id);
            setSelectedFolderName(folder.name);
            setShowPicker(false);

            if (isSavingInProgress) {
                performSave(folder.id);
                setIsSavingInProgress(false);
            }
        }
    };

    const selectFile = (file) => {
        if (pickerMode === 'open') {
            loadFile(file.id, file.name);
            setShowPicker(false);
        }
    };

    const selectCurrentFolder = () => {
        if (pickerMode === 'save') {
            const current = currentPickerPath[currentPickerPath.length - 1];
            setSelectedFolderId(current.id);
            setSelectedFolderName(current.name);
            setShowPicker(false);

            if (isSavingInProgress) {
                performSave(current.id);
                setIsSavingInProgress(false);
            }
        }
    };

    const performSave = async (folderIdToUse = null) => {
        setSaving(true);
        setMessage('Saving...');
        try {
            const res = await fetch('/api/drive/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    name: fileName,
                    content,
                    mimeType: 'text/html',
                    folderId: folderIdToUse || selectedFolderId || 'root',
                    fileId: fileId
                })
            });

            if (res.ok) {
                const data = await res.json();
                setFileId(data.id);
                setMessage('Saved successfully!');
                setTimeout(() => setMessage(''), 3000);
            } else {
                const err = await res.json();
                setMessage(`Save failed: ${err.error}`);
            }
        } catch (error) {
            console.error("Save error:", error);
            setMessage('Error saving file.');
        } finally {
            setSaving(false);
        }
    };

    const handleSave = () => {
        if (!fileId && !isSavingInProgress) {
            // New file: ask for folder first
            setIsSavingInProgress(true);
            openPicker('save');
            setMessage('Please select a folder to save to');
        } else {
            // Existing file: update directly
            performSave();
        }
    };

    // Live Preview Logic
    const previewWindowId = useRef('editor-preview-' + Date.now());
    const [isLivePreviewEnabled, setIsLivePreviewEnabled] = useState(false);

    useEffect(() => {
        if (isLivePreviewEnabled && onOpen) {
            const timer = setTimeout(() => {
                onOpen(previewWindowId.current, 'browser', 'Live Preview', { liveContent: content });
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [content, isLivePreviewEnabled, onOpen]);

    const handleOpenInBrowser = () => {
        setIsLivePreviewEnabled(true);
        if (onOpen) {
            onOpen(previewWindowId.current, 'browser', 'Live Preview', { liveContent: content });
        }
    };

    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiProcessing, setIsAiProcessing] = useState(false);

    const handleAiEdit = async () => {
        if (!aiPrompt) return;
        setIsAiProcessing(true);
        setMessage('AI is thinking...');
        try {
            const res = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `Please update the following HTML code based on this request: "${aiPrompt}". \n\nExisting Code:\n\`\`\`html\n${content}\n\`\`\`\n\nReturn ONLY the updated HTML code, no explanations or markdown blocks.`,
                    config: { mode: 'chat' }
                })
            });

            if (res.ok) {
                const { jobId } = await res.json();
                // Poll for result
                const poll = setInterval(async () => {
                    const statusRes = await fetch(`/api/gemini/job/${jobId}`);
                    const status = await statusRes.json();
                    if (status.state === 'completed') {
                        clearInterval(poll);
                        let updatedCode = status.reply;
                        // Strip markdown blocks if AI included them despite instructions
                        updatedCode = updatedCode.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
                        setContent(updatedCode);
                        setMessage('AI update applied!');
                        setAiPrompt('');
                        setIsAiProcessing(false);
                        setTimeout(() => setMessage(''), 3000);
                    } else if (status.state === 'error') {
                        clearInterval(poll);
                        setMessage('AI error: ' + status.error);
                        setIsAiProcessing(false);
                    }
                }, 1000);
            } else {
                setMessage('AI request failed.');
                setIsAiProcessing(false);
            }
        } catch (error) {
            console.error("AI Edit error:", error);
            setMessage('AI connection error.');
            setIsAiProcessing(false);
        }
    };

    const insertTag = (tag, endTag = null) => {
        const textarea = document.getElementById('base-html-editor');
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const after = text.substring(end);
        const selected = text.substring(start, end);

        const open = `<${tag}>`;
        const close = endTag ? `</${endTag}>` : `</${tag}>`;

        const newContent = before + open + selected + close + after;
        setContent(newContent);

        // Restore focus and selection
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + open.length, end + open.length);
        }, 0);
    };

    if (loading) return <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-white">Loading...</div>;

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] text-white font-mono text-sm relative">
            {/* Main Toolbar - Glassmorphic Redesign */}
            <div className="flex items-center gap-3 p-2 bg-black/40 backdrop-blur-xl border-b border-white/5 shadow-lg z-20 sticky top-0">
                {/* File Controls Group */}
                <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
                    <button
                        onClick={() => openPicker('open')}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-md text-white/80 hover:text-white transition-all group"
                        title="Open File"
                    >
                        <span className="text-base group-hover:scale-110 transition-transform opacity-70">📂</span>
                        <span className="text-[10px] font-bold tracking-wider opacity-40 group-hover:opacity-100 uppercase">Open</span>
                    </button>

                    <div className="w-px h-6 bg-white/10 mx-1" />

                    <input
                        type="text"
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="bg-transparent border-none text-sm font-medium text-white/90 focus:outline-none focus:text-white w-32 px-2 placeholder-white/30 truncate no-drag"
                        placeholder="Untitled"
                    />

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-md text-white/80 hover:text-white transition-all disabled:opacity-50 group"
                        title={saving ? 'Saving...' : 'Save'}
                    >
                        <span className="text-base group-hover:scale-110 transition-transform text-blue-400">{saving ? '💾...' : '💾'}</span>
                        <span className="text-[10px] font-bold tracking-wider opacity-60 group-hover:opacity-100 uppercase">{saving ? 'Save' : 'Save'}</span>
                    </button>

                    <button
                        onClick={() => openPicker('save')}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-md text-white/80 hover:text-white transition-all group"
                        title={`Current Folder: ${selectedFolderName}`}
                    >
                        <span className="text-base group-hover:scale-110 transition-transform opacity-70">📁</span>
                        <span className="text-[10px] font-bold tracking-wider opacity-40 group-hover:opacity-100 max-w-[80px] truncate">{selectedFolderName.toUpperCase()}</span>
                    </button>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleOpenInBrowser}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm border border-transparent ${isLivePreviewEnabled
                            ? 'bg-green-500/20 text-green-300 border-green-500/30'
                            : 'bg-white/5 hover:bg-white/10 text-white/70 border-white/5'
                            }`}
                    >
                        {isLivePreviewEnabled ? '● Live' : 'Preview'}
                    </button>
                </div>
            </div>

            {/* Vibe Coding "Magic Bar" - Prominent Redesign */}
            <div
                className="flex flex-col gap-2 p-3 bg-gradient-to-r from-purple-900/20 to-blue-900/20 backdrop-blur-md border-b border-white/5 relative group transition-all"
                onClick={() => {
                    const textarea = document.getElementById('vibe-prompt-input');
                    if (textarea) textarea.focus();
                }}
            >
                {/* Subtle Glow Background */}
                <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />

                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/30 text-lg shadow-[0_0_15px_rgba(168,85,247,0.2)] animate-pulse">
                        ✨
                    </div>

                    <div className="flex-1 relative">
                        <textarea
                            id="vibe-prompt-input"
                            rows="1"
                            value={aiPrompt}
                            onChange={(e) => {
                                setAiPrompt(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                    e.preventDefault();
                                    handleAiEdit();
                                }
                                e.stopPropagation();
                            }}
                            placeholder="Describe your Vibe... (e.g., 'Make a dark mode dashboard with pink glass buttons')"
                            className="w-full bg-transparent border-none py-1.5 text-base text-white placeholder-white/20 focus:outline-none no-drag font-medium resize-none overflow-hidden"
                            style={{ minHeight: '24px', maxHeight: '120px' }}
                            disabled={isAiProcessing}
                        />
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); handleAiEdit(); }}
                        disabled={isAiProcessing || !aiPrompt.trim()}
                        className={`
                            flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all no-drag
                            ${isAiProcessing
                                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                                : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 active:scale-95'}
                        `}
                    >
                        {isAiProcessing ? (
                            <>
                                <span className="animate-spin text-lg">🌀</span>
                                <span>THINKING...</span>
                            </>
                        ) : (
                            <>
                                <span className="text-lg">✨</span>
                                <span>GENERATE</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Formatting Toolbar - Integrated into Main or separate glass strip? Keeping separate but cleaner */}
            <div className="flex items-center gap-1 px-4 py-1.5 bg-black/20 border-b border-white/5 backdrop-blur-md overflow-x-auto">
                <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10">
                    {['h1', 'h2', 'p', 'b', 'i', 'u'].map(tag => (
                        <button
                            key={tag}
                            onClick={() => insertTag(tag)}
                            className="px-2.5 py-0.5 hover:bg-white/10 rounded text-[10px] font-medium uppercase text-white/70 hover:text-white transition-colors"
                        >
                            {tag}
                        </button>
                    ))}
                </div>
                <div className="w-[1px] h-3 bg-white/10 mx-2" />
                <div className="flex gap-1">
                    <button onClick={() => insertTag('a href="#"', 'a')} className="px-2 py-0.5 hover:bg-white/10 rounded text-[10px] text-blue-300 hover:text-blue-200">Link</button>
                    <button onClick={() => insertTag('img src="https://placehold.jp/150x150.png"', 'img')} className="px-2 py-0.5 hover:bg-white/10 rounded text-[10px] text-green-300 hover:text-green-200">Img</button>
                </div>

                {/* Status Message moved here */}
                <div className="flex-1 text-right">
                    <span className="text-[10px] text-white/40 tracking-wide font-medium">{message}</span>
                </div>
            </div>

            {/* Editor Area */}
            {/* Editor Area */}
            <div className="flex-1 flex overflow-hidden relative">
                <div className="absolute inset-0 bg-[#1e1e1e]" /> {/* Background */}
                <textarea
                    id="base-html-editor"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()} // Prevent bubbling
                    className="flex-1 w-full h-full bg-transparent text-[#d4d4d4] p-6 resize-none focus:outline-none font-mono leading-7 text-sm relative z-10 no-drag"
                    spellCheck="false"
                    style={{
                        fontFamily: '"Menlo", "Consolas", "Monaco", monospace',
                        letterSpacing: '0.5px'
                    }}
                />
            </div>

            {/* File/Folder Picker Modal - Spotlight Style */}
            {
                showPicker && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[10vh] z-50">
                        <div className="bg-[#1e1e1e]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl w-[600px] max-h-[70vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            {/* Header */}
                            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                                <span className="font-semibold text-lg text-white tracking-tight">{pickerMode === 'open' ? 'Open File' : 'Select Destination'}</span>
                                <button
                                    onClick={() => setShowPicker(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/50 hover:text-white transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Breadcrumb - Clean pill style */}
                            <div className="px-4 py-3 bg-black/20 text-xs flex gap-2 flex-wrap items-center">
                                <span className="text-white/40 font-medium">Location:</span>
                                {currentPickerPath.map((item, index) => (
                                    <React.Fragment key={item.id}>
                                        {index > 0 && <span className="text-white/20">/</span>}
                                        <button
                                            onClick={() => navigateToPathIndex(index)}
                                            className="hover:text-blue-400 hover:underline transition-all font-medium text-white/80"
                                        >
                                            {item.name}
                                        </button>
                                    </React.Fragment>
                                ))}
                            </div>

                            {/* Item list */}
                            <div className="flex-1 overflow-auto p-2 min-h-[300px]">
                                {loadingFolders ? (
                                    <div className="flex flex-col items-center justify-center h-full text-white/40 gap-2">
                                        <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
                                        <span>Loading...</span>
                                    </div>
                                ) : items.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-white/30 gap-2">
                                        <span className="text-2xl">📂</span>
                                        <span>Folder is empty</span>
                                    </div>
                                ) : (
                                    items.map(item => {
                                        const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
                                        const isHtml = item.mimeType === 'text/html' || item.name.endsWith('.html');

                                        if (pickerMode === 'open' && !isFolder && !isHtml) return null;

                                        return (
                                            <div
                                                key={item.id}
                                                className={`flex items-center gap-3 p-3 mx-2 rounded-xl transition-all group ${isFolder ? 'cursor-pointer hover:bg-white/5' : (pickerMode === 'open' ? 'cursor-pointer hover:bg-white/5' : 'opacity-40 cursor-default')}`}
                                                onClick={() => isFolder ? navigateToFolder(item) : (pickerMode === 'open' && selectFile(item))}
                                            >
                                                <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-lg text-xl shadow-inner group-hover:scale-105 transition-transform">
                                                    {isFolder ? '📁' : '📄'}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-white/90 truncate">{item.name}</div>
                                                    <div className="text-xs text-white/40 truncate">{isFolder ? 'Folder' : 'HTML Document'}</div>
                                                </div>

                                                {isFolder && pickerMode === 'save' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            selectFolder(item);
                                                        }}
                                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg shadow-blue-900/20"
                                                    >
                                                        Select
                                                    </button>
                                                )}
                                                {!isFolder && pickerMode === 'open' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            selectFile(item);
                                                        }}
                                                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        Open
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            {/* Actions */}
                            <div className="p-4 border-t border-white/5 flex justify-end gap-3 bg-black/20">
                                <button
                                    onClick={() => setShowPicker(false)}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/80 text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                {pickerMode === 'save' && (
                                    <button
                                        onClick={selectCurrentFolder}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white text-sm font-medium shadow-lg shadow-blue-900/30 transition-all hover:scale-105 active:scale-95"
                                    >
                                        Use This Folder
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default React.memo(HtmlEditor);
