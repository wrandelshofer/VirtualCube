/*
 * @(#)PocketCubeS5Cube3D.js  1.0  2015-01-09
 * Copyright (c) 2015 Werner Randelshofer, Switzerland. MIT License.
 */
"use strict";

// --------------
// require.js
// --------------
define("PocketCubeS5Cube3D", ["AbstractRubiksCubeCube3D","CubeAttributes","PreloadRubiksCubeS4", 'J3DIMath'], 
function(AbstractRubiksCubeCube3D,CubeAttributes,PreloadRubiksCubeS4,J3DIMath) { 
  
    let module = {
      log: (false) ? console.log : ()=>{},
      info: (true) ? console.info : ()=>{},
      warning: (true) ? console.warning : ()=>{},
      error: (true) ? console.error : ()=>{}
    }

class PocketCubeS5Cube3D extends AbstractRubiksCubeCube3D.AbstractRubiksCubeCube3D {
  /** Constructor
   * Creates the 3D geometry of a Rubik's Cube.
   * You must call loadGeometry() after instantation. 
   */
  constructor() {
    super(1.3,6*4);
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
      a.partsPhong[i]=partsPhong;
    }
    for (var i=0;i<8;i++) {
      a.partsFillColor[i]=[24,24,24,255];
    }
    for (var i=8;i<this.partCount;i++) {
      a.partsFillColor[i]=[240,240,240,255];
    }
    
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
    a.stickerOffsets=[0,4,8,12,16,20];
    a.stickerCounts=[4,4,4,4,4,4];
    
    return a;
  }
  
    /** Intersection test for a ray with the cube. 
     * The ray must be given as an object with {point:J3DIVector3, dir:J3DIVector3}
     * in the model coordinates of the cube.
     *
     * Returns null if no intersection, or the intersection data: 
     * {point:J3DIVector3, uv:J3DIVector3, t:float, axis:int, layerMask:int, 
     *  angle:int, ...}
     *
     * @return point Intersection point: 3D vector.
     * @return uv    Intersecton UV coordinates: 2D vector on the intersection plane.
     * @return t     The distance that the ray traveled to the intersection point.
     * @return axis  The twist axis.
     * @return layerMask The twist layer mask.
     * @return angle The twist angle.
     */
    intersect(ray) {
      var cubeSize = this.partSize * 2;

      var box = {pMin: new J3DIVector3(-cubeSize / 2, -cubeSize / 2, -cubeSize / 2),
        pMax: new J3DIVector3(cubeSize / 2, cubeSize / 2, cubeSize / 2)};
      var isect = J3DIMath.intersectBox(ray, box);

      if (isect != null) {
        let face = isect.face;
        let u = Math.floor(isect.uv[0] * 2);
        let v = Math.floor(isect.uv[1] * 2);
        
        if (u==1) u=2;
        if (v==1) v=2;
        
        isect.location = this.boxClickToLocationMap[face][u][v];
        isect.axis = this.boxClickToAxisMap[face][u][v];
        isect.layerMask = this.boxClickToLayerMap[face][u][v];
        isect.angle = this.boxClickToAngleMap[face][u][v];
        
        isect.part=this.cube.getPartAt(isect.location);
        if (!this.attributes.isPartVisible(isect.part)) {
          isect=null;
        }
      }

      return isect;
    }
  
}

PocketCubeS5Cube3D.prototype.relativeUrl = 'models/pocketcubes5/';
PocketCubeS5Cube3D.prototype.baseUrl = 'lib/';

// ------------------
// MODULE API    
// ------------------
return {
  Cube3D : PocketCubeS5Cube3D,
  newCube3D : function () { const c = new PocketCubeS5Cube3D(); c.loadGeometry(); return c; }
};
});
