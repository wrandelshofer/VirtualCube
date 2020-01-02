/* @(#)ScriptAST.mjs  0.1  2011-08-12
 * Copyright (c) 2011 Werner Randelshofer, Switzerland. MIT License.
 */

// --------------
// Module imports
// --------------
import ScriptNotation from './ScriptNotation.mjs';
const Symbol = ScriptNotation.Symbol;

class IllegalArgumentException extends Error {
    constructor(msg) {
        super(msg);
    }
}

/**
 * Represents an Abstract Syntax Tree Node.
 */
class Node {
    constructor(startPosition, endPosition) {
        this.children = [];
        this.parent = null;
        this.startPosition = startPosition;
        this.endPosition = endPosition;
    }

    add(child) {
        if (child.parent != null) {
            child.removeFromParent();
        }
        child.parent = this;
        this.children.push(child);
    }
    addAll(children) {
        for (let child of children) {
            this.add(child);
        }
    }

    remove(child) {
        if (child.parent == this) {
            let index = this.children.indexOf(child);
            if (index != -1) {
                this.children.splice(index, 1);
            }
            child.parent = null;
        }
    }

    removeFromParent() {
        if (this.parent != null) {
            this.parent.remove(this);
        }
    }
    removeAllChildren() {
        for (let i = this.getChildCount() - 1; i >= 0; i--) {
            this.remove(this.getChildAt(i));
        }
    }

    getChildren() {
        return this.children;
    }
    getChildCount() {
        return this.children.length;
    }
    getChildAt(index) {
        return this.children[index];
    }

    setStartPosition(newValue) {
        this.startPosition = newValue;
    }
    setEndPosition(newValue) {
        this.endPosition = newValue;
    }

    getSymbol() {
        return null;
    }
    getNodeName() {
        let sym = this.getSymbol();
        return sym == null ? "node" : sym.getName().toLowerCase();
    }
    getStartPosition() {
        return this.startPosition;
    }
    getEndPosition() {
        return this.endPosition;
    }

    applyTo(cube, inverse = false) {
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].applyTo(cube, inverse);
    }
    }

    /** 
     * Enumerates a resolved version of the subtree starting at this node. All
     * elements of the enumeration except of MoveNode's and PermutationNode's
     * may be safely ignored.
     *
     * @param inverse:boolean 
     */
    * resolvedIterable(inverse = false) {
        if (inverse) {
            for (let i = this.children.length - 1; i >= 0; i--) {
                yield* this.children[i].resolvedIterable(inverse);
            }
        } else {
            for (let i in this.children) {
                yield * this.children[i].resolvedIterable(inverse);
            }
    }
    }

    toString() {
        return "Node";
    }
}

/**
 * A CommutationNode holds a child A and a child B.
 * The side effect of a commutation node is A B A' B'.
 */
class CommutationNode extends Node {
    constructor() {
        super();
    }
    getSymbol() {
        return Symbol.COMMUTATION;
    }
}
/**
 * A ConjugationNode holds a conjugator A and a single child B.
 * The side effect of a conjugation node is A B A'.
 */
class ConjugationNode extends Node {
    constructor() {
        super();
    }

    getSymbol() {
        return Symbol.CONJUGATION;
    }
}
class SequenceNode extends Node {
    constructor(startPosition, endPosition) {
        super(startPosition, endPosition);
    }
    getSymbol() {
        return Symbol.SEQUENCE;
    }
}

class GroupingNode extends Node {
    constructor() {
        super();
    }

    getSymbol() {
        return Symbol.GROUPING;
    }
}

/**
 * An InversionNode holds one child A.
 * The side effect of an inversion node is A'.
 */
class InversionNode extends Node {
    constructor() {
        super();
    }
    applyTo(cube, inverse = false) {
        super.applyTo(cube, !inverse);
    }
    * resolvedIterable(inverse = false) {
        yield* super.resolvedIterable(!inverse);
    }

    getSymbol() {
        return Symbol.INVERSION;
    }
}

class PermutationItemNode extends Node {
    constructor(startPosition, endPosition) {
        super(startPosition, endPosition);

        /**
        * The orientation of the part.
        * Values: 0, 1 for edge parts.
        * 0, 1, 2 for side parts.
        * 0, 1, 2, 3, 4, 5 for corner parts
        */
        this.orientation = null;
        /**
        * The location of the part.
        *
        * @see ch.randelshofer.rubik.Cube
        */
        this.location = null;
    }

    getSymbol() {
        return Symbol.PERMUTATION_ITEM;
    }

    getOrientation() {
        return this.orientation;
    }

    setOrientation(orientation) {
        this.orientation = orientation;
    }

    getLocation() {
        return this.location;
    }

    setLocation(location) {
        this.location = location;
    }
}
const PLUS_SIGN = 3;
const PLUSPLUS_SIGN = 2;
const MINUS_SIGN = 1;
const  NO_SIGN = 0;
const  UNDEFINED_SIGN = null;

const SIDE_PERMUTATION = 1;
const EDGE_PERMUTATION = 2;
const CORNER_PERMUTATION = 3;
const UNDEFINED_PERMUTATION = null;

class PermutationNode extends Node {
    constructor(layerCount, startPosition, endPosition) {
        super(startPosition, endPosition);
        this.layerCount = layerCount;
        this.type = UNDEFINED_PERMUTATION;
        this.sign = UNDEFINED_SIGN;
    }

    /**
     * Throws illegal argument exception if this
     * permutation already has permutation items
     * of a different type.
     *
     * @param {int} type PermutationNode.SIDE, .EDGE, .CORNER
     * @param {Symbol} signSymbol Symbol.PERMUTATION_PLUS, .PMINUS or  .PPLUSPLUS or (0 if no sign symbol).
     * @param {Symbol[]} faceSymbols Array of 1, 2, or 3 entries of
     *                   Symbol.PERMUTATION_FACE_R, .PU, .PB, .PL, .PD or .PF.
     * @param {int} partNumber A value &gt;= 0 used to disambiguate multiple edge parts
     *                   and multiple side parts in 4x4 cubes and 5x5 cubes.
     * @param {int} layerCount The number of layers of the cube.
     */
    addPermItem(type, signSymbol, faceSymbols, partNumber = 0, layerCount = 3) {
        if (type == null) {
            throw new IllegalArgumentException("type must not be null");
        }
        if (this.type == null) {
            this.type = type;
        }
        if (this.type != type) {
            throw new IllegalArgumentException(
              "Permutation of different part types is not supported. Current type:" + this.type + " Added type:" + type + " Current length:" + this.getChildCount());
        }

        // Evaluate the sign symbol.
        let s = null;
        if (signSymbol == Symbol.PERMUTATION_MINUS) {
            s = MINUS_SIGN;
        } else if (signSymbol == Symbol.PERMUTATION_PLUSPLUS) {
            s = PLUSPLUS_SIGN;
        } else if (signSymbol == Symbol.PERMUTATION_PLUS) {
            s = PLUS_SIGN;
        } else if (signSymbol == null) {
            s = NO_SIGN;
        } else {
            throw new IllegalArgumentException("Illegal sign symbol:" + signSymbol);
        }
        if (s == PLUS_SIGN) {
            if (type == CORNER_PERMUTATION) {
                s = PLUSPLUS_SIGN;
            } else if (type == EDGE_PERMUTATION) {
                s = MINUS_SIGN;
            }
        }
        if (this.getChildCount() == 0) {
            this.sign = s;
        } else if (type != SIDE_PERMUTATION && s != NO_SIGN) {
            throw new IllegalArgumentException("Illegal sign.");
        }

        // Evaluate the face symbols and construct the permutation item.
        let permItem = new PermutationItemNode();
        let loc = -1;
        switch (type) {
            case UNDEFINED_PERMUTATION:
                break;
            case SIDE_PERMUTATION:
            {
                if (faceSymbols[0] == Symbol.PERMUTATION_FACE_R) {
                    loc = 0;
                } else if (faceSymbols[0] == Symbol.PERMUTATION_FACE_U) {
                    loc = 1;
                } else if (faceSymbols[0] == Symbol.PERMUTATION_FACE_F) {
                    loc = 2;
                } else if (faceSymbols[0] == Symbol.PERMUTATION_FACE_L) {
                    loc = 3;
                } else if (faceSymbols[0] == Symbol.PERMUTATION_FACE_D) {
                    loc = 4;
                } else if (faceSymbols[0] == Symbol.PERMUTATION_FACE_B) {
                    loc = 5;
                }

                if (layerCount <= 3) {
                    if (partNumber != 0) {
                        throw new IllegalArgumentException("Illegal side part number " + partNumber);
                    }
                } else {
                    if (partNumber < 0 || partNumber > (2 << (layerCount - 2)) - 1) {
                        throw new IllegalArgumentException("Illegal side part number " + partNumber);
                    }

                }
                loc += 6 * partNumber;

                permItem.location = loc;
                permItem.orientation = (this.getChildCount() == 0) ? 0 : s;

                break;
            }
            case EDGE_PERMUTATION:
            {
                if (signSymbol != null && signSymbol != Symbol.PERMUTATION_PLUS) {
                    throw new IllegalArgumentException("Illegal sign for edge part. [" + signSymbol + "]");
                }

                // FIXME: This low/high stuff is stupid, because we
                //        imply that PR < PU < PF < PL < PD < PB
                //        is an invariant.
                let low = (faceSymbols[0].compareTo(faceSymbols[1]) < 0) ? faceSymbols[0] : faceSymbols[1];
                let high = (faceSymbols[0].compareTo(faceSymbols[1]) > 0) ? faceSymbols[0] : faceSymbols[1];
                let first = faceSymbols[0];
                let rotated = false;
                if (low == Symbol.PERMUTATION_FACE_R && high == Symbol.PERMUTATION_FACE_U) {
                    loc = 0;
                    rotated = first == Symbol.PERMUTATION_FACE_R;
                } else if (low == Symbol.PERMUTATION_FACE_R
                && high == Symbol.PERMUTATION_FACE_F) {
                    loc = 1;
                    rotated = first == Symbol.PERMUTATION_FACE_F;
                } else if (low == Symbol.PERMUTATION_FACE_R
                && high == Symbol.PERMUTATION_FACE_D) {
                    loc = 2;
                    rotated = first == Symbol.PERMUTATION_FACE_R;
                } else if (low == Symbol.PERMUTATION_FACE_U
                && high == Symbol.PERMUTATION_FACE_B) {
                    loc = 3;
                    rotated = first == Symbol.PERMUTATION_FACE_U;
                } else if (low == Symbol.PERMUTATION_FACE_R
                && high == Symbol.PERMUTATION_FACE_B) {
                    loc = 4;
                    rotated = first == Symbol.PERMUTATION_FACE_B;
                } else if (low == Symbol.PERMUTATION_FACE_D
                && high == Symbol.PERMUTATION_FACE_B) {
                    loc = 5;
                    rotated = first == Symbol.PERMUTATION_FACE_D;
                } else if (low == Symbol.PERMUTATION_FACE_U
                && high == Symbol.PERMUTATION_FACE_L) {
                    loc = 6;
                    rotated = first == Symbol.PERMUTATION_FACE_L;
                } else if (low == Symbol.PERMUTATION_FACE_L
                && high == Symbol.PERMUTATION_FACE_B) {
                    loc = 7;
                    rotated = first == Symbol.PERMUTATION_FACE_B;
                } else if (low == Symbol.PERMUTATION_FACE_L
                && high == Symbol.PERMUTATION_FACE_D) {
                    loc = 8;
                    rotated = first == Symbol.PERMUTATION_FACE_L;
                } else if (low == Symbol.PERMUTATION_FACE_U
                && high == Symbol.PERMUTATION_FACE_F) {
                    loc = 9;
                    rotated = first == Symbol.PERMUTATION_FACE_U;
                } else if (low == Symbol.PERMUTATION_FACE_F
                && high == Symbol.PERMUTATION_FACE_L) {
                    loc = 10;
                    rotated = first == Symbol.PERMUTATION_FACE_F;
                } else if (low == Symbol.PERMUTATION_FACE_F
                && high == Symbol.PERMUTATION_FACE_D) {
                    loc = 11;
                    rotated = first == Symbol.PERMUTATION_FACE_D;

                } else {
                    throw new IllegalArgumentException("Impossible edge part \""+low.getName()+high.getName()+"\".");
                }

                if (layerCount <= 3) {
                    if (partNumber != 0) {
                        throw new IllegalArgumentException("Illegal edge part number " + partNumber);
                    }
                } else {
                    if (partNumber < 0 || partNumber >= layerCount - 2) {
                        throw new IllegalArgumentException("Illegal edge part number " + partNumber);
                    }
                    loc += 12 * partNumber;
                }


                permItem.location = loc;
                permItem.orientation = (rotated) ? 1 : 0;

                break;
            }
            case CORNER_PERMUTATION:
            {
                if (signSymbol == Symbol.PERMUTATION_PLUSPLUS) {
                    throw new IllegalArgumentException("Illegal sign for corner part.");
                }

                // FIXME: This low/high stuff is stupid, because we
                //        imply that PR < PU < PF < PL < PD < PB
                //        is an invariant.
                let sorted = faceSymbols.slice(0);
                sorted.sort((a,b) => a.compareTo(b));
                let low = sorted[0];
                let mid = sorted[1];
                let high = sorted[2];

                // Values for rotation:
                //   0 = Initial position clockwise
                //   1 = Orientation 1 clockwise
                //   2 = Orientation 2 clockwise
                //   3 = Initial position counterclockwise
                //   4 = Orientation 1 counterclockwise
                //   5 = Orientation 2 counterclockwise
                let rotation = 0;
                if (low == Symbol.PERMUTATION_FACE_R
                        && mid == Symbol.PERMUTATION_FACE_U
                        && high == Symbol.PERMUTATION_FACE_F) {
                    loc = 0;
                    if (faceSymbols[0] == Symbol.PERMUTATION_FACE_U) {
                        rotation = (faceSymbols[1] == Symbol.PERMUTATION_FACE_R) ? 0 : 3;
                    } else if (faceSymbols[0] == Symbol.PERMUTATION_FACE_R) {
                        rotation = (faceSymbols[1] == Symbol.PERMUTATION_FACE_F) ? 2 : 5;
                    } else {
                        rotation = (faceSymbols[1] == Symbol.PERMUTATION_FACE_U) ? 1 : 4;
                    }
                } else if (low == Symbol.PERMUTATION_FACE_R
                        && mid == Symbol.PERMUTATION_FACE_F
                        && high == Symbol.PERMUTATION_FACE_D) {
                    loc = 1;
                    if (faceSymbols[0] == Symbol.PERMUTATION_FACE_D) {
                        rotation = (faceSymbols[1] == Symbol.PERMUTATION_FACE_F) ? 0 : 3;
                    } else if (faceSymbols[0] == Symbol.PERMUTATION_FACE_F) {
                        rotation = (faceSymbols[1] == Symbol.PERMUTATION_FACE_R) ? 2 : 5;
                    } else {
                        rotation = (faceSymbols[1] == Symbol.PERMUTATION_FACE_D) ? 1 : 4;
                    }
                } else if (low == Symbol.PERMUTATION_FACE_R
                        && mid == Symbol.PERMUTATION_FACE_U
                        && high == Symbol.PERMUTATION_FACE_B) {
                    loc = 2;
                    if (faceSymbols[0] == Symbol.PERMUTATION_FACE_U) {
                        rotation = (faceSymbols[1] == Symbol.PERMUTATION_FACE_B) ? 0 : 3;
                    } else if (faceSymbols[0] == Symbol.PERMUTATION_FACE_B) {
                        rotation = (faceSymbols[1] == Symbol.PERMUTATION_FACE_R) ? 2 : 5;
                    } else {
                        rotation = (faceSymbols[1] == Symbol.PERMUTATION_FACE_U) ? 1 : 4;
                    }
                } else if (low == Symbol.PERMUTATION_FACE_R
                        && mid == Symbol.PERMUTATION_FACE_D
                        && high == Symbol.PERMUTATION_FACE_B) {
                    loc = 3;
                    if (faceSymbols[0] == Symbol.PERMUTATION_FACE_D) {
                        rotation = (faceSymbols[1] == Symbol.PERMUTATION_FACE_R) ? 0 : 3;
                    } else if (faceSymbols[0] == Symbol.PERMUTATION_FACE_R) {
                        rotation = (faceSymbols[1] == Symbol.PERMUTATION_FACE_B) ? 2 : 5;
                    } else {
                        rotation = (faceSymbols[1] == Symbol.PERMUTATION_FACE_D) ? 1 : 4;
                    }
                } else if (low == Symbol.PERMUTATION_FACE_U
                        && mid == Symbol.PERMUTATION_FACE_L
                        && high == Symbol.PERMUTATION_FACE_B) {
                    loc = 4;
                    if (faceSymbols[0] == Symbol.PERMUTATION_FACE_U) {
                        rotation = (faceSymbols[1] == Symbol.PERMUTATION_FACE_L) ? 0 : 3;
                    } else if (faceSymbols[0] == Symbol.PERMUTATION_FACE_L) {
                        rotation = (faceSymbols[1] == Symbol.PERMUTATION_FACE_B) ? 2 : 5;
                    } else {
                        rotation = (faceSymbols[1] == Symbol.PERMUTATION_FACE_U) ? 1 : 4;
                    }
                } else if (low == Symbol.PERMUTATION_FACE_L
                        && mid == Symbol.PERMUTATION_FACE_D
                        && high == Symbol.PERMUTATION_FACE_B) {
                    loc = 5;
                    if (faceSymbols[0] == Symbol.PERMUTATION_FACE_D) {
                        rotation = (faceSymbols[1] == Symbol.PERMUTATION_FACE_B) ? 0 : 3;
                    } else if (faceSymbols[0] == Symbol.PERMUTATION_FACE_B) {
                        rotation = (faceSymbols[1] == Symbol.PERMUTATION_FACE_L) ? 2 : 5;
                    } else {
                        rotation = (faceSymbols[1] == Symbol.PERMUTATION_FACE_D) ? 1 : 4;
                    }
                } else if (low == Symbol.PERMUTATION_FACE_U
                        && mid == Symbol.PERMUTATION_FACE_F
                        && high == Symbol.PERMUTATION_FACE_L) {
                    loc = 6;
                    if (faceSymbols[0] == Symbol.PERMUTATION_FACE_U) {
                        rotation = (faceSymbols[1] == Symbol.PERMUTATION_FACE_F) ? 0 : 3;
                    } else if (faceSymbols[0] == Symbol.PERMUTATION_FACE_F) {
                        rotation = (faceSymbols[1] == Symbol.PERMUTATION_FACE_L) ? 2 : 5;
                    } else {
                        rotation = (faceSymbols[1] == Symbol.PERMUTATION_FACE_U) ? 1 : 4;
                    }
                } else if (low == Symbol.PERMUTATION_FACE_F
                        && mid == Symbol.PERMUTATION_FACE_L
                        && high == Symbol.PERMUTATION_FACE_D) {
                    loc = 7;
                    if (faceSymbols[0] == Symbol.PERMUTATION_FACE_D) {
                        rotation = (faceSymbols[1] == Symbol.PERMUTATION_FACE_L) ? 0 : 3;
                    } else if (faceSymbols[0] == Symbol.PERMUTATION_FACE_L) {
                        rotation = (faceSymbols[1] == Symbol.PERMUTATION_FACE_F) ? 2 : 5;
                    } else {
                        rotation = (faceSymbols[1] == Symbol.PERMUTATION_FACE_D) ? 1 : 4;
                    }
                } else {
                    throw new IllegalArgumentException("Impossible corner part \""+low.getName()+mid.getName()+high.getName()+"\".");
                }

                permItem.location = loc;
                permItem.orientation = rotation;

                for (let i = 0; i < this.getChildCount(); i++) {
                    let existingItem = this.getChildAt(i);
                    if (Math.floor(existingItem.orientation / 3) != Math.floor(permItem.orientation / 3)) {
                        throw new IllegalArgumentException("Corner permutation cannot be clockwise and anticlockwise at the same time.");
                    }
                }

                break;
            }
        }

        for (let i = 0; i < this.getChildCount(); i++) {
            let existingItem = this.getChildAt(i);
            if (existingItem.location == permItem.location) {
                throw new IllegalArgumentException("Illegal multiple occurrence of same part. " + permItem.location);
            }
        }

        this.add(permItem);
    }
    getSymbol() {
        return Symbol.PERMUTATION;
    }
    getType() {
        return this.type;
    }
    getSign() {
        return this.sign;
    }
    setSign(signSymbol) {
        let s;
        if (signSymbol == Symbol.PERMUTATION_MINUS) {
            s = MINUS_SIGN;
        } else if (signSymbol == Symbol.PERMUTATION_PLUSPLUS) {
            s = PLUSPLUS_SIGN;
        } else if (signSymbol == Symbol.PERMUTATION_PLUS) {
            s = PLUS_SIGN;
        } else if (signSymbol == null) {
            s = NO_SIGN;
        } else {
            throw new IllegalArgumentException("Illegal sign symbol:" + signSymbol);
        }
        if (s == PLUS_SIGN) {
            if (this.type == CORNER_PERMUTATION) {
                s = PLUSPLUS_SIGN;
            } else if (this.type == EDGE_PERMUTATION) {
                s = MINUS_SIGN;
            }
        }
        this.sign = s;
    }

}

class ReflectionNode extends Node {
    constructor() {
        super();
    }
    getSymbol() {
        return Symbol.REFLECTION;
    }
}
/**
 * A RepetitionNode holds one child A and a repeat count.
 * The side effect of a RepetitionNode on a cube is
 * repeat count times A.
 */
class RepetitionNode extends Node {
    constructor() {
        super();
    }
    setRepeatCount(newValue) {
        this.repeatCount = newValue;
    }
    getRepeatCount() {
        return this.repeatCount;
    }
    applyTo(cube, inverse) {
        for (let r = 0; r < this.repeatCount; r++) {
            super.applyTo(cube, inverse);
        }
    }

    * resolvedIterable(inverse) {
        for (let r = 0; r < this.repeatCount; r++) {
            yield* super.resolvedIterable(inverse);
        }
    }

    getSymbol() {
        return Symbol.REPETITION;
    }
}

/**
 * A RotationNode holds a rotator A and a single child B. The side effect of a
 * rotation node to a Cube is A' B A.
 */
class RotationNode extends Node {
    constructor() {
        super();
    }
    getSymbol() {
        return Symbol.ROTATION;
    }
}

class NOPNode extends Node {
    constructor(startPosition, endPosition) {
        super(startPosition, endPosition);
    }
    getSymbol() {
        return Symbol.NOP;
    }
}

class MoveNode extends Node {

    /** Script nodes. */
    constructor(layerCount, axis, layerMask, angle, startPos, endPos) {
        super(startPos, endPos);

        this.axis = axis;
        this.layerMask = layerMask;
        this.layerCount = layerCount;

        // Normalize angle to range [-2, +2].
        let a = angle % 4;
        if (a == 3) a = -1;
        if (a == -3) a = 1;
        this.angle = a;
    }

    getAxis() {
        return this.axis;
    }
    getAngle() {
        return this.angle;
    }
    getLayerCount() {
        return this.layerCount;
    }
    getLayerMask() {
        return this.layerMask;
    }

    /** Applies the node to the specified cube. */
    applyTo(cube, inverse) {
       cube.transform(this.axis, this.layerMask, inverse ? -this.angle : this.angle);
    }

    * resolvedIterable(inverse) {
        if (inverse) {
            yield new MoveNode(this.layerCount, this.axis, this.layerMask, -this.angle);
        } else {
            yield this;
        }
    }

    getSymbol() {
        return Symbol.MOVE;
    }
    toString() {
        return this.getSymbol()
         +'{ ' + this.axis + ':' + this.layerMask + ':' + this.angle + ' }';
    }
}

// ------------------
// MODULE API    
// ------------------
export default {
    CommutationNode: CommutationNode,
    ConjugationNode: ConjugationNode,
    GroupingNode: GroupingNode,
    InversionNode: InversionNode,
    Node: Node,
    MoveNode: MoveNode,
    NOPNode: NOPNode,
    ReflectionNode: ReflectionNode,
    RepetitionNode: RepetitionNode,
    RotationNode: RotationNode,
    SequenceNode: SequenceNode,
    PermutationNode: PermutationNode,
};
