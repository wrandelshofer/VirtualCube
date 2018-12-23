/*
 * @(#)SplineInterpolator.mjs  1.0  2011-06-24
 * Copyright (c) 2011 Werner Randelshofer, Switzerland. MIT License.
 */
"use strict";

// --------------
// require.js
// --------------
define("SplineInterpolator", [], 
function () {

 
/** Constructor.
 *
 * @param x1 The x coordinate for the first bezier control point.
 * @param y1 The y coordinate for the first bezier control point.
 * @param x2 The x coordinate for the second bezier control point.
 * @param y2 The x coordinate for the second bezier control point.
 */
class SplineInterpolator {
  constructor(x1,y1,x2,y2) {
    this.x1=x1;
    this.y1=y1;
    this.x2=x2;
    this.y2=y2;
  }
}

/**
 * Evaluates the bezier function, and clamps the result value between 0
 * and 1.
 *
 * @param t A time value between 0 and 1.
 */
SplineInterpolator.prototype.getFraction=function(t) {
    var invT = (1 - t);
    var b1 = 3 * t * (invT * invT);
    var b2 = 3 * (t * t) * invT;
    var b3 = t * t * t;
    var result = (b1 * this.y1) + (b2 * this.y2) + b3;
    return Math.min(1, Math.max(0, result));
}


// ------------------
// MODULE API    
// ------------------
return {
	newSplineInterpolator : function (x1,y1,x2,y2) { return new SplineInterpolator(x1,y1,x2,y2); }
};
});

