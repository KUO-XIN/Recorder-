// =========================
// 中音直笛風格（單音）
// =========================
window.monoSynth = new Tone.Sampler({
    urls: {
        // ====== Octave 4 ======
        "C4": "C4.wav",
        "C#4": "H-C4.wav",
        "D4": "D4.wav",
        "D#4": "H-D4.wav",
        "E4": "E4.wav",
        "F4": "F4.wav",
        "F#4": "H-F4.wav",
        "G4": "G4.wav",
        "G#4": "H-G4.wav",
        "A4": "A4.wav",
        "A#4": "H-A4.wav",
        "B4": "B4.wav",

        // ====== Octave 5 ======
        "C5": "C5.wav",
        "D5": "D5.wav",
        "E5": "E5.wav",
        "F5": "F5.wav",
        "G5": "G5.wav",
        "A5": "A5.wav",
        "B5": "B5.wav"
    },

    baseUrl: "./Recorder-result/",
    attack: 0.05,
    release: 0.8
}).toDestination();

window.recorderFilter = new Tone.Filter({
    type: "lowpass",
    frequency: 1200,
    Q: 0.8
}).toDestination();

window.monoSynth.disconnect();
window.monoSynth.connect(window.recorderFilter);


// =========================
// 音名對照
// =========================
export const NOTE_TO_MIDI = {
    C4: 60, D4: 62, E4: 64, F4: 65,
    G4: 67, A4: 69, B4: 71,
    C4: 72, D4: 74, E4: 76, F4: 77,
    G4: 79, A4: 81, B4: 83,
    "H-C3": 61, "H-D3": 63, "H-F3": 66,
    "H-G3": 68, "H-A3": 70
};

const TONE_NOTE_MAP = {
    "H-C4": "C#4",
    "H-D4": "D#4",
    "H-F4": "F#4",
    "H-G4": "G#4",
    "H-A4": "A#4"
};

// =========================
// 狀態管理（關鍵）
// =========================
let currentNote = null;
let isPlaying = false;

// =========================
// 停止吹奏
// =========================
export function stopAllNotes() {
    if (isPlaying) {
        window.monoSynth.triggerRelease(currentNote);
        isPlaying = false;
        currentNote = null;
    }
}

// =========================
// 吹奏直笛
// =========================
export function playMIDINotes(note, mouthOpen) {
    if (!mouthOpen || !note) {
        stopAllNotes();
        return;
    }

    const toneNote = TONE_NOTE_MAP[note] || note;

    // 同一個音還在吹 → 不做任何事
    if (isPlaying && currentNote === toneNote) {
        return;
    }

    // 換音（合法）
    stopAllNotes();

    window.monoSynth.triggerAttack(toneNote);
    currentNote = toneNote;
    isPlaying = true;
}

let smoothedVolume = 0;

export function setInstrumentVolume(v) {
    const minDb = -24;
    const maxDb = -4;

    // 氣流平滑
    smoothedVolume = smoothedVolume * 0.8 + v * 0.2;

    const curved = Math.pow(smoothedVolume, 1.6);
    const db = minDb + (maxDb - minDb) * curved;

    window.monoSynth.volume.value = db;

    // 吹越強 → 越亮
    recorderFilter.frequency.value =
        900 + curved * 2800;
}
