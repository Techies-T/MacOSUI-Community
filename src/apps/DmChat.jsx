import React, { useState, useEffect, useRef } from 'react';

const DmChat = ({ targetUser, urgent }) => {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [inMeeting, setInMeeting] = useState(false);
    const messagesEndRef = useRef(null);

    const handleJoinMeeting = async () => {
        setInMeeting(true);
        try {
            await fetch('/api/virtual-office/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    current_room: 'meeting-room-a',
                    status_text: 'In a Meeting'
                })
            });
        } catch (err) {
            console.error('Failed to update status to meeting:', err);
        }
    };

    const handleLeaveMeeting = async () => {
        setInMeeting(false);
        try {
            await fetch('/api/virtual-office/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    current_room: 'open-space',
                    status_text: 'Active'
                })
            });
        } catch (err) {
            console.error('Failed to update status to open-space:', err);
        }
    };

    // デフォルトのターゲットユーザー（フォールバック）
    const user = targetUser || {
        id: 1,
        name: '戌亥稔',
        avatar_url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Inui',
        current_room: 'open-space',
        status_text: 'Active',
        is_remote: false,
        email: 'minoru.inui@techiespod.jp'
    };

    // 自分のログイン情報を取得
    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => {
                if (data.user) {
                    setCurrentUser(data.user);
                }
            })
            .catch(err => console.error("Failed to fetch auth info:", err));
    }, []);

    // メッセージ履歴の取得処理
    const fetchMessages = () => {
        if (!user.id) return;
        fetch(`/api/dm/messages?targetUserId=${user.id}`)
            .then(res => res.json())
            .then(data => {
                if (data.messages) {
                    setMessages(data.messages);
                }
            })
            .catch(err => console.error("Failed to fetch DM messages:", err));
    };

    // inMeeting の最新状態を ref で保持（クリーンアップ用）
    const inMeetingRef = useRef(inMeeting);
    useEffect(() => {
        inMeetingRef.current = inMeeting;
    }, [inMeeting]);

    // 別のユーザーを選択し直した（user.id が変わった）場合は、チャット入力欄と会議ステートをリセット
    useEffect(() => {
        setInMeeting(false);
        setInputValue('');
    }, [user.id]);

    useEffect(() => {
        fetchMessages();

        // 3秒間隔でポーリングして双方向同期
        const timer = setInterval(fetchMessages, 3000);
        return () => clearInterval(timer);
    }, [user.id]);

    // ウィンドウが閉じられた（コンポーネントがアンマウントされた）ときのクリーンアップ
    useEffect(() => {
        return () => {
            // ビデオ会議中にウィンドウが閉じられた場合、自動でオープンスペースに戻す
            if (inMeetingRef.current) {
                fetch('/api/virtual-office/status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        current_room: 'open-space',
                        status_text: 'Active'
                    })
                }).catch(err => console.error("Cleanup meeting status failed:", err));
            }
        };
    }, []);

    useEffect(() => {
        // 自動スクロール
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const textToSend = inputValue;
        setInputValue('');

        setIsTyping(true);

        try {
            const res = await fetch('/api/dm/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    receiverId: user.id,
                    text: textToSend
                })
            });

            if (res.ok) {
                // 送信完了したら即時ロード
                fetchMessages();
            }
        } catch (err) {
            console.error("Failed to send DM message:", err);
        } finally {
            // タイピングインジケータを1秒後に非表示
            setTimeout(() => {
                setIsTyping(false);
            }, 1000);
        }
    };

    // 仮想的ウェルカムメッセージを含む、表示用メッセージデータの整形
    const getDisplayMessages = () => {
        if (!currentUser) return [];

        const formatted = messages.map(msg => {
            const isMe = msg.sender_id === currentUser.id;
            return {
                id: msg.id,
                sender: isMe ? 'me' : (msg.sender_type === 'assistant' ? 'assistant' : 'them'),
                text: msg.text,
                time: (() => {
                    if (!msg.created_at) {
                        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }
                    const utcStr = msg.created_at.includes('T') 
                        ? msg.created_at 
                        : msg.created_at.replace(' ', 'T') + 'Z';
                    return new Date(utcStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                })()
            };
        });

        // 履歴が空の場合のみ、アシスタントのウェルカムメッセージを表示
        if (formatted.length === 0) {
            const roomName = 
                user.current_room === 'focus-zone' ? '集中ゾーン' :
                user.current_room === 'remote' ? 'リモートワーク中' : '会議室';
            
            return [{
                id: 'welcome',
                sender: 'assistant',
                text: `こんにちは！${user.name}は現在「${roomName}」のため応答できません。用件がありましたら、代わりにアシスタントの私が伝言を承ります。お互いのカレンダーから「空き時間（30分）」の仮調整も可能です。`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }];
        }

        return formatted;
    };

    const displayMessages = getDisplayMessages();

    if (inMeeting) {
        return (
            <div className="h-full flex flex-col bg-[#0b0f19] text-[#e2e8f0] font-sans justify-between items-center p-6 relative">
                {/* 会議ヘッダー */}
                <div className="w-full flex justify-between items-center px-4 py-2 bg-gray-900/60 border border-gray-800 rounded-xl backdrop-blur-md">
                    <div className="flex items-center space-x-2">
                        <span className="animate-pulse w-2 h-2 bg-red-500 rounded-full"></span>
                        <span className="text-xs font-bold text-gray-300">Meeting Room A (Live)</span>
                    </div>
                    <span className="text-[10px] text-gray-500">経過時間: 00:45</span>
                </div>

                {/* ビデオストリームグリッド */}
                <div className="flex-1 w-full grid grid-cols-2 gap-4 my-6 items-center">
                    {/* 自分 */}
                    <div className="relative aspect-video bg-gray-950 rounded-2xl border border-indigo-500/20 overflow-hidden flex flex-col justify-center items-center group hover:border-indigo-500/40 transition-all">
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-900 border-2 border-indigo-500 shadow-lg mb-2">
                            <img src={currentUser?.avatar_url || 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Me'} alt="Me" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs font-semibold text-gray-300">{currentUser?.name || 'あなた'} (自分)</span>
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[9px] text-gray-400">マイクオン</span>
                    </div>

                    {/* 相手 */}
                    <div className="relative aspect-video bg-gray-950 rounded-2xl border border-gray-800 overflow-hidden flex flex-col justify-center items-center group hover:border-gray-700 transition-all">
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-900 border-2 border-gray-800 shadow-lg mb-2">
                            <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs font-semibold text-gray-300">{user.name}</span>
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[9px] text-gray-400">音声のみ接続</span>
                    </div>
                </div>

                {/* 会議コントロールバー */}
                <div className="w-full flex justify-center items-center space-x-6 py-4 border-t border-gray-900">
                    <button type="button" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 text-sm flex items-center justify-center transition" title="Mute Mic">
                        🎤
                    </button>
                    <button type="button" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 text-sm flex items-center justify-center transition" title="Camera Off">
                        📹
                    </button>
                    <button type="button" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 text-sm flex items-center justify-center transition" title="Share Screen">
                        🖥️
                    </button>
                    <button 
                        type="button"
                        onClick={handleLeaveMeeting}
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-bold transition shadow-md shadow-red-900/20"
                    >
                        📞 会議から退出する
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-[#0b0f19] text-[#e2e8f0] overflow-hidden font-sans">
            {/* Header */}
            <div className="flex items-center space-x-3 px-5 py-3 bg-[#111827]/85 border-b border-gray-800 backdrop-blur-md">
                <div className="relative">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-900 border border-gray-800">
                        <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#111827] ${
                        user.current_room === 'focus-zone' ? 'bg-amber-400' :
                        user.current_room === 'remote' ? 'bg-cyan-400' : 'bg-emerald-400'
                    }`} />
                </div>
                <div>
                    <h3 className="font-bold text-sm text-gray-100">{user.name}</h3>
                    <p className="text-[10px] text-gray-500">
                        {user.is_remote ? '🏡 Remote Active' : '🏢 Office Active'}
                        <span className="mx-1.5">•</span>
                        Status: {user.status_text || 'Active'}
                    </p>
                </div>
            </div>

            {/* Message History */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#0b0f19]/30">
                {displayMessages.map(msg => (
                    <div 
                        key={msg.id}
                        className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`flex items-end space-x-2 max-w-[75%] ${msg.sender === 'me' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                            {msg.sender === 'them' && (
                                <img src={user.avatar_url} alt={user.name} className="w-6 h-6 rounded-md bg-gray-800 object-cover flex-shrink-0" />
                            )}
                            {msg.sender === 'assistant' && (
                                <div className="w-6 h-6 rounded-md flex-shrink-0 bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-xs shadow-sm select-none">
                                    🤖
                                </div>
                            )}
                            <div className="flex flex-col">
                                {msg.sender === 'assistant' && (
                                    <span className="text-[8px] text-indigo-400 font-bold mb-0.5 ml-1 select-none">
                                        {user.name}のアシスタント
                                    </span>
                                )}
                                <div className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm break-all ${
                                    msg.sender === 'me' 
                                        ? 'bg-indigo-600 text-white rounded-br-none' 
                                        : msg.sender === 'assistant'
                                            ? 'bg-[#151124]/90 text-indigo-100 border border-indigo-500/30 rounded-bl-none relative pr-4'
                                            : 'bg-gray-900 text-gray-200 border border-gray-800 rounded-bl-none'
                                }`}>
                                    {msg.text.includes('➔') ? (
                                        <>
                                            {msg.text.split('➔')[0]} ➔ 
                                            {(msg.text.includes('💻 ミーティングを仮調整する') || msg.text.includes('💻 時間外でBOSSに確認する')) ? (
                                                <button 
                                                    onClick={() => {
                                                        const lines = msg.text.split('\n');
                                                        let targetSlot = '';
                                                        for (const line of lines) {
                                                            if (line.trim().startsWith('・')) {
                                                                targetSlot = line.replace('・', '').trim();
                                                                break;
                                                            }
                                                        }
                                                        
                                                        let startIso = new Date(Date.now() + 30 * 60 * 1000).toISOString();
                                                        let endIso = new Date(Date.now() + 60 * 60 * 1000).toISOString();
                                                        
                                                        if (targetSlot) {
                                                            const parts = targetSlot.split('〜').map(p => p.trim());
                                                            const today = new Date();
                                                            if (parts[0]) {
                                                                const [h, m] = parts[0].split(':').map(Number);
                                                                const startD = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m);
                                                                startIso = startD.toISOString();
                                                            }
                                                            if (parts[1]) {
                                                                const [h, m] = parts[1].split(':').map(Number);
                                                                const endD = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m);
                                                                endIso = endD.toISOString();
                                                            }
                                                        }

                                                        let desc = msg.text.includes('💻 時間外でBOSSに確認する') 
                                                            ? 'AIアシスタントによる時間外（BOSS確認中）の自動仮調整予定'
                                                            : 'AIアシスタントによる自動仮調整予定';
                                                        
                                                        const travelIndex = msg.text.indexOf('【考慮した移動時間】');
                                                        if (travelIndex !== -1) {
                                                            const travelPart = msg.text.substring(travelIndex);
                                                            const cleanTravelPart = travelPart.split('➔')[0].trim();
                                                            desc += '\n\n' + cleanTravelPart;
                                                        }

                                                        fetch('/api/calendar/events', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                summary: msg.text.includes('💻 時間外でBOSSに確認する') 
                                                                    ? `【時間外】ミーティング: ${currentUser?.name || ''} & ${user.name}`
                                                                    : `ミーティング: ${currentUser?.name || ''} & ${user.name}`,
                                                                description: desc,
                                                                start: startIso,
                                                                end: endIso
                                                            })
                                                        }).then(res => {
                                                            if (res.ok) {
                                                                if (msg.text.includes('💻 時間外でBOSSに確認する')) {
                                                                    alert(`時間外のため、カレンダーに仮登録した上で、${user.name}(BOSS)へ確認要求を送信しました！`);
                                                                } else {
                                                                    alert(`双方のカレンダーに「${targetSlot || '空き時間'}」で予定を仮登録しました！`);
                                                                }
                                                            } else {
                                                                alert('予定の登録に失敗しました。');
                                                            }
                                                            fetchMessages();
                                                        });
                                                    }}
                                                    className="ml-1 text-cyan-400 font-bold hover:underline"
                                                >
                                                    {msg.text.includes('💻 時間外でBOSSに確認する') ? '💻 時間外でBOSSに確認する' : '💻 ミーティングを仮調整する'}
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={handleJoinMeeting}
                                                    className="ml-1 text-cyan-400 font-bold hover:underline"
                                                >
                                                    💻 ビデオ会議室へ入る
                                                </button>
                                            )}
                                        </>
                                    ) : msg.text}
                                </div>
                                <span className="text-[8px] text-gray-600 mt-1 self-end">{msg.time}</span>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="flex items-center space-x-2 bg-gray-900 border border-gray-800 px-4 py-2.5 rounded-2xl rounded-bl-none">
                            <div className="flex space-x-1">
                                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                
                <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-4 bg-[#111827]/55 border-t border-gray-800 flex items-center space-x-3">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={`${user.name}さんにメッセージを送信...`}
                    className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-2 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition"
                >
                    送信
                </button>
            </form>
        </div>
    );
};

export default DmChat;
