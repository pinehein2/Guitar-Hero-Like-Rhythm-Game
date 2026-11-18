import "./style.css";
import { fromEvent, interval, merge, from, timer, Observable, Subscription } from "rxjs";
import { map, filter, scan, mergeMap, take, startWith } from "rxjs/operators";
import { Key, Event, noteObj, State, Constants, defaultCols, Update, Keys, defaultNote, defaultTail, RegisterThreshold, noteSpeed } from "./types"
import { updateView, highlightElement } from "./view"
import { updatePress, updateStateAll, initialState, updateNotes, updateRNG, updateHoldNotes } from "./state"
import { playNote, playNoteNow, RNG } from "./utils"

/**
 * Main Function
 */
export function main(
    csvContents: string,
) {

    /** Processes the raw data into an arraw of custom noteObjs */
    const csvData = ():ReadonlyArray<noteObj> =>csvContents
        .split("\n")
        .slice(1, -1)
        .map((note: string) => note.split(","))
        .map(
            (curr, ind) =>
                ({
                    user_played: curr[0].toLowerCase() === "true",
                    instrument_name: String(curr[1]),
                    velocity: Number(curr[2]),
                    pitch: Number(curr[3]),
                    start: Number(curr[4]),
                    end: Number(curr[5]),
                    duration: Number(curr[5]) - Number(curr[4]),
                    noteSVG: {...defaultNote(Number(curr[3])%4),
                                svg: {...defaultNote(Number(curr[3])%4).svg,
                                    id: `circle ${ind}`}}
                }) as const,
        );
        
        //Observable stream to add appropriate delay between each note
    const dataStream$:Observable<noteObj> = from(csvData()).pipe(mergeMap(note => timer(note.start* 1000).pipe(map(_ => note)))),

        //Observable stream to add the notes into the game using an Update function
          updateNotes$:Observable<Update> = dataStream$.pipe(filter(note => note.duration <= 1), map(note => updateNotes(note))),

        //Observable stream to play the background music
          dataSub = dataStream$.pipe(filter(note => !note.user_played)).subscribe(playNote),

        //Observable stream to process hold notes then add them into the game using an Update function
          holdNotes$ = dataStream$.pipe(filter(note => note.duration > 1),
                        map((note, ind) => ({ note: note,
                                tail: {...defaultTail(note.pitch%4), 
                                    svg: {...defaultTail(note.pitch%4).svg,
                                        id: `line ${ind}`,
                                        y1: `-${(note.duration)*(RegisterThreshold.CENTER/noteSpeed)}`,
                                        y2: note.noteSVG.svg.cy}, },
                                    pressed: false
                            })), 
                        map(holdNote => updateHoldNotes(holdNote)))

        //Observable stream to update all entities inside the game using an Update function
    const tick$:Observable<Update> = interval(Constants.TICK_RATE_MS).pipe(map(tick => updateStateAll(tick)));

        //Observable stream to update the rng used in the game
    const rng$:Observable<Update> = interval(Constants.TICK_RATE_MS).pipe(scan(RNG.hash,Constants.SEED),map(RNG.scale), map(num => updateRNG(num)));

    /** 
         * Creates an observable stream for the given keyboard event and key
         * @param e the keyboard event
         * @param k the key
         * @returns an observable for the given keybaord event and key
        */
    const key$:(e: Event, k: Key) => Observable<KeyboardEvent> = (e: Event, k: Key) => fromEvent<KeyboardEvent>(document, e)
        .pipe(filter(({ code }) => code === k), filter(({ repeat }) => !repeat));
    
    /** 
         * Creates an observable stream for a key single key press given the key
         * @param key the key
         * @returns an observable for a key press
        */
    const press$ = (key:Key):Observable<{press: boolean, key: Key}> => key$("keydown", key).pipe(mergeMap(
            down => key$("keyup", key).pipe(take(1), startWith(down), 
            map(({type}) => ({press: type === "keydown", key: key})))))

        //Observable stream to highlight the keys for in the UI
    const highlightKeys$:Subscription = Keys.reduce((stream:Observable<{press: boolean, key: Key}>, key: Key) => 
            merge(stream, press$(key)), merge()).subscribe(({press, key}) => {highlightElement(press, key)})
        
        //Observable streams for keypresses for all the keys used in the game
    const colPress$ = Keys.reduce((stream:Observable<Update>, key: Key, ind:number) => 
            merge(stream, press$(key).pipe(
                map(({press}) => updatePress({press:press, col:defaultCols[ind].cx} as const)))), merge())
    
        //Observable stream for all state updates in the game
    const main$:Observable<State> = merge(colPress$, updateNotes$, tick$, rng$, holdNotes$).pipe(
            scan((acc, curr) => curr(acc), initialState))
    
        //Subscription to play audio and update display
    const mainSub:Subscription = main$.subscribe((s:State) =>
        {
            s.toPlay.forEach(playNoteNow);
            s.toHoldPlay.forEach(playNoteNow)
            updateView(() => {mainSub.unsubscribe(); dataSub.unsubscribe(); highlightKeys$.unsubscribe()})(s);
        })
}

// The following simply runs your main function on window load.  Make sure to leave it in place.
// You should not need to change this, beware if you are.
if (typeof window !== "undefined") {
    const startGame = (contents: string) => {
        document.body.addEventListener(
            "mousedown",
            function () {
                main(contents);
            },
            { once: true },
        );
    };

    const { protocol, hostname, port } = new URL(import.meta.url);
    const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ""}`;

    fetch(`${baseUrl}/assets/${Constants.SONG_NAME}.csv`)
        .then((response) => response.text())
        .then((text) => startGame(text))
        .catch((error) =>
            console.error("Error fetching the CSV file:", error),
        );

}