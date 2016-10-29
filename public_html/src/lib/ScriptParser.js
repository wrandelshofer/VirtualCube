/*
 * @(#)ScriptParser.js  0.1  2011-08-12
 *
 * Copyright (c) 2011-2012 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

// --------------
// require.js
// --------------
define("ScriptParser", [], 
function(h) {
 
/**
 * A customizable parser for cube scripts.
 */

/** Script nodes. */
const TwistNode = function(axis, layerMask, angle) {
  this.axis=axis;
  this.angle=angle;
  this.layerMask=layerMask;
}

/** Applies the node to the specified cube. */
TwistNode.prototype.applyTo = function(cube)  {
  if (! this.doesNothing()) {
   cube.transform(this.axis,this.layerMask,this.angle);
  }
}
/** Applies the inverse of the node to the specified cube. */
TwistNode.prototype.applyInverseTo = function(cube)  {
  if (! this.doesNothing()) {
   cube.transform(this.axis,this.layerMask,-this.angle);
  }
}
/** Returns true if this node does nothing. */
TwistNode.prototype.doesNothing = function() {
  return this.angle == 0 || this.layerMask == 0;
}
/** Tries to consume the given TwistNode. 
 * Returns true if successful.
 * This TwistNode may return true for doesNothing afterwards!);
 */
TwistNode.prototype.consume = function(that) {
  if (that.axis == this.axis
    && that.layerMask == this.layerMask) {
//var ts=this.toString();
    this.angle = (this.angle + that.angle) % 4;
    if (this.angle == 3) this.angle = -1;
    else if (this.angle == -3) this.angle = 1;
//console.log('consume:'+ts+' + '+that+" => "+this);    
    return true;
  }
  return false;
}
TwistNode.prototype.toString = function() {
  return 'TwistNode{ax:'+this.axis+' an:'+this.angle+' lm:'+this.layerMask+'}';
}

/**
 * Creates a new parser.
 */
const ScriptParser = function()  {
  this.layerCount=3;
}

/** Returns an array of script nodes. */
ScriptParser.prototype.createRandomScript = function(scrambleCount,scrambleMinCount)  {
  if (scrambleCount==null) scrambleCount=21;
  if (scrambleMinCount==null) scrambleMinCount=6;
  
  var scrambler=new Array(Math.floor(Math.random()*scrambleCount-scrambleMinCount)+scrambleMinCount);
  
  // Keep track of previous axis, to avoid two subsequent moves on
  // the same axis.
  var prevAxis = -1;
  var axis, layerMask, angle;
  for (var i = 0; i < scrambleCount; i++) {
    while ((axis = Math.floor(Math.random()*3)) == prevAxis) {}
    prevAxis = axis;
//    while ((layerMask = Math.floor(Math.random()*(1 << this.layerCount))) == 0) {}
    layerMask = 1<<Math.floor(Math.random()*this.layerCount);
    while ((angle = Math.floor(Math.random()*5) - 2) == 0) {}
    scrambler[i]=new TwistNode(axis, layerMask, angle);
  }
  
  return scrambler;
}

// ------------------
// MODULE API    
// ------------------
return {
	newTwistNode : function (axis, layerMask, angle) { return new TwistNode(axis, layerMask, angle); },
	newScriptParser : function () { return new ScriptParser(); }
};
});
