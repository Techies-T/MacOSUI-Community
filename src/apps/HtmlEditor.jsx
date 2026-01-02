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
        }
    };

    const handleSave = async () => {
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
                    folderId: selectedFolderId || 'root',
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
            {/* Main Toolbar */}
            <div className="flex items-center gap-2 p-2 bg-[#2d2d2d] border-b border-[#3e3e3e] flex-wrap">
                <button
                    onClick={() => openPicker('open')}
                    className="px-3 py-1 bg-[#444] hover:bg-[#555] rounded text-white flex items-center gap-1"
                    title="Open HTML file"
                >
                    📂 Open
                </button>

                <div className="w-[1px] h-4 bg-[#444] mx-1" />

                <input
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="bg-[#3e3e3e] border border-[#555] rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500 w-40 no-drag"
                    placeholder="filename.html"
                />

                <button
                    onClick={() => openPicker('save')}
                    className="px-3 py-1 bg-[#444] hover:bg-[#555] rounded text-white text-xs flex items-center gap-1"
                    title="Select save folder"
                >
                    📁 {selectedFolderName}
                </button>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save'}
                </button>

                <button
                    onClick={handleOpenInBrowser}
                    className={`px-3 py-1 rounded text-white transition-colors ${isLivePreviewEnabled ? 'bg-green-600 hover:bg-green-500' : 'bg-[#444] hover:bg-[#555]'}`}
                >
                    {isLivePreviewEnabled ? 'Live Preview ON' : 'Live Preview'}
                </button>

                <div className="w-[1px] h-4 bg-[#444] mx-1" />

                {/* Vibe Coding Input */}
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <input
                        type="text"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleAiEdit();
                            e.stopPropagation(); // Prevent bubbling to draggable containers
                        }}
                        placeholder="Vibe Coding: e.g. 'Make it look premium'"
                        className="flex-1 bg-white/10 border border-white/20 rounded px-3 py-1 focus:outline-none focus:border-blue-500 no-drag"
                        disabled={isAiProcessing}
                    />
                    <button
                        onClick={handleAiEdit}
                        disabled={isAiProcessing || !aiPrompt}
                        className="bg-purple-600 hover:bg-purple-500 px-3 py-1 rounded text-white disabled:opacity-50 flex items-center gap-1 no-drag"
                    >
                        {isAiProcessing ? '🪄...' : '🪄 Vibe'}
                    </button>
                </div>

                <span className="text-xs text-gray-400">{message}</span>
            </div>

            {/* Formatting Toolbar */}
            <div className="flex items-center gap-1 p-1 bg-[#1e1e1e] border-b border-[#333] px-4">
                <button onClick={() => insertTag('h1')} className="px-2 py-1 hover:bg-[#333] rounded text-xs">H1</button>
                <button onClick={() => insertTag('h2')} className="px-2 py-1 hover:bg-[#333] rounded text-xs">H2</button>
                <button onClick={() => insertTag('b')} className="px-2 py-1 hover:bg-[#333] font-bold rounded text-xs">B</button>
                <button onClick={() => insertTag('i')} className="px-2 py-1 hover:bg-[#333] italic rounded text-xs">I</button>
                <button onClick={() => insertTag('u')} className="px-2 py-1 hover:bg-[#333] underline rounded text-xs">U</button>
                <button onClick={() => insertTag('p')} className="px-2 py-1 hover:bg-[#333] rounded text-xs">P</button>
                <button onClick={() => insertTag('a href="#"', 'a')} className="px-2 py-1 hover:bg-[#333] rounded text-xs text-blue-400">Link</button>
                <button onClick={() => insertTag('img src="https://placehold.jp/150x150.png"', 'img')} className="px-2 py-1 hover:bg-[#333] rounded text-xs">Img</button>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex overflow-hidden">
                <textarea
                    id="base-html-editor"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()} // Prevent bubbling
                    className="flex-1 bg-[#1e1e1e] text-[#d4d4d4] p-4 resize-none focus:outline-none font-mono leading-relaxed no-drag"
                    spellCheck="false"
                />
            </div>

            {/* File/Folder Picker Modal */}
            {showPicker && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[#2d2d2d] rounded-lg shadow-xl w-96 max-h-[80%] flex flex-col">
                        <div className="p-3 border-b border-[#3e3e3e] flex justify-between items-center">
                            <span className="font-bold">{pickerMode === 'open' ? 'Open File' : 'Select Folder'}</span>
                            <button
                                onClick={() => setShowPicker(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Breadcrumb */}
                        <div className="p-2 bg-[#252525] text-xs flex gap-1 flex-wrap">
                            {currentPickerPath.map((item, index) => (
                                <span key={item.id} className="flex items-center">
                                    {index > 0 && <span className="mx-1 text-gray-500">/</span>}
                                    <button
                                        onClick={() => navigateToPathIndex(index)}
                                        className="hover:text-blue-400"
                                    >
                                        {item.name}
                                    </button>
                                </span>
                            ))}
                        </div>

                        {/* Item list */}
                        <div className="flex-1 overflow-auto p-2 min-h-[200px]">
                            {loadingFolders ? (
                                <div className="text-center text-gray-400 py-4">Loading...</div>
                            ) : items.length === 0 ? (
                                <div className="text-center text-gray-400 py-4">Empty folder</div>
                            ) : (
                                items.map(item => {
                                    const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
                                    const isHtml = item.mimeType === 'text/html' || item.name.endsWith('.html');

                                    if (pickerMode === 'open' && !isFolder && !isHtml) return null;

                                    return (
                                        <div
                                            key={item.id}
                                            className={`flex items-center gap-2 p-2 rounded hover:bg-[#3e3e3e] group ${isFolder ? 'cursor-pointer' : (pickerMode === 'open' ? 'cursor-pointer' : 'opacity-50 cursor-default')}`}
                                        >
                                            <span
                                                className="flex-1 flex items-center gap-2"
                                                onClick={() => isFolder ? navigateToFolder(item) : (pickerMode === 'open' && selectFile(item))}
                                            >
                                                <span>{isFolder ? '📁' : '📄'}</span>
                                                {item.name}
                                            </span>
                                            {isFolder && pickerMode === 'save' && (
                                                <button
                                                    onClick={() => selectFolder(item)}
                                                    className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded opacity-0 group-hover:opacity-100"
                                                >
                                                    Select
                                                </button>
                                            )}
                                            {!isFolder && pickerMode === 'open' && (
                                                <button
                                                    onClick={() => selectFile(item)}
                                                    className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded opacity-0 group-hover:opacity-100"
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
                        <div className="p-3 border-t border-[#3e3e3e] flex justify-end gap-2">
                            <button
                                onClick={() => setShowPicker(false)}
                                className="px-3 py-1 bg-[#444] hover:bg-[#555] rounded text-white text-sm"
                            >
                                Cancel
                            </button>
                            {pickerMode === 'save' && (
                                <button
                                    onClick={selectCurrentFolder}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm"
                                >
                                    Use Current Folder
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(HtmlEditor);
