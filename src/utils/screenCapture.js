/**
 * ScreenCaptureManager: ブラウザ標準の画面共有 API (getDisplayMedia) を用いたリアルタイムフレームキャプチャ
 * - ユーザーの許可のもと画面映像を取得
 * - Canvas 経由で毎秒1回 (1 FPS) の軽量 JPEG フレームとして抽出
 * - Gemini Multimodal Live API への送信およびローカルプレビュー用データを提供
 */

export class ScreenCaptureManager {
    constructor({ onFrame, onStopped }) {
        this.onFrame = onFrame;
        this.onStopped = onStopped;
        this.mediaStream = null;
        this.videoElement = null;
        this.canvasElement = null;
        this.canvasCtx = null;
        this.intervalId = null;
        this.isCapturing = false;
        this.targetWidth = 1024;
        this.targetHeight = 768;
    }

    async startCapture(fps = 1) {
        if (this.isCapturing) return;

        try {
            // 画面共有 API の呼び出し (Safari 互換フォールバック付き)
            try {
                this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        frameRate: { ideal: fps, max: 5 }
                    },
                    audio: false
                });
            } catch (err) {
                console.warn('[ScreenCapture] Detailed constraints failed, falling back to basic constraints (Safari compatibility):', err);
                this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: false
                });
            }

            // 不可視の Video 要素を生成
            this.videoElement = document.createElement('video');
            this.videoElement.srcObject = this.mediaStream;
            this.videoElement.muted = true;
            this.videoElement.autoplay = true;
            this.videoElement.playsInline = true;
            this.videoElement.setAttribute('playsinline', '');
            this.videoElement.setAttribute('webkit-playsinline', '');
            await this.videoElement.play().catch(e => console.warn('[ScreenCapture] video play error:', e));

            // 不可視の Canvas 要素を生成
            this.canvasElement = document.createElement('canvas');
            this.canvasCtx = this.canvasElement.getContext('2d');

            // ユーザーがブラウザ標準バーの「共有を停止」を押した時の検知
            const videoTrack = this.mediaStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.onended = () => {
                    console.log('[ScreenCapture] Display media track ended by user.');
                    this.stopCapture();
                    if (this.onStopped) this.onStopped();
                };
            }

            this.isCapturing = true;

            // 定期的なフレームサンプリング (デフォルト: 1秒に1回)
            const intervalMs = Math.round(1000 / fps);
            this.intervalId = setInterval(() => {
                this.captureFrame();
            }, intervalMs);

            // 初回フレームを即時取得
            setTimeout(() => this.captureFrame(), 300);

            console.log(`[ScreenCapture] Screen capture started (${fps} FPS).`);
        } catch (err) {
            console.error('[ScreenCapture] Failed to start display media:', err);
            this.stopCapture();
            throw err;
        }
    }

    captureFrame() {
        if (!this.isCapturing || !this.videoElement || !this.canvasElement || !this.canvasCtx) return;
        if (this.videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

        const videoW = this.videoElement.videoWidth;
        const videoH = this.videoElement.videoHeight;
        if (videoW === 0 || videoH === 0) return;

        // アスペクト比を維持してスケーリング (最大 1024x768 程度に抑えて帯域節約)
        const scale = Math.min(this.targetWidth / videoW, this.targetHeight / videoH, 1);
        const drawW = Math.round(videoW * scale);
        const drawH = Math.round(videoH * scale);

        this.canvasElement.width = drawW;
        this.canvasElement.height = drawH;

        // 描画
        this.canvasCtx.drawImage(this.videoElement, 0, 0, drawW, drawH);

        // JPEG Base64 (品質 0.75 で軽量化)
        const dataUrl = this.canvasElement.toDataURL('image/jpeg', 0.75);
        const base64Data = dataUrl.split(',')[1];

        if (this.onFrame) {
            this.onFrame({
                base64Data,
                previewUrl: dataUrl,
                width: drawW,
                height: drawH
            });
        }
    }

    stopCapture() {
        this.isCapturing = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(t => t.stop());
            this.mediaStream = null;
        }
        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement.srcObject = null;
            this.videoElement = null;
        }
        this.canvasElement = null;
        this.canvasCtx = null;
        console.log('[ScreenCapture] Screen capture stopped.');
    }
}
