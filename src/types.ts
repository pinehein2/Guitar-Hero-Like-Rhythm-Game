export { Constants, Viewport, S_TO_T, defaultCols, Note, RegisterThreshold, Expiry, defualtNote, noteSpeed, notesPPS,  Keys, defaultNote, defaultTail }
export type { Key, Event, noteSVG, noteObj, State, Updater, Update, tailSVG, objSVG }

/** 
 * Constants 
*/
    //Important constants
    const Constants = {
        TICK_RATE_MS: 5,
        SONG_NAME: "RockinRobin",
        TOTAL_NOTES: 3260,
        SEED: 10
    } as const;

    //Viewport dimensions
    const Viewport = {
        CANVAS_WIDTH: 200,
        CANVAS_HEIGHT: 400,
    } as const;
    
    //Note dimensions
    const Note = {
        RADIUS: 0.07 * Viewport.CANVAS_WIDTH,
        TAIL_WIDTH: 10,
    };

    //The boundary for notes being considered hit
    const RegisterThreshold = {
        LOWER: 325,
        CENTER: 350,
        UPPER: 375
    }

    //The speed of the game
    const noteSpeed = 2

    //The boundary for notes expiring
    const Expiry = 400

    //Conversion rate for tick per second
    const S_TO_T = 1000/Constants.TICK_RATE_MS

    //The velocity of the notes
    const notesPPS = RegisterThreshold.CENTER/(noteSpeed * S_TO_T)

    //Default numbers for each column
    const defaultCols:{style:string, cx:string}[] = [{style: "green", cx: "20%"}, {style: "red", cx: "40%"},
                                                     {style: "blue", cx: "60%"}, {style: "yellow", cx: "80%"}]

    //Default note for each column
    const defaultNote = (ind:number):noteSVG => defaultCols.map(({style, cx}) => ({
                                                objType: "circle",
                                                svg: {id: "circle",
                                                    r: `${Note.RADIUS}`,
                                                    cx: cx,
                                                    cy: "0",
                                                    style: `fill: ${style}`
                                                    } as const,
                                                expired:false
                                                } as const))[ind]
    //Default tail for each column                                            
    const defaultTail = (ind:number):tailSVG => defaultCols.map(({style, cx}) => ({
                                                objType: "line",
                                                svg: {id: "line",
                                                    x1: cx,
                                                    y1: "0",
                                                    x2: cx,
                                                    y2: "0",
                                                    stroke: style,
                                                    style: `stroke-width:${Note.TAIL_WIDTH}`
                                                    } as const,
                                                expired: false
                                                } as const))[ind]

    //Default note object                                            
    const defualtNote:noteObj = {
        user_played: true,
        instrument_name: "piano",
        velocity: 100,
        pitch: 50,
        start: 0,
        end: 0,
        duration: 0.5,
        noteSVG: defaultNote(0)
    }

    //Array of keys used
    const Keys:Key[] = ["KeyD", "KeyF", "KeyJ", "KeyK"]

/**
 * Types
 */

    //names for each key
    type Key = "KeyD" | "KeyF" | "KeyJ" | "KeyK";

    //possible inputs are keydown, keyup, and keypress
    type Event = "keydown" | "keyup" | "keypress";

    //possible element types
    type elementType = "circle" | "line"

    type objSVG = noteSVG | tailSVG

    //type to store the csv data of each note
    type noteObj = Readonly<{
        user_played: boolean;
        instrument_name: string;
        velocity: number;
        pitch: number;
        start: number;
        end: number;
        duration: number;
        noteSVG: noteSVG;
    }>;

    //type to store the svg data of each note
    type noteSVG = 
    Readonly<{
        objType: elementType;
        svg: Readonly<{
            id: string;
            r: string;
            cx: string;
            cy: string;
            style: string;
        }>;
        expired: boolean;
    }>
    
    //type to store the svg data of each tail
    type tailSVG = 
    Readonly<{
        objType: elementType;
        svg: Readonly<{
            id: string;
            x1: string;
            y1: string;
            x2: string;
            y2: string;
            stroke: string;
            style: string;
        }>
        expired: boolean;
    }>

    //game state
    type State = Readonly<{
        gameEnd: boolean;
        notes: ReadonlyArray<noteObj>;
        holdNotes: ReadonlyArray<{note: noteObj, tail: tailSVG, pressed:boolean}>;
        toPlay: ReadonlyArray<noteObj>;
        toHoldPlay: ReadonlyArray<noteObj>;
        noteCount: number;
        score: number;
        combo: number;
        multiplier: number;
        RNG: number;
    }>;

    //Updater type functions that return Update type functions
    type Updater<T> = (data: T) => Update;

    //Update type functions that update the state
    type Update = (s: State) => State