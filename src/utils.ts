import { SampleLibrary } from "./tonejs-instruments";
import * as Tone from "tone";
import {noteObj, noteSpeed, RegisterThreshold} from "./types"
export {playNote, playNoteNow, getRandomInstrument, RNG, withinBounds}

/**
 * A random number generator which provides two pure functions
 * `hash` and `scaleToRange`.  Call `hash` repeatedly to generate the
 * sequence of hashes.
 */
abstract class RNG {
    // LCG using GCC's constants
    private static m = 0x80000000; // 2**31
    private static a = 1103515245;
    private static c = 12345;

    /**
     * Call `hash` repeatedly to generate the sequence of hashes.
     * @param seed 
     * @returns a hash of the seed
     */
    public static hash = (seed: number) => (RNG.a * seed + RNG.c) % RNG.m;

    /**
 h    * Takes hash value and scales it to the range [0, 1]
     */
    public static scale = (hash: number) => ((2 * hash) / (RNG.m - 1)) % 1;

}

    const withinBounds = (n:number) => 
        RegisterThreshold.LOWER <= n && n <= RegisterThreshold.UPPER

    // Load in the instruments and then start your game!
    const samples = SampleLibrary.load({
        instruments: [
            "bass-electric",
            "violin",
            "piano",
            "trumpet",
            "saxophone",
            "trombone",
            "flute",
        ], // SampleLibrary.list,
        baseUrl: "samples/",
    });

Tone.ToneAudioBuffer.loaded().then(() => {
    for (const instrument in samples) {
        samples[instrument].toDestination();
        samples[instrument].release = 0.5;
    }
});

//Returns a random instrument given a number between 0 and 1
const getRandomInstrument = (rand: number) => ["bass-electric",
                                    "violin",
                                    "piano",
                                    "trumpet",
                                    "saxophone",
                                    "trombone",
                                    "flute",][Math.floor(rand * 7)]

//Plays a note with delay                                    
const playNote = (note: noteObj):Tone.Sampler =>
    samples[note.instrument_name].triggerAttackRelease(
    Tone.Frequency(note.pitch, "midi").toNote(), // Convert MIDI note to frequency
    note.duration, // Duration of the note in seconds
    Tone.now()+noteSpeed, // Use default time for note onset
    note.velocity/250, // Set velocity to quarter of the maximum velocity
)

//Plays a note immediately for the given duration
const playNoteNow = (note: noteObj):Tone.Sampler =>
    samples[note.instrument_name].triggerAttackRelease(
    Tone.Frequency(note.pitch, "midi").toNote(), // Convert MIDI note to frequency
    note.duration, // Duration of the note in seconds
    Tone.now(), // Use default time for note onset
    note.velocity/200, // Set velocity to quarter of the maximum velocity
)