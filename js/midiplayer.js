// midiplayer.js
export class MIDIPlayer {
    constructor() {
        this.volume = new Tone.Volume(-6).toDestination();

        this.sampler = new Tone.Sampler({
            urls: {
                "C3": "C3.wav",
                "D3": "D3.wav",
                "E3": "E3.wav",
                "F3": "F3.wav",
                "G3": "G3.wav",
                "A3": "A3.wav",
                "B3": "B3.wav",
                "C4": "C4.wav",
                "D4": "D4.wav",
                "E4": "E4.wav",
                "F4": "F4.wav",
                "G4": "G4.wav",
                "A4": "A4.wav",
                "B4": "B4.wav"
            },
            baseUrl: "./Recorder-result/",
            attack: 0.03,
            release: 0.8
        }).connect(this.volume);

        this.notes = [];
        this.currentIndex = 0;
        this.currentNote = null;
    }

    async loadFile(file) {
        if (!file) return;

        // 必須：解鎖 AudioContext
        await Tone.start();

        // 停掉舊聲音
        this.stop();

        this.notes = [];
        this.currentIndex = 0;

        const arrayBuffer = await file.arrayBuffer();
        const midi = new Midi(arrayBuffer);

        // 收集所有音符
        midi.tracks.forEach(track => {
            track.notes.forEach(note => {
                this.notes.push(note);
            });
        });

        // 依時間排序
        this.notes.sort((a, b) => a.time - b.time);

        console.log("MIDI loaded, note count:", this.notes.length);
    }

    playNextNote() {
        if (this.currentIndex >= this.notes.length) return;

        const note = this.notes[this.currentIndex];

        // legato：放掉上一個音
        if (this.currentNote) {
            this.sampler.triggerRelease(this.currentNote);
        }

        this.sampler.triggerAttack(
            note.name,          // 例如 C4, A3
            undefined,
            note.velocity
        );

        this.currentNote = note.name;
        this.currentIndex++;
    }

    stop() {
        this.sampler.releaseAll();
        this.currentNote = null;
    }
}

