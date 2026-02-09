let lastThumbDistance = null;   // 上一幀距離
let lastUpdate = 0;             // 上次觸發時間
const MIN_INTERVAL = 50;        // 毫秒，防抖 0.05 秒

export function checkHandGesture(leftHand, rightHand, currentNoteNumber, nextNoteNumber) {
    const now = Date.now();
    if (now - lastUpdate < MIN_INTERVAL) return false; // 防抖
    lastUpdate = now;

    if (!leftHand || !rightHand || currentNoteNumber == null || nextNoteNumber == null) return false;

    const fingerIndices = [8, 12, 16, 20];

    let sumDistance = 0;

    for (let i of fingerIndices) {
        const l = leftHand[i];
        const r = rightHand[i];

        const d = Math.sqrt(
            (l.x - r.x) ** 2 +
            (l.y - r.y) ** 2
        );

        sumDistance += d;
    }

    const distance = sumDistance / fingerIndices.length; // 平均距離


    if (lastThumbDistance === null) {
        lastThumbDistance = distance;
        return false; // 第一幀不觸發
    }

    const delta = distance - lastThumbDistance; // 正值：變遠，負值：變近

    let trigger = false;

    if (nextNoteNumber < currentNoteNumber && delta < -0.025) {
        // 下一音比目前低 & 靠近
        trigger = true;
    } else if (nextNoteNumber > currentNoteNumber && delta > 0.025) {
        // 下一音比目前高 & 遠離
        trigger = true;
    } else if (nextNoteNumber === currentNoteNumber && Math.abs(delta) < 0.025) {
        // 同音 & 手不動
        trigger = true;
    }

    lastThumbDistance = distance; // 更新上一幀距離
    return trigger;
}
