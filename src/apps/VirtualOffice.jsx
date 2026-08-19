import React, { useState, useEffect } from 'react';

// デフォルトのランダムアバター割り当て用シードリスト
const DEFAULT_AVATAR_SEEDS = ['Oliver', 'Jake', 'Charlie', 'Luna', 'Bella', 'Milo', 'Coco', 'Cookie'];

// クイックステータスプリセット定義
const STATUS_PRESETS = [
    { id: 'active', label: '在席中・相談歓迎', icon: '🟢', text: 'Active', room: 'open-space', color: 'bg-emerald-500' },
    { id: 'focus', label: '集中作業中', icon: '🤫', text: 'Focus', room: 'focus-zone', color: 'bg-amber-500' },
    { id: 'meeting', label: 'ミーティング中', icon: '💬', text: 'In Meeting', room: 'meeting-room-a', color: 'bg-indigo-500' },
    { id: 'away', label: '一時離席中', icon: '🟡', text: 'Away', room: 'open-space', color: 'bg-yellow-500' },
    { id: 'lunch', label: '食事・ランチ', icon: '🍱', text: 'Lunch', room: 'open-space', color: 'bg-orange-500' },
    { id: 'break', label: '小休憩中', icon: '☕', text: 'Break', room: 'open-space', color: 'bg-amber-600' },
    { id: 'remote', label: 'リモート勤務', icon: '🏡', text: 'Home Office', room: 'remote', color: 'bg-cyan-500' }
];

const getStatusEmoji = (text = '', room = '') => {
    const t = (text || '').toLowerCase();
    if (t.includes('lunch') || t.includes('飯') || t.includes('食')) return '🍱';
    if (t.includes('break') || t.includes('休') || t.includes('tea') || t.includes('coffee')) return '☕';
    if (t.includes('away') || t.includes('離席') || t.includes('外')) return '🟡';
    if (t.includes('focus') || t.includes('集中') || room === 'focus-zone') return '🤫';
    if (t.includes('meet') || t.includes('会議') || (room && room.startsWith('meeting'))) return '💬';
    if (t.includes('home') || t.includes('remote') || room === 'remote') return '🏡';
    return '🟢';
};

const getStatusDotColor = (text = '', room = '') => {
    const t = (text || '').toLowerCase();
    if (t.includes('lunch') || t.includes('break') || t.includes('away') || t.includes('離席') || t.includes('休')) return 'bg-amber-400';
    if (t.includes('focus') || room === 'focus-zone') return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]';
    if (t.includes('meet') || (room && room.startsWith('meeting'))) return 'bg-indigo-500';
    if (room === 'remote' || t.includes('remote') || t.includes('home')) return 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]';
    return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]';
};

const VirtualOffice = ({ onOpen, user }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [myStatus, setMyStatus] = useState({ room: 'open-space', text: 'Active' });
    const [customStatusText, setCustomStatusText] = useState('Active');
    const [isStatusPopoverOpen, setIsStatusPopoverOpen] = useState(false);
    const [generatingAvatarId, setGeneratingAvatarId] = useState(null);
    const [error, setError] = useState('');
    const [assistantPrompt, setAssistantPrompt] = useState('');
    const [defaultAssistantPrompt, setDefaultAssistantPrompt] = useState('');
    const [activeSettingsTab, setActiveSettingsTab] = useState('basic');
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    const allowedActions = user?.allowed_actions || [];
    const canManageRules = allowedActions.includes('*') || allowedActions.includes('action:manage_assistant_rules');

    useEffect(() => {
        const loadConfig = async () => {
            try {
                const res = await fetch('/api/config');
                if (res.ok) {
                    const data = await res.json();
                    if (data.defaultAssistantPrompt) {
                        setDefaultAssistantPrompt(data.defaultAssistantPrompt);
                    }
                }
            } catch (err) {
                console.error("Failed to load config for default prompt:", err);
            }
        };
        loadConfig();
    }, []);

    useEffect(() => {
        if (selectedUser && selectedUser.id === user?.id) {
            setAssistantPrompt(selectedUser.assistant_prompt || '');
        }
    }, [selectedUser, user?.id]);

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
            if (!res.ok) {
                let errMsg = 'Failed to load users';
                try {
                    const data = await res.json();
                    errMsg = data.error || errMsg;
                } catch (_) {}
                throw new Error(errMsg);
            }
            const data = await res.json();
            setError(null);
            
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
            if (!res.ok) {
                let errMsg = 'Failed to generate avatar';
                try {
                    const data = await res.json();
                    errMsg = data.error || errMsg;
                } catch (_) {}
                throw new Error(errMsg);
            }
            const data = await res.json();
            
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
        const targetRoom = room || myStatus.room || 'open-space';
        const targetText = text !== undefined ? text : (myStatus.text || 'Active');

        // 即座にUIに反映（楽観的更新）
        setMyStatus({ room: targetRoom, text: targetText });
        setCustomStatusText(targetText);
        setUsers(prev => prev.map(u => {
            const isMe = u.id === user?.id;
            if (isMe) {
                return {
                    ...u,
                    current_room: targetRoom,
                    status_text: targetText,
                    is_remote: targetRoom === 'remote' ? 1 : 0
                };
            }
            return u;
        }));

        try {
            const res = await fetch('/api/virtual-office/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    current_room: targetRoom,
                    status_text: targetText,
                    is_remote: targetRoom === 'remote' ? 1 : 0
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

    const handleUpdateSettings = async (workStart, workEnd, breakStart, breakEnd, meetingBuffer, promptValue, override = false) => {
        const targetPrompt = promptValue !== undefined ? promptValue : (selectedUser?.assistant_prompt || '');

        try {
            const res = await fetch('/api/virtual-office/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assistant_work_start: workStart,
                    assistant_work_end: workEnd,
                    assistant_break_start: breakStart,
                    assistant_break_end: breakEnd,
                    assistant_meeting_buffer: meetingBuffer,
                    assistant_prompt: targetPrompt,
                    override: override
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update assistant settings');
            }

            const data = await res.json();
            if (data.status === 'warning') {
                const confirmSave = window.confirm(
                    `⚠️ 就業規則違反の疑いがあります：\n\n${data.reason}\n\nこのまま強制保存しますか？\n（この操作は監査ログに記録されます）`
                );
                if (confirmSave) {
                    return await handleUpdateSettings(workStart, workEnd, breakStart, breakEnd, meetingBuffer, promptValue, true);
                } else {
                    loadUsers(false);
                    return false;
                }
            }

            // Update local state on success
            setUsers(prevUsers => prevUsers.map(u => {
                if (u.id === user?.id) {
                    return {
                        ...u,
                        assistant_work_start: workStart,
                        assistant_work_end: workEnd,
                        assistant_break_start: breakStart,
                        assistant_break_end: breakEnd,
                        assistant_meeting_buffer: meetingBuffer,
                        assistant_prompt: targetPrompt
                    };
                }
                return u;
            }));

            if (selectedUser && selectedUser.id === user?.id) {
                setSelectedUser(prev => ({
                    ...prev,
                    assistant_work_start: workStart,
                    assistant_work_end: workEnd,
                    assistant_break_start: breakStart,
                    assistant_break_end: breakEnd,
                    assistant_meeting_buffer: meetingBuffer,
                    assistant_prompt: targetPrompt
                }));
            }

            if (override) {
                alert("就業規則警告を承認し、設定を強制保存しました。");
            }
            return true;
        } catch (err) {
            console.error('Settings update failed:', err);
            setError(err.message);
            loadUsers(false);
            throw err;
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

                {/* My Status Rich Trigger */}
                <div className="relative">
                    <button
                        onClick={() => setIsStatusPopoverOpen(!isStatusPopoverOpen)}
                        className="flex items-center space-x-2.5 bg-gray-900/90 hover:bg-gray-850 border border-gray-700/80 px-3 py-1.5 rounded-xl text-xs text-gray-200 transition shadow-sm hover:border-indigo-500/50 cursor-pointer"
                    >
                        <span className="text-sm">{getStatusEmoji(myStatus.text, myStatus.room)}</span>
                        <div className="flex flex-col text-left">
                            <span className="text-[9px] text-gray-400 font-medium">My Status</span>
                            <span className="text-xs font-bold text-gray-100 flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${getStatusDotColor(myStatus.text, myStatus.room)}`}></span>
                                <span className="max-w-[110px] truncate">{myStatus.text || 'Active'}</span>
                                <span className="text-[10px] text-gray-400 font-normal">({ROOMS[myStatus.room]?.name?.split(' ')[1] || myStatus.room})</span>
                            </span>
                        </div>
                        <svg className={`w-3.5 h-3.5 text-gray-400 ml-0.5 transition-transform ${isStatusPopoverOpen ? 'rotate-180 text-indigo-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </button>

                    {/* Status Popover Modal / Dropdown */}
                    {isStatusPopoverOpen && (
                        <>
                            <div className="fixed inset-0 z-30" onClick={() => setIsStatusPopoverOpen(false)} />
                            <div className="absolute right-0 mt-2 w-80 bg-[#131b2e] border border-gray-700/90 rounded-2xl shadow-2xl z-40 p-4 space-y-4 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                                {/* Header */}
                                <div className="flex justify-between items-center pb-2 border-b border-gray-800">
                                    <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                                        <span>✨</span> ステータス・プレゼンス設定
                                    </span>
                                    <button onClick={() => setIsStatusPopoverOpen(false)} className="text-gray-400 hover:text-gray-200 text-xs cursor-pointer p-1">✕</button>
                                </div>

                                {/* Custom Status Input */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 block uppercase">ステータスメッセージ</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={customStatusText}
                                            onChange={(e) => setCustomStatusText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleUpdateMyStatus(myStatus.room, customStatusText);
                                                    setIsStatusPopoverOpen(false);
                                                }
                                            }}
                                            placeholder="例: 15:00まで資料作成、相談OK..."
                                            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                                        />
                                        <button
                                            onClick={() => {
                                                handleUpdateMyStatus(myStatus.room, customStatusText);
                                                setIsStatusPopoverOpen(false);
                                            }}
                                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
                                        >
                                            保存
                                        </button>
                                    </div>
                                </div>

                                {/* Quick Presets */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 block uppercase">クイックプリセット</label>
                                    <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto pr-1">
                                        {STATUS_PRESETS.map((preset) => (
                                            <button
                                                key={preset.id}
                                                onClick={() => {
                                                    handleUpdateMyStatus(preset.room, preset.text);
                                                    setCustomStatusText(preset.text);
                                                    setIsStatusPopoverOpen(false);
                                                }}
                                                className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-800/80 text-left transition group border border-transparent hover:border-gray-700/50 cursor-pointer"
                                            >
                                                <div className="flex items-center space-x-2.5">
                                                    <span className="text-base">{preset.icon}</span>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-semibold text-gray-200 group-hover:text-white">{preset.label}</span>
                                                        <span className="text-[10px] text-gray-500">{preset.text} · {ROOMS[preset.room]?.name?.split(' ')[1]}</span>
                                                    </div>
                                                </div>
                                                <span className={`w-2.5 h-2.5 rounded-full ${preset.color} opacity-75 group-hover:opacity-100`}></span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Location / Room Selection */}
                                <div className="space-y-1.5 pt-2 border-t border-gray-800">
                                    <label className="text-[10px] font-bold text-gray-400 block uppercase">所在エリアの移動</label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {Object.entries(ROOMS).map(([roomId, roomInfo]) => (
                                            <button
                                                key={roomId}
                                                onClick={() => {
                                                    handleUpdateMyStatus(roomId, myStatus.text || 'Active');
                                                    setIsStatusPopoverOpen(false);
                                                }}
                                                className={`p-2 rounded-xl text-left text-xs font-medium border transition cursor-pointer ${
                                                    myStatus.room === roomId 
                                                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 font-bold' 
                                                        : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                                                }`}
                                            >
                                                <div className="truncate">{roomInfo.name}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
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
                                    onClick={() => handleUpdateMyStatus(roomId, roomId === 'focus-zone' ? 'Busy' : (roomId === 'remote' ? 'Home Office' : (myStatus.text || 'Active')))}
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

                                                        {/* Unread count badge */}
                                                        {u.unread_count > 0 && (
                                                            <div className="absolute -top-1 -left-1 bg-red-600 border border-[#0b0f19] rounded-full px-1.5 py-0.5 text-[8px] font-bold text-white shadow-sm shadow-red-500/20 animate-pulse z-10">
                                                                {u.unread_count}
                                                            </div>
                                                        )}

                                                        {/* Status indicators */}
                                                        {!!u.is_remote && (
                                                            <div className="absolute -top-1 -right-1 bg-cyan-500 border border-[#0b0f19] rounded-full p-0.5 text-[8px]" title="Remote Login">
                                                                🏡
                                                            </div>
                                                        )}
                                                        {roomId === 'focus-zone' && (
                                                            <div className="absolute -bottom-1 -right-1 bg-amber-500 border border-[#0b0f19] rounded-full p-0.5 text-[8px]" title="Do Not Disturb">
                                                                🤫
                                                            </div>
                                                        )}

                                                        {/* Presence dot badge */}
                                                        <div 
                                                            className={`absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0b0f19] flex items-center justify-center ${getStatusDotColor(u.status_text, u.current_room)}`}
                                                            title={`Status: ${u.status_text || 'Active'}`}
                                                        />
                                                    </div>

                                                    {/* Name & Status Chip */}
                                                    <div className="flex flex-col items-center max-w-[75px]">
                                                        <span className="text-[10px] font-semibold text-gray-300 group-hover:text-white truncate w-full text-center">
                                                            {u.name}
                                                        </span>
                                                        {u.status_text && u.status_text !== 'Active' && (
                                                            <span 
                                                                className="text-[8px] px-1.5 py-0.5 bg-gray-900/90 text-gray-300 rounded-full border border-gray-700/60 truncate max-w-full text-center mt-0.5 shadow-sm"
                                                                title={u.status_text}
                                                            >
                                                                {getStatusEmoji(u.status_text, u.current_room)} {u.status_text}
                                                            </span>
                                                        )}
                                                    </div>
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
                                    {!!selectedUser.is_remote && (
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
                                    {selectedUser.unread_count > 0 && (
                                         <span className="ml-1.5 px-2 py-0.5 rounded-full bg-red-600/20 border border-red-500/50 text-[10px] text-red-400 font-bold inline-block mt-1 animate-pulse">
                                             🔴 {selectedUser.unread_count}件の未読
                                         </span>
                                     )}
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
                                {selectedUser.id === user?.id && (
                                    <button
                                        onClick={() => setIsStatusPopoverOpen(true)}
                                        className="w-full mt-2 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-indigo-500/50 rounded-lg text-xs text-indigo-300 font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                    >
                                        <span>✨</span> ステータスを変更する
                                    </button>
                                )}
                            </div>

                            {/* Assistant Rules Panel (Only for Me / Boss settings) */}
                            {selectedUser.id === user?.id && canManageRules && (
                                <div className="bg-indigo-950/20 border border-indigo-500/20 p-4 rounded-xl space-y-3">
                                    <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                                         <span>🤖</span> AI アシスタント設定
                                    </h4>
                                    <p className="text-[10px] text-gray-400 leading-relaxed font-normal">
                                        代理調整時の就業ルールや、自動応答のAIプロンプトをカスタマイズできます。
                                    </p>
                                    <button 
                                        onClick={() => setIsSettingsModalOpen(true)}
                                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                                    >
                                        🛠️ アシスタント設定を開く
                                    </button>
                                </div>
                            )}

                            {/* AI Avatar Creator Section */}
                            {(!!selectedUser.is_photo_avatar || !!selectedUser.is_placeholder_avatar) && (
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
                                        onClick={() => onOpen(`dm-chat-${selectedUser.id}`, 'dm-chat', `Chat with ${selectedUser.name}`, { targetUser: selectedUser })}
                                        className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                                    >
                                        💬 チャットを開く (Remote推奨)
                                    </button>
                                ) : selectedUser.current_room === 'focus-zone' ? (
                                    <button 
                                        onClick={() => onOpen(`dm-chat-${selectedUser.id}`, 'dm-chat', `Chat with ${selectedUser.name}`, { targetUser: selectedUser, urgent: true })}
                                        className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                                    >
                                        ⚠️ 緊急チャットを送る (Focus中)
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => onOpen('dm-chat', 'dm-chat', `Chat with ${selectedUser.name}`, { targetUser: selectedUser })}
                                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                                    >
                                        💬 チャットを開く (相談/立ち話)
                                    </button>
                                )}
                            </div>
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

            {/* Settings Modal */}
            {isSettingsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#111827] border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800 bg-gray-900/40">
                            <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                                <span>🤖</span> AI アシスタント設定のカスタマイズ
                            </h3>
                            <button
                                onClick={() => setIsSettingsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-200 text-lg focus:outline-none"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Tab Selection */}
                            <div className="flex border-b border-gray-800">
                                <button
                                    onClick={() => setActiveSettingsTab('basic')}
                                    className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 ${
                                        activeSettingsTab === 'basic' 
                                            ? 'border-indigo-500 text-indigo-400' 
                                            : 'border-transparent text-gray-400 hover:text-gray-200'
                                    }`}
                                >
                                    基本就業ルール
                                </button>
                                <button
                                    onClick={() => setActiveSettingsTab('prompt')}
                                    className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 ${
                                        activeSettingsTab === 'prompt' 
                                            ? 'border-indigo-500 text-indigo-400' 
                                            : 'border-transparent text-gray-400 hover:text-gray-200'
                                    }`}
                                >
                                    応答AIプロンプト
                                </button>
                            </div>

                            {activeSettingsTab === 'basic' ? (
                                <div className="space-y-5">
                                    <div className="bg-indigo-950/10 border border-indigo-500/10 rounded-xl p-4">
                                        <p className="text-xs text-gray-400 leading-relaxed font-normal">
                                            他メンバーからの予定調整リクエストに対し、AIアシスタントがあなたのカレンダーの空きスロットを自動探索・調整する際の就業条件を定義します。
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-400">就業開始時間</label>
                                            <select
                                                value={selectedUser?.assistant_work_start || '09:00'}
                                                onChange={(e) => handleUpdateSettings(e.target.value, selectedUser.assistant_work_end, selectedUser.assistant_break_start, selectedUser.assistant_break_end, selectedUser.assistant_meeting_buffer)}
                                                className="w-full bg-gray-900 border border-gray-800 text-sm rounded-xl p-3 text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                            >
                                                <option value="08:00">08:00 (午前8時)</option>
                                                <option value="08:30">08:30 (午前8時半)</option>
                                                <option value="09:00">09:00 (午前9時)</option>
                                                <option value="09:30">09:30 (午前9時半)</option>
                                                <option value="10:00">10:00 (午前10時)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-400">就業終了時間</label>
                                            <select
                                                value={selectedUser?.assistant_work_end || '17:30'}
                                                onChange={(e) => handleUpdateSettings(selectedUser.assistant_work_start, e.target.value, selectedUser.assistant_break_start, selectedUser.assistant_break_end, selectedUser.assistant_meeting_buffer)}
                                                className="w-full bg-gray-900 border border-gray-800 text-sm rounded-xl p-3 text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                            >
                                                <option value="17:00">17:00 (午後5時)</option>
                                                <option value="17:30">17:30 (午後5時半)</option>
                                                <option value="18:00">18:00 (午後6時)</option>
                                                <option value="18:30">18:30 (午後6時半)</option>
                                                <option value="19:00">19:00 (午後7時)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="bg-indigo-950/10 border border-indigo-500/10 rounded-xl p-4">
                                        <p className="text-xs text-gray-400 leading-relaxed font-normal">
                                            日本の就業規則に基づき、1時間の休憩時間を設定してください（デフォルト 12:00〜13:00）。
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-400">休憩開始時間</label>
                                            <select
                                                value={selectedUser?.assistant_break_start || '12:00'}
                                                onChange={(e) => handleUpdateSettings(selectedUser.assistant_work_start, selectedUser.assistant_work_end, e.target.value, selectedUser.assistant_break_end, selectedUser.assistant_meeting_buffer)}
                                                className="w-full bg-gray-900 border border-gray-800 text-sm rounded-xl p-3 text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                            >
                                                <option value="11:00">11:00</option>
                                                <option value="11:30">11:30</option>
                                                <option value="12:00">12:00</option>
                                                <option value="12:30">12:30</option>
                                                <option value="13:00">13:00</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-400">休憩終了時間</label>
                                            <select
                                                value={selectedUser?.assistant_break_end || '13:00'}
                                                onChange={(e) => handleUpdateSettings(selectedUser.assistant_work_start, selectedUser.assistant_work_end, selectedUser.assistant_break_start, e.target.value, selectedUser.assistant_meeting_buffer)}
                                                className="w-full bg-gray-900 border border-gray-800 text-sm rounded-xl p-3 text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                            >
                                                <option value="12:00">12:00</option>
                                                <option value="12:30">12:30</option>
                                                <option value="13:00">13:00</option>
                                                <option value="13:30">13:30</option>
                                                <option value="14:00">14:00</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400">就業終了前の予定ブロックバッファ</label>
                                        <select
                                            value={selectedUser?.assistant_meeting_buffer !== undefined ? selectedUser.assistant_meeting_buffer : 30}
                                            onChange={(e) => handleUpdateSettings(selectedUser.assistant_work_start, selectedUser.assistant_work_end, selectedUser.assistant_break_start, selectedUser.assistant_break_end, parseInt(e.target.value))}
                                            className="w-full bg-gray-900 border border-gray-800 text-sm rounded-xl p-3 text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                        >
                                            <option value="15">15分前まで（最後の枠をギリギリまで許容）</option>
                                            <option value="30">30分前まで（標準）</option>
                                            <option value="45">45分前まで</option>
                                            <option value="60">60分前まで（余裕を持たせる）</option>
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-indigo-950/10 border border-indigo-500/10 rounded-xl p-4">
                                        <p className="text-xs text-gray-400 leading-relaxed font-normal">
                                            AIアシスタントが他メンバーからのチャットや調整に対して、あなたに成り代わって返答する際の指示（プロンプト）を自由に記述できます。
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-gray-400">プロンプト編集エリア</label>
                                            {defaultAssistantPrompt && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (window.confirm("現在の編集内容がデフォルトプロンプトで上書きされますが、よろしいですか？")) {
                                                            setAssistantPrompt(defaultAssistantPrompt);
                                                        }
                                                    }}
                                                    className="text-xs text-indigo-400 hover:text-indigo-300 underline bg-transparent border-0 cursor-pointer"
                                                >
                                                    デフォルトプロンプトをコピー
                                                </button>
                                            )}
                                        </div>
                                        <textarea
                                            value={assistantPrompt}
                                            onChange={(e) => setAssistantPrompt(e.target.value)}
                                            rows={14}
                                            placeholder={`未設定の場合はデフォルトルールが適用されます。\n例：あなたは{name}のAIアシスタントです。`}
                                            className="w-full bg-gray-900 border border-gray-800 text-sm rounded-xl p-4 text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono leading-relaxed"
                                        />
                                    </div>

                                    {defaultAssistantPrompt && (
                                        <details className="text-xs text-gray-400 bg-gray-950 rounded-xl border border-gray-800 p-2">
                                            <summary className="cursor-pointer hover:text-gray-300 focus:outline-none py-1 select-none font-bold">
                                                システム標準プロンプトを表示 (コピー元・閲覧専用)
                                            </summary>
                                            <div className="mt-2 bg-gray-900/60 border border-gray-800/40 rounded-lg p-3 max-h-48 overflow-y-auto text-gray-500 font-mono text-xs whitespace-pre-wrap leading-relaxed select-text">
                                                {defaultAssistantPrompt}
                                            </div>
                                        </details>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-800 bg-gray-900/20">
                            <button
                                onClick={() => setIsSettingsModalOpen(false)}
                                className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-bold transition duration-150"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        const success = await handleUpdateSettings(
                                            selectedUser.assistant_work_start || '09:00',
                                            selectedUser.assistant_work_end || '17:30',
                                            selectedUser.assistant_break_start || '12:00',
                                            selectedUser.assistant_break_end || '13:00',
                                            selectedUser.assistant_meeting_buffer !== undefined ? selectedUser.assistant_meeting_buffer : 30,
                                            assistantPrompt
                                        );
                                        if (success) {
                                            setIsSettingsModalOpen(false);
                                            alert("アシスタント設定を保存しました。");
                                        }
                                    } catch (err) {
                                        alert(`保存に失敗しました: ${err.message}`);
                                    }
                                }}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition duration-150 shadow-md shadow-indigo-600/10"
                            >
                                設定を保存する
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VirtualOffice;
