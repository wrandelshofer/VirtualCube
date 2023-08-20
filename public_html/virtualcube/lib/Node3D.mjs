/* @(#)Node3D.mjs
 * Copyright (c) 2023 Werner Randelshofer, Switzerland. MIT License.
 */

/** A simple 3d scenegraph.
 */
import J3DIMath from './J3DIMath.mjs';

class Node3D {
    constructor() {
        /** The transformation matrix of a node. */
        this.matrix = new J3DIMath.J3DIMatrix4();

        /** The children of a node. */
        this.children = [];

        /** The parent of a node. */
        this.parent = null;
    }

    /** Applies the scene graph transformation to m. */
    transform(m) {
        if (this.parent != null)
            this.parent.transform(m);
        m.multiply(this.matrix);
    }

    /** Adds a child. */
    add(child) {
        if (child.parent != null) {
            child.parent.remove(child);
        }
        this.children[this.children.length] = child;
        child.parent = this;
    }

    /** Removes a child. */
    remove(child) {
        if (child.parent == this) {
            for (let i = 0; i < this.children.length; i++) {
                if (this.children[i] == child) {
                    this.children = this.children.slice(0, i) + this.children.slice(i + 1);
                    break;
                }
            }
            child.parent = null;
        }
    }
}

// ------------------
// MODULE API    
// ------------------
export default {
    Node3D: Node3D,
};

