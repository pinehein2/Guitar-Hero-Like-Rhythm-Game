export { updateStateAll, updatePress, updateNotes, updateRNG, updateHoldNotes, initialState } 
import { State, Updater, Update, noteObj, RegisterThreshold, Expiry, defualtNote, Constants, tailSVG, notesPPS } from "./types"
import { getRandomInstrument, withinBounds } from "./utils"

/** State processing */

const initialState: State = {
    gameEnd: false,
    notes: [],
    holdNotes: [],
    toPlay: [],
    toHoldPlay: [],
    noteCount: 0,
    score: 0,
    combo: 0,
    multiplier: 1.0,
    RNG: 0,
} as const;

//Updates the state every tick
const updateStateAll:Updater<number> = (data: number):Update => {
    //Checks if the game has ended
    const checkGameEnd = (s:State) =>
        s.noteCount === Constants.TOTAL_NOTES && s.notes.length === 0

    //Calculates the multiplier
    const multiplierHelper = (s:State):number => 
        1 + Math.floor((Math.floor(s.combo/10) * 0.2) * 10)/10

    //Updates the notes and removes the expired ntoes
    const notesHelper = (s:State): ReadonlyArray<noteObj> =>    
        s.notes.filter(note => !note.noteSVG.expired)
        .map(note => ({...note, noteSVG: {...note.noteSVG, expired: Number(note.noteSVG.svg.cy) >= Expiry, svg: {...note.noteSVG.svg, cy: `${Number(note.noteSVG.svg.cy) + notesPPS}`}}}))

    //Updates the holdnotes and removes the expired notes
    const holdNotesHelper = (s:State) => s.holdNotes.filter(({tail}) => !tail.expired)
        .map(({note, tail, pressed}) => 
        ({note: {...note, noteSVG:{...note.noteSVG, expired: Number(note.noteSVG.svg.cy) >= Expiry || note.noteSVG.expired,svg:{...note.noteSVG.svg, cy: pressed ? note.noteSVG.svg.cy : `${Number(note.noteSVG.svg.cy) + notesPPS}` }}}, 
        tail: ({...tail, expired:Number(tail.svg.y1) >= Expiry || (Number(tail.svg.y1) > RegisterThreshold.UPPER && pressed), svg: {...tail.svg, y1: `${Number(tail.svg.y1) + notesPPS}`,  y2: note.noteSVG.svg.cy}}), pressed: pressed}))
    
    //Updates the combo and resets if a note is missed
    const comboHelper = (s:State) =>
        ((s.notes.filter(note=>Number(note.noteSVG.svg.cy) >= Expiry).length > 0) || (s.holdNotes.filter(({note, tail}) => Number(note.noteSVG.svg.cy) >= Expiry || Number(tail.svg.y1) >= RegisterThreshold.UPPER).length > 0) ? 0 : s.combo)

    //The update for the state
    const updateState = (s:State):State => 
        ({...s,
            gameEnd: checkGameEnd(s),
            notes: notesHelper(s),
            holdNotes: holdNotesHelper(s),
            combo: comboHelper(s),
            multiplier: multiplierHelper(s),
            toPlay: []
        })

    return updateState
}

//Updates whenever there is a key press
const updatePress:Updater<Readonly<{press:boolean, col:string}>> = (data: Readonly<{press:boolean, col:string}>):Update => {
    //Gets all the notes within the hit registration range
    const pressedNotes = (s:State) => 
        s.notes.filter(note => data.col === note.noteSVG.svg.cx
        && withinBounds(Number(note.noteSVG.svg.cy)))
    
    //Gets all the holdnotes within the hit registration range
    const heldNotes = (s:State) =>
        s.holdNotes.filter(({note, tail}) => data.col === note.noteSVG.svg.cx
        && withinBounds(Number(note.noteSVG.svg.cy)))
    
    //Updates all the notes that have been hit
    const notesHelper = (s:State) =>
        s.notes.filter(note => !(pressedNotes(s).reduce((acc, curr) => (curr === note) || acc, false)))
        .concat(pressedNotes(s).map(note => ({...note, noteSVG: {...note.noteSVG, expired: true}})))
    
    //Updates all the holdnotes that have been hit
    const holdNotesHelper = (s:State) => 
        s.holdNotes.filter(holdnote => !(heldNotes(s).reduce((acc, curr) => (curr === holdnote) || acc, false)))
        .concat(heldNotes(s).map(holdnote => (data.press ? {...holdnote,
                                                            note: {...holdnote.note, noteSVG: {...holdnote.note.noteSVG, expired: true}}, 
                                                            tail: {...holdnote.tail}, 
                                                            pressed: true} 
                                                         : {note: {...holdnote.note, noteSVG: {...holdnote.note.noteSVG, expired: true}}, 
                                                            tail: withinBounds(Number(holdnote.tail.svg.y1)) ? {...holdnote.tail, expired: true} : holdnote.tail, pressed: false})))

    //Updates the score if notes have been hit
    const scoreHelper = (s:State) => 
        pressedNotes(s).reduce(
            (score:number, note:noteObj) => (Math.abs(Number(note.noteSVG.svg.cy) - RegisterThreshold.CENTER) <= 15) 
            ? (score + 30*s.multiplier) : (score + 10*s.multiplier), s.score) 
    
    //Updates the score if a note is held the correct amount of time
    const holdScoreHelper = (s:State) =>
        heldNotes(s).filter(({tail, pressed}) => withinBounds(Number(tail.svg.y1)) && pressed)
            .reduce((score, {note}) => (Math.abs(Number(note.noteSVG.svg.cy) - RegisterThreshold.CENTER) <= 15) ? (score + 30*s.multiplier) : (score + 10*s.multiplier), s.score)

    //Updates the combo if a note has been hit        
    const comboHelper = (s:State) => s.combo + pressedNotes(s).length 

    //Updates the combo if a ntoe is held the correct amount of time
    const holdComboHelper = (s:State) => s.combo + heldNotes(s).filter(({tail, pressed}) => withinBounds(Number(tail.svg.y1)) && pressed).length
    
    //Gets the notes that are to be played
    const toPlayHelper = (s:State) => 
        pressedNotes(s).map(note => ({...note, 
                duration: 
                    Math.abs(Number(note.noteSVG.svg.cy) - RegisterThreshold.CENTER) <= 10 
                    ? note.duration 
                    : s.RNG*0.5
        }
        ))
    
    //Gets the hold notes that are to be played
    const holdToPlayHelper = (s:State) =>
        heldNotes(s).map(({note}) => ({...note, duration: Constants.TICK_RATE_MS/1000}))
    
    //Gets a random note to be played
    const toPlayRandomHelper = (s:State) => 
        data.press ? [{...defualtNote,
        instrument_name: getRandomInstrument(s.RNG),
        pitch: (s.RNG*80)%100,
        duration: s.RNG*0.5,
        }]: []
    
    //The update for the state
    const updateState = (s:State):State => 
        pressedNotes(s).length || heldNotes(s).length ?  
        (data.press ? 
        ({...s,
            notes: notesHelper(s),
            holdNotes: holdNotesHelper(s),
            score: scoreHelper(s),
            combo: comboHelper(s),
            toPlay: toPlayHelper(s),
            toHoldPlay: holdToPlayHelper(s)
        } )
        :
        (heldNotes(s).length ? {...s,
            holdNotes: holdNotesHelper(s),
            score: holdScoreHelper(s),
            combo: holdComboHelper(s),
            toHoldPlay: []
        }: {...s})) : {...s,
            toPlay: toPlayRandomHelper(s),
            toHoldPlay: []
        }
    
    return updateState
}

const updateNotes:Updater<noteObj> = (data: noteObj):Update => {
    //Updates the notes on screen
    const notesHelper = (s:State) => s.notes.concat([data])

    //Updates the note count
    const notesCountHelper = (s:State) => s.noteCount + 1

    //The update for the state
    const updateState = (s:State):State => {
        return data.user_played ? {
            ...s, 
            notes: notesHelper(s),
            noteCount: notesCountHelper(s)
        } : {
            ...s,
            noteCount: notesCountHelper(s)
        }
    }
    return updateState
}

const updateHoldNotes:Updater<{note: noteObj, tail: tailSVG, pressed: boolean}> = (data: {note: noteObj, tail: tailSVG, pressed: boolean}):Update => {
    //Updates the holdnotes on screen
    const notesHelper = (s:State) => s.holdNotes.concat([data])

    //Updates the note count
    const notesCountHelper = (s:State) => s.noteCount + 1

    //The update for the state
    const updateState = (s:State):State => {
        return data.note.user_played ? {
            ...s, 
            holdNotes: notesHelper(s),
            noteCount: notesCountHelper(s)
        } : {
            ...s,
            noteCount: notesCountHelper(s)
        }
    }
    return updateState
}

const updateRNG:Updater<number> = (rand:number):Update => {
    //Updates the rng
    const rngHelper = (s:State) => rand

    //The update for the state
    const updateState = (s:State):State => {
        return {
            ...s,
            RNG:rngHelper(s)
        }
    }
    return updateState
}
