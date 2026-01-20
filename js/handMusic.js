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

    // ---------------- 音符判斷 (C4~B4) ----------------
    if (!l_middle && !l_ring && !l_pinky &&
        !r_index && !r_middle && !r_ring && (!r_pinky || !l_index) && !r_thumb) return 'C4';

    if (l_pinky && !l_middle && !l_ring &&
        !r_index && !r_middle && !r_ring && (!r_pinky || !l_index) && !r_thumb) {
        if (fingerAngle(left, 20, 19, 17) > 135) { return 'D4'; }
        else { return 'H-C4' }
    }

    if (l_ring && l_pinky && !l_middle &&
        !r_index && !r_middle && !r_ring && (!r_pinky || !l_index) && !r_thumb) {
        if (fingerAngle(left, 16, 15, 13) > 135) { return 'E4'; }
        else { return 'H-D4' }
        }

    if (l_middle && l_ring && l_pinky &&
        !r_index && !r_middle && !r_ring && !r_pinky && !l_index && !r_thumb) return 'F4';

    if (l_middle && l_ring && l_pinky &&
        !r_index && !r_middle && !r_ring && (r_pinky || l_index) && !r_thumb) return 'G4';

    if (l_middle && l_ring && l_pinky &&
        !r_index && !r_middle && r_ring && (r_pinky || l_index) && !r_thumb) return 'A4';

    if (l_middle && l_ring && l_pinky &&
        !r_index && r_middle && r_ring && (r_pinky || l_index) && !r_thumb) return 'B4';

    if (!l_middle && !l_ring && !l_pinky &&
        !r_index && !r_middle && !r_ring && (!r_pinky || !l_index) && r_thumb) return 'C5';

    if (l_pinky && !l_middle && !l_ring &&
        !r_index && !r_middle && !r_ring && (!r_pinky || !l_index) && r_thumb) return 'D5';

    if (l_ring && l_pinky && !l_middle &&
        !r_index && !r_middle && !r_ring && (!r_pinky || !l_index) && r_thumb) return 'E5';

    if (l_middle && l_ring && l_pinky &&
        !r_index && !r_middle && !r_ring && !r_pinky && !l_index && r_thumb) return 'F5';

    if (l_middle && l_ring && l_pinky &&
        !r_index && !r_middle && !r_ring && (r_pinky || l_index) && r_thumb) return 'G5';

    if (l_middle && l_ring && l_pinky &&
        !r_index && !r_middle && r_ring && (r_pinky || l_index) && r_thumb) return 'A5';

    if (l_middle && l_ring && l_pinky &&
        !r_index && r_middle && r_ring && (r_pinky || l_index) && r_thumb) return 'B5';

    if (l_pinky && !l_ring && !l_middle &&
        !r_index && !r_middle && !r_ring && !r_thumb && (r_pinky || l_index)) return 'H-F4';

    if (!r_middle && !r_index && !r_thumb && r_ring && (r_pinky || !l_index) &&
        !l_middle && l_ring && l_pinky) return 'H-G4';

    if (r_middle && !r_index && !r_thumb &&
        !r_ring && (r_pinky || l_index) && l_middle && !l_ring && l_pinky) return 'H-A4';


    return null;
}
