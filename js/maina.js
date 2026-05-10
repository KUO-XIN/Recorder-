import { detectNote } from "./handMusic.js";
import { isMouthOpen, getMouthVolume } from "./mouthDetector.js";
import { playMIDINotes, stopAllNotes, setInstrumentVolume } from "./midiSynth.js";
import { MIDIPlayer } from "./midiplayer.js";
import { checkHandGesture } from "./MIDI-hand.js";
/* ================= 模式定義 ================= */
const PlayMode = {
    FREE: "free",
    MIDI: "midi"
};

let currentMode = PlayMode.FREE;
let lastScale = 1;

/* ================= DOM ================= */
const midiPlayer = new MIDIPlayer();
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const info = document.getElementById("info");
const loadMidiBtn = document.getElementById("loadMidiBtn");
const midiFileInput = document.getElementById("midiFileInput");
const app = document.getElementById("app");
const recorder = document.getElementById("recorder");

/* ===== 新增模式切換按鈕 ===== */
const modeToggleBtn = document.createElement("button");
modeToggleBtn.innerText = "\u6A21\u5F0F\uFF1A\u81EA\u7531\u6F14\u594F";
modeToggleBtn.style.position = "absolute";
modeToggleBtn.style.top = "120px";
modeToggleBtn.style.left = "10px";
modeToggleBtn.style.zIndex = "20";
modeToggleBtn.style.fontSize = "18px";
modeToggleBtn.style.padding = "6px 12px";
document.body.appendChild(modeToggleBtn);

/* ================= Canvas ================= */
canvas.width = 720;
canvas.height = 600;

/* ================= 狀態 ================= */
let leftHand = null;
let rightHand = null;
let faceLandmarks = null;
let lastThumbX = null;
let lastThumbY = null;

/* ================= 放入MIDI ================= */
loadMidiBtn.addEventListener("click", () => {
    midiFileInput.click();
});


midiFileInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    await midiPlayer.loadFile(file);
});

document.getElementById("next").onclick = () => {
    midiPlayer.playNextNote();
};

/* ================= Hands ================= */
let hands = new Hands({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
});

hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});

hands.onResults(results => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    leftHand = null;
    rightHand = null;

    if (results.multiHandLandmarks && results.multiHandedness) {
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const landmarks = results.multiHandLandmarks[i];
            const label = results.multiHandedness[i].label;

            if (label === "Left") rightHand = landmarks;
            else if (label === "Right") leftHand = landmarks;

            landmarks.forEach((lm, idx) => {
                if ([4, 8, 12, 16, 20].includes(idx)) {
                    const rawX = lm.x * canvas.width;
                    const rawY = lm.y * canvas.height;

                    if (!window[`last_${label}_${idx}_x`]) window[`last_${label}_${idx}_x`] = rawX;
                    if (!window[`last_${label}_${idx}_y`]) window[`last_${label}_${idx}_y`] = rawY;

                    const smoothX = window[`last_${label}_${idx}_x`] * 0.7 + rawX * 0.3;
                    const smoothY = window[`last_${label}_${idx}_y`] * 0.7 + rawY * 0.3;

                    window[`last_${label}_${idx}_x`] = smoothX;
                    window[`last_${label}_${idx}_y`] = smoothY;

                    ctx.beginPath();
                    ctx.arc(smoothX, smoothY, 6, 0, 2 * Math.PI);
                    ctx.fillStyle = "#ff3333";
                    ctx.fill();
                }
            });
        }
    }

    if (leftHand && leftHand[4]) {
        const rawX = (1 - leftHand[4].x) * canvas.width;
        const rawY = leftHand[4].y * canvas.height;

        if (lastThumbX === null) lastThumbX = rawX;
        if (lastThumbY === null) lastThumbY = rawY;

        const smoothX = lastThumbX * 0.7 + rawX * 0.3;
        const smoothY = lastThumbY * 0.7 + rawY * 0.3;

        lastThumbX = smoothX;
        lastThumbY = smoothY;

        const appRect = app.getBoundingClientRect();

        recorder.style.left = (appRect.left + smoothX) + "px";
        recorder.style.top = (appRect.top + smoothY - 175) + "px";

        // ===== 修正 scale =====
        let scale;

        if (rightHand && rightHand[4]) {

            // 新方法（上下距離）
            const top = rightHand[4];
            const bottom = leftHand[20];

            let dy = Math.abs(top.y - bottom.y);

            scale = dy * 2.1;

        } else {

            //  fallback（你原本的方法）
            const dx = leftHand[5].x - leftHand[17].x;
            const handWidth = Math.abs(dx);

            scale = handWidth * 6;
        }

        //  最後才做 clamp（這樣才有效）
        const MIN_SCALE = 0.6;
        const MAX_SCALE = 3.0;

        scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));

        // smoothing（保留）
        scale = lastScale * 0.7 + scale * 0.3;
        lastScale = scale;

        recorder.style.transform = `scale(${scale})`;
    }
});

/* ================= FaceMesh ================= */
let faceMesh = new FaceMesh({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
});

faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

faceMesh.onResults(results => {
    faceLandmarks = results.multiFaceLandmarks?.[0] || null;
});

/* ================= Camera ================= */
const camera = new Camera(video, {
    onFrame: async () => {
        await hands.send({ image: video });
        await faceMesh.send({ image: video });

        const result = detectNote(leftHand, rightHand);
        const note = result?.note;
        const holes = result?.holes;
        const mouthOpen = isMouthOpen(faceLandmarks);
        const volume = getMouthVolume(faceLandmarks);
        const currentNote = midiPlayer.notes?.[midiPlayer.currentIndex];

        setInstrumentVolume(volume);

        initHelpUI();

        if (holes) {
            updateRecorderUI(holes);
        }

        if (currentMode === PlayMode.FREE) {
            setHelpMode("free");
            handleFreePlay(note, mouthOpen);
        } else {
            handleMIDIMode(leftHand, rightHand, mouthOpen);
            setHelpMode("midi");
        }

        if (currentMode === PlayMode.FREE) {
            info.innerHTML =
                "MODE: FREE<br>" +
                "MOUTH: " + (mouthOpen ? "OPEN" : "CLOSE") + "<br>" +
                "NOTE: " + (note ? note : "NONE");
        } else {
            info.innerHTML = "MODE: MIDI<br>";
        }
    },
    width: 720,
    height: 600
});

camera.start();

/* ================= 模式切換 ================= */
modeToggleBtn.addEventListener("click", () => {
    if (currentMode === PlayMode.FREE) {
        switchToMIDIMode();
    } else {
        switchToFreeMode();
    }
});

function switchToFreeMode() {
    currentMode = PlayMode.FREE;
    modeToggleBtn.innerText = "\u6A21\u5F0F\uFF1A\u81EA\u7531\u6F14\u594F";
    loadMidiBtn.style.display = "none";
    stopAllNotes();
}

function switchToMIDIMode() {
    currentMode = PlayMode.MIDI;
    modeToggleBtn.innerText = "\u6A21\u5F0F\uFF1AMIDI\u6F14\u594F";
    loadMidiBtn.style.display = "block"; //
    stopAllNotes();
    resetMIDIModeState();
}

/* ================= 播放邏輯 ================= */
function handleFreePlay(note, mouthOpen) {
    if (mouthOpen && note) {
        playMIDINotes(note, mouthOpen);
    } else {
        stopAllNotes();
    }
}

/* ===== MIDI 模式空殼（之後寫） ===== */
function handleMIDIMode(leftHand, rightHand) {

    if (!leftHand && !rightHand) return;
    if (!midiPlayer.notes.length) return;

    const nextIndex = midiPlayer.currentIndex;
    const gestureInfo = midiPlayer.gestureTimeline[nextIndex];
    if (!gestureInfo) return;

    // 不再用 expectedGesture

    const nextReady = checkHandGesture(leftHand, rightHand);

    if (nextReady) {
        midiPlayer.playNextNote();
    }
}

function resetMIDIModeState() {
    midiPlayer.stop();
    midiPlayer.currentIndex = 0;
    midiPlayer.currentNote = null;
}

function updateRecorderUI(holes) {
    if (!holes) return;

    for (let i = 0; i < holes.length; i++) {
        const hole = document.getElementById("h" + i);
        if (!hole) continue;

        if (holes[i]) {
            hole.classList.add("active");
        } else {
            hole.classList.remove("active");
        }
    }
}
