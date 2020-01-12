/* @(#)Cubes.mjs
 * Copyright (c) 2018 Werner Randelshofer, Switzerland. MIT License.
 */

import Cube from './Cube.mjs';
import ScriptNotation from './ScriptNotation.mjs';
let Symbol = ScriptNotation.Symbol;

    /**
     * Returns an int whose value is the smallest common multiple of
     * <tt>abs(a)</tt> and <tt>abs(b)</tt>.  Returns 0 if
     * <tt>a==0 || b==0</tt>.
     *
     * @param  a value with with the SCM is to be computed.
     * @param  b value with with the SCM is to be computed.
     * @return <tt>SCM(a, b)</tt>
     */
    function scm(a, b) {
        // Quelle:
        //   Herrmann, D. (1992). Algorithmen Arbeitsbuch.
        //   Bonn, München Paris: Addison Wesley.
        //   gill, Seite 141

        if (a == 0 || b == 0) return 0;

        a = Math.abs(a);
        b = Math.abs(b);

        let u = a;
        let v = b;

        while (a != b) {
            if (a < b) {
                b -= a;
                v += u;
            } else {
                a -= b;
                u += v;
            }
        }


        //return a; // gcd
        return (u + v) / 2; // scm
    }

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
        notation.getToken(Symbol.FACE_R),
        notation.getToken(Symbol.FACE_U),
        notation.getToken(Symbol.FACE_F),
        notation.getToken(Symbol.FACE_L),
        notation.getToken(Symbol.FACE_D),
        notation.getToken(Symbol.FACE_B),
        notation.getToken(Symbol.PERMUTATION_PLUS),
        notation.getToken(Symbol.PERMUTATION_PLUSPLUS),
        notation.getToken(Symbol.PERMUTATION_MINUS),
        notation.getToken(Symbol.PERMUTATION_BEGIN),
        notation.getToken(Symbol.PERMUTATION_END),
        notation.getToken(Symbol.PERMUTATION_DELIMITER)
          );
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


    /**
     * Returns a number that describes the order
     * of the permutation of the supplied cube.
     * <p>
     * The order says how many times the permutation
     * has to be applied to the cube to get the
     * initial state.
     *
     * @param cube A cube
     * @return the order of the permutation of the cube
     */
    function getOrder(cube) {
        let cornerLoc = cube.getCornerLocations();
        let cornerOrient = cube.getCornerOrientations();
        let edgeLoc = cube.getEdgeLocations();
        let edgeOrient = cube.getEdgeOrientations();
        let sideLoc = cube.getSideLocations();
        let sideOrient = cube.getSideOrientations();

        let order = 1;

        let visitedLocs;
        let i, j, k, n, p;
        let prevOrient;
        let length;

        // determine cycle lengths of the current corner permutation
        // and compute smallest common multiple
        visitedLocs = new Array(cornerLoc.length);

        for (i = 0; i < 8; i++) {
            if (!visitedLocs[i]) {
                if (cornerLoc[i] == i && cornerOrient[i] == 0) {
                    continue;
                }

                length = 1;

                visitedLocs[i] = true;
                prevOrient = 0;

                for (j = 0; cornerLoc[j] != i; j++) {
                }

                while (!visitedLocs[j]) {
                    visitedLocs[j] = true;
                    prevOrient = (prevOrient + cornerOrient[j]) % 3;

                    length++;

                    for (k = 0; cornerLoc[k] != j; k++) {
                    }
                    j = k;
                }

                prevOrient = (prevOrient + cornerOrient[i]) % 3;
                if (prevOrient != 0) {
                    //order = scm(order, 3);
                    length *= 3;
                }
                order = scm(order, length);
            }
        }

        // determine cycle lengths of the current edge permutation
        // and compute smallest common multiple
        visitedLocs = new Array(edgeLoc.length);
        for (i = 0, n = edgeLoc.length; i < n; i++) {
            if (!visitedLocs[i]) {
                if (edgeLoc[i] == i && edgeOrient[i] == 0) {
                    continue;
                }

                length = 1;

                visitedLocs[i] = true;
                prevOrient = 0;

                for (j = 0; edgeLoc[j] != i; j++) {
                }

                while (!visitedLocs[j]) {
                    visitedLocs[j] = true;
                    prevOrient ^= edgeOrient[j];

                    length++;

                    for (k = 0; edgeLoc[k] != j; k++) {
                    }
                    j = k;
                }

                if ((prevOrient ^ edgeOrient[i]) == 1) {
                    //order = scm(order, 2);
                    length *= 2;
                }
                order = scm(order, length);
            }
        }

        // determine cycle lengths of the current side permutation
        // and compute smallest common multiple
        visitedLocs = new Array(sideLoc.length);
        for (i = 0, n = sideLoc.length; i < n; i++) {
            if (!visitedLocs[i]) {
                if (sideLoc[i] == i && sideOrient[i] == 0) {
                    continue;
                }

                length = 1;

                visitedLocs[i] = true;
                prevOrient = 0;

                for (j = 0; sideLoc[j] != i; j++) {
                }

                while (!visitedLocs[j]) {
                    visitedLocs[j] = true;

                    length++;

                    prevOrient = (prevOrient + sideOrient[j]) % 4;

                    for (k = 0; sideLoc[k] != j; k++) {
                    }
                    j = k;
                }

                prevOrient = (prevOrient + sideOrient[i]) % 4;
                switch (prevOrient) {
                    case 0: // no sign
                        break;
                    case 1: // '-' sign
                        //order = scm(order, 4);
                        length *= 4;
                        break;
                    case 2: // '++' sign
                        //order = scm(order, 2);
                        length *= 2;
                        break;
                    case 3: // '+' sign
                        //order = scm(order, 4);
                        length *= 4;
                        break;
                }
                order = scm(order, length);
            }
        }

        return order;
    }

    /**
     * Returns a number that describes the order
     * of the permutation of the supplied cube,
     * assuming that all stickers only have a solid
     * color, and that all stickers on the same face
     * have the same color.
     * <p>
     * On a cube with such stickers, we can
     * not visually determine the orientation of its
     * side parts, and we can not visually determine
     * a permutation of side parts of which all side
     * parts are on the same face of the cube.
     * <p>
     * The order says how many times the permutation
     * has to be applied to the cube to get the
     * initial state.
     *
     * @param cube A cube
     * @return the order of the permutation of the cube
     */
function getVisibleOrder(cube) {
        let cornerLoc = cube.getCornerLocations();
        let cornerOrient = cube.getCornerOrientations();
        let edgeLoc = cube.getEdgeLocations();
        let edgeOrient = cube.getEdgeOrientations();
        let sideLoc = cube.getSideLocations();
        let sideOrient = cube.getSideOrientations();
        let order = 1;

        let visitedLocs;
        let i, j, k, n, p;
        let prevOrient;
        let length;

        // determine cycle lengths of the current corner permutation
        // and compute smallest common multiple
        visitedLocs = new Array(cornerLoc.length);

        for (i = 0, n = cornerLoc.length; i < n; i++) {
            if (!visitedLocs[i]) {
                if (cornerLoc[i] == i && cornerOrient[i] == 0) {
                    continue;
                }

                length = 1;

                visitedLocs[i] = true;
                prevOrient = 0;

                for (j = 0; cornerLoc[j] != i; j++) {
                }

                while (!visitedLocs[j]) {
                    visitedLocs[j] = true;
                    prevOrient = (prevOrient + cornerOrient[j]) % 3;

                    length++;

                    for (k = 0; cornerLoc[k] != j; k++) {
                    }
                    j = k;
                }

                prevOrient = (prevOrient + cornerOrient[i]) % 3;
                if (prevOrient != 0) {
                    //order = scm(order, 3);
                    length *= 3;
                }
                order = scm(order, length);
            }
        }

        // determine cycle lengths of the current edge permutation
        // and compute smallest common multiple
        visitedLocs = new Array(edgeLoc.length);
        for (i = 0, n = edgeLoc.length; i < n; i++) {
            if (!visitedLocs[i]) {
                if (edgeLoc[i] == i && edgeOrient[i] == 0) {
                    continue;
                }

                length = 1;

                visitedLocs[i] = true;
                prevOrient = 0;

                for (j = 0; edgeLoc[j] != i; j++) {
                }

                while (!visitedLocs[j]) {
                    visitedLocs[j] = true;
                    prevOrient ^= edgeOrient[j];

                    length++;

                    for (k = 0; edgeLoc[k] != j; k++) {
                    }
                    j = k;
                }

                if ((prevOrient ^ edgeOrient[i]) == 1) {
                    //order = scm(order, 2);
                    length *= 2;
                }
                order = scm(order, length);
            }
        }

        // Determine cycle lengths of the current side permutation
        // and compute smallest common multiple.
        // Ignore changes of orientation.
        // Ignore side permutations which are entirely on same face.
        visitedLocs = new Array(sideLoc.length);
        for (i = 0, n = sideLoc.length; i < n; i++) {
            if (!visitedLocs[i]) {
                if (sideLoc[i] == i && sideOrient[i] == 0) {
                    continue;
                }

                length = 1;

                visitedLocs[i] = true;
                let firstFace = sideLoc[i] % 6;
                let allPartsAreOnSameFace = true;

                for (j = 0; sideLoc[j] != i; j++) {
                }

                while (!visitedLocs[j]) {
                    visitedLocs[j] = true;

                    length++;
                    if (firstFace != sideLoc[j] % 6) {
                        allPartsAreOnSameFace = false;
                    }

                    for (k = 0; sideLoc[k] != j; k++) {
                    }
                    j = k;
                }
                if (!allPartsAreOnSameFace) {
                    order = scm(order, length);
                }
            }
        }

        return order;
    }

// ------------------
// MODULE API    
// ------------------
export default {
    toPermutationString: toPermutationString,
    getOrder : getOrder,
    getVisibleOrder: getVisibleOrder
};

