// gesture.js

const nearStateMemory = new Map();

let lastUpdate = 0;
const MIN_INTERVAL = 120; // 防止過快觸發

// 手勢狀態機（避免手指一直開著連續觸發）
let gestureArmed = true;


// 判斷兩手手指是否分開（像直笛開孔）
export function isNearTip(tip, refTip, threshold = 0.05) {

    if (!tip || !refTip) return false;

    const dx = tip.x - refTip.x;
    const dist = Math.abs(dx);

    let state = nearStateMemory.get(tip);
    if (state === undefined) state = false;

    const enterThreshold = threshold * 1.15;
    const exitThreshold = threshold * 0.85;

    if (!state && dist > enterThreshold) {
        state = true;
    }
    else if (state && dist < exitThreshold) {
        state = false;
    }

    nearStateMemory.set(tip, state);

    return state;
}


// 判斷四指是否開孔
function fingerOpen(handA, thumptip) {

    const tips = [8, 12, 16, 20];

    let openCount = 0;

    for (let i of tips) {

        if (isNearTip(handA[i], thumptip)) {
            openCount++;
        }

    }

    return openCount >= 1; // 至少兩指開孔
}



// 主偵測函式
export function checkHandGesture(leftHand, rightHand, expectedGesture) {

    const now = Date.now();

    if (now - lastUpdate < MIN_INTERVAL) return false;

    if (!leftHand || !rightHand) return false;

    let isOpen = false;

    if (expectedGesture === "LEFT") {

        isOpen = fingerOpen(leftHand, leftHand[4]);

    }
    else if (expectedGesture === "RIGHT") {

        isOpen = fingerOpen(rightHand, rightHand[4]);

    }

    // DEBUG
    // console.log("gesture:", expectedGesture, "open:", isOpen);

    if (isOpen && gestureArmed) {

        gestureArmed = false;
        lastUpdate = now;

        return true;
    }

    if (!isOpen) {
        gestureArmed = true;
    }

    return false;
}
