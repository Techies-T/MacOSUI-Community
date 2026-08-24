import React, { useState, useEffect } from 'react';

// 天気の種類に対応するアニメーションアイコンコンポーネント
const WeatherIcon = ({ type, size = 48 }) => {
    const s = size;

    switch (type) {
        case 'sunny':
            return (
                <svg width={s} height={s} viewBox="0 0 100 100" className="drop-shadow-lg">
                    <circle cx="50" cy="50" r="22" fill="url(#sunny-grad)" />
                    <g className="animate-spin-slow" style={{ transformOrigin: '50px 50px' }}>
                        {[...Array(8)].map((_, i) => (
                            <line
                                key={i}
                                x1="50"
                                y1="12"
                                x2="50"
                                y2="24"
                                stroke="#FFB03A"
                                strokeWidth="6"
                                strokeLinecap="round"
                                transform={`rotate(${i * 45} 50 50)`}
                            />
                        ))}
                    </g>
                    <defs>
                        <linearGradient id="sunny-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FFA000" />
                            <stop offset="100%" stopColor="#FF5722" />
                        </linearGradient>
                    </defs>
                </svg>
            );
        case 'rainy':
            return (
                <svg width={s} height={s} viewBox="0 0 100 100" className="drop-shadow-lg">
                    <path
                        d="M32 60 A18 18 0 0 1 36 24 A22 22 0 0 1 72 26 A16 16 0 0 1 74 58 Z"
                        fill="url(#cloud-grad)"
                    />
                    <g className="rain-drops">
                        <line x1="38" y1="65" x2="33" y2="78" stroke="#4FC3F7" strokeWidth="4" strokeLinecap="round" className="animate-rain-drop-1" />
                        <line x1="52" y1="68" x2="47" y2="82" stroke="#00B0FF" strokeWidth="4" strokeLinecap="round" className="animate-rain-drop-2" />
                        <line x1="66" y1="64" x2="61" y2="77" stroke="#4FC3F7" strokeWidth="4" strokeLinecap="round" className="animate-rain-drop-3" />
                    </g>
                    <defs>
                        <linearGradient id="cloud-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#B0BEC5" />
                            <stop offset="100%" stopColor="#546E7A" />
                        </linearGradient>
                    </defs>
                </svg>
            );
        case 'snowy':
            return (
                <svg width={s} height={s} viewBox="0 0 100 100" className="drop-shadow-lg">
                    <path
                        d="M32 60 A18 18 0 0 1 36 24 A22 22 0 0 1 72 26 A16 16 0 0 1 74 58 Z"
                        fill="url(#snow-cloud-grad)"
                    />
                    <g className="snow-flakes">
                        <circle cx="36" cy="70" r="3.5" fill="#FFFFFF" className="animate-snow-flake-1" />
                        <circle cx="50" cy="75" r="4.5" fill="#E0F7FA" className="animate-snow-flake-2" />
                        <circle cx="64" cy="69" r="3.5" fill="#FFFFFF" className="animate-snow-flake-3" />
                    </g>
                    <defs>
                        <linearGradient id="snow-cloud-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#ECEFF1" />
                            <stop offset="100%" stopColor="#90A4AE" />
                        </linearGradient>
                    </defs>
                </svg>
            );
        case 'cloudy':
        default:
            return (
                <svg width={s} height={s} viewBox="0 0 100 100" className="drop-shadow-lg">
                    <circle cx="38" cy="38" r="14" fill="#FFA726" className="animate-pulse" style={{ opacity: 0.6 }} />
                    <path
                        d="M30 62 A16 16 0 0 1 34 30 A20 20 0 0 1 68 32 A14 14 0 0 1 70 60 Z"
                        fill="url(#cloudy-cloud-grad)"
                        className="animate-float"
                    />
                    <defs>
                        <linearGradient id="cloudy-cloud-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#FFFFFF" />
                            <stop offset="100%" stopColor="#CFD8DC" />
                        </linearGradient>
                    </defs>
                </svg>
            );
    }
};

// SVG で描く気温推移の薄い背景折れ線グラフ
const TempChartLine = ({ points }) => {
    if (!points || points.length === 0) return null;

    const width = 500;
    const height = 60;
    const paddingX = 40;
    const paddingY = 15;

    const temps = points.map(p => p.temp);
    const minTemp = Math.min(...temps) - 1;
    const maxTemp = Math.max(...temps) + 1;
    const tempRange = maxTemp - minTemp || 1;

    // 座標計算
    const getX = (index) => paddingX + (index * (width - 2 * paddingX)) / (points.length - 1);
    const getY = (temp) => height - paddingY - ((temp - minTemp) / tempRange) * (height - 2 * paddingY);

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.temp)}`).join(' ');
    const areaPathData = `${pathData} L ${getX(points.length - 1)} ${height} L ${getX(0)} ${height} Z`;

    return (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="absolute bottom-0 left-0 right-0 overflow-visible pointer-events-none opacity-20">
            <defs>
                <linearGradient id="chart-area-grad-2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.0" />
                </linearGradient>
            </defs>
            <path d={areaPathData} fill="url(#chart-area-grad-2)" />
            <path d={pathData} fill="none" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
};

// 円形の降水確率インジケーター
const PopIndicator = ({ value }) => {
    const r = 24;
    const circ = 2 * Math.PI * r;
    const strokeDashoffset = circ - (value / 100) * circ;

    return (
        <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10 w-full">
            <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
                <svg width="48" height="48" className="transform -rotate-90">
                    <circle cx="24" cy="24" r={r} fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                    <circle
                        cx="24"
                        cy="24"
                        r={r}
                        fill="transparent"
                        stroke="#29B6F6"
                        strokeWidth="4"
                        strokeDasharray={circ}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[11px] font-bold text-white leading-none">{value}%</span>
                </div>
            </div>
            <div>
                <div className="text-[10px] text-white/50 leading-none">降水確率</div>
                <div className="text-xs font-bold text-white mt-1">
                    {value >= 50 ? '雨具のご用意を ☔' : value >= 20 ? '傘があると安心 ☂️' : 'お出かけ日和 ☀️'}
                </div>
            </div>
        </div>
    );
};

// メインコンポーネント (地図を廃止し、グラスモーフィック2時間おきタイムライン一覧へ刷新)
const WeatherForecastMap = ({ data }) => {
    // 2時間ごとの時間帯デフォルト予報データ
    const defaultData = {
        date: new Date().toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' }),
        comment: "全国的に高気圧に覆われて穏やかに晴れますが、北日本は一時的な気圧の谷の通過で急な雨にご注意ください。",
        cities: [
            { 
                id: "sapporo", name: "札幌", weather: "晴れ時々曇り", type: "sunny", tempMax: 24, tempMin: 13, pop: 30, humidity: 55, 
                hourly: [
                    { time: '08:00', temp: 15, weather: '晴れ', type: 'sunny' },
                    { time: '10:00', temp: 19, weather: '晴れ', type: 'sunny' },
                    { time: '12:00', temp: 24, weather: '曇り', type: 'cloudy' },
                    { time: '14:00', temp: 23, weather: '曇り', type: 'cloudy' },
                    { time: '16:00', temp: 20, weather: 'にわか雨', type: 'rainy' },
                    { time: '18:00', temp: 17, weather: '曇り', type: 'cloudy' },
                    { time: '20:00', temp: 14, weather: '快晴', type: 'sunny' }
                ]
            },
            { 
                id: "sendai", name: "仙台", weather: "曇り時々晴れ", type: "cloudy", tempMax: 23, tempMin: 16, pop: 30, humidity: 65, 
                hourly: [
                    { time: '08:00', temp: 17, weather: '曇り', type: 'cloudy' },
                    { time: '10:00', temp: 20, weather: '曇り', type: 'cloudy' },
                    { time: '12:00', temp: 23, weather: '晴れ間', type: 'cloudy' },
                    { time: '14:00', temp: 22, weather: '晴れ', type: 'sunny' },
                    { time: '16:00', temp: 20, weather: '曇り', type: 'cloudy' },
                    { time: '18:00', temp: 18, weather: '曇り', type: 'cloudy' },
                    { time: '20:00', temp: 16, weather: '曇り', type: 'cloudy' }
                ]
            },
            { 
                id: "tokyo", name: "東京", weather: "晴れのち曇り", type: "sunny", tempMax: 28, tempMin: 18, pop: 20, humidity: 60, 
                hourly: [
                    { time: '08:00', temp: 19, weather: '晴れ', type: 'sunny' },
                    { time: '10:00', temp: 24, weather: '快晴', type: 'sunny' },
                    { time: '12:00', temp: 28, weather: '快晴', type: 'sunny' },
                    { time: '14:00', temp: 27, weather: '晴れ', type: 'sunny' },
                    { time: '16:00', temp: 25, weather: '薄曇り', type: 'cloudy' },
                    { time: '18:00', temp: 22, weather: '曇り', type: 'cloudy' },
                    { time: '20:00', temp: 19, weather: '曇り', type: 'cloudy' }
                ]
            },
            { 
                id: "niigata", name: "新潟", weather: "曇り", type: "cloudy", tempMax: 25, tempMin: 17, pop: 30, humidity: 65, 
                hourly: [
                    { time: '08:00', temp: 18, weather: '曇り', type: 'cloudy' },
                    { time: '10:00', temp: 21, weather: '曇り', type: 'cloudy' },
                    { time: '12:00', temp: 25, weather: '小雨', type: 'rainy' },
                    { time: '14:00', temp: 24, weather: '曇り', type: 'cloudy' },
                    { time: '16:00', temp: 22, weather: '曇り', type: 'cloudy' },
                    { time: '18:00', temp: 20, weather: '晴れ間', type: 'cloudy' },
                    { time: '20:00', temp: 18, weather: '晴れ', type: 'sunny' }
                ]
            },
            { 
                id: "nagoya", name: "名古屋", weather: "曇りのち晴れ", type: "cloudy", tempMax: 28, tempMin: 20, pop: 30, humidity: 60, 
                hourly: [
                    { time: '08:00', temp: 21, weather: '曇り', type: 'cloudy' },
                    { time: '10:00', temp: 25, weather: '曇り', type: 'cloudy' },
                    { time: '12:00', temp: 28, weather: '晴れ', type: 'sunny' },
                    { time: '14:00', temp: 27, weather: '晴れ', type: 'sunny' },
                    { time: '16:00', temp: 25, weather: '快晴', type: 'sunny' },
                    { time: '18:00', temp: 23, weather: '快晴', type: 'sunny' },
                    { time: '20:00', temp: 21, weather: '晴れ', type: 'sunny' }
                ]
            },
            { 
                id: "osaka", name: "大阪", weather: "晴れ時々曇り", type: "sunny", tempMax: 31, tempMin: 20, pop: 20, humidity: 55, 
                hourly: [
                    { time: '08:00', temp: 22, weather: '晴れ', type: 'sunny' },
                    { time: '10:00', temp: 27, weather: '晴れ', type: 'sunny' },
                    { time: '12:00', temp: 31, weather: '晴れ間', type: 'cloudy' },
                    { time: '14:00', temp: 30, weather: '曇り', type: 'cloudy' },
                    { time: '16:00', temp: 28, weather: '晴れ', type: 'sunny' },
                    { time: '18:00', temp: 25, weather: '快晴', type: 'sunny' },
                    { time: '20:00', temp: 22, weather: '快晴', type: 'sunny' }
                ]
            },
            { 
                id: "hiroshima", name: "広島", weather: "晴れのち曇り", type: "sunny", tempMax: 29, tempMin: 20, pop: 30, humidity: 65, 
                hourly: [
                    { time: '08:00', temp: 21, weather: '晴れ', type: 'sunny' },
                    { time: '10:00', temp: 26, weather: '晴れ', type: 'sunny' },
                    { time: '12:00', temp: 29, weather: '薄曇り', type: 'cloudy' },
                    { time: '14:00', temp: 28, weather: '曇り', type: 'cloudy' },
                    { time: '16:00', temp: 26, weather: '曇り', type: 'cloudy' },
                    { time: '18:00', temp: 24, weather: '曇り', type: 'cloudy' },
                    { time: '20:00', temp: 21, weather: '雨のち曇り', type: 'cloudy' }
                ]
            },
            { 
                id: "takamatsu", name: "高松", weather: "晴れ", type: "sunny", tempMax: 30, tempMin: 19, pop: 10, humidity: 55, 
                hourly: [
                    { time: '08:00', temp: 20, weather: '快晴', type: 'sunny' },
                    { time: '10:00', temp: 26, weather: '快晴', type: 'sunny' },
                    { time: '12:00', temp: 30, weather: '晴れ', type: 'sunny' },
                    { time: '14:00', temp: 29, weather: '晴れ', type: 'sunny' },
                    { time: '16:00', temp: 27, weather: '晴れ', type: 'sunny' },
                    { time: '18:00', temp: 24, weather: '快晴', type: 'sunny' },
                    { time: '20:00', temp: 20, weather: '快晴', type: 'sunny' }
                ]
            },
            { 
                id: "fukuoka", name: "福岡", weather: "晴れのち雨", type: "rainy", tempMax: 29, tempMin: 22, pop: 70, humidity: 75, 
                hourly: [
                    { time: '08:00', temp: 23, weather: '晴れ', type: 'sunny' },
                    { time: '10:00', temp: 27, weather: '晴れ間', type: 'cloudy' },
                    { time: '12:00', temp: 29, weather: '曇り', type: 'cloudy' },
                    { time: '14:00', temp: 28, weather: '小雨', type: 'rainy' },
                    { time: '16:00', temp: 26, weather: '雨', type: 'rainy' },
                    { time: '18:00', temp: 24, weather: '本降り', type: 'rainy' },
                    { time: '20:00', temp: 22, weather: '本降り', type: 'rainy' }
                ]
            },
            { 
                id: "naha", name: "那覇", weather: "晴れ一時雨", type: "rainy", tempMax: 31, tempMin: 26, pop: 50, humidity: 80, 
                hourly: [
                    { time: '08:00', temp: 27, weather: '晴れ', type: 'sunny' },
                    { time: '10:00', temp: 29, weather: 'にわか雨', type: 'rainy' },
                    { time: '12:00', temp: 31, weather: '晴れ', type: 'sunny' },
                    { time: '14:00', temp: 30, weather: '快晴', type: 'sunny' },
                    { time: '16:00', temp: 29, weather: '晴れ', type: 'sunny' },
                    { time: '18:00', temp: 28, weather: '通り雨', type: 'rainy' },
                    { time: '20:00', temp: 26, weather: '晴れ', type: 'sunny' }
                ]
            }
        ]
    };

    // 親から渡されたデータをもとに初期化 (データ整合性確保)
    const normalizeData = (inputData) => {
        if (!inputData || !inputData.cities || inputData.cities.length === 0) {
            return { ...defaultData, viewMode: 'national', title: '全国都市別天気ダッシュボード' };
        }

        const viewMode = inputData.viewMode || 'national';
        const title = inputData.title || (viewMode === 'national' ? '全国都市別天気ダッシュボード' : '天気予報');

        // 各都市の hourly データを安全にマッピング・補正する
        const cleanCities = inputData.cities.map(city => {
            let hourly = city.hourly || [];
            
            // 旧形式 (朝、昼、夕、夜の4時間帯) のデータが渡された場合は、2時間おきにマッピングして補間する
            if (hourly.length === 4 && hourly[0].label) {
                const labelMap = {
                    '朝': '08:00',
                    '昼': '12:00',
                    '夕': '17:00',
                    '夜': '21:00'
                };
                const baseHourly = hourly.map(h => ({
                    time: labelMap[h.label] || h.label,
                    temp: h.temp,
                    weather: city.weather || '晴れ',
                    type: city.type || 'sunny'
                }));

                // 中間の時間帯を自動補間して7要素にする
                hourly = [
                    baseHourly[0], // 08:00 (朝)
                    { time: '10:00', temp: Math.round((baseHourly[0].temp + baseHourly[1].temp) / 2), weather: baseHourly[0].weather, type: baseHourly[0].type },
                    baseHourly[1], // 12:00 (昼)
                    { time: '14:00', temp: Math.round((baseHourly[1].temp * 2 + baseHourly[2].temp) / 3), weather: baseHourly[1].weather, type: baseHourly[1].type },
                    { time: '16:00', temp: Math.round((baseHourly[1].temp + baseHourly[2].temp * 2) / 3), weather: baseHourly[2].weather, type: baseHourly[2].type },
                    baseHourly[2], // 17:00 (夕)
                    { time: '20:00', temp: baseHourly[3].temp, weather: baseHourly[3].weather, type: baseHourly[3].type }  // 20:00 (夜の代替)
                ];
            } else if (hourly.length === 0 && viewMode === 'national') {
                // hourlyがない場合はデフォルトからコピー
                const matchDefault = defaultData.cities.find(c => c.id === city.id);
                hourly = matchDefault ? matchDefault.hourly : [];
            }

            // 各要素のスキーマ項目を埋める
            const cleanHourly = hourly.map(h => ({
                time: h.time || h.label || '00:00',
                temp: typeof h.temp === 'number' ? h.temp : parseInt(h.temp) || 20,
                weather: h.weather || city.weather || '晴れ',
                type: h.type || city.type || 'sunny'
            }));
            
            const cleanDaily = (city.daily || []).map(d => ({
                date: d.date || '日付未定',
                tempMax: typeof d.tempMax === 'number' ? d.tempMax : parseInt(d.tempMax) || 25,
                tempMin: typeof d.tempMin === 'number' ? d.tempMin : parseInt(d.tempMin) || 15,
                weather: d.weather || city.weather || '晴れ',
                type: d.type || city.type || 'sunny',
                pop: typeof d.pop === 'number' ? d.pop : parseInt(d.pop) || 0
            }));

            return {
                ...city,
                tempMax: typeof city.tempMax === 'number' ? city.tempMax : parseInt(city.tempMax) || 25,
                tempMin: typeof city.tempMin === 'number' ? city.tempMin : parseInt(city.tempMin) || 15,
                pop: typeof city.pop === 'number' ? city.pop : parseInt(city.pop) || 0,
                humidity: typeof city.humidity === 'number' ? city.humidity : parseInt(city.humidity) || 50,
                hourly: cleanHourly,
                daily: cleanDaily
            };
        });

        return {
            viewMode: viewMode,
            title: title,
            date: inputData.date || defaultData.date,
            comment: inputData.comment || defaultData.comment,
            cities: cleanCities
        };
    };

    const forecast = normalizeData(data);
    const dateStr = forecast.date;
    const commentStr = forecast.comment;
    const isNational = forecast.viewMode === 'national';
    const isWeekly = forecast.viewMode === 'local_weekly';

    // 現在選択されている都市 (全国なら東京(3番目)、それ以外なら最初の都市)
    const [selectedCity, setSelectedCity] = useState(isNational ? (forecast.cities[2] || forecast.cities[0]) : forecast.cities[0]);

    // 親から新しいデータが渡された場合に選択状態を同期
    useEffect(() => {
        if (forecast.cities && forecast.cities.length > 0) {
            const defaultCity = forecast.viewMode === 'national' ? (forecast.cities[2] || forecast.cities[0]) : forecast.cities[0];
            const found = forecast.cities.find(c => c.id === selectedCity?.id) || defaultCity;
            setSelectedCity(found);
        }
    }, [data]);

    // 天気タイプに応じたグラデーションカラーを取得 (詳細パネル背景用)
    const getThemeGrad = (type) => {
        switch (type) {
            case 'sunny':
                return 'from-orange-500/20 via-pink-600/10 to-transparent';
            case 'rainy':
                return 'from-blue-600/25 via-cyan-800/15 to-transparent';
            case 'snowy':
                return 'from-sky-300/20 via-indigo-900/20 to-transparent';
            case 'cloudy':
            default:
                return 'from-slate-400/20 via-slate-600/10 to-transparent';
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto rounded-3xl overflow-hidden backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl p-4 md:p-6 text-white font-sans transition-all duration-500 hover:shadow-cyan-500/5 animate-fadeIn">
            
            {/* ヘッダー情報 */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-4 mb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xl">📅</span>
                        <h3 className="text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-cyan-200">
                            {forecast.title}
                        </h3>
                        <span className="text-xs px-2.5 py-0.5 bg-cyan-400/20 text-cyan-300 rounded-full font-bold border border-cyan-400/20 flex-shrink-0">
                            {dateStr}
                        </span>
                    </div>
                    <p className="text-[12.5px] text-white/70 mt-2 leading-relaxed bg-white/5 rounded-xl px-3 py-2 border border-white/5 max-w-3xl">
                        {commentStr}
                    </p>
                </div>
            </div>

            {/* メインレイアウトグリッド */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                
                {/* 左側：地域リスト (複数地域の場合のみ表示) */}
                {forecast.cities.length > 1 && (
                    <div className="col-span-1 lg:col-span-4 flex flex-col gap-3 max-h-[460px] overflow-y-auto pr-1">
                        <div className="text-xs font-semibold text-white/50 px-1 uppercase tracking-wider mb-1 flex items-center justify-between">
                            <span>🗺️ 地域を選択</span>
                            <span className="text-[10px] text-cyan-400/80">({forecast.cities.length}地点)</span>
                        </div>
                        
                        <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5">
                        {forecast.cities.map((city) => {
                            const isSelected = selectedCity.id === city.id;
                            return (
                                <button
                                    key={city.id}
                                    onClick={() => setSelectedCity(city)}
                                    id={`city-btn-${city.id}`}
                                    className={`flex items-center justify-between p-3 rounded-2xl transition-all duration-300 text-left cursor-pointer border ${
                                        isSelected 
                                            ? 'bg-gradient-to-r from-white/15 to-white/5 border-cyan-400/50 shadow-md shadow-cyan-500/5' 
                                            : 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="p-1 bg-white/5 rounded-lg flex-shrink-0">
                                            <WeatherIcon type={city.type} size={28} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className={`text-sm font-bold ${isSelected ? 'text-cyan-300' : 'text-white'}`}>
                                                {city.name}
                                            </div>
                                            <div className="text-[10px] text-white/40 truncate mt-0.5">
                                                {city.weather}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <div className="text-sm font-extrabold font-sans">
                                            {city.tempMax}°
                                        </div>
                                        <div className="text-[9.5px] text-white/50 font-sans mt-0.5">
                                            {city.tempMin}°
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
                )}
                
                {/* 右側：選択都市の詳細 (リストがない場合は全幅) */}
                <div className={`col-span-1 ${forecast.cities.length > 1 ? 'lg:col-span-8' : 'lg:col-span-12'} flex flex-col gap-4 relative animate-slideInRight bg-gradient-to-b ${getThemeGrad(selectedCity.type)} border border-white/10 rounded-3xl p-4 md:p-5 flex flex-col justify-between min-h-[440px] lg:h-[460px] transition-all duration-500 relative overflow-hidden`}>
                    
                    {/* 背景装飾ぼかし */}
                    <div className="absolute -top-16 -right-16 w-36 h-36 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>

                    {/* 都市名と基本情報 */}
                    <div>
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-[10px] text-cyan-300 font-bold uppercase tracking-widest">Selected City</div>
                                <h4 className="text-2xl md:text-3xl font-black tracking-wide text-white drop-shadow-sm mt-0.5">
                                    {selectedCity.name}
                                </h4>
                                <p className="text-xs text-white/50 mt-1 flex items-center gap-1.5">
                                    <span>本日の概況:</span>
                                    <span className="font-bold text-white/80">{selectedCity.weather}</span>
                                </p>
                            </div>
                            
                            {/* アニメーションアイコン */}
                            <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10 shadow-inner flex items-center justify-center">
                                <WeatherIcon type={selectedCity.type} size={52} />
                            </div>
                        </div>

                        {/* 気温とステータスメトリクス */}
                        <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
                            <div className="md:col-span-5 bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-col justify-center">
                                <div className="text-[10.5px] text-white/40 leading-none">気温範囲 (最高/最低)</div>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-3xl font-extrabold text-white tracking-tight">{selectedCity.tempMax}°C</span>
                                    <span className="text-xs text-white/40">/</span>
                                    <span className="text-sm font-semibold text-cyan-300">{selectedCity.tempMin}°C</span>
                                </div>
                            </div>
                            <div className="md:col-span-7 flex gap-2">
                                <PopIndicator value={selectedCity.pop} />
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex flex-col justify-center w-full">
                                    <div className="text-[10.5px] text-white/40 leading-none">湿度</div>
                                    <div className="text-xl font-black text-white mt-1.5">{selectedCity.humidity || 50}%</div>
                                    <div className="text-[9.5px] text-white/50 font-medium mt-1">風速: 北西 3m/s</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 下部パネル: タイムライン または 週間カレンダー */}
                    {isWeekly && selectedCity.daily && selectedCity.daily.length > 0 ? (
                        <div className="mt-6 relative bg-white/5 border border-white/10 rounded-2xl p-3 overflow-hidden">
                            <div className="text-[11px] font-bold text-white/60 mb-2.5 flex items-center justify-between px-1">
                                <span className="flex items-center gap-1">📆 週間天気予報</span>
                                <span className="text-[9.5px] text-white/30">(横スクロール可)</span>
                            </div>
                            
                            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide select-none relative z-10">
                                {selectedCity.daily.map((day, idx) => (
                                    <div 
                                        key={idx} 
                                        className="flex-shrink-0 w-[64px] bg-white/5 border border-white/5 hover:border-white/15 rounded-xl p-2.5 flex flex-col items-center justify-between text-center transition-all duration-300 hover:scale-[1.03]"
                                    >
                                        <span className="text-[10.5px] font-semibold text-white/70 leading-none">
                                            {day.date}
                                        </span>
                                        <div className="my-1.5 flex items-center justify-center">
                                            <WeatherIcon type={day.type || 'sunny'} size={24} />
                                        </div>
                                        <div className="flex items-center justify-center gap-1.5 mt-1">
                                            <span className="text-xs font-bold text-orange-400 leading-none">{day.tempMax}°</span>
                                            <span className="text-xs font-bold text-cyan-300 leading-none">{day.tempMin}°</span>
                                        </div>
                                        <span className="text-[8.5px] text-white/40 truncate max-w-full mt-1.5 bg-white/5 rounded px-1 py-0.5">
                                            {day.pop}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="mt-6 relative bg-white/5 border border-white/10 rounded-2xl p-3 overflow-hidden">
                            <div className="text-[11px] font-bold text-white/60 mb-2.5 flex items-center justify-between px-1">
                                <span className="flex items-center gap-1">⏱️ 2時間おきの天気予報</span>
                                <span className="text-[9.5px] text-white/30">(横スクロール可)</span>
                            </div>
                            
                            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide select-none relative z-10">
                                {selectedCity.hourly && selectedCity.hourly.map((hour, idx) => (
                                    <div 
                                        key={idx} 
                                        className="flex-shrink-0 w-[64px] bg-white/5 border border-white/5 hover:border-white/15 rounded-xl p-2.5 flex flex-col items-center justify-between text-center transition-all duration-300 hover:scale-[1.03]"
                                    >
                                        <span className="text-[10.5px] font-semibold text-white/50 leading-none">
                                            {hour.time}
                                        </span>
                                        <div className="my-1.5 flex items-center justify-center">
                                            <WeatherIcon type={hour.type || 'sunny'} size={24} />
                                        </div>
                                        <span className="text-xs font-black text-white leading-none">
                                            {hour.temp}°
                                        </span>
                                        <span className="text-[8.5px] text-white/40 truncate max-w-full mt-1">
                                            {hour.weather}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {selectedCity.hourly && <TempChartLine points={selectedCity.hourly} />}
                        </div>
                    )}
                </div>

            </div>

            {/* マイクロアニメーション用 CSS */}
            <style>{`
                @keyframes float {
                    0% { transform: translateY(0px) translateX(0px); }
                    50% { transform: translateY(-3px) translateX(1.5px); }
                    100% { transform: translateY(0px) translateX(0px); }
                }
                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }
                .animate-spin-slow {
                    animation: spin 16s linear infinite;
                }
                
                /* 雨粒落下アニメーション */
                @keyframes rainDrop {
                    0% { stroke-dashoffset: 0; opacity: 0; transform: translateY(-5px); }
                    20% { opacity: 1; }
                    80% { opacity: 0.8; }
                    100% { stroke-dashoffset: 20; opacity: 0; transform: translateY(12px); }
                }
                .animate-rain-drop-1 {
                    animation: rainDrop 1.2s linear infinite;
                    animation-delay: 0s;
                }
                .animate-rain-drop-2 {
                    animation: rainDrop 1.2s linear infinite;
                    animation-delay: 0.4s;
                }
                .animate-rain-drop-3 {
                    animation: rainDrop 1.2s linear infinite;
                    animation-delay: 0.8s;
                }

                /* 雪の結晶落下アニメーション */
                @keyframes snowFlake {
                    0% { opacity: 0; transform: translateY(-8px) translateX(0px); }
                    10% { opacity: 1; }
                    90% { opacity: 0.9; }
                    100% { opacity: 0; transform: translateY(18px) translateX(4px); }
                }
                .animate-snow-flake-1 {
                    animation: snowFlake 2.2s ease-in-out infinite;
                    animation-delay: 0s;
                }
                .animate-snow-flake-2 {
                    animation: snowFlake 2.2s ease-in-out infinite;
                    animation-delay: 0.7s;
                }
                .animate-snow-flake-3 {
                    animation: snowFlake 2.2s ease-in-out infinite;
                    animation-delay: 1.4s;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

export default WeatherForecastMap;
