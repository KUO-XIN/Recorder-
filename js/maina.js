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

/* ================= DOM ================= */
const midiPlayer = new MIDIPlayer();
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const info = document.getElementById("info");
const loadMidiBtn = document.getElementById("loadMidiBtn");
const midiFileInput = document.getElementById("midiFileInput");

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
let expectedGesture = "-"; 

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
        const rawX = leftHand[4].x * canvas.width;
        if (lastThumbX === null) lastThumbX = rawX;
        const smoothX = lastThumbX * 0.7 + rawX * 0.3;
        lastThumbX = smoothX;

        ctx.beginPath();
        ctx.moveTo(smoothX, 50);
        ctx.lineTo(smoothX, canvas.height - 50);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 4;
        ctx.stroke();
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

        const note = detectNote(leftHand, rightHand);
        const mouthOpen = isMouthOpen(faceLandmarks);
        const volume = getMouthVolume(faceLandmarks);

        setInstrumentVolume(volume);

        if (currentMode === PlayMode.FREE) {
            handleFreePlay(note, mouthOpen);
        } else {
            handleMIDIMode(leftHand, rightHand, mouthOpen);
        }

        if (currentMode === PlayMode.FREE) {
            info.innerHTML =
                "MODE: FREE<br>" +
                "MOUTH: " + (mouthOpen ? "OPEN" : "CLOSE") + "<br>" +
                "NOTE: " + (note ? note : "NONE");
        } else {
            info.innerHTML = "MODE: MIDI<br>" +
                "GESTURE: " + renderGestureText(expectedGesture);
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
function handleMIDIMode(leftHand, rightHand, mouthOpen) {
    if (!leftHand || !rightHand || !midiPlayer.notes.length) return;

    const nextNoteObj = midiPlayer.notes[midiPlayer.currentIndex]; // 下一音
    if (!nextNoteObj) return;

    // 第一個音特判：currentNote不存在 → 往上播放
    let currentNoteObj = midiPlayer.notes[midiPlayer.currentIndex - 1];
    if (!currentNoteObj) {
        currentNoteObj = { midi: nextNoteObj.midi - 1 }; // 保證第一音可觸發
    }

    if (nextNoteObj.midi > currentNoteObj.midi) {
        expectedGesture = "UP";      // 要靠近（上滑）
    } else if (nextNoteObj.midi < currentNoteObj.midi) {
        expectedGesture = "DOWN";    // 要遠離（下滑）
    } else {
        expectedGesture = "HOLD";    // 不動
    }
    const nextReady = checkHandGesture(
        leftHand,
        rightHand,
        currentNoteObj.midi,
        nextNoteObj.midi
    );

    if (nextReady) {
        midiPlayer.playNextNote();
    }
}

function resetMIDIModeState() {
    midiPlayer.stop();
    midiPlayer.currentIndex = 0;
    midiPlayer.currentNote = null;
}

function renderGestureText(gesture) {
    switch (gesture) {
        case "UP":
            return "\u4E0A\u6ED1\uFF08\u9060\u96E2\uFF09";   // 上滑（靠近）
        case "DOWN":
            return "\u4E0B\u6ED1\uFF08\u9760\u8FD1\uFF09"; // 下滑（遠離）
        case "HOLD":
            return "\u4E0D\u52D5";                         // 不動
        default:
            return "-";
    }
}
