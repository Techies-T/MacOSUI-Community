import React, { useState, useRef, useEffect } from 'react';

const AvatarCreatorModal = ({ onClose, onAvatarUpdate }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [stage, setStage] = useState('camera'); // 'camera', 'preview', 'generating', 'success', 'error'
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        // Start camera when component mounts
        startCamera();
        return () => {
            // Cleanup stream when component unmounts
            stopCamera();
        };
    }, []);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 512 }, height: { ideal: 512 } }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            setErrorMsg('カメラへのアクセスに失敗しました。権限を確認してください。');
            setStage('error');
        }
    };

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const captureImage = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            
            // Try to make it square
            const size = Math.min(video.videoWidth, video.videoHeight);
            canvas.width = size;
            canvas.height = size;
            
            const ctx = canvas.getContext('2d');
            // Crop from center
            const startX = (video.videoWidth - size) / 2;
            const startY = (video.videoHeight - size) / 2;
            
            // Draw image horizontally flipped (mirror)
            ctx.translate(size, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);
            
            // Get base64 Data URL (e.g. data:image/png;base64,....)
            const dataUrl = canvas.toDataURL('image/png');
            setCapturedImage(dataUrl);
            stopCamera();
            setStage('preview');
        }
    };

    const retakePhoto = () => {
        setCapturedImage(null);
        setStage('camera');
        startCamera();
    };

    const pollGeminiJob = (jobId) => {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const pollInterval = setInterval(async () => {
                attempts++;
                try {
                    const res = await fetch(`/api/gemini/job/${jobId}`);
                    const data = await res.json();
                    if (data.state === 'completed') {
                        clearInterval(pollInterval);
                        resolve(data.reply);
                    } else if (data.state === 'error') {
                        clearInterval(pollInterval);
                        reject(new Error(data.error));
                    } else if (attempts >= 120) { // 2 mins timeout
                        clearInterval(pollInterval);
                        reject(new Error("Generation timed out."));
                    }
                } catch (err) {
                    clearInterval(pollInterval);
                    reject(new Error("Network error during polling."));
                }
            }, 1000);
        });
    };

    const generateAvatar = async () => {
        setStage('generating');
        try {
            // Extract pure base64 data without data URL prefix
            const base64Data = capturedImage.split(',')[1];
            
            // Step 1: Describe the image using default RAG mode (or normal mode)
            const descReq = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: "この人物の特徴（髪型、髪の色、目の特徴、表情、服装、アクセサリーなど）を詳細に描写してください。性別や年齢の推定も含めてください。アバター生成のプロンプトとして利用します。",
                    images: [{ data: base64Data, mimeType: 'image/png' }],
                    config: { mode: 'normal' }
                })
            });
            const descData = await descReq.json();
            if (!descReq.ok) throw new Error(descData.error || "Failed to analyze image");
            
            const description = await pollGeminiJob(descData.jobId);
            
            // Step 2: Generate the avatar using nanobanana mode
            const genReq = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `以下の人物の特徴を元に、高品質で魅力的なアニメ調（Anime style）のアバター画像を1枚生成してください。背景はシンプルにしてください。\n\n【人物の特徴】\n${description}`,
                    config: { mode: 'nanobanana', aspectRatio: '1:1' }
                })
            });
            const genData = await genReq.json();
            if (!genReq.ok) throw new Error(genData.error || "Failed to generate avatar");
            
            const finalImageJson = await pollGeminiJob(genData.jobId);
            const imgData = JSON.parse(finalImageJson);
            const newAvatarUrl = `data:${imgData.mimeType};base64,${imgData.data}`;
            
            // Step 3: Save to user profile
            const saveReq = await fetch('/api/users/me/avatar', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ avatar_url: newAvatarUrl })
            });
            
            if (!saveReq.ok) throw new Error("Failed to save avatar to profile");
            
            setStage('success');
            setTimeout(() => {
                onAvatarUpdate(newAvatarUrl);
                onClose();
            }, 1500);
            
        } catch (error) {
            console.error("Avatar generation error:", error);
            setErrorMsg(error.message || 'アバターの生成に失敗しました。');
            setStage('error');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative text-white">
                <div className="flex justify-between items-center p-4 border-b border-white/10">
                    <h3 className="font-bold text-lg">AI Avatar Creator</h3>
                    <button onClick={() => { stopCamera(); onClose(); }} className="text-gray-400 hover:text-white p-1 rounded-md transition-colors">
                        ✕
                    </button>
                </div>
                
                <div className="p-6 flex flex-col items-center">
                    {stage === 'camera' && (
                        <>
                            <div className="w-64 h-64 bg-black rounded-full overflow-hidden shadow-inner border-4 border-indigo-500/30 mb-6 relative">
                                <video 
                                    ref={videoRef} 
                                    autoPlay 
                                    playsInline 
                                    className="w-full h-full object-cover" 
                                    style={{ transform: 'scaleX(-1)' }}
                                />
                                <div className="absolute inset-0 border-2 border-dashed border-white/20 rounded-full pointer-events-none"></div>
                            </div>
                            <button 
                                onClick={captureImage}
                                className="bg-white text-black font-bold px-8 py-3 rounded-full hover:bg-gray-200 transition-transform active:scale-95 shadow-lg flex items-center gap-2"
                            >
                                📸 写真を撮る
                            </button>
                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                        </>
                    )}
                    
                    {stage === 'preview' && (
                        <>
                            <div className="w-64 h-64 bg-black rounded-full overflow-hidden shadow-xl border-4 border-indigo-500 mb-6">
                                <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex gap-4">
                                <button 
                                    onClick={retakePhoto}
                                    className="bg-gray-700 text-white font-medium px-6 py-3 rounded-full hover:bg-gray-600 transition-colors"
                                >
                                    撮り直す
                                </button>
                                <button 
                                    onClick={generateAvatar}
                                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold px-6 py-3 rounded-full hover:opacity-90 transition-transform active:scale-95 shadow-lg flex items-center gap-2"
                                >
                                    ✨ アバターを生成
                                </button>
                            </div>
                        </>
                    )}
                    
                    {stage === 'generating' && (
                        <div className="flex flex-col items-center justify-center py-8">
                            <div className="w-24 h-24 mb-6 relative">
                                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
                                <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center text-3xl">✨</div>
                            </div>
                            <h4 className="font-bold text-lg mb-2">アバター生成中...</h4>
                            <p className="text-gray-400 text-sm text-center max-w-xs leading-relaxed">
                                AIがあなたの特徴を分析し、<br />Nano Banana 2でアニメ調のアバターを描いています。
                            </p>
                        </div>
                    )}
                    
                    {stage === 'success' && (
                        <div className="flex flex-col items-center justify-center py-8">
                            <div className="w-24 h-24 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-4xl mb-4">
                                ✓
                            </div>
                            <h4 className="font-bold text-lg">保存完了！</h4>
                        </div>
                    )}
                    
                    {stage === 'error' && (
                        <div className="flex flex-col items-center justify-center py-4">
                            <div className="w-20 h-20 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center text-3xl mb-4">
                                ⚠
                            </div>
                            <h4 className="font-bold text-lg mb-2 text-red-400">エラーが発生しました</h4>
                            <p className="text-gray-400 text-sm text-center mb-6">{errorMsg}</p>
                            <button 
                                onClick={retakePhoto}
                                className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-lg transition-colors"
                            >
                                やり直す
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AvatarCreatorModal;
