/*
 * @(#)Node3D.js  2.0  2014-01-225
 * Copyright (c) 2011 Werner Randelshofer, Switzerland.
 * You may only use this software in accordance with the license terms.
 */
"use strict";

/** A simple 3d scenegraph.
 */
// --------------
// require.js
// --------------
define("Node3D", ['J3DIMath'], 
function(J3DIMath) { 

class Node3D {
  constructor() {
    /** The transformation matrix of a node. */
    this.matrix=new J3DIMatrix4();
    
    /** The children of a node. */
    this.children=[];
    
    /** The parent of a node. */
    this.parent=null;
  }
}

/** Applies the scene graph transformation to m. */
Node3D.prototype.transform=function(m) {
  if (this.parent != null) this.parent.transform(m);
  m.multiply(this.matrix);
}

/** Adds a child. */
Node3D.prototype.add=function(child) {
  if (child.parent != null) {
    child.parent.remove(child);
  }
  this.children[this.children.length]=child;
  child.parent=this;
}

/** Removes a child. */
Node3D.prototype.remove=function(child) {
  if (child.parent == this) {
    for (var i=0;i<this.children.length;i++) {
      if (this.children[i]==child) {
        this.children=this.children.slice(0,i)+this.children.slice(i+1);
        break;
      }
    }
    child.parent = null;
  }
}

// ------------------
// MODULE API    
// ------------------
return {
    Node3D : Node3D,
};
});
