/*
 * @(#)ScriptAST.js  0.1  2011-08-12
 *
 * Copyright (c) 2011-2012 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

// --------------
// require.js
// --------------
define("ScriptAST", [],
function () {

  /**
   * Represents an Abstract Syntax Tree Node
   */
  class Node {
      constructor() {
        this.children=[];
        this.startPosition=-1;
        this.endPosition=-1;
      }
      
      add(child) {
        this.children.push(child);
      }
      
      setStartPosition(newValue) {
        this.startPosition=newValue;
      }
      setEndPosition(newValue) {
        this.endPosition=newValue;
      }
      
      applyTo(cube) {
        for (let i=0;i<this.children.length;i++) {
          this.children[i].applyTo(cube);
        }
      }
  }
  
  class SequenceNode extends Node {
      constructor() {
        super();
      }
  }

  class NOPNode extends Node {
      constructor(startPosition,endPosition) {
        super();
        this.startPostion=startPosition;
        this.endPosition=endPosition;
      }
  }

  class MoveNode extends Node {

    /** Script nodes. */
    constructor(layerCount, axis, layerMask, angle) {
      super();
      this.layerCount=layerCount;
      this.axis = axis;
      this.angle = angle;
      this.layerMask = layerMask;
    }
    
    setAxis(newValue) {
      this.axis=newValue;
    }
    setAngle(newValue) {
      this.angle=newValue;
    }
    setLayerCount(newValue) {
      this.layerCount=newValue;
    }
    setLayerMask(newValue) {
      this.layerMask=newValue;
    }

    /** Applies the node to the specified cube. */
    applyTo(cube) {
      if (!this.doesNothing()) {
        cube.transform(this.axis, this.layerMask, this.angle);
      }
    }
    /** Applies the inverse of the node to the specified cube. */
    applyInverseTo(cube) {
      if (!this.doesNothing()) {
        cube.transform(this.axis, this.layerMask, -this.angle);
      }
    }
    /** Returns true if this node does nothing. */
    doesNothing() {
      return this.angle == 0 || this.layerMask == 0;
    }
    /** Tries to consume the given MoveNode. 
     * Returns true if successful.
     * This MoveNode may return true for doesNothing afterwards!);
     */
    consume(that) {
      if (that.axis == this.axis
      && that.layerMask == this.layerMask) {
        this.angle = (this.angle + that.angle) % 4;
        if (this.angle == 3)
          this.angle = -1;
        else if (this.angle == -3)
          this.angle = 1;
        return true;
      }
      return false;
    }
    toString() {
      return 'MoveNode{ax:' + this.axis + ' an:' + this.angle + ' lm:' + this.layerMask + '}';
    }
  }

// ------------------
// MODULE API    
// ------------------
  return {
    Node: Node,
    SequenceNode: SequenceNode,
    MoveNode: MoveNode,
    NOPNode: NOPNode
  };
});
