import React, { useState, useEffect, useRef } from 'react';

const DmChat = ({ targetUser, urgent }) => {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    // デフォルトのターゲットユーザー（プロップがない場合のフォールバック）
    const user = targetUser || {
        id: 1,
        name: '戌亥稔',
        avatar_url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Inui',
        current_room: 'open-space',
        status_text: 'Active',
        is_remote: false
    };

    useEffect(() => {
        // 初期の歓迎メッセージ
        const welcomeMsgs = [
            {
                id: 1,
                sender: 'them',
                text: urgent 
                    ? `⚠️ [緊急通知を受信しました] どうされましたか？集中スペースにいますが、何かお急ぎでしょうか？`
                    : `こんにちは！何かご用件ですか？（ステータス: ${user.status_text || 'Active'} / ${user.is_remote ? '🏡 自宅勤務中' : '🏢 オフィス勤務中'}）`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
        ];
        setMessages(welcomeMsgs);
    }, [user.id, urgent]);

    useEffect(() => {
        // 自動スクロール
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const newUserMessage = {
            id: Date.now(),
            sender: 'me',
            text: inputValue,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, newUserMessage]);
        const userText = inputValue;
        setInputValue('');

        // 相手からの自動返信シミュレーション（AIエージェントの模擬）
        setIsTyping(true);

        const startTime = Date.now();
        let calendarResult = { status: 'unknown', currentEvent: null };

        // リモートワーク中で、打ち合わせなどのキーワードが含まれる場合にカレンダーをチェック
        const needsCalendarCheck = user.current_room === 'remote' && 
            (userText.includes('打ち合わせ') || userText.includes('会議') || userText.includes('ミーティング') || userText.includes('話'));
        if (needsCalendarCheck) {
            try {
                const res = await fetch(`/api/calendar/events?email=${encodeURIComponent(user.email || '')}`);
                if (res.ok) {
                    const data = await res.json();
                    const events = data.events || [];
                    const now = new Date();
                    
                    // 現在進行中のイベントを検索
                    const currentEvent = events.find(event => {
                        const start = new Date(event.start.dateTime || event.start.date);
                        const end = new Date(event.end.dateTime || event.end.date);
                        return now >= start && now < end;
                    });

                    if (currentEvent) {
                        calendarResult = { status: 'busy', currentEvent };
                    } else {
                        calendarResult = { status: 'free', currentEvent: null };
                    }
                } else {
                    calendarResult = { status: 'error' };
                }
            } catch (err) {
                console.error("Failed to fetch calendar events:", err);
                calendarResult = { status: 'error' };
            }
        }

        // 最低1.5秒のタイピングインジケータ表示時間を確保する
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 1500 - elapsed);

        setTimeout(() => {
            setIsTyping(false);
            
            let replyText = '了解しました！';
            
            // 相手のステータスに応じた賢い自動返信
            if (user.current_room === 'focus-zone') {
                replyText = `すみません、今「集中ゾーン」で別のドキュメント作成作業に没頭しているので、確認次第またすぐチャットでご連絡しますね！🙇‍♂️`;
            } else if (user.current_room === 'remote') {
                if (userText.includes('打ち合わせ') || userText.includes('会議') || userText.includes('ミーティング') || userText.includes('話')) {
                    if (calendarResult.status === 'busy') {
                        const event = calendarResult.currentEvent;
                        const endStr = event.end.dateTime 
                            ? new Date(event.end.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '終日';
                        replyText = `自宅からログインしています！カレンダーを確認したところ、現在「${event.summary}」の予定が入っております（${endStr}まで）。終わり次第、こちらのビデオ会議用URLでお待ちしております ➔ [💻 ビデオ会議室へ入る]`;
                    } else if (calendarResult.status === 'free') {
                        replyText = `自宅からログインしています！打ち合わせですね、OKです。今カレンダーを確認したところ本当に空いていますので、こちらのビデオ会議用URLから入っていただけますか？ ➔ [💻 ビデオ会議室へ入る]`;
                    } else if (calendarResult.status === 'error') {
                        replyText = `自宅からログインしています！カレンダーの取得に失敗しましたが、予定は空いているはずです。こちらのビデオ会議用URLから入っていただけますか？ ➔ [💻 ビデオ会議室へ入る]`;
                    } else {
                        replyText = `自宅からログインしています！打ち合わせですね、OKです。今カレンダー空いているので、こちらのビデオ会議用URLから入っていただけますか？ ➔ [💻 ビデオ会議室へ入る]`;
                    }
                } else {
                    replyText = `自宅でリモートワーク中ですが、チャットでの相談ならいつでも大丈夫ですよ！何かお困りのことがあれば何でも聞いてください。`;
                }
            } else if (user.current_room.startsWith('meeting-room')) {
                replyText = `現在「会議室」に入って打ち合わせ中のため、少し反応が遅れるかもしれません！終わり次第オフィスに戻ります。`;
            } else {
                // オープンスペース等
                if (userText.includes('打ち合わせ') || userText.includes('会議') || userText.includes('話')) {
                    replyText = `今オープンスペースにいますので、少時間（10分程度）の立ち話打ち合わせ、今すぐ大丈夫ですよ！そちらの席まで伺いましょうか？`;
                } else {
                    replyText = `了解しました！ありがとうございます。今オフィスフロアにいるので、直接そちらに向かうこともできますよ。`;
                }
            }

            const newReply = {
                id: Date.now() + 1,
                sender: 'them',
                text: replyText,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, newReply]);
        }, delay);
    };

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
                {messages.map(msg => (
                    <div 
                        key={msg.id}
                        className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`flex items-end space-x-2 max-w-[75%] ${msg.sender === 'me' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                            {msg.sender === 'them' && (
                                <img src={user.avatar_url} alt={user.name} className="w-6 h-6 rounded-md bg-gray-800" />
                            )}
                            <div className="flex flex-col">
                                <div className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm break-all ${
                                    msg.sender === 'me' 
                                        ? 'bg-indigo-600 text-white rounded-br-none' 
                                        : 'bg-gray-900 text-gray-200 border border-gray-800 rounded-bl-none'
                                }`}>
                                    {msg.text.includes('💻 ビデオ会議室へ入る') ? (
                                        <>
                                            {msg.text.split('➔')[0]} ➔ 
                                            <button 
                                                onClick={() => alert('ビデオチャットルームを起動します（モック）')}
                                                className="ml-1 text-cyan-400 font-bold hover:underline"
                                            >
                                                💻 ビデオ会議室へ入る
                                            </button>
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
