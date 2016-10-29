/*
 * @(#)CubeAttributes.js  1.0  2011-06-23
 *
 * Copyright (c) 2011-2012 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

// --------------
// require.js
// --------------
define("CubeAttributes", [], 
function() { 

let module = {
  log: (false) // Enable or disable logging for this module.
    ? function(msg) { console.log('CubeAttributes.js '+msg); }
    : function() {}
}

/** 
 * Holds the attributes of a Rubik's Cube like puzzle.
 */
class CubeAttributes {
  constructor(partCount, stickerCount, stickerCountPerFace) {
    this.partsVisible = new Array(partCount);//boolean
    this.partsFillColor = new Array(partCount);//[r,g,b,a]
    this.partsPhong = new Array(partCount);//[ambient, diffuse, specular, shininess]
    this.stickersVisible = new Array(stickerCount);//boolean
    this.stickersFillColor = new Array(stickerCount);//[r,g,b,a]
    this.stickersPhong = new Array(stickerCount);//[ambient, diffuse, specular, shininess]
    this.stickerCountPerFace = stickerCountPerFace;//integer
    this.partExplosion = new Array(partCount);//float
    this.stickerExplosion = new Array(stickerCount);//float
    this.xRot=-25;
    this.yRot=-45;
    this.scaleFactor=1.0;
    this.explosionFactor=0;
    this.developmentFactor=0; // range [0,1]
    
    this.stickersImageURL=null;
    
    // The twist duration of the cube.
    this.twistDuration=500;
    
    // The twist duration that will be set on twistDuration when the user
    // performs an twist operation.
    this.userTwistDuration=500;
    
    // The twist duration that will be set on twistDuration when the program
    // performs a scramble operation.
    this.scrambleTwistDuration=500/3;
    
    this.backgroundColor=[0, 0, 0, 0]; //[r,g,b,a]
    
    for (var i=0;i<partCount;i++) {
      this.partsVisible[i]=true;
      this.stickersVisible[i]=true;
      this.partExplosion[i]=0;
    }
    
    // The following values must be initialized explicitly
    this.faceCount=undefined;
    this.stickerOffsets=[];
    this.stickerCounts=[];
  }
  
  getFaceCount() {
    return this.faceCount;
  }
  getStickerOffset(face) {
    return this.stickerOffsets[face];
  }
  getStickerCount(face) {
    return this.stickerCounts[face];
  }
}


// ------------------
// MODULE API    
// ------------------
return {
    CubeAttributes : CubeAttributes,
    newCubeAttributes : function (partCount, stickerCount, stickerCountPerFace) { return new CubeAttributes(partCount, stickerCount, stickerCountPerFace); }
};
});
