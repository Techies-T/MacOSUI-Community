import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

    // Vibe Modal State
    const [showVibeModal, setShowVibeModal] = useState(false);
    const [isAiSuccess, setIsAiSuccess] = useState(false);

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
                        setShowVibeModal(false);
                        setIsAiSuccess(true);
                        setTimeout(() => setIsAiSuccess(false), 2000);
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
        <div className="flex flex-col h-full bg-[#1e1e1e] text-white font-mono text-sm relative overflow-hidden">
            {/* Mac-style Toolbar */}
            <div className="h-12 flex items-center justify-between px-4 bg-[#2c2c2c]/90 backdrop-blur-xl border-b border-black/40 shadow-sm z-30 shrink-0 select-none">
                {/* Left: File Actions */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => openPicker('open')}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors group relative"
                        title="Open File"
                    >
                        <div className="text-xl opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all">📂</div>
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors group relative"
                        title="Save File"
                    >
                        <div className={`text-xl transition-all group-hover:scale-110 ${saving ? 'opacity-50 animate-pulse' : 'opacity-80 group-hover:opacity-100'}`}>
                            {saving ? '💾' : '💾'}
                        </div>
                    </button>

                    <div className="h-6 w-px bg-white/10 mx-1" />

                    <div className="flex flex-col justify-center">
                        <input
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="bg-transparent border-none text-xs font-semibold text-white/90 focus:text-white focus:outline-none w-40 truncate transition-colors placeholder-white/30"
                            placeholder="Untitled"
                        />
                        <button
                            onClick={() => openPicker('save')}
                            className="text-[10px] text-white/40 hover:text-white/70 text-left truncate max-w-[160px] transition-colors"
                        >
                            {selectedFolderName}
                        </button>
                    </div>
                </div>

                {/* Center: Vibe Trigger */}
                <button
                    onClick={() => setShowVibeModal(true)}
                    className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 hover:from-purple-500/20 hover:to-blue-500/20 border border-purple-500/20 hover:border-purple-500/40 transition-all group shadow-[0_0_15px_-5px_rgba(168,85,247,0.3)] hover:shadow-[0_0_20px_-5px_rgba(168,85,247,0.5)]"
                >
                    <span className="text-lg group-hover:rotate-12 transition-transform">✨</span>
                    <span className="text-purple-200/90 group-hover:text-purple-100 transition-colors text-xs font-medium tracking-wide">Vibe Coding</span>
                </button>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {/* Formatting Tools (Collapsed) */}
                    <div className="flex bg-black/20 rounded-lg p-0.5 border border-white/5 mr-2">
                        {['h1', 'b', 'i'].map(tag => (
                            <button
                                key={tag}
                                onClick={() => insertTag(tag)}
                                className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded text-[10px] font-bold text-white/50 hover:text-white transition-colors uppercase"
                            >
                                {tag}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleOpenInBrowser}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all border ${isLivePreviewEnabled
                                ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_-3px_rgba(74,222,128,0.2)]'
                                : 'bg-white/5 text-white/60 hover:text-white border-white/5 hover:bg-white/10'
                            }`}
                    >
                        {isLivePreviewEnabled ? 'LIVE' : 'PREVIEW'}
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex overflow-hidden relative">
                <motion.textarea
                    id="base-html-editor"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="flex-1 w-full h-full text-[#e0e0e0] p-8 resize-none focus:outline-none font-mono leading-7 text-sm relative z-10 no-drag selection:bg-purple-500/30"
                    spellCheck="false"
                    animate={{
                        backgroundColor: isAiSuccess ? 'rgba(76, 29, 149, 0.2)' : '#1e1e1e'
                    }}
                    transition={{ duration: 0.5 }}
                    style={{
                        fontFamily: '"SF Mono", "Menlo", "Consolas", "Monaco", monospace',
                        letterSpacing: '0.01em',
                        lineHeight: '1.6'
                    }}
                />

                {/* Vibe Modal Overlay */}
                <AnimatePresence>
                    {showVibeModal && (
                        <motion.div
                            className="absolute inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-[2px]"
                            onClick={() => setShowVibeModal(false)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <motion.div
                                className="w-[640px] bg-[#121212]/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10 relative group"
                                onClick={(e) => e.stopPropagation()}
                                initial={{ scale: 0.95, y: 20, opacity: 0 }}
                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                exit={{ scale: 0.95, y: 20, opacity: 0 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            >
                                {/* Liquid/Glass Gradient Background */}
                                <div className="absolute inset-x-0 top-0 h-[200px] bg-gradient-to-b from-purple-500/10 via-blue-500/5 to-transparent pointer-events-none" />
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-blue-500/5 opacity-50" />

                                <div className="relative p-5 flex flex-col gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0 animate-pulse">
                                            <span className="text-xl text-white">✨</span>
                                        </div>
                                        <div className="flex-1">
                                            <textarea
                                                id="vibe-modal-input"
                                                autoFocus
                                                placeholder="Describe the changes you want..."
                                                className="w-full bg-transparent border-none focus:ring-0 text-lg text-white placeholder-white/20 resize-none min-h-[48px] py-1 leading-relaxed font-light"
                                                value={aiPrompt}
                                                onChange={(e) => {
                                                    setAiPrompt(e.target.value);
                                                    e.target.style.height = 'auto';
                                                    e.target.style.height = e.target.scrollHeight + 'px';
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleAiEdit();
                                                    }
                                                    if (e.key === 'Escape') setShowVibeModal(false);
                                                }}
                                                style={{ maxHeight: '200px' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                        <div className="flex gap-2 text-[10px] text-white/30 font-medium uppercase tracking-wider">
                                            <span className="bg-white/5 px-2 py-1 rounded">Enter to Generate</span>
                                            <span className="bg-white/5 px-2 py-1 rounded">Esc to Cancel</span>
                                        </div>
                                        <button
                                            onClick={handleAiEdit}
                                            disabled={isAiProcessing || !aiPrompt.trim()}
                                            className={`px-6 py-2 rounded-xl text-sm font-bold text-white transition-all transform active:scale-95 flex items-center gap-2
                                            ${isAiProcessing
                                                    ? 'bg-white/5 cursor-not-allowed opacity-50'
                                                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-900/40 hover:shadow-purple-700/60'
                                                }`}
                                        >
                                            {isAiProcessing ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    <span>Thinking...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>Generate</span>
                                                    <span className="text-lg">✨</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {message && (
                                    <div className="px-5 py-2 bg-purple-900/20 border-t border-purple-500/20 text-purple-200 text-xs font-medium animate-in slide-in-from-top-1">
                                        {message}
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
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
