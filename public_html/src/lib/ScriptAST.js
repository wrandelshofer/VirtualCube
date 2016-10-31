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
        this.children.put(child);
      }
      
      setStartPosition(newValue) {
        this.startPosition=newValue;
      }
      setEndPosition(newValue) {
        this.endPosition=newValue;
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
    setLayeMask(newValue) {
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
    /** Tries to consume the given TwistNode. 
     * Returns true if successful.
     * This TwistNode may return true for doesNothing afterwards!);
     */
    consume(that) {
      if (that.axis == this.axis
      && that.layerMask == this.layerMask) {
//var ts=this.toString();
        this.angle = (this.angle + that.angle) % 4;
        if (this.angle == 3)
          this.angle = -1;
        else if (this.angle == -3)
          this.angle = 1;
//console.log('consume:'+ts+' + '+that+" => "+this);    
        return true;
      }
      return false;
    }
    toString() {
      return 'TwistNode{ax:' + this.axis + ' an:' + this.angle + ' lm:' + this.layerMask + '}';
    }
  }

// ------------------
// MODULE API    
// ------------------
  return {
    Node: Node,
  MoveNode: MoveNode
  };
});
