import React, { useState } from 'react';

const Notes = () => {
    const [text, setText] = useState('Welcome to Notes!\n\nThis is a simple notes app.');

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px', borderBottom: '1px solid #ddd', backgroundColor: '#f9f9f9', fontSize: '12px', color: '#888' }}>
                {new Date().toLocaleString()}
            </div>
            <textarea
                style={{
                    flex: 1,
                    border: 'none',
                    resize: 'none',
                    padding: '20px',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                    outline: 'none',
                    backgroundColor: '#fff',
                    color: '#333'
                }}
                value={text}
                onChange={(e) => setText(e.target.value)}
            />
        </div>
    );
};

export default Notes;
