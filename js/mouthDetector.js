// 使用 Mediapipe face mesh 節點計算嘴巴開合
const upper_lip_external_indexes = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291];
const lower_lip_external_indexes = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291];
const upper_lip_internal_indexes = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308];
const lower_lip_internal_indexes = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308];
let baseMouthWidth = null;   // 放鬆嘴型的基準
let smoothVolume = 0;        // 平滑後音量

function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export function isMouthOpen(landmarks) {
    if (!landmarks) return false;

    // 取上唇下方、下唇上方作距離
    const upper = landmarks[13] || landmarks[0];
    const lower = landmarks[14] || landmarks[0];

    const left = landmarks[61] || landmarks[0];
    const right = landmarks[291] || landmarks[0];

    const vertical = distance(upper, lower);
    const horizontal = distance(left, right);

    const ratio = vertical / horizontal;

    return ratio > 0.06; // 閾值，可依人調整
}

export function getMouthVolume(landmarks) {
    if (!landmarks) return 0;

    const left = landmarks[61];
    const right = landmarks[291];
    const upper = landmarks[13];
    const lower = landmarks[14];

    const horizontal = distance(left, right);
    const vertical = distance(upper, lower);

    const openRatio = vertical / horizontal;

    // --- 沒張嘴 → 沒聲音（完全保留原本邏輯） ---
    if (openRatio < 0.06) {
        baseMouthWidth = null;
        smoothVolume = 0;
        return 0;
    }

    // --- 剛開始張嘴時記錄基準 ---
    if (baseMouthWidth === null) {
        baseMouthWidth = horizontal;
    }

    // --- 嘴角外撐（主控制） ---
    let strength = (horizontal - baseMouthWidth) / baseMouthWidth;
    strength = Math.max(0, strength);

    // ★ 放大權重（關鍵）
    strength *= 3.0;

    // --- 嘴巴開合輔助（小加成） ---
    const openBoost = Math.min(openRatio / 0.12, 1); // 0~1

    // --- 合成吹氣強度 ---
    let combined = strength * 0.8 + openBoost * 0.2;

    // --- 樂器感曲線（前段更明顯） ---
    let volume = Math.pow(combined, 1.2);

    // --- 上限 ---
    const MAX_VOLUME = 0.9;
    volume = Math.min(volume, MAX_VOLUME);

    // --- 平滑 ---
    smoothVolume = smoothVolume * 0.75 + volume * 0.25;

    return smoothVolume;
}

