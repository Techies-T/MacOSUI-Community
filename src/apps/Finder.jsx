import React, { useState, useEffect } from 'react';

const Finder = ({ user, onOpen }) => {
    const [currentPath, setCurrentPath] = useState([{ id: 'root', name: 'Google Drive' }]);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [viewMode, setViewMode] = useState('icons'); // 'icons' or 'list'

    const currentFolder = currentPath[currentPath.length - 1];

    useEffect(() => {
        fetchFiles(currentFolder.id);
    }, [currentFolder]);

    const fetchFiles = async (folderId) => {
        setLoading(true);
        try {
            let res;
            // Google Drive
            const driveFolderId = folderId === 'root' ? 'root' : folderId;
            res = await fetch(`/api/drive/list?folderId=${driveFolderId}`);

            if (res && res.ok) {
                const data = await res.json();
                setFiles(data.files || []);
            } else {
                console.error("Failed to fetch files");
                setFiles([]);
            }
        } catch (error) {
            console.error("Error fetching files:", error);
            setFiles([]);
        } finally {
            setLoading(false);
        }
    };

    const handleNavigate = (folder) => {
        setCurrentPath([...currentPath, folder]);
    };

    const handleNavigateUp = () => {
        if (currentPath.length > 1) {
            setCurrentPath(currentPath.slice(0, -1));
        }
    };

    const handleBreadcrumbClick = (index) => {
        setCurrentPath(currentPath.slice(0, index + 1));
    };

    const handleFileClick = (file) => {
        setSelectedFile(file.id === selectedFile ? null : file.id);
    };

    const handleFileDoubleClick = (file) => {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
            handleNavigate({ id: file.id, name: file.name });
        } else {
            // Open file
            if (file.mimeType === 'text/html' || file.name.endsWith('.html')) {
                // Open in Browser
                if (onOpen) {
                    onOpen('editor-' + Date.now(), 'html-editor', 'HTML Editor', { fileId: file.id, fileName: file.name, folderId: file.parents?.[0] });
                }
            } else if (file.webViewLink) {
                window.open(file.webViewLink, '_blank');
            } else {
                alert(`Cannot open ${file.name}`);
            }
        }
    };

    return (
        <div className="flex h-full bg-white text-black font-sans text-sm select-none">
            {/* Sidebar */}
            <div className="w-48 flex-shrink-0 bg-[#f5f5f7]/80 backdrop-blur-xl border-r border-gray-200 pt-4 px-2 flex flex-col gap-1">
                <div className="px-2 mb-2 text-xs font-semibold text-gray-500">Favorites</div>
                <div className="px-2 mb-2 text-xs font-semibold text-gray-500">Favorites</div>
                <SidebarItem icon="🖥️" label="Desktop" />
                <SidebarItem icon="⬇️" label="Downloads" />
                <SidebarItem icon="📄" label="Documents" />

                <div className="px-2 mt-4 mb-2 text-xs font-semibold text-gray-500">Locations</div>
                <SidebarItem icon="☁️" label="iCloud Drive" />
                <SidebarItem icon="🔄" label="Google Drive" active />
                <SidebarItem icon="🗑️" label="Trash" />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-white">
                {/* Toolbar */}
                <div className="h-12 border-b border-gray-200 flex items-center px-4 gap-4 bg-[#f5f5f7]/50">
                    <div className="flex gap-1">
                        <button onClick={handleNavigateUp} disabled={currentPath.length <= 1} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                        <button className="p-1 rounded hover:bg-gray-200 disabled:opacity-30" disabled>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                    </div>

                    <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
                        {currentFolder.name}
                    </div>

                    <div className="flex-1"></div>

                    <div className="flex bg-gray-200 rounded-md p-0.5">
                        <button onClick={() => setViewMode('icons')} className={`p-1 rounded ${viewMode === 'icons' ? 'bg-white shadow-sm' : ''}`}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                        </button>
                        <button onClick={() => setViewMode('list')} className={`p-1 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                        </button>
                    </div>
                </div>

                {/* File Area */}
                <div className="flex-1 overflow-y-auto p-4" onClick={() => setSelectedFile(null)}>
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-gray-400">Loading...</div>
                    ) : (
                        <div className={viewMode === 'icons' ? "grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-4" : "flex flex-col"}>
                            {files.map(file => (
                                <FileItem
                                    key={file.id}
                                    file={file}
                                    selected={selectedFile === file.id}
                                    viewMode={viewMode}
                                    onClick={(e) => { e.stopPropagation(); handleFileClick(file); }}
                                    onDoubleClick={(e) => { e.stopPropagation(); handleFileDoubleClick(file); }}
                                />
                            ))}
                            {files.length === 0 && (
                                <div className="col-span-full text-center text-gray-400 mt-10">Empty Folder</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Status Bar */}
                <div className="h-6 border-t border-gray-200 bg-[#f5f5f7] flex items-center px-4 text-xs text-gray-500">
                    {files.length} items
                </div>
            </div>
        </div>
    );
};

const SidebarItem = ({ icon, label, active, onClick }) => (
    <div onClick={onClick} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${active ? 'bg-gray-300/50' : 'hover:bg-gray-200/50'}`}>
        <span className="text-lg">{icon}</span>
        <span className="truncate">{label}</span>
    </div>
);

const FileItem = ({ file, selected, viewMode, onClick, onDoubleClick }) => {
    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
    const icon = file.iconLink || (isFolder ? '📁' : '📄');

    if (viewMode === 'list') {
        return (
            <div
                className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${selected ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 odd:bg-gray-50/50'}`}
                onClick={onClick}
                onDoubleClick={onDoubleClick}
            >
                <img src={file.iconLink} alt="" className="w-4 h-4" onError={(e) => e.target.style.display = 'none'} />
                <span className="flex-1 truncate">{file.name}</span>
                <span className="text-xs opacity-70 w-32 truncate">{isFolder ? 'Folder' : 'File'}</span>
            </div>
        );
    }

    return (
        <div
            className={`flex flex-col items-center gap-1 p-2 rounded cursor-pointer ${selected ? 'bg-gray-200/80 ring-2 ring-gray-300' : 'hover:bg-gray-100'}`}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
        >
            <div className="w-16 h-16 flex items-center justify-center">
                {file.thumbnailLink ? (
                    <img src={file.thumbnailLink} alt="" className="max-w-full max-h-full object-contain rounded shadow-sm" />
                ) : (
                    <img src={file.iconLink} alt="" className="w-10 h-10" />
                )}
            </div>
            <span className={`text-xs text-center w-full break-words line-clamp-2 ${selected ? 'bg-blue-600 text-white rounded px-1' : ''}`}>
                {file.name}
            </span>
        </div>
    );
};

export default Finder;
