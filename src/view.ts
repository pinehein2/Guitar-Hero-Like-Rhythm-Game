export { updateView, show, hide, highlightElement }

import { State, noteObj, Constants, Viewport, S_TO_T, Key, objSVG, defaultNote, defaultTail } from "./types"

/**
 * Displays a SVG element on the canvas. Brings to foreground.
 * @param elem SVG element to display
 */
const show = (elem: SVGGraphicsElement) => {
    elem.setAttribute("visibility", "visible");
    elem.parentNode!.appendChild(elem);
    };

/**
 * Hides a SVG element on the canvas.
 * @param elem SVG element to hide
 */
const hide = (elem: SVGGraphicsElement) =>
    elem.setAttribute("visibility", "hidden");

/**
 * Creates an SVG element with the given properties.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element for valid
 * element names and properties.
 *
 * @param namespace Namespace of the SVG element
 * @param name SVGElement name
 * @param props Properties to set on the SVG element
 * @returns SVG element
 */
const createSvgElement = (
    namespace: string | null,
    name: string,
    props: Record<string, string> = {},
) => {
    const elem = document.createElementNS(namespace, name) as SVGElement;
    Object.entries(props).forEach(([k, v]) => elem.setAttribute(k, v));
    return elem;
};

//Sets multiple attributes at once
const setAttrs = (e: Element, o: { [p: string]: unknown }) => {
    for (const k in o) e.setAttribute(k, String(o[k])) 
};

//Highlights the element given the an on off switch and the id
const highlightElement = (lever:boolean, elementID:string) => 
    (lever ? document.getElementById(elementID)!.classList.add("highlight") : document.getElementById(elementID)!.classList.remove("highlight"));

//Updates the display
function updateView(onFinish: () => void): (_:State)=>void {
    return function (s: State):void {
        
        const svg = document.querySelector("#svgCanvas") as SVGGraphicsElement & HTMLElement;

        const gameover = document.querySelector("#gameOver") as SVGGraphicsElement & HTMLElement;

        const container = document.querySelector("#main") as HTMLElement;

        const multiplier = document.querySelector("#multiplierText") as HTMLElement;
        
        const scoreText = document.querySelector("#scoreText") as HTMLElement;
                
        const comboText = document.querySelector("#comboText") as HTMLElement;

        if (!svg || !gameover || !container || !multiplier || !scoreText) return

        createSvgElement(svg.namespaceURI, defaultTail(0).objType, defaultTail(0).svg)

        svg.setAttribute("height", `${Viewport.CANVAS_HEIGHT}`);
        svg.setAttribute("width", `${Viewport.CANVAS_WIDTH}`);
        
        const updateNotesView = (rootSVG: HTMLElement) => (currentNote: objSVG) => {

            function createBodyView() {
                const newNote = createSvgElement(rootSVG.namespaceURI, currentNote.objType,
                currentNote.svg);
                rootSVG.appendChild(newNote)
                return newNote
            }

            const note = document.getElementById(currentNote.svg.id) || createBodyView()
            currentNote.expired
            ? svg.removeChild(note)
            : setAttrs(note, currentNote.svg)
        }
        
        s.notes.forEach(note => updateNotesView(svg)(note.noteSVG));
        s.holdNotes.forEach(({note, tail}) => {updateNotesView(svg)(note.noteSVG); updateNotesView(svg)(tail)} )
        scoreText.innerHTML = String(s.score);
        multiplier.innerHTML = String(s.multiplier);
        comboText.innerHTML = String(s.combo);

        if (s.gameEnd) {
            show(gameover);
            onFinish();
        } else {
            hide(gameover);
        }
    }
}
