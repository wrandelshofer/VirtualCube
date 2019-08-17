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
 * Represents an Abstract Syntax Tree Node
 */
class Node {
    constructor(layerCount, startPosition, endPosition) {
        this.children = [];
        this.parent = null;
        this.layerCount = layerCount;
        this.startPostion = startPosition;
        this.endPosition = endPosition;
    }

    add(child) {
        if (child.parent != null) {
            child.removeFromParent();
        }
        child.parent = this;
        this.children.push(child);
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
                yield* this.children[i].resolvedIterable(inverse);
            }
        }
    }

    toString() {
        return "Node";
    }
}

/**
 * A CommutationNode holds a commutator A and a single child B.
 * The side effect of a commutation node is A B A' B'.
 */
class CommutationNode extends Node {
    constructor(layerCount, commutator, commutee, startPosition, endPosition) {
        super(layerCount, startPosition, endPosition);
        this.commutator = commutator;
        if (commutee != null) {
            this.add(commutee);
        }
    }
    setCommutator(newValue) {
        this.commutator = newValue;
    }
    toString() {
        const buf = [];
        buf.push("CommutationNode{ ");
        buf.push(this.commutator);
        buf.push(",");
        const n = this.getChildCount();
        for (var i = 0; i < n; i++) {
            buf.push(" ");
            buf.push(this.getChildAt(i).toString());
        }
        buf.push(" }");
        return buf.join("");
    }
}
/**
 * A ConjugationNode holds a conjugator A and a single child B.
 * The side effect of a conjugation node is A B A'.
 */
class ConjugationNode extends Node {
    constructor(layerCount, conjugator, conjugate, startPosition, endPosition) {
        super(layerCount, startPosition, endPosition);
        this.conjugator = conjugator;
        if (conjugate != null) {
            this.add(conjugate);
        }
    }
    setConjugator(newValue) {
        this.conjugator = newValue;
    }

    toString() {
        const buf = [];
        buf.push("ConjugationNode{ ");
        buf.push(this.conjugator);
        buf.push(",");
        const n = this.getChildCount();
        for (var i = 0; i < n; i++) {
            buf.push(" ");
            buf.push(this.getChildAt(i).toString());
        }
        buf.push(" }");
        return buf.join("");
    }
}
class SequenceNode extends Node {
    constructor(layerCount, startPosition, endPosition) {
        super(layerCount, startPosition, endPosition);
    }
    toString() {
        const buf = [];
        buf.push("SequenceNode{");
        const n = this.getChildCount();
        for (var i = 0; i < n; i++) {
            buf.push(" ");
            buf.push(this.getChildAt(i).toString());
        }
        buf.push(" }");
        return buf.join("");
    }
}
class StatementNode extends Node {
    constructor(layerCount, startPosition, endPosition) {
        super(layerCount, startPosition, endPosition);
    }

    toString() {
        const buf = [];
        buf.push("StatementNode{");
        const n = this.getChildCount();
        for (var i = 0; i < n; i++) {
            buf.push(" ");
            buf.push(this.getChildAt(i).toString());
        }
        buf.push(" }");
        return buf.join("");
    }
}
class GroupingNode extends Node {
    constructor(layerCount, startPosition, endPosition) {
        super(layerCount, startPosition, endPosition);
        this.layerCount = layerCount;
    }
    

    toString() {
        const buf = [];
        buf.push("GroupingNode{");
        const n = this.getChildCount();
        for (var i = 0; i < n; i++) {
            buf.push(" ");
            buf.push(this.getChildAt(i).toString());
        }
        buf.push(" }");
        return buf.join("");
    }
}

class InversionNode extends Node {
    constructor(layerCount, startPosition, endPosition) {
        super(layerCount, startPosition, endPosition);
    }
    applyTo(cube, inverse = false) {
        super.applyTo(cube, !inverse);
    }
    * resolvedIterable(inverse = false) {
        yield* super.resolvedIterable(!inverse);
    }

    toString() {
        const buf = [];
        buf.push("InversionNode{ ");
        const n = this.getChildCount();
        for (var i = 0; i < n; i++) {
            buf.push(this.getChildAt(i).toString());
        }
        buf.push(" }");
        return buf.join("");
    }
}

class PermutationItem extends Node {
    constructor(layerCount, startPosition, endPosition) {
        super(layerCount, startPosition, endPosition);
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
        super(layerCount, startPosition, endPosition);
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
     *                   Symbol.FACE_R, .PU, .PB, .PL, .PD or .PF.
     * @param {int} partNumber A value &gt;= 0 used to disambiguate multiple edge parts
     *                   and multiple side parts in 4x4 cubes and 5x5 cubes.
     * @param {int} layerCount The number of layers of the cube.
     */
    addPermItem(type, signSymbol, faceSymbols, partNumber = 0, layerCount = 3) {
        if (type==null) {
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
        let permItem = new PermutationItem();
        let loc = -1;
        switch (type) {
            case UNDEFINED_PERMUTATION:
                break;
            case SIDE_PERMUTATION:
            {
                if (faceSymbols[0] == Symbol.FACE_R) {
                    loc = 0;
                } else if (faceSymbols[0] == Symbol.FACE_U) {
                    loc = 1;
                } else if (faceSymbols[0] == Symbol.FACE_F) {
                    loc = 2;
                } else if (faceSymbols[0] == Symbol.FACE_L) {
                    loc = 3;
                } else if (faceSymbols[0] == Symbol.FACE_D) {
                    loc = 4;
                } else if (faceSymbols[0] == Symbol.FACE_B) {
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
                if (low == Symbol.FACE_R && high == Symbol.FACE_U) {
                    loc = 0;
                    rotated = first == Symbol.FACE_R;
                } else if (low == Symbol.FACE_R && high == Symbol.FACE_F) {
                    loc = 1;
                    rotated = first == Symbol.FACE_F;
                } else if (low == Symbol.FACE_R && high == Symbol.FACE_D) {
                    loc = 2;
                    rotated = first == Symbol.FACE_R;
                } else if (low == Symbol.FACE_U && high == Symbol.FACE_B) {
                    loc = 3;
                    rotated = first == Symbol.FACE_U;
                } else if (low == Symbol.FACE_R && high == Symbol.FACE_B) {
                    loc = 4;
                    rotated = first == Symbol.FACE_B;
                } else if (low == Symbol.FACE_D && high == Symbol.FACE_B) {
                    loc = 5;
                    rotated = first == Symbol.FACE_D;
                } else if (low == Symbol.FACE_U && high == Symbol.FACE_L) {
                    loc = 6;
                    rotated = first == Symbol.FACE_L;
                } else if (low == Symbol.FACE_L && high == Symbol.FACE_B) {
                    loc = 7;
                    rotated = first == Symbol.FACE_B;
                } else if (low == Symbol.FACE_L && high == Symbol.FACE_D) {
                    loc = 8;
                    rotated = first == Symbol.FACE_L;
                } else if (low == Symbol.FACE_U && high == Symbol.FACE_F) {
                    loc = 9;
                    rotated = first == Symbol.FACE_U;
                } else if (low == Symbol.FACE_F && high == Symbol.FACE_L) {
                    loc = 10;
                    rotated = first == Symbol.FACE_F;
                } else if (low == Symbol.FACE_F && high == Symbol.FACE_D) {
                    loc = 11;
                    rotated = first == Symbol.FACE_D;

                } else {
                    throw new IllegalArgumentException("Impossible edge part.");
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
                let sorted = faceSymbols.clone();
                Arrays.sort(sorted);
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
                if (low == Symbol.FACE_R && mid == Symbol.FACE_U && high == Symbol.FACE_F) {
                    loc = 0;
                    if (faceSymbols[0] == Symbol.FACE_U) {
                        rotation = (faceSymbols[1] == Symbol.FACE_R) ? 0 : 3;
                    } else if (faceSymbols[0] == Symbol.FACE_R) {
                        rotation = (faceSymbols[1] == Symbol.FACE_F) ? 2 : 5;
                    } else {
                        rotation = (faceSymbols[1] == Symbol.FACE_U) ? 1 : 4;
                    }
                } else if (low == Symbol.FACE_R && mid == Symbol.FACE_F && high == Symbol.FACE_D) {
                    loc = 1;
                    if (faceSymbols[0] == Symbol.FACE_D) {
                        rotation = (faceSymbols[1] == Symbol.FACE_F) ? 0 : 3;
                    } else if (faceSymbols[0] == Symbol.FACE_F) {
                        rotation = (faceSymbols[1] == Symbol.FACE_R) ? 2 : 5;
                    } else {
                        rotation = (faceSymbols[1] == Symbol.FACE_D) ? 1 : 4;
                    }
                } else if (low == Symbol.FACE_R && mid == Symbol.FACE_U && high == Symbol.FACE_B) {
                    loc = 2;
                    if (faceSymbols[0] == Symbol.FACE_U) {
                        rotation = (faceSymbols[1] == Symbol.FACE_B) ? 0 : 3;
                    } else if (faceSymbols[0] == Symbol.FACE_B) {
                        rotation = (faceSymbols[1] == Symbol.FACE_R) ? 2 : 5;
                    } else {
                        rotation = (faceSymbols[1] == Symbol.FACE_U) ? 1 : 4;
                    }
                } else if (low == Symbol.FACE_R && mid == Symbol.FACE_D && high == Symbol.FACE_B) {
                    loc = 3;
                    if (faceSymbols[0] == Symbol.FACE_D) {
                        rotation = (faceSymbols[1] == Symbol.FACE_R) ? 0 : 3;
                    } else if (faceSymbols[0] == Symbol.FACE_R) {
                        rotation = (faceSymbols[1] == Symbol.FACE_B) ? 2 : 5;
                    } else {
                        rotation = (faceSymbols[1] == Symbol.FACE_D) ? 1 : 4;
                    }
                } else if (low == Symbol.FACE_U && mid == Symbol.FACE_L && high == Symbol.FACE_B) {
                    loc = 4;
                    if (faceSymbols[0] == Symbol.FACE_U) {
                        rotation = (faceSymbols[1] == Symbol.FACE_L) ? 0 : 3;
                    } else if (faceSymbols[0] == Symbol.FACE_L) {
                        rotation = (faceSymbols[1] == Symbol.FACE_B) ? 2 : 5;
                    } else {
                        rotation = (faceSymbols[1] == Symbol.FACE_U) ? 1 : 4;
                    }
                } else if (low == Symbol.FACE_L && mid == Symbol.FACE_D && high == Symbol.FACE_B) {
                    loc = 5;
                    if (faceSymbols[0] == Symbol.FACE_D) {
                        rotation = (faceSymbols[1] == Symbol.FACE_B) ? 0 : 3;
                    } else if (faceSymbols[0] == Symbol.FACE_B) {
                        rotation = (faceSymbols[1] == Symbol.FACE_L) ? 2 : 5;
                    } else {
                        rotation = (faceSymbols[1] == Symbol.FACE_D) ? 1 : 4;
                    }
                } else if (low == Symbol.FACE_U && mid == Symbol.FACE_F && high == Symbol.FACE_L) {
                    loc = 6;
                    if (faceSymbols[0] == Symbol.FACE_U) {
                        rotation = (faceSymbols[1] == Symbol.FACE_F) ? 0 : 3;
                    } else if (faceSymbols[0] == Symbol.FACE_F) {
                        rotation = (faceSymbols[1] == Symbol.FACE_L) ? 2 : 5;
                    } else {
                        rotation = (faceSymbols[1] == Symbol.FACE_U) ? 1 : 4;
                    }
                } else if (low == Symbol.FACE_F && mid == Symbol.FACE_L && high == Symbol.FACE_D) {
                    loc = 7;
                    if (faceSymbols[0] == Symbol.FACE_D) {
                        rotation = (faceSymbols[1] == Symbol.FACE_L) ? 0 : 3;
                    } else if (faceSymbols[0] == Symbol.FACE_L) {
                        rotation = (faceSymbols[1] == Symbol.FACE_F) ? 2 : 5;
                    } else {
                        rotation = (faceSymbols[1] == Symbol.FACE_D) ? 1 : 4;
                    }
                } else {
                    throw new IllegalArgumentException("Impossible corner part.");
                }

                permItem.location = loc;
                permItem.orientation = rotation;

                for (let i = 0; i < this.getChildCount(); i++) {
                    let existingItem = this.getChildAt(i);
                    if (existingItem.orientation / 3 != permItem.orientation / 3) {
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
}

class ReflectionNode extends Node {
    constructor(layerCount, startPosition, endPosition) {
        super(layerCount, startPosition, endPosition);
    }
    toString() {
        const buf = [];
        buf.push("ReflectionNode{");
        const n = this.getChildCount();
        for (var i = 0; i < n; i++) {
            buf.push(" ");
            buf.push(this.getChildAt(i).toString());
        }
        buf.push(" }");
        return buf.join("");
    }
}

class RepetitionNode extends Node {
    constructor(layerCount, startPosition, endPosition, repeatCount) {
        super(layerCount, startPosition, endPosition);
        this.repeatCount = repeatCount;
    }
    setRepeatCount(newValue) {
        this.repeatCount = newValue;
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

    toString() {
        const buf = [];
        buf.push("RepetitionNode{ ");
        buf.push(this.repeatCount);
        buf.push(",");
        const n = this.getChildCount();
        for (var i = 0; i < n; i++) {
            buf.push(" ");
            buf.push(this.getChildAt(i).toString());
        }
        buf.push(" }");
        return buf.join("");
    }
}
class NOPNode extends Node {
    constructor(layerCount, startPosition, endPosition) {
        super(layerCount, startPosition, endPosition);
    }
    toString() {
        return "NOPNode{ }";
    }
}

class MoveNode extends Node {

    /** Script nodes. */
    constructor(layerCount, axis, layerMask, angle) {
        super(layerCount, -1, -1);
        this.axis = axis;
        this.angle = angle;
        this.layerMask = layerMask;
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
        if (!this.doesNothing()) {
            cube.transform(this.axis, this.layerMask, inverse ? -this.angle : this.angle);
        }
    }

    /** Returns true if this node does nothing. */
    doesNothing() {
        return this.angle == 0 || this.layerMask == 0;
    }

    * resolvedIterable(inverse) {
        if (inverse) {
            yield new MoveNode(this.layerCount, this.axis, this.layerMask, -this.angle);
        } else {
            yield this;
        }
    }

    toString() {
        return 'MoveNode{ax:' + this.axis + ' lm:' + this.layerMask + ' an:' + this.angle + '}';
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
    SequenceNode: SequenceNode,
    StatementNode: StatementNode,
    PermutationNode: PermutationNode,
};
