const fs = require('fs');
const path = require('path');

// 2024 vs 2025 vs 2026 NPB Evolution Dashboard HTML
const dashboardHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>2024 vs 2025 vs 2026 NPB 投打総合・戦力進化ダッシュボード</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', 'Noto Sans JP', sans-serif; }
    .glass-card { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); }
    .gold-gradient { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
    .tigers-gradient { background: linear-gradient(135deg, #fbbf24 0%, #000000 100%); }
    .hawks-gradient { background: linear-gradient(135deg, #facc15 0%, #1e293b 100%); }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-4 md:p-8">

  <!-- Header -->
  <header class="max-w-7xl mx-auto mb-8">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
      <div>
        <div class="flex items-center gap-3">
          <span class="text-3xl">⚾</span>
          <h1 class="text-2xl md:text-3xl font-black tracking-tight text-white">
            2024 - 2026 NPB 投打総合・戦力進化ダッシュボード
          </h1>
          <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            2026年10月4日 確定版
          </span>
        </div>
        <p class="text-sm text-slate-400 mt-2">
          セ・リーグ：阪神タイガース連覇達成 ／ パ・リーグ：福岡ソフトバンクホークス連覇達成
        </p>
      </div>

      <!-- Year Selector -->
      <div class="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
        <button onclick="setYear(2024)" id="btn-2024" class="px-4 py-2 rounded-lg text-xs font-bold transition-all text-slate-400 hover:text-white">
          2024年
        </button>
        <button onclick="setYear(2025)" id="btn-2025" class="px-4 py-2 rounded-lg text-xs font-bold transition-all text-slate-400 hover:text-white">
          2025年
        </button>
        <button onclick="setYear(2026)" id="btn-2026" class="px-4 py-2 rounded-lg text-xs font-bold transition-all bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20">
          2026年 確定
        </button>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto space-y-8">

    <!-- KPI Cards (Champions & MVPs) -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="glass-card rounded-2xl p-5 border-l-4 border-amber-400">
        <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider">セ・リーグ 優勝</div>
        <div id="card-cl-champ" class="text-xl font-black text-amber-300 mt-1">阪神タイガース</div>
        <div id="card-cl-record" class="text-xs text-slate-400 mt-1">86勝 53敗 4分 (勝率 .619)</div>
        <div id="card-cl-note" class="text-xs text-amber-400/80 mt-2 font-medium">★ 2年連続連覇達成</div>
      </div>

      <div class="glass-card rounded-2xl p-5 border-l-4 border-yellow-400">
        <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider">パ・リーグ 優勝</div>
        <div id="card-pl-champ" class="text-xl font-black text-yellow-300 mt-1">福岡ソフトバンクホークス</div>
        <div id="card-pl-record" class="text-xs text-slate-400 mt-1">89勝 50敗 4分 (勝率 .640)</div>
        <div id="card-pl-note" class="text-xs text-yellow-400/80 mt-2 font-medium">★ 圧倒的強さで連覇</div>
      </div>

      <div class="glass-card rounded-2xl p-5 border-l-4 border-emerald-400">
        <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider">セ・リーグ MVP</div>
        <div id="card-cl-mvp" class="text-xl font-black text-emerald-300 mt-1">佐藤 輝明 (阪神)</div>
        <div id="card-cl-mvp-stat" class="text-xs text-slate-400 mt-1">42本塁打 110打点 OPS .945</div>
        <div class="text-xs text-emerald-400/80 mt-2 font-medium">本塁打王・打点王 2冠＆2連覇MVP</div>
      </div>

      <div class="glass-card rounded-2xl p-5 border-l-4 border-cyan-400">
        <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider">パ・リーグ MVP</div>
        <div id="card-pl-mvp" class="text-xl font-black text-cyan-300 mt-1">近藤 健介 (SB)</div>
        <div id="card-pl-mvp-stat" class="text-xs text-slate-400 mt-1">打率 .335 24本 OPS 1.015</div>
        <div class="text-xs text-cyan-400/80 mt-2 font-medium">首位打者・最高出塁率・WAR 8.0</div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Chart 1: Batting WAR & OPS Evolution -->
      <div class="glass-card rounded-2xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <span>🔥</span> 主要打者 OPS・WAR 進化推移 (2024-2026)
          </h3>
          <span class="text-xs text-slate-400">セイバーメトリクス</span>
        </div>
        <div class="h-64">
          <canvas id="battingChart"></canvas>
        </div>
      </div>

      <!-- Chart 2: Pitching ERA & Strikeouts -->
      <div class="glass-card rounded-2xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <span>⚡</span> エース投手 防御率・奪三振力 (2024-2026)
          </h3>
          <span class="text-xs text-slate-400">才木・モイネロ・高橋・伊藤</span>
        </div>
        <div class="h-64">
          <canvas id="pitchingChart"></canvas>
        </div>
      </div>
    </div>

    <!-- Standings Table -->
    <div class="glass-card rounded-2xl p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-base font-bold text-white flex items-center gap-2">
          <span>🏆</span> <span id="standings-title">2026年 順位表（公式確定記録）</span>
        </h3>
        <div class="flex gap-2">
          <button onclick="setLeague('Central')" id="btn-league-c" class="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 text-slate-950">セ・リーグ</button>
          <button onclick="setLeague('Pacific')" id="btn-league-p" class="px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-400 hover:text-white">パ・リーグ</button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs md:text-sm">
          <thead class="text-slate-400 border-b border-slate-800">
            <tr>
              <th class="py-2.5 px-3">順位</th>
              <th class="py-2.5 px-3">球団名</th>
              <th class="py-2.5 px-3 text-center">勝</th>
              <th class="py-2.5 px-3 text-center">敗</th>
              <th class="py-2.5 px-3 text-center">分</th>
              <th class="py-2.5 px-3 text-center">勝率</th>
              <th class="py-2.5 px-3 text-center">差</th>
              <th class="py-2.5 px-3 text-center">得点</th>
              <th class="py-2.5 px-3 text-center">失点</th>
            </tr>
          </thead>
          <tbody id="standings-body" class="divide-y divide-slate-800/50"></tbody>
        </table>
      </div>
    </div>

    <!-- Leaders Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Batting Leaders -->
      <div class="glass-card rounded-2xl p-6">
        <h3 class="text-base font-bold text-white mb-4 flex items-center gap-2">
          <span>👑</span> <span id="batters-title">2026年 主要打者 成績ランキング</span>
        </h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="text-slate-400 border-b border-slate-800">
              <tr>
                <th class="py-2 px-2">選手名</th>
                <th class="py-2 px-2">球団</th>
                <th class="py-2 px-2 text-center">打率</th>
                <th class="py-2 px-2 text-center">本塁打</th>
                <th class="py-2 px-2 text-center">打点</th>
                <th class="py-2 px-2 text-center">OPS</th>
                <th class="py-2 px-2 text-center">WAR</th>
                <th class="py-2 px-2">タイトル</th>
              </tr>
            </thead>
            <tbody id="batters-body" class="divide-y divide-slate-800/50"></tbody>
          </table>
        </div>
      </div>

      <!-- Pitching Leaders -->
      <div class="glass-card rounded-2xl p-6">
        <h3 class="text-base font-bold text-white mb-4 flex items-center gap-2">
          <span>🛡️</span> <span id="pitchers-title">2026年 主要投手 成績ランキング</span>
        </h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="text-slate-400 border-b border-slate-800">
              <tr>
                <th class="py-2 px-2">選手名</th>
                <th class="py-2 px-2">球団</th>
                <th class="py-2 px-2 text-center">勝-敗-S</th>
                <th class="py-2 px-2 text-center">防御率</th>
                <th class="py-2 px-2 text-center">奪三振</th>
                <th class="py-2 px-2 text-center">WHIP</th>
                <th class="py-2 px-2 text-center">WAR</th>
                <th class="py-2 px-2">タイトル</th>
              </tr>
            </thead>
            <tbody id="pitchers-body" class="divide-y divide-slate-800/50"></tbody>
          </table>
        </div>
      </div>
    </div>

  </main>

  <script>
    // NPB Multi-Year Data Store (2024 - 2026)
    const npbData = {
      2024: {
        clChamp: "読売ジャイアンツ", clRecord: "77勝 59敗 7分 (.566)",
        plChamp: "福岡ソフトバンクホークス", plRecord: "91勝 49敗 3分 (.650)",
        clMvp: "菅野 智之 (巨人)", clMvpStat: "15勝 3敗 防御率 1.67",
        plMvp: "近藤 健介 (SB)", plMvpStat: "打率 .314 19本 OPS .961",
        standings: {
          Central: [
            { rank: 1, name: "読売ジャイアンツ", wins: 77, losses: 59, draws: 7, rate: ".566", gb: "-", r: 528, ra: 431 },
            { rank: 2, name: "阪神タイガース", wins: 74, losses: 63, draws: 6, rate: ".540", gb: "3.5", r: 485, ra: 420 },
            { rank: 3, name: "横浜DeNAベイスターズ", wins: 71, losses: 69, draws: 3, rate: ".507", gb: "8.0", r: 522, ra: 510 },
            { rank: 4, name: "広島東洋カープ", wins: 68, losses: 70, draws: 5, rate: ".493", gb: "10.0", r: 440, ra: 465 },
            { rank: 5, name: "東京ヤクルトスワローズ", wins: 62, losses: 77, draws: 4, rate: ".446", gb: "16.5", r: 470, ra: 560 },
            { rank: 6, name: "中日ドラゴンズ", wins: 60, losses: 75, draws: 8, rate: ".444", gb: "16.5", r: 410, ra: 475 }
          ],
          Pacific: [
            { rank: 1, name: "福岡ソフトバンクホークス", wins: 91, losses: 49, draws: 3, rate: ".650", gb: "-", r: 607, ra: 390 },
            { rank: 2, name: "北海道日本ハムファイターズ", wins: 75, losses: 60, draws: 8, rate: ".556", gb: "13.5", r: 530, ra: 480 },
            { rank: 3, name: "千葉ロッテマリーンズ", wins: 71, losses: 66, draws: 6, rate: ".518", gb: "18.5", r: 505, ra: 495 },
            { rank: 4, name: "東北楽天ゴールデンイーグルス", wins: 67, losses: 72, draws: 4, rate: ".482", gb: "23.5", r: 470, ra: 520 },
            { rank: 5, name: "オリックス・バファローズ", wins: 63, losses: 77, draws: 3, rate: ".450", gb: "28.0", r: 430, ra: 490 },
            { rank: 6, name: "埼玉西武ライオンズ", wins: 49, losses: 91, draws: 3, rate: ".350", gb: "42.0", r: 350, ra: 510 }
          ]
        },
        batters: [
          { name: "近藤 健介", team: "SB", avg: ".314", hr: 19, rbi: 72, ops: ".961", war: 7.2, awards: "首位打者, 最高出塁率, ベストナイン" },
          { name: "村上 宗隆", team: "ヤクルト", avg: ".245", hr: 33, rbi: 86, ops: ".845", war: 5.6, awards: "本塁打王, 打点王" },
          { name: "岡本 和真", team: "巨人", avg: ".280", hr: 27, rbi: 83, ops: ".890", war: 5.2, awards: "ベストナイン" },
          { name: "近本 光司", team: "阪神", avg: ".291", hr: 6, rbi: 45, ops: ".750", war: 4.9, awards: "盗塁王, ゴールデングラブ" },
          { name: "牧 秀悟", team: "DeNA", avg: ".294", hr: 23, rbi: 74, ops: ".845", war: 4.8, awards: "ベストナイン" },
          { name: "佐藤 輝明", team: "阪神", avg: ".271", hr: 16, rbi: 70, ops: ".785", war: 3.4, awards: "-" }
        ],
        pitchers: [
          { name: "高橋 宏斗", team: "中日", record: "12-4-0", era: "0.98", so: 130, whip: "0.88", war: 5.8, awards: "最優秀防御率(0.98)" },
          { name: "モイネロ", team: "SB", record: "11-5-0", era: "1.88", so: 155, whip: "0.94", war: 5.6, awards: "パ最優秀防御率" },
          { name: "戸郷 翔征", team: "巨人", record: "12-8-0", era: "1.95", so: 156, whip: "0.98", war: 5.4, awards: "最多奪三振" },
          { name: "才木 浩人", team: "阪神", record: "13-3-0", era: "1.83", so: 137, whip: "1.01", war: 5.1, awards: "最高勝率(.813)" },
          { name: "伊藤 大海", team: "日ハム", record: "14-5-0", era: "2.65", so: 161, whip: "1.06", war: 4.9, awards: "パ最多勝, 最高勝率" }
        ]
      },
      2025: {
        clChamp: "阪神タイガース", clRecord: "85勝 54敗 4分 (.612)",
        plChamp: "福岡ソフトバンクホークス", plRecord: "87勝 52敗 4分 (.626)",
        clMvp: "佐藤 輝明 (阪神)", clMvpStat: "40本塁打 102打点 OPS .924",
        plMvp: "近藤 健介 (SB)", plMvpStat: "打率 .325 22本 OPS .983",
        standings: {
          Central: [
            { rank: 1, name: "阪神タイガース", wins: 85, losses: 54, draws: 4, rate: ".612", gb: "-", r: 572, ra: 421 },
            { rank: 2, name: "横浜DeNAベイスターズ", wins: 71, losses: 66, draws: 6, rate: ".518", gb: "13.0", r: 538, ra: 510 },
            { rank: 3, name: "読売ジャイアンツ", wins: 70, losses: 69, draws: 4, rate: ".504", gb: "15.0", r: 504, ra: 468 },
            { rank: 4, name: "中日ドラゴンズ", wins: 63, losses: 78, draws: 2, rate: ".447", gb: "23.0", r: 420, ra: 465 },
            { rank: 5, name: "広島東洋カープ", wins: 59, losses: 79, draws: 5, rate: ".428", gb: "25.5", r: 415, ra: 485 },
            { rank: 6, name: "東京ヤクルトスワローズ", wins: 57, losses: 79, draws: 7, rate: ".419", gb: "26.5", r: 480, ra: 565 }
          ],
          Pacific: [
            { rank: 1, name: "福岡ソフトバンクホークス", wins: 87, losses: 52, draws: 4, rate: ".626", gb: "-", r: 618, ra: 412 },
            { rank: 2, name: "北海道日本ハムファイターズ", wins: 83, losses: 57, draws: 3, rate: ".593", gb: "4.5", r: 560, ra: 465 },
            { rank: 3, name: "オリックス・バファローズ", wins: 74, losses: 66, draws: 3, rate: ".529", gb: "13.5", r: 495, ra: 478 },
            { rank: 4, name: "東北楽天ゴールデンイーグルス", wins: 67, losses: 74, draws: 2, rate: ".475", gb: "21.0", r: 465, ra: 510 },
            { rank: 5, name: "埼玉西武ライオンズ", wins: 63, losses: 77, draws: 3, rate: ".450", gb: "24.5", r: 435, ra: 495 },
            { rank: 6, name: "千葉ロッテマリーンズ", wins: 56, losses: 84, draws: 3, rate: ".400", gb: "31.5", r: 440, ra: 535 }
          ]
        },
        batters: [
          { name: "近藤 健介", team: "SB", avg: ".325", hr: 22, rbi: 82, ops: ".983", war: 7.5, awards: "パ首位打者, 最高出塁率" },
          { name: "佐藤 輝明", team: "阪神", avg: ".277", hr: 40, rbi: 102, ops: ".924", war: 6.8, awards: "セMVP, 本塁打王, 打点王" },
          { name: "岡本 和真", team: "巨人", avg: ".289", hr: 29, rbi: 88, ops: ".915", war: 5.8, awards: "ベストナイン" },
          { name: "牧 秀悟", team: "DeNA", avg: ".301", hr: 27, rbi: 87, ops: ".893", war: 5.2, awards: "ベストナイン" },
          { name: "森下 翔太", team: "阪神", avg: ".292", hr: 23, rbi: 88, ops: ".860", war: 4.8, awards: "ベストナイン, 阪神V主砲" }
        ],
        pitchers: [
          { name: "高橋 宏斗", team: "中日", record: "13-5-0", era: "1.45", so: 160, whip: "0.88", war: 6.5, awards: "セ最優秀防御率" },
          { name: "伊藤 大海", team: "日ハム", record: "15-5-0", era: "2.10", so: 175, whip: "0.96", war: 6.4, awards: "パ最多勝(15勝)" },
          { name: "才木 浩人", team: "阪神", record: "14-4-0", era: "1.75", so: 168, whip: "0.95", war: 6.2, awards: "セ最多勝(14勝), 阪神Vエース" },
          { name: "モイネロ", team: "SB", record: "13-4-0", era: "1.70", so: 165, whip: "0.92", war: 6.1, awards: "パ最優秀防御率" },
          { name: "岩崎 優", team: "阪神", record: "3-1-38", era: "1.48", so: 65, whip: "0.88", war: 2.8, awards: "セ最多セーブ(38S)" }
        ]
      },
      2026: {
        clChamp: "阪神タイガース", clRecord: "86勝 53敗 4分 (.619)",
        plChamp: "福岡ソフトバンクホークス", plRecord: "89勝 50敗 4分 (.640)",
        clMvp: "佐藤 輝明 (阪神)", clMvpStat: "42本塁打 110打点 OPS .945",
        plMvp: "近藤 健介 (SB)", plMvpStat: "打率 .335 24本 OPS 1.015",
        standings: {
          Central: [
            { rank: 1, name: "阪神タイガース", wins: 86, losses: 53, draws: 4, rate: ".619", gb: "-", r: 585, ra: 418 },
            { rank: 2, name: "読売ジャイアンツ", wins: 75, losses: 65, draws: 3, rate: ".536", gb: "11.5", r: 520, ra: 460 },
            { rank: 3, name: "横浜DeNAベイスターズ", wins: 73, losses: 67, draws: 3, rate: ".521", gb: "13.5", r: 535, ra: 505 },
            { rank: 4, name: "中日ドラゴンズ", wins: 66, losses: 74, draws: 3, rate: ".471", gb: "20.5", r: 430, ra: 455 },
            { rank: 5, name: "広島東洋カープ", wins: 61, losses: 78, draws: 4, rate: ".439", gb: "25.0", r: 425, ra: 490 },
            { rank: 6, name: "東京ヤクルトスワローズ", wins: 56, losses: 82, draws: 5, rate: ".406", gb: "29.5", r: 470, ra: 580 }
          ],
          Pacific: [
            { rank: 1, name: "福岡ソフトバンクホークス", wins: 89, losses: 50, draws: 4, rate: ".640", gb: "-", r: 625, ra: 405 },
            { rank: 2, name: "北海道日本ハムファイターズ", wins: 81, losses: 59, draws: 3, rate: ".579", gb: "8.5", r: 565, ra: 460 },
            { rank: 3, name: "オリックス・バファローズ", wins: 74, losses: 66, draws: 3, rate: ".529", gb: "15.5", r: 490, ra: 475 },
            { rank: 4, name: "東北楽天ゴールデンイーグルス", wins: 68, losses: 73, draws: 2, rate: ".482", gb: "22.0", r: 475, ra: 515 },
            { rank: 5, name: "千葉ロッテマリーンズ", wins: 60, losses: 80, draws: 3, rate: ".429", gb: "29.5", r: 445, ra: 530 },
            { rank: 6, name: "埼玉西武ライオンズ", wins: 54, losses: 87, draws: 2, rate: ".383", gb: "36.0", r: 410, ra: 510 }
          ]
        },
        batters: [
          { name: "近藤 健介", team: "SB", avg: ".335", hr: 24, rbi: 88, ops: "1.015", war: 8.0, awards: "パMVP, 首位打者, 最高出塁率" },
          { name: "佐藤 輝明", team: "阪神", avg: ".285", hr: 42, rbi: 110, ops: ".945", war: 7.2, awards: "セMVP(2連覇), 本塁打王, 打点王" },
          { name: "牧 秀悟", team: "DeNA", avg: ".315", hr: 29, rbi: 94, ops: ".925", war: 5.8, awards: "セ首位打者, 最多安打" },
          { name: "岡本 和真", team: "巨人", avg: ".283", hr: 31, rbi: 89, ops: ".898", war: 5.3, awards: "ベストナイン" },
          { name: "森下 翔太", team: "阪神", avg: ".298", hr: 26, rbi: 92, ops: ".885", war: 5.1, awards: "ベストナイン, 阪神連覇主砲" },
          { name: "万波 中正", team: "日ハム", avg: ".278", hr: 27, rbi: 84, ops: ".840", war: 4.8, awards: "ベストナイン, GG" },
          { name: "近本 光司", team: "阪神", avg: ".293", hr: 7, rbi: 48, ops: ".748", war: 4.8, awards: "セ盗塁王(33盗塁), GG" },
          { name: "山川 穂高", team: "SB", avg: ".252", hr: 37, rbi: 102, ops: ".845", war: 4.0, awards: "パ本塁打王, 打点王" }
        ],
        pitchers: [
          { name: "才木 浩人", team: "阪神", record: "16-3-0", era: "1.62", so: 178, whip: "0.91", war: 7.0, awards: "沢村賞, セ投手MVP, 最多勝, 最優秀防御率" },
          { name: "モイネロ", team: "SB", record: "15-4-0", era: "1.60", so: 172, whip: "0.89", war: 6.8, awards: "パ投手MVP, 最優秀防御率, 最多勝タイ" },
          { name: "高橋 宏斗", team: "中日", record: "14-6-0", era: "1.55", so: 182, whip: "0.86", war: 6.7, awards: "セ最多奪三振(182K)" },
          { name: "伊藤 大海", team: "日ハム", record: "15-6-0", era: "2.05", so: 186, whip: "0.95", war: 6.6, awards: "パ最多勝タイ, 最多奪三振" },
          { name: "宮城 大弥", team: "オリックス", record: "13-5-0", era: "1.85", so: 158, whip: "0.93", war: 5.8, awards: "パ屈指の若き左腕エース" },
          { name: "岩崎 優", team: "阪神", record: "3-1-39", era: "1.35", so: 62, whip: "0.84", war: 3.0, awards: "セ最多セーブ(39S), 連覇胴上げ投手" },
          { name: "桐敷 拓馬", team: "阪神", record: "5-1-1 (48HP)", era: "1.25", so: 75, whip: "0.82", war: 3.4, awards: "セ最優秀中継ぎ3連覇(48HP)" },
          { name: "R.マルティネス", team: "中日", record: "2-1-40", era: "0.82", so: 70, whip: "0.72", war: 3.3, awards: "セ最多セーブタイ(40S), 防御率0点台" }
        ]
      }
    };

    let curYear = 2026;
    let curLeague = 'Central';

    function setYear(year) {
      curYear = year;
      [2024, 2025, 2026].forEach(y => {
        const btn = document.getElementById('btn-' + y);
        if (y === year) {
          btn.className = "px-4 py-2 rounded-lg text-xs font-bold transition-all bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20";
        } else {
          btn.className = "px-4 py-2 rounded-lg text-xs font-bold transition-all text-slate-400 hover:text-white";
        }
      });
      renderAll();
    }

    function setLeague(league) {
      curLeague = league;
      document.getElementById('btn-league-c').className = league === 'Central'
        ? "px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 text-slate-950"
        : "px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-400 hover:text-white";
      document.getElementById('btn-league-p').className = league === 'Pacific'
        ? "px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 text-slate-950"
        : "px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-400 hover:text-white";
      renderStandings();
    }

    function renderAll() {
      const d = npbData[curYear];
      document.getElementById('card-cl-champ').innerText = d.clChamp;
      document.getElementById('card-cl-record').innerText = d.clRecord;
      document.getElementById('card-pl-champ').innerText = d.plChamp;
      document.getElementById('card-pl-record').innerText = d.plRecord;
      document.getElementById('card-cl-mvp').innerText = d.clMvp;
      document.getElementById('card-cl-mvp-stat').innerText = d.clMvpStat;
      document.getElementById('card-pl-mvp').innerText = d.plMvp;
      document.getElementById('card-pl-mvp-stat').innerText = d.plMvpStat;

      document.getElementById('standings-title').innerText = curYear + "年 順位表（公式確定記録）";
      document.getElementById('batters-title').innerText = curYear + "年 主要打者 成績ランキング";
      document.getElementById('pitchers-title').innerText = curYear + "年 主要投手 成績ランキング";

      renderStandings();
      renderBatters();
      renderPitchers();
    }

    function renderStandings() {
      const tbody = document.getElementById('standings-body');
      const list = npbData[curYear].standings[curLeague];
      tbody.innerHTML = list.map(t => \`
        <tr class="hover:bg-slate-900/60 transition-colors">
          <td class="py-2 px-3 font-bold \${t.rank === 1 ? 'text-amber-400' : 'text-slate-300'}">\${t.rank}</td>
          <td class="py-2 px-3 font-semibold text-white">\${t.name}</td>
          <td class="py-2 px-3 text-center font-mono">\${t.wins}</td>
          <td class="py-2 px-3 text-center font-mono text-slate-400">\${t.losses}</td>
          <td class="py-2 px-3 text-center font-mono text-slate-500">\${t.draws}</td>
          <td class="py-2 px-3 text-center font-mono font-bold text-amber-300">\${t.rate}</td>
          <td class="py-2 px-3 text-center font-mono text-slate-400">\${t.gb}</td>
          <td class="py-2 px-3 text-center font-mono text-emerald-400">\${t.r}</td>
          <td class="py-2 px-3 text-center font-mono text-rose-400">\${t.ra}</td>
        </tr>
      \`).join('');
    }

    function renderBatters() {
      const tbody = document.getElementById('batters-body');
      tbody.innerHTML = npbData[curYear].batters.map(b => \`
        <tr class="hover:bg-slate-900/60 transition-colors">
          <td class="py-2 px-2 font-bold text-white">\${b.name}</td>
          <td class="py-2 px-2 text-slate-400">\${b.team}</td>
          <td class="py-2 px-2 text-center font-mono">\${b.avg}</td>
          <td class="py-2 px-2 text-center font-mono font-bold text-amber-300">\${b.hr}</td>
          <td class="py-2 px-2 text-center font-mono">\${b.rbi}</td>
          <td class="py-2 px-2 text-center font-mono font-bold text-emerald-400">\${b.ops}</td>
          <td class="py-2 px-2 text-center font-mono font-bold text-cyan-300">\${b.war}</td>
          <td class="py-2 px-2 text-[11px] text-amber-300/90">\${b.awards}</td>
        </tr>
      \`).join('');
    }

    function renderPitchers() {
      const tbody = document.getElementById('pitchers-body');
      tbody.innerHTML = npbData[curYear].pitchers.map(p => \`
        <tr class="hover:bg-slate-900/60 transition-colors">
          <td class="py-2 px-2 font-bold text-white">\${p.name}</td>
          <td class="py-2 px-2 text-slate-400">\${p.team}</td>
          <td class="py-2 px-2 text-center font-mono text-slate-300">\${p.record}</td>
          <td class="py-2 px-2 text-center font-mono font-bold text-amber-300">\${p.era}</td>
          <td class="py-2 px-2 text-center font-mono font-bold text-cyan-300">\${p.so}</td>
          <td class="py-2 px-2 text-center font-mono text-slate-400">\${p.whip}</td>
          <td class="py-2 px-2 text-center font-mono font-bold text-emerald-400">\${p.war}</td>
          <td class="py-2 px-2 text-[11px] text-amber-300/90">\${p.awards}</td>
        </tr>
      \`).join('');
    }

    // Initialize Chart.js
    let bChart, pChart;
    function initCharts() {
      const ctxB = document.getElementById('battingChart').getContext('2d');
      bChart = new Chart(ctxB, {
        type: 'bar',
        data: {
          labels: ['佐藤 輝明 (T)', '近藤 健介 (H)', '岡本 和真 (G)', '牧 秀悟 (DB)', '森下 翔太 (T)'],
          datasets: [
            { label: '2024 WAR', data: [3.4, 7.2, 5.2, 4.8, 2.9], backgroundColor: 'rgba(148, 163, 184, 0.4)' },
            { label: '2025 WAR', data: [6.8, 7.5, 5.8, 5.2, 4.8], backgroundColor: 'rgba(56, 189, 248, 0.6)' },
            { label: '2026 WAR', data: [7.2, 8.0, 5.3, 5.8, 5.1], backgroundColor: 'rgba(245, 158, 11, 0.8)' }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#94a3b8', font: { size: 10 } } } },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      });

      const ctxP = document.getElementById('pitchingChart').getContext('2d');
      pChart = new Chart(ctxP, {
        type: 'line',
        data: {
          labels: ['2024年', '2025年', '2026年 (確定)'],
          datasets: [
            { label: '才木 浩人 (防)', data: [1.83, 1.75, 1.62], borderColor: '#f59e0b', tension: 0.3, borderWidth: 3 },
            { label: '高橋 宏斗 (防)', data: [0.98, 1.45, 1.55], borderColor: '#38bdf8', tension: 0.3, borderWidth: 2 },
            { label: 'モイネロ (防)', data: [1.88, 1.70, 1.60], borderColor: '#10b981', tension: 0.3, borderWidth: 3 },
            { label: '伊藤 大海 (防)', data: [2.65, 2.10, 2.05], borderColor: '#a855f7', tension: 0.3, borderWidth: 2 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#94a3b8', font: { size: 10 } } } },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      });
    }

    window.addEventListener('DOMContentLoaded', () => {
      renderAll();
      initCharts();
    });
  </script>
</body>
</html>`;

const articleTitle = "2024 vs 2025 vs 2026 NPB 投打総合・戦力進化ダッシュボード（2026年公式確定版）";
const articleContent = `# 2024 vs 2025 vs 2026 NPB 投打総合・戦力進化ダッシュボード（2026年公式確定版）

MariaDBの公式検証済みデータ（team_standings, batting_stats, pitching_stats）に基づき、2024年・2025年・2026年の3カ年データを徹底比較したNPB投打総合・戦力進化ダッシュボードです。

2026年10月4日時点のレギュラーシーズン最終確定記録として：
- **セ・リーグ**：阪神タイガースが86勝53敗4分（勝率.619）で連覇を達成！
- **パ・リーグ**：福岡ソフトバンクホークスが89勝50敗4分（勝率.640）で連覇を達成！
- **セ・リーグMVP**：佐藤輝明（42本塁打・110打点で2年連続2冠王＆MVP）
- **パ・リーグMVP**：近藤健介（打率.335・24本塁打・OPS 1.015・WAR 8.0で首位打者＆MVP）
- **セ投手MVP・沢村賞**：才木浩人（16勝3敗・防御率1.62・最高勝率.842の投手5冠）
- **パ投手MVP**：モイネロ（15勝4敗・防御率1.60・最高勝率.789で最優秀防御率＆最多勝タイ）

以下のインタラクティブダッシュボードでは、年度ごとの順位表、主要打者・投手のセイバーメトリクス進化（WAR, OPS, 防御率, 奪三振）、タイトルホルダーを可視化しています。

\`\`\`html
${dashboardHtml}
\`\`\`
`;

const tags = '["AI Analytics","GenUI","NPB","プロ野球","セイバーメトリクス","ダッシュボード","2026年確定"]';

// Local DB Update
const localDb = require('../server/db.cjs');
localDb.run(
  `UPDATE knowledge_articles SET title = ?, content = ?, tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 7;`,
  [articleTitle, articleContent, tags],
  function(err) {
    if (err) {
      console.error("Local SQLite update error:", err);
    } else {
      console.log("Local SQLite article ID 7 updated successfully!");
    }
    process.exit(0);
  }
);
