/* @(#)Cubes.mjs
 * Copyright (c) 2018 Werner Randelshofer, Switzerland. MIT License.
 */

import Cube from './Cube.mjs';
import ScriptNotation from './ScriptNotation.mjs';
let Symbol = ScriptNotation.Symbol;

/**
 * Returns a String describing the state of the cube using
 * Bandelow's permutation notation.
 * 
 * @param cube:Cube
 * @param notation:ScriptNotation optional
 * @return a permutation String
 */
function toPermutationString(cube, notation) {
    if (notation == null) {
        notation = new ScriptNotation.DefaultNotation();
    }
    let syntax = notation.getSyntax(ScriptNotation.Symbol.PERMUTATION);

    return toPermutationString0(cube, syntax,
        notation.getToken(Symbol.PERMUTATION_FACE_R),
                    notation.getToken(Symbol.PERMUTATION_FACE_U),
                    notation.getToken(Symbol.PERMUTATION_FACE_F),
                    notation.getToken(Symbol.PEMRUTATION_FACE_L),
                    notation.getToken(Symbol.PERMUTATION_FACE_D),
                    notation.getToken(Symbol.PERMUTATION_FACE_B),
                    notation.getToken(Symbol.PERMUTATION_PLUS),
                    notation.getToken(Symbol.PERMUTATION_PLUSPLUS),
                    notation.getToken(Symbol.PERMUTATION_MINUS),
                    notation.getToken(Symbol.PERMUTATION_BEGIN),
                    notation.getToken(Symbol.PERMUTATION_END),
                    notation.getToken(Symbol.PERMUTATION_DELIMITER));
}


function toPermutationString0(cube,
  syntax,
  tR, tU, tF,
  tL, tD, tB,
  tPlus, tPlusPlus, tMinus,
  tBegin, tEnd, tDelimiter) {

    let buf = '';

    let corners = toCornerPermutationString(cube, syntax,
      tR, tU, tF, tL, tD, tB,
      tPlus, tPlusPlus, tMinus,
      tBegin, tEnd, tDelimiter);
    let edges = toEdgePermutationString(cube, syntax,
      tR, tU, tF, tL, tD, tB,
      tPlus, tPlusPlus, tMinus,
      tBegin, tEnd, tDelimiter);
    let sides = toSidePermutationString(cube, syntax,
      tR, tU, tF, tL, tD, tB,
      tPlus, tPlusPlus, tMinus,
      tBegin, tEnd, tDelimiter);

    buf = buf + corners;
    if (buf.length > 0 && edges.length > 0) {
        buf += '\n';
    }
    buf = buf + edges;
    if (buf.length > 0 && sides.length > 0) {
        buf += '\n';
    }
    buf = buf + sides;
    if (buf.length == 0) {
        buf = buf + tBegin;
        buf = buf + tEnd;
    }
    return buf;
}
function toCornerPermutationString(cube, syntax,
  tR, tU, tF,
  tL, tD, tB,
  tPlus, tPlusPlus, tMinus,
  tBegin, tEnd, tDelimiter) {

    let cornerLoc = cube.cornerLoc;
    let edgeLoc = cube.edgeLoc;
    let sideLoc = cube.sideLoc;
    let cornerOrient = cube.cornerOrient;
    let edgeOrient = cube.edgeOrient;
    let sideOrient = cube.sideOrient;
    let cycle = Array(Math.max(Math.max(cube.getCornerCount(), cube.getEdgeCount()), cube.getSideCount()));
    let layerCount = cube.getLayerCount();
    let hasEvenLayerCount = layerCount % 2 == 0;

    let buf = '';
    let visitedLocs = Array();

    let i, j, k, l, p, n;

    let prevOrient;
    let isFirst;

    // describe the state changes of the corner parts
    let corners = [
        [tU, tR, tF], // urf
        [tD, tF, tR], // dfr
        [tU, tB, tR], // ubr
        [tD, tR, tB], // drb
        [tU, tL, tB], // ulb
        [tD, tB, tL], // dbl
        [tU, tF, tL], // ufl
        [tD, tL, tF]// dlf
    ];

    visitedLocs = new Array(cube.getCornerCount());
    isFirst = true;
    for (i = 0, n = cube.getCornerCount(); i < n; i++) {
        if (!visitedLocs[i]) {
            if (cornerLoc[i] == i && cornerOrient[i] == 0) {
                continue;
            }

            // gather a permutation cycle
            let cycleLength = 0;
            let cycleStart = 0;
            j = i;
            while (!visitedLocs[j]) {
                visitedLocs[j] = true;
                cycle[cycleLength++] = j;
                if (cornerLoc[j] < cornerLoc[cycle[cycleStart]]) {
                    cycleStart = cycleLength - 1;
                }
                for (k = 0; cornerLoc[k] != j; k++) {
                }
                j = k;
            }

            // print the permutation cycle
            if (isFirst) {
                isFirst = false;
            } else {
                buf += ' ';
            }
            if (syntax == ScriptNotation.Syntax.PREFIX) {
                // the sign of the cycle will be inserted before the opening bracket
                p = buf.length;
                buf = buf + tBegin;
            } else if (syntax == ScriptNotation.Syntax.PRECIRCUMFIX) {
                // the sign of the cycle will be inserted after the opening bracket
                buf = buf + tBegin;
                p = buf.length;
            } else {
                buf = buf + tBegin;
                p = -1;
            }

            prevOrient = 0;
            for (k = 0; k < cycleLength; k++) {
                j = cycle[(cycleStart + k) % cycleLength];
                if (k != 0) {
                    buf = buf + tDelimiter;
                    prevOrient = (prevOrient + cornerOrient[j]) % 3;
                }
                switch (prevOrient) {
                    case 0:
                        buf += corners[j][0];
                        buf += corners[j][1];
                        buf += corners[j][2];
                        break;
                    case 2:
                        buf += corners[j][1];
                        buf += corners[j][2];
                        buf += corners[j][0];
                        break;
                    case 1:
                        buf += corners[j][2];
                        buf += corners[j][0];
                        buf += corners[j][1];
                        break;
                }
            }
            j = cycle[cycleStart];
            prevOrient = (prevOrient + cornerOrient[j]) % 3;
            if (syntax == ScriptNotation.Syntax.POSTCIRCUMFIX) {
                // the sign of the cycle will be inserted before the closing bracket
                p = buf.length;
                buf += tEnd;
            } else if (syntax == ScriptNotation.Syntax.SUFFIX) {
                // the sign of the cycle will be inserted after the closing bracket
                buf += tEnd;
                p = buf.length;
            } else {
                buf += tEnd;
            }
            // insert cycle sign
            if (prevOrient != 0) {
                buf = buf.substring(0, p) + ((prevOrient == 1) ? tMinus : tPlus) + buf.substring(p);
            }
        }
    }
    return buf;
}

function toEdgePermutationString(cube, syntax,
  tR, tU, tF,
  tL, tD, tB,
  tPlus, tPlusPlus, tMinus,
  tBegin, tEnd, tDelimiter) {

    let cornerLoc = cube.getCornerLocations();
    let edgeLoc = cube.getEdgeLocations();
    let sideLoc = cube.getSideLocations();
    let cornerOrient = cube.getCornerOrientations();
    let edgeOrient = cube.getEdgeOrientations();
    let sideOrient = cube.getSideOrientations();
    let cycle = Array(Math.max(Math.max(cube.getCornerCount(), cube.getEdgeCount()), cube.getSideCount()));
    let layerCount = cube.getLayerCount();
    let hasEvenLayerCount = layerCount % 2 == 0;

    let buf = '';
    let visitedLocs = Array();

    let i, j, k, l, p, n;
    let prevOrient;
    let isFirst;

    // describe the state changes of the edge parts
    if (edgeLoc.length > 0) {
        let edges = [
            [tU, tR], //"ur"
            [tR, tF], //"rf"
            [tD, tR], //"dr"
            [tB, tU], //"bu"
            [tR, tB], //"rb"
            [tB, tD], //"bd"
            [tU, tL], //"ul"
            [tL, tB], //"lb"
            [tD, tL], //"dl"
            [tF, tU], //"fu"
            [tL, tF], //"lf"
            [tF, tD] //"fd"
        ];
        visitedLocs = new Array(cube.getEdgeCount());
        isFirst = true;
        let previousCycleStartEdge = -1;
        for (i = 0, n = cube.getEdgeCount(); i < n; i++) {
            if (!visitedLocs[i]) {
                if (edgeLoc[i] == i && edgeOrient[i] == 0) {
                    continue;
                }

                // gather a permutation cycle
                let cycleLength = 0;
                let cycleStart = 0;
                j = i;
                while (!visitedLocs[j]) {
                    visitedLocs[j] = true;
                    cycle[cycleLength++] = j;
                    if (previousCycleStartEdge == j % 12) {
                        cycleStart = cycleLength - 1;
                    }
                    for (k = 0; edgeLoc[k] != j; k++) {
                    }
                    j = k;
                }
                previousCycleStartEdge = cycle[cycleStart] % 12;

                // print the permutation cycle
                if (isFirst) {
                    isFirst = false;
                } else {
                    buf += ' ';
                }

                if (syntax == ScriptNotation.Syntax.PREFIX) {
                    // the sign of the cycle will be inserted before the opening bracket
                    p = buf.length;
                    buf += (tBegin);
                } else if (syntax == ScriptNotation.Syntax.PRECIRCUMFIX) {
                    // the sign of the cycle will be inserted after the opening bracket
                    buf += (tBegin);
                    p = buf.length;
                } else {
                    buf += (tBegin);
                    p = -1;
                }

                prevOrient = 0;
                for (k = 0; k < cycleLength; k++) {
                    j = cycle[(cycleStart + k) % cycleLength];
                    if (k != 0) {
                        buf += (tDelimiter);
                        prevOrient ^= edgeOrient[j];
                    }
                    if (prevOrient == 1) {
                        buf += (edges[j % 12][1]);
                        buf += (edges[j % 12][0]);
                    } else {
                        buf += (edges[j % 12][0]);
                        buf += (edges[j % 12][1]);
                    }
                    if (hasEvenLayerCount) {
                        buf += (j / 12 + 1);
                    } else {
                        if (j >= 12) {
                            buf += (j / 12);
                        }
                    }
                }
                j = cycle[cycleStart];
                if (syntax == ScriptNotation.Syntax.POSTCIRCUMFIX) {
                    // the sign of the cycle will be inserted before the closing bracket
                    p = buf.length;
                    buf += (tEnd);
                } else if (syntax == ScriptNotation.Syntax.SUFFIX) {
                    // the sign of the cycle will be inserted after the closing bracket
                    buf += (tEnd);
                    p = buf.length;
                } else {
                    buf += (tEnd);
                }
                // insert cycle sign
                if ((prevOrient ^ edgeOrient[j]) == 1) {
                    buf = buf.substring(0, p) + tPlus + buf.substring(p);
                }
            }
        }
    }

    return buf;
}

function toSidePermutationString(cube, syntax,
  tR, tU, tF,
  tL, tD, tB,
  tPlus, tPlusPlus, tMinus,
  tBegin, tEnd, tDelimiter) {

    let cornerLoc = cube.getCornerLocations();
    let edgeLoc = cube.getEdgeLocations();
    let sideLoc = cube.getSideLocations();
    let cornerOrient = cube.getCornerOrientations();
    let edgeOrient = cube.getEdgeOrientations();
    let sideOrient = cube.getSideOrientations();
    let cycle = new Array(Math.max(Math.max(cube.getCornerCount(), cube.getEdgeCount()), cube.getSideCount()));
    let layerCount = cube.getLayerCount();
    let hasEvenLayerCount = layerCount % 2 == 0;

    let buf = '';
    let visitedLocs;

    let i, j, k, l, p, n;
    let prevOrient;
    let isFirst;

    if (sideLoc.length > 0) { // describe the state changes of the side parts
        let sides = [
            tR, tU, tF, tL, tD, tB // r u f l d b
        ];
        let sideOrients = [
            "", tMinus, tPlusPlus, tPlus
        ];
        visitedLocs = new Array(cube.getSideCount());
        isFirst = true;
        let previousCycleStartSide;

        // First Pass: Only print permutation cycles which lie on a single
        // face of the cube. 
        // Second pass: Only print permutation cycles which don't lie on
        // a singe fass of the cube.
        for (let twoPass = 0; twoPass < 2; twoPass++) {
            for (i = 0; i < visitedLocs.length; i++)
                visitedLocs[i] = false;
            for (let byFaces = 0, nf = 6; byFaces < nf; byFaces++) {
                previousCycleStartSide = -1;
                for (let byParts = 0, np = cube.getSideCount() / 6; byParts < np; byParts++) {
                    i = byParts + byFaces * np;
                    if (!visitedLocs[i]) {
                        if (sideLoc[i] == i && sideOrient[i] == 0) {
                            continue;
                        }

                        // gather a permutation cycle
                        let cycleLength = 0;
                        let cycleStart = 0;
                        let isOnSingleFace = true;
                        j = i;
                        while (!visitedLocs[j]) {
                            visitedLocs[j] = true;
                            cycle[cycleLength++] = j;
                            if (j % 6 != i % 6) {
                                isOnSingleFace = false;
                            }
                            if (cycle[cycleStart] > j) {
                                cycleStart = cycleLength - 1;
                            }
                            for (k = 0; sideLoc[k] != j; k++) {
                            }
                            j = k;
                        }
                        previousCycleStartSide = cycle[cycleStart] % 6;

                        if (isOnSingleFace == (twoPass == 0)) {

                            // print the permutation cycle
                            if (isFirst) {
                                isFirst = false;
                            } else {
                                buf += (' ');
                            }
                            if (syntax == ScriptNotation.Syntax.PREFIX) {
                                // the sign of the cycle will be inserted before the opening bracket
                                p = buf.length;
                                buf += (tBegin);
                            } else if (syntax == ScriptNotation.Syntax.PRECIRCUMFIX) {
                                // the sign of the cycle will be inserted after the opening bracket
                                buf += (tBegin);
                                p = buf.length;
                            } else {
                                buf += (tBegin);
                                p = -1;
                            }

                            prevOrient = 0;
                            for (k = 0; k < cycleLength; k++) {
                                j = cycle[(cycleStart + k) % cycleLength];
                                if (k != 0) {
                                    buf += (tDelimiter);
                                    prevOrient = (prevOrient + sideOrient[j]) % 4;
                                }
                                if (syntax == ScriptNotation.Syntax.PREFIX
                                  || syntax == ScriptNotation.Syntax.PRECIRCUMFIX
                                  || syntax == ScriptNotation.Syntax.POSTCIRCUMFIX) {
                                    buf += (sideOrients[prevOrient]);
                                }
                                buf += (sides[j % 6]);
                                if (syntax == ScriptNotation.Syntax.SUFFIX) {
                                    buf += (sideOrients[prevOrient]);
                                }
                                if (hasEvenLayerCount) {
                                    buf += (j / 6 + 1);
                                } else {
                                    if (j >= 6) {
                                        buf += (j / 6);
                                    }
                                }
                            }
                            j = cycle[cycleStart];
                            prevOrient = (prevOrient + sideOrient[j]) % 4;
                            if (syntax == ScriptNotation.Syntax.POSTCIRCUMFIX) {
                                // the sign of the cycle will be inserted before the closing bracket
                                p = buf.length;
                                buf += (tEnd);
                            } else if (syntax == ScriptNotation.Syntax.SUFFIX) {
                                // the sign of the cycle will be inserted after the closing bracket
                                buf += (tEnd);
                                p = buf.length;
                            } else {
                                buf += (tEnd);
                            }
                            // insert cycle sign
                            if (prevOrient != 0) {
                                buf = buf.substring(0, p) + (sideOrients[prevOrient]) + buf.substring(p);
                            }
                        }
                    }
                }
            }
        }
    }
    return buf;
}


// ------------------
// MODULE API    
// ------------------
export default {
    toPermutationString: toPermutationString
};

