/*
 * @(#)PocketCubeS1Cube3D.js  1.0  2015-03-30
 * Copyright (c) 2015 Werner Randelshofer, Switzerland. MIT License.
 */
"use strict";

// --------------
// require.js
// --------------
define("PocketCubeS1Cube3D", ["AbstractPocketCubeCube3D","CubeAttributes","PreloadPocketCubeS1"], 
function(AbstractPocketCubeCube3D,CubeAttributes,PreloadPocketCubeS1) { 

/** Constructor
 * Creates the 3D geometry of a "Rubik's Cube".
 * Subclasses must call initPocketCubeS1Cube3D(). 
 */
class PocketCubeS1Cube3D extends AbstractPocketCubeCube3D.AbstractPocketCubeCube3D {
  constructor(loadGeometry) {
    super(1.8);
  }
  loadGeometry() {
    super.loadGeometry();
    this.isDrawTwoPass=false;
  }

  getModelUrl() {
    return this.baseUrl+'/'+this.relativeUrl;
  }
  
  
  createAttributes() {
    var a=CubeAttributes.newCubeAttributes(this.partCount, 6*4, [4,4,4,4,4,4]);
    var partsPhong=[0.5,0.6,0.4,16.0];//shiny plastic [ambient, diffuse, specular, shininess]
    for (var i=0;i<this.partCount;i++) {
      a.partsFillColor[i]=[24,24,24,255];
      a.partsPhong[i]=partsPhong;
    }
    a.partsFillColor[this.centerOffset]=[240,240,240,255];
    
  var faceColors=[//Right, Up, Front, Left, Down, Back
      [255, 210, 0,155], // Yellow
      [0, 51, 115,255], // Blue
      [140, 0, 15,255], // Red
      [248, 248, 248,255], // White
      [0, 115, 47,255], // Green
      [255, 70, 0,255], // Orange
  ];
    
    var stickersPhong=[0.8,0.2,0.1,8.0];//shiny paper [ambient, diffuse, specular, shininess]
   
    for (var i=0;i<6;i++) {
      for (var j=0;j<4;j++) {
        a.stickersFillColor[i*4+j]=faceColors[i];
        a.stickersPhong[i*4+j]=stickersPhong;
      }
    }
    
    a.faceCount=6;
    a.stickerOffsets=[0,4,8,12,16,20];
    a.stickerCounts=[4,4,4,4,4,4];
    
   return a;
  }
}
PocketCubeS1Cube3D.prototype.relativeUrl = 'models/pocketcubes1/';
PocketCubeS1Cube3D.prototype.baseUrl = 'lib/';


// ------------------
// MODULE API    
// ------------------
return {
  Cube3D : PocketCubeS1Cube3D,
  newCube3D : function () { const c = new PocketCubeS1Cube3D(); c.loadGeometry(); return c; }
};
});
