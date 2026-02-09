// =========================
// 中音直笛風格（單音）
// =========================
window.monoSynth = new Tone.Sampler({
    urls: {
        // ====== Octave 4 ======
        "C3": "C3.wav",
        "C#3": "H-C3.wav",
        "D3": "D3.wav",
        "D#3": "H-D3.wav",
        "E3": "E3.wav",
        "F3": "F3.wav",
        "F#3": "H-F3.wav",
        "G3": "G3.wav",
        "G#3": "H-G3.wav",
        "A3": "A3.wav",
        "A#3": "H-A3.wav",
        "B3": "B3.wav",

        // ====== Octave 5 ======
        "C4": "C4.wav",
        "D4": "D4.wav",
        "E4": "E4.wav",
        "F4": "F4.wav",
        "G4": "G4.wav",
        "A4": "A4.wav",
        "B4": "B4.wav"
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
    C3: 48, D3: 50, E3: 52, F3: 53,
    G3: 55, A3: 57, B3: 59,
    C4: 60, D4: 62, E4: 64, F4: 65,
    G4: 67, A4: 69, B4: 71,
    "H-C3": 49, "H-D3": 51, "H-F3": 54,
    "H-G3": 56, "H-A3": 58
};

const TONE_NOTE_MAP = {
    "H-C3": "C#3",
    "H-D3": "D#3",
    "H-F3": "F#3",
    "H-G3": "G#3",
    "H-A3": "A#3"
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
