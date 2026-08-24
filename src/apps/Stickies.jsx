import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { DraggableCore } from 'react-draggable';

const COLORS = [
    '#FFF8D6', // Yellow (Classic)
    '#E2F0CB', // Green
    '#FFDAC1', // Orange
    '#FFB7B2', // Red/Pink
    '#C7CEEA', // Purple/Blue
    '#E0E0E0', // Gray
];

const StickyNote = ({ note, onUpdate, onDelete, onFocus }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localContent, setLocalContent] = useState(note.content);
    const debounceTimer = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [isEditing]);

    const handleContentChange = (e) => {
        const val = e.target.value;
        setLocalContent(val);

        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            onUpdate(note.id, { content: val });
        }, 500);
    };

    const handleColorChange = (color) => {
        onUpdate(note.id, { color });
    };

    const renderContent = (text) => {
        if (!text) return null;

        // Regex to find URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);

        return parts.map((part, i) => {
            if (part.match(urlRegex)) {
                return (
                    <a
                        key={i}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#0066cc', textDecoration: 'underline', cursor: 'pointer' }}
                        onClick={(e) => e.stopPropagation()} // Prevent entering edit mode when clicking link
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    return (
        <div
            style={{
                position: 'absolute',
                left: note.x,
                top: note.y,
                width: note.width || 200,
                height: note.height || 200,
                backgroundColor: note.color || COLORS[0],
                boxShadow: '0 4px 6px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)',
                borderRadius: '2px',
                display: 'flex',
                flexDirection: 'column',
                zIndex: note.z_index || 1,
                transition: 'box-shadow 0.2s',
            }}
            onMouseDown={() => onFocus(note.id)}
            className="sticky-note"
        >
            {/* Header / Drag Handle */}
            <div
                className="sticky-header"
                style={{
                    height: '24px',
                    cursor: 'grab',
                    backgroundColor: 'rgba(0,0,0,0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0 5px',
                    opacity: 0, // Show on hover
                    transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
            >
                <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => onDelete(note.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
                    {COLORS.map(c => (
                        <div
                            key={c}
                            onClick={() => handleColorChange(c)}
                            style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: c, cursor: 'pointer', border: '1px solid rgba(0,0,0,0.1)' }}
                        />
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div
                style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
                onClick={() => setIsEditing(true)}
            >
                {isEditing ? (
                    <textarea
                        ref={textareaRef}
                        value={localContent}
                        onChange={handleContentChange}
                        onBlur={() => setIsEditing(false)}
                        style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            background: 'transparent',
                            resize: 'none',
                            padding: '10px',
                            fontSize: '16px',
                            fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif',
                            outline: 'none',
                            lineHeight: '1.4',
                            color: '#333',
                            boxSizing: 'border-box'
                        }}
                        placeholder="Take a note..."
                    />
                ) : (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        padding: '10px',
                        fontSize: '16px',
                        fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif',
                        lineHeight: '1.4',
                        color: '#333',
                        whiteSpace: 'pre-wrap', // Preserve newlines
                        overflowY: 'auto',
                        boxSizing: 'border-box',
                        cursor: 'text'
                    }}>
                        {renderContent(localContent) || <span style={{ color: '#999' }}>Take a note...</span>}
                    </div>
                )}
            </div>
        </div>
    );
};

const StickiesLayer = forwardRef((props, ref) => {
    const [notes, setNotes] = useState([]);

    useImperativeHandle(ref, () => ({
        addNote: async () => {
            const newNote = {
                id: crypto.randomUUID(),
                content: '',
                color: COLORS[0],
                x: 100 + (notes.length * 20) % 300,
                y: 100 + (notes.length * 20) % 300,
                width: 200,
                height: 200,
                zIndex: Math.max(...notes.map(n => n.z_index || 0), 0) + 1
            };

            // Optimistic update
            setNotes(prev => [...prev, newNote]);

            try {
                await fetch('/api/memos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newNote)
                });
            } catch (error) {
                console.error("Failed to create note", error);
            }
        }
    }));

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        try {
            const res = await fetch('/api/memos');
            if (res.ok) {
                const data = await res.json();
                setNotes(data);
            }
        } catch (error) {
            console.error("Failed to fetch notes", error);
        }
    };

    const updateNote = async (id, updates) => {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));

        // Find the note to get full object for API
        const note = notes.find(n => n.id === id);
        if (!note) return;

        const updatedNote = { ...note, ...updates };

        try {
            await fetch(`/api/memos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedNote)
            });
        } catch (error) {
            console.error("Failed to update note", error);
        }
    };

    const deleteNote = async (id) => {
        setNotes(prev => prev.filter(n => n.id !== id));
        try {
            await fetch(`/api/memos/${id}`, { method: 'DELETE' });
        } catch (error) {
            console.error("Failed to delete note", error);
        }
    };

    const bringToFront = (id) => {
        const maxZ = Math.max(...notes.map(n => n.z_index || 0), 0);
        updateNote(id, { zIndex: maxZ + 1 });
    };

    // Note: Since this "Stickies" app runs inside a Window,
    // we are simulating a "desktop" for notes inside that window.
    // Real MacOS Stickies float on the actual desktop, but here we contain them.

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none', // Allow clicks to pass through to desktop/windows
            zIndex: 1 // Low z-index so windows (usually 10+) are above
        }}>
            {notes.map(note => (
                <DraggableNoteWrapper
                    key={note.id}
                    note={note}
                    onUpdate={updateNote}
                    onDelete={deleteNote}
                    onFocus={bringToFront}
                />
            ))}
        </div>
    );
});

// Wrapper to handle dragging logic
const DraggableNoteWrapper = ({ note, onUpdate, onDelete, onFocus }) => {
    // We use a simple mouse event handler for dragging since react-draggable might conflict
    // or we want custom behavior. For simplicity in this "app-in-window", let's use absolute positioning
    // and manual drag handling or just simple HTML5 drag?
    // Let's implement a simple custom drag handler.

    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        // Only drag from header area (invisible but top 20px)
        if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;

        setIsDragging(true);
        dragOffset.current = {
            x: e.clientX - note.x,
            y: e.clientY - note.y
        };
        onFocus(note.id);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const newX = e.clientX - dragOffset.current.x;
        const newY = e.clientY - dragOffset.current.y;

        // Update local state immediately for smoothness?
        // Or just update parent? Parent update might be slow.
        // For now, update parent directly (might need optimization).
        onUpdate(note.id, { x: newX, y: newY });
    };

    const handleMouseUp = () => {
        if (isDragging) {
            setIsDragging(false);
            // Final save is handled by onUpdate calling API
        }
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    return (
        <div
            onMouseDown={handleMouseDown}
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 0,
                height: 0,
                pointerEvents: 'auto' // Re-enable pointer events for the note itself
            }}
        >
            <StickyNote
                note={note}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onFocus={onFocus}
            />
        </div>
    );
};

export default StickiesLayer;
