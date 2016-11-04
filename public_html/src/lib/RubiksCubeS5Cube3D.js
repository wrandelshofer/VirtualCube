/*
 * @(#)RubiksCubeS5Cube3D.js 
 * Copyright (c) 2015 Werner Randelshofer, Switzerland.
 * You may only use this software in accordance with the license terms.
 */
"use strict";

// --------------
// require.js
// --------------
define("RubiksCubeS5Cube3D", ["AbstractRubiksCubeCube3D","CubeAttributes","PreloadRubiksCubeS4"], 
function(AbstractRubiksCubeCube3D,CubeAttributes,PreloadRubiksCubeS4) { 

class RubiksCubeS5Cube3D extends AbstractRubiksCubeCube3D.AbstractRubiksCubeCube3D {
  /** Constructor
   * Creates the 3D geometry of a Rubik's Cube.
   * You must call loadGeometry() after instantation. 
   */
  constructor() {
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
    var a=CubeAttributes.newCubeAttributes(this.partCount, 6*9, [9,9,9,9,9,9]);
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
    
    var stickersPhong=[0.8,0.2,0.1,8.0];//glossy paper [ambient, diffuse, specular, shininess]
   
    for (var i=0;i<6;i++) {
      for (var j=0;j<9;j++) {
        a.stickersFillColor[i*9+j]=faceColors[i];
        a.stickersPhong[i*9+j]=stickersPhong;
      }
    }
    
    a.faceCount=6;
    a.stickerOffsets=[0,9,18,27,36,45];
    a.stickerCounts=[9,9,9,9,9,9];
    
    return a;
  }
}

RubiksCubeS5Cube3D.prototype.relativeUrl = 'models/rubikscubes5/';
RubiksCubeS5Cube3D.prototype.baseUrl = 'lib/';

// ------------------
// MODULE API    
// ------------------
return {
  Cube3D : RubiksCubeS5Cube3D,
  newCube3D : function () { const c = new RubiksCubeS5Cube3D(); c.loadGeometry(); return c; }
};
});
