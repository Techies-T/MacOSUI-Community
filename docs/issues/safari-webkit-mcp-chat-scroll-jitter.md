# [Bug #6] Safari (WebKit) における MCP チャットクライアントの複数プロンプト実行時のスクロール巻き戻り・画面ちらつき

- **GitHub Issue**: [#6 (Techies-T/MacOSUI-oss)](https://github.com/Techies-T/MacOSUI-oss/issues/6)
- **Status**: Open (Chrome推奨 / 次回深掘り調査予定)

## 1. 概要 (Overview)
`McpChat`（MCPチャットクライアント）において、**1回目のプロンプトと回答がチャット画面上部に残っている状態で2回目のプロンプトを連続送信した際、画面が上部に引き戻されたり、スクロールが小刻みに振動・ちらつく**現象が発生する。

- **Chrome (Blink)**: 一切問題なく、極めてスムーズに下端へ追従し正常動作する。
- **Safari (WebKit)**: 2回目のプロンプト送信時に画面が上部に巻き戻る現象が確実に再現する。
- **条件付き回避策**: 1回目の実行後にチャット履歴をクリア（Clear Chat History）してから2回目を送信した場合は、Safari でも正常に動作する。

---

## 2. 環境情報 (Environment)
- **GitHub Issue**: #6
- **ブラウザ**: Safari (macOS WebKit)
- **比較対象**: Google Chrome (Blink) - 正常
- **対象コンポーネント**: `src/apps/McpChat.jsx`, `src/components/HtmlPreviewCodeBlock.jsx`, `src/components/Window.jsx`
- **対象バージョン**: v2.6.0 以降

---

## 3. これまでに判明した事実と挙動メカニズム (Key Findings)

### (1) ポーリングと親コンポーネント再レンダリングの分離（改修完了済み）
- **初期原因**: 親コンポーネント `McpChat` が 1.5 秒ごとのポーリング状態（`activeTask`）を保持していたため、親画面全体が毎秒〜1.5秒ごとに再レンダリングされていた。
- **改修内容**: ポーリングと経過秒数タイマーを子コンポーネント `TaskProgressIndicator` 内部に完全カプセル化。親コンポーネントのポーリング中再レンダリング回数「ゼロ」を達成。

### (2) Chrome と Safari の決定的な挙動差
- **Chrome では完全解決**: 親の再レンダリング停止とスクロールアンカーにより、Chrome では連続送信しても全くブレずにスムーズに動作。
- **Safari (WebKit) 特有の要因**:
  1. **`scrollIntoView` の祖先カスケード・スクロールバグ**:
     - WebKit では子要素の `scrollIntoView()` を呼び出すと、直近のスクロール枠だけでなく親のウィンドウ（`Window.jsx`）やデスクトップ全体まで連鎖してスクロールを狂わせるバグが存在する。
     - 対策として直接 `container.scrollTop = container.scrollHeight` を適用。
  2. **Safari Flexbox Overflow バグ (`min-h-0`)**:
     - Safari では `flex-col` 内で `overflow-y-auto` を持つ要素に `min-height: 0` がないと、コンテンツの全高で Flex アイテムが一時展開され、スクロール位置（`scrollTop`）が `0`（最上部）に強制リセットされる。
  3. **上部に残った過去ログ要素（特に iframe / HTMLプレビュー）の WebKit レンダリング干渉**:
     - 1 回目の結果に `HtmlPreviewCodeBlock`（iframe）が含まれている場合、新しいメッセージ追加時のレイアウト再計算で iframe の高さやスクロールコンテキストが WebKit 内部で競合している可能性。

---

## 4. これまでに実施した対策 (Applied Fixes)
1. **ポーリングとタイマーのカプセル化**:
   - `TaskProgressIndicator` にポーリング処理（`setInterval` / fetch）を完全委譲。
2. **スクロール関数の WebKit 向け直接指定**:
   - `scrollIntoView` を廃止し、`messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight` に統一。
3. **Flexbox 高さ破綻防止**:
   - チャット左ペインおよびメッセージコンテナに `min-h-0` および `overscroll-contain` を追加。
4. **送信時のフォーカス固定**:
   - 送信直後に `inputRef.current?.focus()` を呼出し、送信ボタン disabled によるフォーカス巻き戻りを防止。

---

## 5. 残課題と次回のアプローチ (Next Steps & Investigation)

時間ができた際に以下の観点から調査・修正を再開する：

1. **上部過去ログ要素の WebKit 仮想化または隔離**:
   - 1 つ目のメッセージブロック（特に `ReactMarkdown` や `HtmlPreviewCodeBlock` 内の iframe）に対して、WebKit のレイアウト再計算が伝播しないよう `contain: paint` または `content-visibility: auto` を適用する。
2. **Safari 開発者ツール（Web Inspector）でのトレース取得**:
   - Safari の「開発」メニュー ＞「要素」・「コンソール」にて、スクロールイベント発生時の `document.activeElement` および `event.target` のスタックトレースを捕捉。
3. **一時的な暫定運用**:
   - 連続してプロンプトを投げる場合は Google Chrome を使用する、または 1 回ごとにチャット履歴をクリア（またはウィンドウを開き直す）して利用する。
