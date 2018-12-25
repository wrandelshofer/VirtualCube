/* @(#)RubiksCubeS4Cube3D.mjs
 * Copyright (c) 2018 Werner Randelshofer, Switzerland. MIT License.
 */

import AbstractRubiksCubeCube3D from './AbstractRubiksCubeCube3D.mjs';
import CubeAttributes from './CubeAttributes.mjs';
import PreloadRubiksCubeS4 from './PreloadRubiksCubeS4.mjs';

class RubiksCubeS4Cube3D extends AbstractRubiksCubeCube3D.AbstractRubiksCubeCube3D {
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
    let a=new CubeAttributes.CubeAttributes(this.partCount, 6*9, [9,9,9,9,9,9]);
    let partsPhong=[0.5,0.6,0.4,16.0];//shiny plastic [ambient, diffuse, specular, shininess]
    for (let i=0;i<this.partCount;i++) {
      a.partsFillColor[i]=[24,24,24,255];
      a.partsPhong[i]=partsPhong;
    }
    a.partsFillColor[this.centerOffset]=[240,240,240,255];
    
    let faceColors=[//Right, Up, Front, Left, Down, Back
      [255, 210, 0,155], // Yellow
      [0, 51, 115,255], // Blue
      [140, 0, 15,255], // Red
      [248, 248, 248,255], // White
      [0, 115, 47,255], // Green
      [255, 70, 0,255], // Orange
    ];
    
    let stickersPhong=[0.8,0.2,0.1,8.0];//glossy paper [ambient, diffuse, specular, shininess]
   
    for (let i=0;i<6;i++) {
      for (let j=0;j<9;j++) {
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

RubiksCubeS4Cube3D.prototype.relativeUrl = 'models/rubikscubes4/';
RubiksCubeS4Cube3D.prototype.baseUrl = 'lib/';

// ------------------
// MODULE API    
// ------------------
export default {
  Cube3D : RubiksCubeS4Cube3D,
};
