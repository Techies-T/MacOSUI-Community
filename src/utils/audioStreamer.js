/**
 * AudioStreamer: Web Audio API を用いた Gemini Multimodal Live API 向け音声ストリーミング
 * - 録音 (Input): マイク音声 ➔ PCM 16kHz (16-bit Mono, Little Endian) ➔ Base64
 * - 再生 (Output): Gemini から届いた PCM 24kHz (16-bit Mono) ➔ キュー再生 ＆ 割り込み停止
 */

/**
 * Float32 配列 (-1.0 ~ 1.0) を Int16 配列 (-32768 ~ 32767) の Little-Endian バイト列へ変換
 */
function floatTo16BitPCM(float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
        let s = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Uint8Array(buffer);
}

/**
 * Float32 サンプル列を指定の入力サンプルレートから出力サンプルレート (デフォルト 16000Hz) へリサンプリング
 * (Safari / macOS 等でハードウェア標準の 48kHz / 44.1kHz で取得された音声を正確に 16kHz に変換)
 */
function downsampleBuffer(buffer, inputSampleRate, outputSampleRate = 16000) {
    if (inputSampleRate === outputSampleRate) {
        return buffer;
    }
    if (inputSampleRate < outputSampleRate) {
        return buffer;
    }
    const sampleRateRatio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
        const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
        // 平均化ダウンサンプリング (アンチエイリアシング効果)
        let accum = 0;
        let count = 0;
        for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
            accum += buffer[i];
            count++;
        }
        result[offsetResult] = count > 0 ? accum / count : 0;
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
    }
    return result;
}

/**
 * Uint8Array (バイナリ) を Base64 文字列へ変換
 */
function arrayBufferToBase64(bytes) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

/**
 * Base64 文字列を Float32Array (-1.0 ~ 1.0) へ変換 (PCM 16-bit レスポンス再生用)
 */
function base64ToFloat32Array(base64) {
    const binaryStr = window.atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }
    const dataView = new DataView(bytes.buffer);
    const numSamples = Math.floor(len / 2);
    const float32Array = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
        const int16 = dataView.getInt16(i * 2, true); // Little endian
        float32Array[i] = int16 < 0 ? int16 / 0x8000 : int16 / 0x7FFF;
    }
    return float32Array;
}

/**
 * マイク音声レコーダー (PCM 16kHz ストリーミング & スマート VAD 自動発話区間検知)
 */
export class AudioRecorder {
    constructor({ onAudioData, onVolumeChange, onSpeechTurnComplete, speechThreshold = 6, silenceDurationMs = 850 }) {
        this.onAudioData = onAudioData;
        this.onVolumeChange = onVolumeChange;
        this.onSpeechTurnComplete = onSpeechTurnComplete;
        this.speechThreshold = speechThreshold;
        this.silenceDurationMs = silenceDurationMs;
        this.audioContext = null;
        this.mediaStream = null;
        this.processor = null;
        this.source = null;
        this.isRecording = false;

        // スマート VAD 状態
        this.isSpeaking = false;
        this.speechChunks = [];
        this.preRollBuffer = [];
        this.silenceTimer = null;
    }

    commitSpeechTurn() {
        if (!this.isSpeaking || this.speechChunks.length === 0) return;
        this.isSpeaking = false;
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }

        let totalLen = 0;
        for (const chunk of this.speechChunks) {
            totalLen += chunk.length;
        }

        // 最低 0.4 秒以上 (~6400 samples at 16kHz) の発話がある場合にターンコミット
        if (totalLen >= 16000 * 0.4) {
            const combined = new Float32Array(totalLen);
            let offset = 0;
            for (const chunk of this.speechChunks) {
                combined.set(chunk, offset);
                offset += chunk.length;
            }

            const pcmBytes = floatTo16BitPCM(combined);
            const base64Data = arrayBufferToBase64(pcmBytes);

            if (this.onSpeechTurnComplete) {
                console.log(`[AudioRecorder] VAD Speech turn complete: ${totalLen} samples (~${(totalLen / 16000).toFixed(2)}s). Triggering response.`);
                this.onSpeechTurnComplete(base64Data);
            }
        }

        this.speechChunks = [];
    }

    async start() {
        if (this.isRecording) return;

        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContextClass();
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            const inputRate = this.audioContext.sampleRate;
            console.log(`[AudioRecorder] Hardware input sampleRate: ${inputRate}Hz. Will resample to 16000Hz.`);

            this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
            // 4096 サンプルバッファ (~85ms at 48kHz, ~250ms at 16kHz)
            this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

            this.processor.onaudioprocess = (e) => {
                if (!this.isRecording) return;
                const inputData = e.inputBuffer.getChannelData(0);

                // 音量 (RMS) の計算
                let sum = 0;
                for (let i = 0; i < inputData.length; i++) {
                    sum += inputData[i] * inputData[i];
                }
                const rms = Math.sqrt(sum / inputData.length);
                const volume = Math.min(100, Math.round(rms * 300));
                if (this.onVolumeChange) {
                    this.onVolumeChange(volume);
                }

                // 入力レート (48k/44.1k等) から 16kHz へ正確にリサンプリング
                const resampled16k = downsampleBuffer(inputData, inputRate, 16000);

                // リアルタイム波形・ストリーミング用の即時送信
                const pcmBytes = floatTo16BitPCM(resampled16k);
                const base64Data = arrayBufferToBase64(pcmBytes);
                if (this.onAudioData) {
                    this.onAudioData(base64Data);
                }

                // スマート VAD ロジック
                this.preRollBuffer.push(new Float32Array(resampled16k));
                if (this.preRollBuffer.length > 2) {
                    this.preRollBuffer.shift();
                }

                if (volume > this.speechThreshold) {
                    if (!this.isSpeaking) {
                        this.isSpeaking = true;
                        this.speechChunks = [...this.preRollBuffer];
                    } else {
                        this.speechChunks.push(new Float32Array(resampled16k));
                    }

                    if (this.silenceTimer) {
                        clearTimeout(this.silenceTimer);
                        this.silenceTimer = null;
                    }
                } else if (this.isSpeaking) {
                    this.speechChunks.push(new Float32Array(resampled16k));

                    if (!this.silenceTimer) {
                        this.silenceTimer = setTimeout(() => {
                            this.commitSpeechTurn();
                        }, this.silenceDurationMs);
                    }
                }
            };

            this.source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);

            this.isRecording = true;
            console.log('[AudioRecorder] Recording started with live 16kHz resampling and Smart VAD.');
        } catch (err) {
            console.error('[AudioRecorder] Failed to start microphone:', err);
            throw err;
        }
    }

    stop() {
        if (this.isSpeaking) {
            this.commitSpeechTurn();
        }
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
        this.isRecording = false;
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }
        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }
        if (this.audioContext) {
            this.audioContext.close().catch(() => {});
            this.audioContext = null;
        }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(t => t.stop());
            this.mediaStream = null;
        }
        if (this.onVolumeChange) {
            this.onVolumeChange(0);
        }
        console.log('[AudioRecorder] Recording stopped.');
    }
}

/**
 * 音声ストリーミングプレイヤー (Gemini PCM 24kHz スケジュール再生)
 */
export class AudioPlayer {
    constructor({ onVolumeChange, onPlaybackStateChange }) {
        this.onVolumeChange = onVolumeChange;
        this.onPlaybackStateChange = onPlaybackStateChange;
        this.audioContext = null;
        this.nextStartTime = 0;
        this.activeSources = [];
        this.sampleRate = 24000;
        this.isPlaying = false;
    }

    ensureContext() {
        if (!this.audioContext || this.audioContext.state === 'closed') {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContextClass({ sampleRate: this.sampleRate });
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    playChunk(base64Pcm) {
        if (!base64Pcm) return;
        this.ensureContext();

        try {
            const float32Data = base64ToFloat32Array(base64Pcm);
            if (float32Data.length === 0) return;

            // 再生音量の簡易計算
            if (this.onVolumeChange) {
                let sum = 0;
                for (let i = 0; i < Math.min(float32Data.length, 512); i++) {
                    sum += float32Data[i] * float32Data[i];
                }
                const rms = Math.sqrt(sum / Math.min(float32Data.length, 512));
                const volume = Math.min(100, Math.round(rms * 250));
                this.onVolumeChange(volume);
            }

            const audioBuffer = this.audioContext.createBuffer(1, float32Data.length, this.sampleRate);
            audioBuffer.copyToChannel(float32Data, 0);

            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext.destination);

            const currentTime = this.audioContext.currentTime;
            // 継ぎ目のない連続再生のためのタイムスケジューリング
            const startTime = Math.max(currentTime, this.nextStartTime);
            source.start(startTime);
            this.nextStartTime = startTime + audioBuffer.duration;

            this.activeSources.push(source);
            if (!this.isPlaying) {
                this.isPlaying = true;
                if (this.onPlaybackStateChange) this.onPlaybackStateChange(true);
            }

            source.onended = () => {
                const idx = this.activeSources.indexOf(source);
                if (idx !== -1) this.activeSources.splice(idx, 1);
                if (this.activeSources.length === 0) {
                    this.isPlaying = false;
                    this.nextStartTime = 0;
                    if (this.onPlaybackStateChange) this.onPlaybackStateChange(false);
                    if (this.onVolumeChange) this.onVolumeChange(0);
                }
            };
        } catch (err) {
            console.error('[AudioPlayer] Error playing audio chunk:', err);
        }
    }

    /**
     * 割り込み (ユーザーが喋り始めた時など) に即座に再生を中断
     */
    stop() {
        for (const src of this.activeSources) {
            try {
                src.stop();
                src.disconnect();
            } catch (_) {}
        }
        this.activeSources = [];
        this.nextStartTime = 0;
        this.isPlaying = false;
        if (this.onPlaybackStateChange) this.onPlaybackStateChange(false);
        if (this.onVolumeChange) this.onVolumeChange(0);
    }
}
