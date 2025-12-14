import React, { useState, useEffect } from 'react';

const HtmlEditor = ({ onOpen, fileId: initialFileId, fileName: initialFileName, folderId: initialFolderId }) => {
    const [content, setContent] = useState('<!DOCTYPE html>\n<html>\n<head>\n<title>Page Title</title>\n</head>\n<body>\n\n<h1>This is a Heading</h1>\n<p>This is a paragraph.</p>\n\n</body>\n</html>');
    const [fileName, setFileName] = useState(initialFileName || 'untitled.html');
    const [fileId, setFileId] = useState(initialFileId || null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    // Folder selection
    const [selectedFolderId, setSelectedFolderId] = useState(initialFolderId || null);
    const [selectedFolderName, setSelectedFolderName] = useState('Root');
    const [showFolderPicker, setShowFolderPicker] = useState(false);
    const [items, setItems] = useState([]);
    const [currentPickerPath, setCurrentPickerPath] = useState([{ id: 'root', name: 'Root' }]);
    const [loadingFolders, setLoadingFolders] = useState(false);

    useEffect(() => {
        if (initialFileId) {
            loadFile(initialFileId);
        }
    }, [initialFileId]);

    const loadFile = async (id) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/drive/read?fileId=${id}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setContent(data.content);
                setFileId(id);
                if (initialFileName) setFileName(initialFileName);
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
                setMessage('Failed to load folders');
            }
        } catch (error) {
            console.error("Error loading folders:", error);
            setMessage(`Error: ${error.message}`);
        } finally {
            setLoadingFolders(false);
        }
    };

    const openFolderPicker = () => {
        setShowFolderPicker(true);
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
        setSelectedFolderId(folder.id);
        setSelectedFolderName(folder.name);
        setShowFolderPicker(false);
    };

    const selectCurrentFolder = () => {
        const current = currentPickerPath[currentPickerPath.length - 1];
        setSelectedFolderId(current.id);
        setSelectedFolderName(current.name);
        setShowFolderPicker(false);
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

    const handleOpenInBrowser = () => {
        if (!fileId) {
            setMessage('Please save the file first.');
            return;
        }
        if (onOpen) {
            onOpen('browser-' + Date.now(), 'browser', 'Safari', { driveFileId: fileId });
        }
    };

    if (loading) return <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-white">Loading...</div>;

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] text-white font-mono text-sm relative">
            {/* Toolbar */}
            <div className="flex items-center gap-2 p-2 bg-[#2d2d2d] border-b border-[#3e3e3e] flex-wrap">
                <input
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    className="bg-[#3e3e3e] border border-[#555] rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500 w-40"
                    placeholder="filename.html"
                />

                {/* Folder selector button */}
                <button
                    onClick={openFolderPicker}
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
                    className="px-3 py-1 bg-[#444] hover:bg-[#555] rounded text-white"
                >
                    Open in Browser
                </button>
                <span className="ml-auto text-xs text-gray-400">{message}</span>
            </div>

            {/* Editor Area */}
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 bg-[#1e1e1e] text-[#d4d4d4] p-4 resize-none focus:outline-none font-mono leading-relaxed"
                spellCheck="false"
            />

            {/* Folder Picker Modal */}
            {showFolderPicker && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[#2d2d2d] rounded-lg shadow-xl w-96 max-h-[80%] flex flex-col">
                        <div className="p-3 border-b border-[#3e3e3e] flex justify-between items-center">
                            <span className="font-bold">Select Folder</span>
                            <button
                                onClick={() => setShowFolderPicker(false)}
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

                        {/* Folder list */}
                        <div className="flex-1 overflow-auto p-2 min-h-[200px]">
                            {loadingFolders ? (
                                <div className="text-center text-gray-400 py-4">Loading...</div>
                            ) : items.length === 0 ? (
                                <div className="text-center text-gray-400 py-4">Empty folder</div>
                            ) : (
                                items.map(item => {
                                    const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
                                    return (
                                        <div
                                            key={item.id}
                                            className={`flex items-center gap-2 p-2 rounded ${isFolder ? 'hover:bg-[#3e3e3e] cursor-pointer' : 'opacity-70 cursor-default'} group`}
                                        >
                                            <span
                                                className="flex-1 flex items-center gap-2"
                                                onClick={() => isFolder && navigateToFolder(item)}
                                            >
                                                <span>{isFolder ? '📁' : '📄'}</span>
                                                {item.name}
                                            </span>
                                            {isFolder && (
                                                <button
                                                    onClick={() => selectFolder(item)}
                                                    className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded opacity-0 group-hover:opacity-100"
                                                >
                                                    Select
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
                                onClick={() => setShowFolderPicker(false)}
                                className="px-3 py-1 bg-[#444] hover:bg-[#555] rounded text-white text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={selectCurrentFolder}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm"
                            >
                                Use Current Folder
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HtmlEditor;
