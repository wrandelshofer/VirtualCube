/* @(#)VirtualCubeMain.mjs 
 * Copyright (c) 2018 Werner Randelshofer, Switzerland. MIT License.
 */

/** Integrates a virtual cube into a HTML page.
 */

import WebglPlayerApplet from './WebglPlayerApplet.mjs';
import TwoDPlayerApplet from './TwoDPlayerApplet.mjs';

let logger = {
    log: (false && console != null && console.log != null) ? console.log : () => {
    },
    info: (true && console != null && console.info != null) ? console.info : () => {
    },
    warning: (true && console != null && console.warn != null) ? console.warn : () => {
    },
    error: (true && console != null && console.error != null) ? console.error : () => {
    }
}

let nextId = 0;


/** 
 * Attaches a VirtualCube object to the specified <div> or <canvas> element.
 *
 * If a <div>-Element is specified, then the following child elements
 * are added to it:
 *
 * <canvas class="cube-canvas"/>
 * <div class="button-toolbar">
 *    <div class="reset-button" />
 *    <div class="undo-button" />
 *    <div class="redo-button" />
 *    <div class="scramble-button" />
 * </div>
 *
 * @param parameters applet parameters (key,names)
 * @param divOrCanvas 
 *               Optional <div> or <canvas> object.
 *               If divOrCanvas is null, a rubik's cube is attached to all
 *               <div> and <canvas>  elements in the document with 
 *               class "virtualcube".
 *               If a <canvas>-Element is specified, then a VirtualCube
 *               object is added to it as the property virtualcube.
 */
function attachVirtualCube(parameters, divOrCanvas) {
    logger.log("attaching virtual cube")
    if (parameters == null) {
        parameters = [];
    }

    if (divOrCanvas == null) {
        // => no element was provided, attach to all elements with class "virtualcube"
        let htmlCollection = [];
        try {
            htmlCollection = document.getElementsByClassName("virtualcube");
            if (htmlCollection.length == 0) {
                logger.error('no canvas or div element with class name "virtualcube" found.');
                return;
            }
        } catch (err) {
            // => IE does not support getElementsByClassName
            return;
        }
        for (let i = 0; i < htmlCollection.length; i++) {
            let elem = htmlCollection[i];
            attachVirtualCube(parameters, elem);
        }
    } else {
        // => an element was provided, attach VirtualCube to it
        let canvasElem = null;
        if (divOrCanvas.tagName == "CANVAS") {
            // => A <canvas> element was provided, attach to it
            canvasElem = divOrCanvas;
        } else if (divOrCanvas.tagName == "DIV") {
            // => A <div> element was provided, remove content, then insert a canvas element and buttons
            while (divOrCanvas.lastChild) {
                divOrCanvas.removeChild(divOrCanvas.lastChild);
            }

            let id = "virtualcube_" + nextId++;
            canvasElem = document.createElement("canvas");
            canvasElem.setAttribute("class", "cube-canvas");
            canvasElem.setAttribute("id", id);
            canvasElem.setAttribute("width", "220px");
            canvasElem.setAttribute("height", "220px");
            canvasElem.style.width="220px";
            canvasElem.style.height="220px";
 
            // copy attributes from divOrCanvas over to the canvasElem
            for (let i = 0; i < divOrCanvas.attributes.length; i++) {
                let attr = divOrCanvas.attributes[i];
                if (attr.name != "id" && attr.name != "class") {
                    logger.log('.attachVirtualCube copying attribute attr.name:' + attr.name + ' attr.value:' + attr.value);
                    canvasElem.setAttribute(attr.name, attr.value);
                }
            }
            if (!divOrCanvas.hasAttribute("kind")) {
                canvasElem.setAttribute("kind", divOrCanvas.getAttribute("kind"));
            }
            if (!divOrCanvas.hasAttribute("debug")) {
                canvasElem.setAttribute("debug", "");
            }

            divOrCanvas.appendChild(canvasElem);

            let toolbarElem = document.createElement("div");
            toolbarElem.setAttribute("class", "button-toolbar");
            divOrCanvas.appendChild(toolbarElem);
            let buttonElem;
            buttonElem = document.createElement("button");
            buttonElem.setAttribute("type", "button");
            buttonElem.setAttribute("class", "reset-button");
            buttonElem.setAttribute("onclick", "document.getElementById('" + id + "').virtualcube.reset();");
            buttonElem.appendChild(document.createTextNode("Reset"));
            toolbarElem.appendChild(buttonElem);
            buttonElem = document.createElement("button");
            buttonElem.setAttribute("type", "button");
            buttonElem.setAttribute("class", "undo-button");
            buttonElem.setAttribute("onclick", "document.getElementById('" + id + "').virtualcube.undo();");
            buttonElem.appendChild(document.createTextNode("Undo"));
            toolbarElem.appendChild(buttonElem);
            buttonElem = document.createElement("button");
            buttonElem.setAttribute("type", "button");
            buttonElem.setAttribute("class", "redo-button");
            buttonElem.setAttribute("onclick", "document.getElementById('" + id + "').virtualcube.redo();");
            buttonElem.appendChild(document.createTextNode("Redo"));
            toolbarElem.appendChild(buttonElem);
            buttonElem = document.createElement("button");
            buttonElem.setAttribute("type", "button");
            buttonElem.setAttribute("class", "scramble-button");
            buttonElem.setAttribute("onclick", "document.getElementById('" + id + "').virtualcube.scramble();");
            buttonElem.appendChild(document.createTextNode("Scramble"));
            toolbarElem.appendChild(buttonElem);
            /*
             buttonElem = document.createElement("button");
             buttonElem.setAttribute("type","button");
             buttonElem.setAttribute("onclick","document.getElementById('"+id+"').virtualcube.wobble();");  
             buttonElem.appendChild(document.createTextNode("Wobble"));
             toolbarElem.appendChild(buttonElem);
             buttonElem = document.createElement("button");
             buttonElem.setAttribute("type","button");
             buttonElem.setAttribute("onclick","document.getElementById('"+id+"').virtualcube.explode();");  
             buttonElem.appendChild(document.createTextNode("Explode"));
             toolbarElem.appendChild(buttonElem);
             */
        } else {
            logger.error('element ' + divOrCanvas + ' is not a canvas or a div. tagName=' + divOrCanvas.tagName);
            return;
        }
        let vr = new VirtualCube(canvasElem);
        vr.parameters = [];
        for (let key in parameters) {
            vr.parameters[key] = parameters[key];
        }
        for (let i = 0; i < divOrCanvas.attributes.length; i++) {
            let attr = divOrCanvas.attributes[i];
            if (attr.name != "id" && attr.name != "class") {
                logger.log('.attachVirtualCube copying parameter attr.name:' + attr.name + ' attr.value:' + attr.value);
                vr.parameters[attr.name] = attr.value;
            }
        }
        vr.init();
        canvasElem.virtualcube = vr;
    }
}

/** Constructor.
 * 
 * Creates a virtual rubik's cube and attaches it to the specified canvas
 * object. 
 * init() must be called after construction.
 */
class VirtualCube {
    constructor(canvas) {
        this.canvas = canvas;
        this.parameters = {baseurl: 'lib'};
    }

    /** Initializes the virtual cube. */
    init() {
        let rendercontext = this.parameters.rendercontext;
        logger.log('reading parameter rendercontext:' + rendercontext);
        if (rendercontext == "2d") {
            this.canvas3d = new TwoDPlayerApplet.TwoDPlayerApplet();
        } else if (rendercontext == null || rendercontext == "webgl") {
            this.canvas3d = new WebglPlayerApplet.WebglPlayerApplet();
        } else {
            logger.error('illegal rendercontext:' + rendercontext);
            this.canvas3d = new WebglPlayerApplet.WebglPlayerApplet();
        }
        for (let k in this.parameters) {
            this.canvas3d.parameters[k] = this.parameters[k];
        }
        let s = this.canvas3d.setCanvas(this.canvas);
        if (!s) {
            logger.log("Could not instantiate WebGL Context, falling back to 2D Context");
            for (let k in this.parameters) {
                this.canvas3d.parameters[k] = this.parameters[k]
            }
            this.canvas3d = new TwoDPlayerApplet.TwoDPlayerApplet();
            for (let k in this.parameters) {
                this.canvas3d.parameters[k] = this.parameters[k];
            }
            s = this.canvas3d.setCanvas(this.canvas);
        }
    }
    reset() {
        this.canvas3d.reset();
    }
    scramble(scrambleCount, animate) {
        this.canvas3d.scramble(scrambleCount, animate);
    }
    undo() {
        this.canvas3d.undo();
    }
    redo() {
        this.canvas3d.redo();
    }
    play() {
        this.canvas3d.play();
    }
    solveStep() {
        this.canvas3d.solveStep();
    }
    wobble() {
        this.canvas3d.wobble();
    }
    explode() {
        this.canvas3d.explode();
    }
    setAutorotate(newValue) {
        this.canvas3d.setAutorotate(newValue);
    }
}

// ------------------
// MODULE API    
// ------------------
export default {
    attachVirtualCube: attachVirtualCube
};

