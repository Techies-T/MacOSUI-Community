import React from 'react';

const Finder = () => {
    const sidebarItems = ['Recents', 'Applications', 'Desktop', 'Documents', 'Downloads'];
    const files = [
        { name: 'Project Proposal.docx', type: 'doc' },
        { name: 'Budget.xlsx', type: 'sheet' },
        { name: 'Vacation.jpg', type: 'image' },
        { name: 'Notes.txt', type: 'text' },
    ];

    return (
        <div style={{ height: '100%', display: 'flex' }}>
            <div style={{ width: '150px', backgroundColor: 'rgba(240, 240, 240, 0.9)', backdropFilter: 'blur(10px)', padding: '10px', borderRight: '1px solid #ddd' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#888', marginBottom: '5px' }}>Favorites</div>
                {sidebarItems.map(item => (
                    <div key={item} style={{ padding: '5px 10px', fontSize: '13px', color: '#333', cursor: 'pointer', borderRadius: '5px' }}>
                        {item}
                    </div>
                ))}
            </div>
            <div style={{ flex: 1, backgroundColor: '#fff', padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gridAutoRows: 'min-content', gap: '20px' }}>
                {files.map(file => (
                    <div key={file.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <div style={{ width: '50px', height: '60px', backgroundColor: '#eee', borderRadius: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px' }}>
                            📄
                        </div>
                        <div style={{ fontSize: '12px', textAlign: 'center', color: '#333', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {file.name}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Finder;
