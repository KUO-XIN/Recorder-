import { detectNote } from "./handMusic.js";
import { isMouthOpen, getMouthVolume } from "./mouthDetector.js";
import { playMIDINotes, stopAllNotes, setInstrumentVolume} from "./midiSynth.js";

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const info = document.getElementById("info");

/* 同步尺寸 */
canvas.width = 720;
canvas.height = 600;

let leftHand = null;
let rightHand = null;
let faceLandmarks = null;
let lastThumbX = null;

/* ---------------- Hands ---------------- */
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

            // 只畫手指 TIP
            landmarks.forEach((lm, idx) => {
                if ([4, 8, 12, 16, 20].includes(idx)) { // TIP index
                    // === 這裡加平滑 ===
                    const rawX = lm.x * canvas.width;
                    const rawY = lm.y * canvas.height;

                    if (!window[`last_${label}_${idx}_x`]) window[`last_${label}_${idx}_x`] = rawX;
                    if (!window[`last_${label}_${idx}_y`]) window[`last_${label}_${idx}_y`] = rawY;

                    const smoothX = window[`last_${label}_${idx}_x`] * 0.7 + rawX * 0.3;
                    const smoothY = window[`last_${label}_${idx}_y`] * 0.7 + rawY * 0.3;

                    window[`last_${label}_${idx}_x`] = smoothX;
                    window[`last_${label}_${idx}_y`] = smoothY;
                    // ====================

                    ctx.beginPath();
                    ctx.arc(smoothX, smoothY, 6, 0, 2 * Math.PI);
                    ctx.fillStyle = "#ff3333";
                    ctx.fill();
                }
            });
        }
    }
    if(leftHand && leftHand[4]) {
        const rawX = leftHand[4].x * canvas.width;
        // 平滑處理
        if (lastThumbX === null) lastThumbX = rawX;
        const smoothX = lastThumbX * 0.7 + rawX * 0.3;
        lastThumbX = smoothX;

        const yStart = 50;
        const yEnd = canvas.height - 50;
        ctx.beginPath();
        ctx.moveTo(smoothX, yStart);
        ctx.lineTo(smoothX, yEnd);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 4;
        ctx.stroke();
    }
});


/* ---------------- FaceMesh ---------------- */
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

/* ---------------- Camera ---------------- */
const camera = new Camera(video, {
    onFrame: async () => {
        await hands.send({ image: video });
        await faceMesh.send({ image: video });

        const note = detectNote(leftHand, rightHand);
        const mouthOpen = isMouthOpen(faceLandmarks);
        const volume = getMouthVolume(faceLandmarks);

        setInstrumentVolume(volume);

        if (mouthOpen && note) {
            playMIDINotes(note, mouthOpen);
        } else {
            stopAllNotes();
        }

        info.innerHTML =
            "MOUTH: " + (mouthOpen ? "OPEN" : "CLOSE") + "<br>" +
            "NOTE: " + (note ? note : "NONE");
    },
    width: 720,
    height: 600
});

camera.start();
