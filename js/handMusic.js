/* ---------------- 手指判斷工具 ---------------- */
// 判斷 TIP 是否靠近另一個點 (例如大拇指 TIP)
const nearStateMemory = new WeakMap();

/**
 * 判斷 tip 是否「穩定地」遠離 refTip
 * - 有進出緩衝，避免距離抖動造成亂跳
 * - 介面與回傳值與你原本完全相同
 */
export function isNearTip(tip, refTip, threshold = 0.05) {
    if (!tip || !refTip) return false;

    const dx = tip.x - refTip.x;
    const dist = Math.abs(dx);

    // 每個 tip 物件各自有狀態
    let state = nearStateMemory.get(tip);
    if (state === undefined) state = false;

    // 進出使用不同門檻（hysteresis）
    const enterThreshold = threshold * 1.15; // 要「更明確」才變成 true
    const exitThreshold = threshold * 0.85; // 要「更明確」才變回 false

    if (!state && dist > enterThreshold) {
        state = true;
    } else if (state && dist < exitThreshold) {
        state = false;
    }

    nearStateMemory.set(tip, state);
    return state;
}

export function thumb_isNearTip(tip, refTip, threshold = 0.08) {
    const dx = tip.x - refTip.x;
    return Math.sqrt(dx * dx) > threshold;
}

export function fingerAngle(landmarks, tipIdx, dipIdx, pipIdx) {
    const tip = landmarks[tipIdx];
    const dip = landmarks[dipIdx];
    const pip = landmarks[pipIdx];

    const v1 = [
        tip.x - dip.x,
        tip.y - dip.y,
        tip.z - dip.z
    ];

    const v2 = [
        pip.x - dip.x,
        pip.y - dip.y,
        pip.z - dip.z
    ];

    const dot =
        v1[0] * v2[0] +
        v1[1] * v2[1] +
        v1[2] * v2[2];

    const mag1 = Math.hypot(v1[0], v1[1], v1[2]);
    const mag2 = Math.hypot(v2[0], v2[1], v2[2]);

    const angle = Math.acos(dot / (mag1 * mag2 + 1e-6));
    return angle * 180 / Math.PI;
}

/* ---------------- detectNote ---------------- */
export function detectNote(left, right) {
    if (!left || !right) return null;

    const l_thumbTip = left[4]; // 左手大拇指 TIP

    // ---------------- 左手 ----------------
    const l_index = isNearTip(left[8], l_thumbTip);
    const l_middle = isNearTip(left[12], l_thumbTip);
    const l_ring = isNearTip(left[16], l_thumbTip);
    const l_pinky = isNearTip(left[20], l_thumbTip);

    // ---------------- 右手 ----------------
    const r_index = isNearTip(right[8], l_thumbTip);
    const r_middle = isNearTip(right[12], l_thumbTip);
    const r_ring = isNearTip(right[16], l_thumbTip);
    const r_pinky = isNearTip(right[20], l_thumbTip);
    const r_thumb = thumb_isNearTip(right[4], l_thumbTip);

    // 新增：孔狀態（順序你可以之後再調）
    const holes = [
        !r_thumb,
        !r_index,
        !r_middle,
        !r_ring,
        !r_pinky,
        !l_middle,
        !l_ring,
        !l_pinky
    ];

    let note = null;

    // ---------------- 音符判斷 (C4~B4) ----------------
    if (!l_middle && !l_ring && !l_pinky &&
        !r_index && !r_middle && !r_ring && (!r_pinky || !l_index) && !r_thumb) note = 'C3';

    if (l_pinky && !l_middle && !l_ring &&
        !r_index && !r_middle && !r_ring && (!r_pinky || !l_index) && !r_thumb) {
        if (fingerAngle(left, 20, 19, 17) > 135) { note = 'D3'; }
        else { note = 'H-C3' }
    }

    if (l_ring && l_pinky && !l_middle &&
        !r_index && !r_middle && !r_ring && (!r_pinky || !l_index) && !r_thumb) {
        if (fingerAngle(left, 16, 15, 13) > 135) { note = 'E3'; }
        else { note = 'H-D3' }
        }

    if (l_middle && l_ring && l_pinky &&
        !r_index && !r_middle && !r_ring && !r_pinky && !l_index && !r_thumb) note = 'F3';

    if (l_middle && l_ring && l_pinky &&
        !r_index && !r_middle && !r_ring && (r_pinky || l_index) && !r_thumb) note = 'G3';

    if (l_middle && l_ring && l_pinky &&
        !r_index && !r_middle && r_ring && (r_pinky || l_index) && !r_thumb) note = 'A3';

    if (l_middle && l_ring && l_pinky &&
        !r_index && r_middle && r_ring && (r_pinky || l_index) && !r_thumb) note = 'B3';

    if (!l_middle && !l_ring && !l_pinky &&
        !r_index && !r_middle && !r_ring && (!r_pinky || !l_index) && r_thumb) note = 'C4';

    if (l_pinky && !l_middle && !l_ring &&
        !r_index && !r_middle && !r_ring && (!r_pinky || !l_index) && r_thumb) note = 'D4';

    if (l_ring && l_pinky && !l_middle &&
        !r_index && !r_middle && !r_ring && (!r_pinky || !l_index) && r_thumb) note = 'E4';

    if (l_middle && l_ring && l_pinky &&
        !r_index && !r_middle && !r_ring && !r_pinky && !l_index && r_thumb) note = 'F4';

    if (l_middle && l_ring && l_pinky &&
        !r_index && !r_middle && !r_ring && (r_pinky || l_index) && r_thumb) note = 'G4';

    if (l_middle && l_ring && l_pinky &&
        !r_index && !r_middle && r_ring && (r_pinky || l_index) && r_thumb) note = 'A4';

    if (l_middle && l_ring && l_pinky &&
        !r_index && r_middle && r_ring && (r_pinky || l_index) && r_thumb) note = 'B4';

    if (l_pinky && !l_ring && !l_middle &&
        !r_index && !r_middle && !r_ring && !r_thumb && (r_pinky || l_index)) note = 'H-F3';

    if (!r_middle && !r_index && !r_thumb && r_ring && (r_pinky || !l_index) &&
        !l_middle && l_ring && l_pinky) note = 'H-G3';

    if (r_middle && !r_index && !r_thumb &&
        !r_ring && (r_pinky || l_index) && l_middle && !l_ring && l_pinky) note = 'H-A3';

    // 最後回傳
    return {
        note: note,
        holes: holes
    };
}
