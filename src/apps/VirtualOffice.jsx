import React, { useState, useEffect } from 'react';

// デフォルトのランダムアバター割り当て用シードリスト
const DEFAULT_AVATAR_SEEDS = ['Oliver', 'Jake', 'Charlie', 'Luna', 'Bella', 'Milo', 'Coco', 'Cookie'];

const VirtualOffice = ({ onOpen, user }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [myStatus, setMyStatus] = useState({ room: 'open-space', text: 'Active' });
    const [generatingAvatarId, setGeneratingAvatarId] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        loadUsers(true);

        const timer = setInterval(() => {
            loadUsers(false);
        }, 3000);

        return () => clearInterval(timer);
    }, [user?.id]);

    const loadUsers = async (isFirst = false) => {
        try {
            if (isFirst) setLoading(true);
            const res = await fetch('/api/virtual-office/users');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load users');
            
            // アバター未設定ユーザーに対するランダムアバターの割り当て
            const processedUsers = data.map((u, idx) => {
                let avatarUrl = u.avatar_url;
                let isPlaceholder = false;
                if (!avatarUrl) {
                    const seed = DEFAULT_AVATAR_SEEDS[idx % DEFAULT_AVATAR_SEEDS.length];
                    avatarUrl = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`;
                    isPlaceholder = true;
                }
                
                // 実写写真かどうかの判定 (GoogleフォトのURLなど)
                const isPhoto = avatarUrl.includes('googleusercontent.com') || 
                                avatarUrl.includes('lh3.google') ||
                                (avatarUrl.startsWith('http') && !avatarUrl.includes('dicebear.com'));
                return {
                    ...u,
                    avatar_url: avatarUrl,
                    is_placeholder_avatar: isPlaceholder,
                    is_photo_avatar: isPhoto
                };
            });

            setUsers(processedUsers);

            // 自分の最新ステータスを myStatus に同期
            if (user) {
                const meInDb = processedUsers.find(u => u.id === user.id);
                if (meInDb) {
                    setMyStatus({
                        room: meInDb.current_room || 'open-space',
                        text: meInDb.status_text || 'Active'
                    });
                }
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            if (isFirst) setLoading(false);
        }
    };

    // AIアバター生成アクション (写真からドット絵アバターを作成)
    const handleGenerateAvatar = async (userId) => {
        try {
            setGeneratingAvatarId(userId);
            const res = await fetch('/api/virtual-office/generate-avatar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to generate avatar');
            
            // ユーザー一覧の状態を即座に更新
            setUsers(prev => prev.map(u => {
                if (u.id === userId) {
                    return {
                        ...u,
                        avatar_url: data.avatar_url,
                        is_photo_avatar: false,
                        is_placeholder_avatar: false
                    };
                }
                return u;
            }));

            if (selectedUser && selectedUser.id === userId) {
                setSelectedUser(prev => ({
                    ...prev,
                    avatar_url: data.avatar_url,
                    is_photo_avatar: false,
                    is_placeholder_avatar: false
                }));
            }

            alert('AIアバターの生成が完了しました！');
        } catch (err) {
            alert(err.message);
        } finally {
            setGeneratingAvatarId(null);
        }
    };

    // 自分のステータス（位置・状態テキスト）の更新
    const handleUpdateMyStatus = async (room, text) => {
        // 即座にUIに反映（楽観的更新）
        setMyStatus({ room, text });
        setUsers(prev => prev.map(u => {
            const isMe = u.id === user?.id;
            if (isMe) {
                return {
                    ...u,
                    current_room: room,
                    status_text: text,
                    is_remote: room === 'remote' ? 1 : 0
                };
            }
            return u;
        }));

        try {
            const res = await fetch('/api/virtual-office/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    current_room: room,
                    status_text: text,
                    is_remote: room === 'remote' ? 1 : 0
                })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update status');
            }
        } catch (err) {
            console.error('Status update failed:', err);
            setError(err.message);
        }
    };

    // 部屋（エリア）の定義
    const ROOMS = {
        'open-space': { name: '🌳 Open Space', desc: '会話自由・カジュアルな相談向け', color: 'border-emerald-500/30 bg-emerald-500/5' },
        'meeting-room-a': { name: '💬 Meeting Room A', desc: '進行中のミーティングスペース', color: 'border-indigo-500/30 bg-indigo-500/5' },
        'meeting-room-b': { name: '🎥 Meeting Room B', desc: 'クライアントやチーム間での対話', color: 'border-violet-500/30 bg-violet-500/5' },
        'focus-zone': { name: '🤫 Focus Zone', desc: '集中作業中（緊急時のみチャット推奨）', color: 'border-amber-500/30 bg-amber-500/5' },
        'remote': { name: '🏡 Remote (自宅勤務)', desc: '自宅からログイン中のメンバー', color: 'border-cyan-500/30 bg-cyan-500/5' }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 bg-[#0b0f19] text-gray-400">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mb-4"></div>
                <p className="text-sm font-medium">バーチャルオフィス空間をロード中...</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-[#0b0f19] text-[#e2e8f0] overflow-hidden font-sans select-none">
            {/* Control Bar */}
            <div className="flex justify-between items-center px-6 py-4 bg-[#111827]/80 border-b border-gray-800 backdrop-blur-md">
                <div className="flex items-center space-x-3">
                    <span className="text-2xl">🏢</span>
                    <div>
                        <h2 className="text-sm font-bold text-gray-100">Virtual Workspace</h2>
                        <p className="text-[10px] text-gray-500">メンバーのリアルタイムな所在と出社ステータス</p>
                    </div>
                </div>

                {/* My Status Trigger */}
                <div className="flex items-center space-x-3 bg-gray-900/60 p-2 rounded-xl border border-gray-800">
                    <span className="text-xs font-semibold text-gray-400">My Status:</span>
                    <select
                        value={myStatus.room}
                        onChange={(e) => handleUpdateMyStatus(e.target.value, e.target.value === 'focus-zone' ? 'Busy' : (e.target.value === 'remote' ? 'Home Office' : 'Active'))}
                        className="bg-gray-800 border border-gray-700 text-xs rounded-lg px-2 py-1 text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                        <option value="open-space">🌳 オープンスペース</option>
                        <option value="meeting-room-a">💬 会議室 A</option>
                        <option value="meeting-room-b">🎥 会議室 B</option>
                        <option value="focus-zone">🤫 集中ゾーン</option>
                        <option value="remote">🏡 自宅 (リモート)</option>
                    </select>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Side: Office Map */}
                <div className="flex-1 p-6 overflow-y-auto space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Map Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(ROOMS).map(([roomId, roomInfo]) => {
                            const roomUsers = users.filter(u => u.current_room === roomId);
                            
                            return (
                                <div 
                                    key={roomId}
                                    onClick={() => handleUpdateMyStatus(roomId, roomId === 'focus-zone' ? 'Busy' : (roomId === 'remote' ? 'Home Office' : 'Active'))}
                                    className={`p-5 rounded-2xl border ${roomInfo.color} cursor-pointer hover:border-indigo-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5 relative overflow-hidden`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-sm text-gray-200">{roomInfo.name}</h3>
                                            <p className="text-[10px] text-gray-500 mt-0.5">{roomInfo.desc}</p>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full bg-gray-900/40 text-gray-400 text-[10px] border border-gray-800">
                                            {roomUsers.length}名
                                        </span>
                                    </div>

                                    {/* User Avatars in Room */}
                                    <div className="flex flex-wrap gap-4 pt-2">
                                        {roomUsers.length === 0 ? (
                                            <div className="text-[11px] text-gray-600 italic py-2">誰もいません</div>
                                        ) : (
                                            roomUsers.map(u => (
                                                <div 
                                                    key={u.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedUser(u);
                                                    }}
                                                    className="group flex flex-col items-center space-y-1.5 cursor-pointer relative"
                                                >
                                                    {/* Avatar Wrap */}
                                                    <div className="relative">
                                                        <div className={`w-12 h-12 rounded-xl overflow-hidden bg-gray-900 border-2 transition-all group-hover:scale-105 ${
                                                            u.is_remote ? 'border-cyan-400/80 shadow-md shadow-cyan-400/10' :
                                                            roomId === 'focus-zone' ? 'border-amber-400/80' : 'border-gray-800'
                                                        }`}>
                                                            <img 
                                                                src={u.avatar_url} 
                                                                alt={u.name} 
                                                                className="w-full h-full object-cover" 
                                                                onError={(e) => {
                                                                    e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${u.name}`;
                                                                }}
                                                            />
                                                        </div>

                                                        {/* Status indicators */}
                                                        {u.is_remote && (
                                                            <div className="absolute -top-1 -right-1 bg-cyan-500 border border-[#0b0f19] rounded-full p-0.5 text-[8px]" title="Remote Login">
                                                                🏡
                                                            </div>
                                                        )}
                                                        {roomId === 'focus-zone' && (
                                                            <div className="absolute -bottom-1 -right-1 bg-amber-500 border border-[#0b0f19] rounded-full p-0.5 text-[8px]" title="Do Not Disturb">
                                                                🤫
                                                            </div>
                                                        )}
                                                    </div>

                                                    <span className="text-[10px] font-semibold text-gray-300 group-hover:text-white max-w-[65px] truncate">
                                                        {u.name}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Side: Detail Panel */}
                <div className="w-72 bg-[#111827]/50 border-l border-gray-800 flex flex-col justify-between p-6 overflow-y-auto">
                    {selectedUser ? (
                        <div className="space-y-6">
                            {/* Panel Header */}
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-500">Member Profile</span>
                                <button 
                                    onClick={() => setSelectedUser(null)}
                                    className="text-gray-500 hover:text-gray-300 text-xs font-semibold"
                                >
                                    閉じる
                                </button>
                            </div>

                            {/* Avatar & Name */}
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-900 border-2 border-gray-800 shadow-xl">
                                        <img src={selectedUser.avatar_url} alt={selectedUser.name} className="w-full h-full object-cover" />
                                    </div>
                                    {selectedUser.is_remote && (
                                        <div className="absolute -top-1 -right-1 bg-cyan-500 border-2 border-[#111827] rounded-full p-1 text-xs" title="Remote Active">
                                            🏡
                                        </div>
                                    )}
                                </div>
                                
                                <div>
                                    <h3 className="font-extrabold text-base text-gray-100">{selectedUser.name}</h3>
                                    <span className="px-2.5 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-[10px] text-gray-400 capitalize inline-block mt-1">
                                        {selectedUser.role || 'Member'}
                                    </span>
                                </div>
                            </div>

                            {/* Status Card */}
                            <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-3">
                                <div>
                                    <span className="text-[9px] font-bold text-gray-500 block uppercase">Current Room</span>
                                    <span className="text-xs font-bold text-gray-300">
                                        {ROOMS[selectedUser.current_room]?.name || 'Offline'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-bold text-gray-500 block uppercase">Status Text</span>
                                    <span className="text-xs text-gray-400">
                                        {selectedUser.status_text || 'Active'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-bold text-gray-500 block uppercase">Work Location</span>
                                    <span className="text-xs text-gray-300 flex items-center gap-1.5">
                                        {selectedUser.is_remote ? (
                                            <>
                                                <span className="text-cyan-400">🏡</span> 自宅 (Remote)
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-emerald-400">🏢</span> 本社オフィス (Office)
                                            </>
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* AI Avatar Creator Section */}
                            {(selectedUser.is_photo_avatar || selectedUser.is_placeholder_avatar) && (
                                <div className="bg-indigo-950/20 border border-indigo-500/20 p-4 rounded-xl space-y-3">
                                    <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                                        <span>🤖</span> AI Avatar Creator
                                    </h4>
                                    <p className="text-[10px] text-gray-400 leading-relaxed">
                                        {selectedUser.is_photo_avatar 
                                            ? '実写写真が検出されました。AIで親しみやすいドット絵アバターに変換できます。' 
                                            : 'アバターが未設定です。ランダムアバターの代わりに、お好みのAIアバターを作成します。'
                                        }
                                    </p>
                                    <button
                                        disabled={generatingAvatarId === selectedUser.id}
                                        onClick={() => handleGenerateAvatar(selectedUser.id)}
                                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800/50 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        {generatingAvatarId === selectedUser.id ? (
                                            <>
                                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                                                生成中...
                                            </>
                                        ) : (
                                            <>
                                                ✨ イラストアバターを生成
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="space-y-2 pt-2 border-t border-gray-800">
                                {selectedUser.is_remote ? (
                                    <button 
                                        onClick={() => onOpen('dm-chat', 'dm-chat', `Chat with ${selectedUser.name}`, { targetUser: selectedUser })}
                                        className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                                    >
                                        💬 チャットで会議を提案 (Remote推奨)
                                    </button>
                                ) : selectedUser.current_room === 'focus-zone' ? (
                                    <button 
                                        onClick={() => onOpen('dm-chat', 'dm-chat', `Chat with ${selectedUser.name}`, { targetUser: selectedUser, urgent: true })}
                                        className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                                    >
                                        ⚠️ 緊急メッセージを送る (Focus中)
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => onOpen('dm-chat', 'dm-chat', `Chat with ${selectedUser.name}`, { targetUser: selectedUser })}
                                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                                    >
                                        👋 立ち話（10分打ち合わせ）を申し込む
                                    </button>
                                )}
                            </div>

                            {/* Debug Controls (Test other users' positions) */}
                            {selectedUser.id !== user?.id && (
                                <div className="bg-indigo-950/20 border border-dashed border-indigo-500/30 p-4 rounded-xl space-y-2 mt-4">
                                    <span className="text-[9px] font-bold text-indigo-400 block uppercase">⚙️ テスト用デバッグツール</span>
                                    <p className="text-[9px] text-gray-400 leading-relaxed font-normal">
                                        このメンバーの配置を強制変更して、AIアシスタントの自動応答やボタンの出し分けをシミュレートできます。
                                    </p>
                                    <select
                                        value={selectedUser.current_room || 'open-space'}
                                        onChange={async (e) => {
                                            const room = e.target.value;
                                            const isRemote = room === 'remote' ? 1 : 0;
                                            const status = room === 'focus-zone' ? 'Busy' : (room === 'remote' ? 'Home Office' : 'Active');
                                            
                                            try {
                                                const res = await fetch('/api/virtual-office/status', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        targetUserId: selectedUser.id,
                                                        current_room: room,
                                                        status_text: status,
                                                        is_remote: isRemote
                                                    })
                                                });
                                                if (res.ok) {
                                                    setSelectedUser(prev => ({
                                                        ...prev,
                                                        current_room: room,
                                                        status_text: status,
                                                        is_remote: isRemote
                                                    }));
                                                    loadUsers(false);
                                                }
                                            } catch (err) {
                                                console.error(err);
                                            }
                                        }}
                                        className="w-full bg-gray-900 border border-gray-700 text-[10px] rounded px-1.5 py-1 text-gray-300 focus:outline-none cursor-pointer"
                                    >
                                        <option value="open-space">🌳 オープンスペース (出社中)</option>
                                        <option value="meeting-room-a">💬 会議室 A (ミーティング中)</option>
                                        <option value="meeting-room-b">🎥 会議室 B (ミーティング中)</option>
                                        <option value="focus-zone">🤫 集中ゾーン (話しかけ不可)</option>
                                        <option value="remote">🏡 自宅 (リモートワーク中)</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col justify-center items-center text-center space-y-3 text-gray-500">
                            <span className="text-4xl">👥</span>
                            <div>
                                <p className="text-xs font-bold text-gray-400">メンバー未選択</p>
                                <p className="text-[10px] mt-1">マップ上のアバターをクリックすると、現在の勤務場所やアクションが表示されます。</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VirtualOffice;
