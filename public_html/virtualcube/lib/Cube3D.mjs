/* @(#)Cube3D.mjs
 * Copyright (c) 2018 Werner Randelshofer, Switzerland. MIT License.
 */

// --------------
// require.js
// --------------
import Node3D from './Node3D.mjs';
import Cube from './Cube.mjs';
import J3DI from './J3DI.mjs';
import J3DIMath from './J3DIMath.mjs';
import CubeAttributes from './CubeAttributes.mjs';
import SplineInterpolator from './SplineInterpolator.mjs';

/** Change event. */
class ChangeEvent {
  constructor(source) {
    this.source = source;
  }
}

/** Constructor
 * Base class for classes which implement the geometry of a
 * Rubik's Cube like puzzle.
 *
 *
 */
class Cube3D extends Node3D.Node3D {
  constructor(layerCount, partSize) {
    super();
    // subclasses must build the following model hierarchy
    // for use when the cube is assembled:
    //
    // cube3d           Node3D root (this).
    // .partLocations       Node3D used to perform
    //              location changes of the part.
    // .partExplosions      Node3D used to perform the
    //              explosion effect.
    // .partOrientations    Node3D for orientation transformation
    //              of the parts. These are rotations
    //              around position 0.
    // .parts           Node3D holding the mesh. May contain
    //              a non-identity transform to position
    //              the mesh, so that the part is
    //              moved to position 0 and orientation 0.

    // subclasses must build the following model hierarchy
    // for use when the cube is developed:
    //
    // cube3d           Node3D root (this).
    // .stickerTranslations   Node3D used to drag a sticker around
    // .stickerLocations    Node3D used to perform
    //              location changes of the sticker.
    // .stickerExplosions     Node3D used to perform the
    //              explosion effect.
    // .stickerOrientations   Node3D for orientation transformation
    //              of the sticker. These are rotations
    //              around position 0.
    // .stickers         Node3D holding the mesh. May contain
    //              a non-identity transform to position
    //              the mesh, so that the sticker is
    //              moved to position 0 and orientation 0.

    this.layerCount = layerCount;
    this.cube = Cube.createCube(layerCount);

    this.partSize = partSize;
    this.cubeSize = partSize * layerCount;  // cube size in centimeters

    this.cornerCount = 8;
    this.edgeCount = 12 * (layerCount - 2);
    this.sideCount = 6 * (layerCount - 2)*(layerCount - 2);
    this.centerCount = 1;
    this.partCount = layerCount * layerCount * layerCount
        - (layerCount - 2) * (layerCount - 2) * (layerCount - 2)
        + 1;
    this.cornerOffset = 0;
    this.edgeOffset = this.cornerOffset + this.cornerCount;
    this.sideOffset = this.edgeOffset + this.edgeCount;
    this.centerOffset = this.sideOffset + this.sideCount;

    this.repainter = null;
    this.isTwisting = false;
    this.repaintFunction = null;

    this.parts = [];
    this.partOrientations = [];
    this.partExplosions = [];
    this.partLocations = [];

    this.stickers = [];
    this.stickerOrientations = [];
    this.stickerExplosions = [];
    this.stickerLocations = [];
    this.stickerTranslations = [];

    this.identityPartLocations = [];
    this.identityStickerLocations = [];
    //this.identityStickerOrientations=[]; Not needed, since == identity matrix

    this.listenerList = [];
    this.isCubeValid = false;
    this.updateTwistRotation = new J3DIMath.J3DIMatrix4();
    this.updateTwistOrientation = new J3DIMath.J3DIMatrix4();

    this.developedStickerTranslations = [];
    this.developedStickers = [];
    this.identityDevelopedMatrix = [];

    this.currentStickerTransforms = [];
    this.textureScaleFactor=Math.floor(512/(3*layerCount))/512;

    this.attributes = this.createAttributes();
    this.stickerCount = this.attributes.getStickerCount();
    this.cube.addCubeListener(this);
    this.createSceneNodes();
  }

  createSceneNodes() {
    this.partToStickerMap = new Array(this.partCount);
    for (let i = 0; i < this.partCount; i++) {
      this.parts[i] = new Node3D.Node3D();
      this.partOrientations[i] = new Node3D.Node3D();
      this.partExplosions[i] = new Node3D.Node3D();
      this.partLocations[i] = new Node3D.Node3D();

      this.partOrientations[i].add(this.parts[i]);
      this.partExplosions[i].add(this.partOrientations[i]);
      this.partLocations[i].add(this.partExplosions[i]);
      this.add(this.partLocations[i]);

      this.identityPartLocations[i] = new J3DIMath.J3DIMatrix4();
      this.partToStickerMap[i] = new Array(3);
    }

    for (let i = 0; i < this.stickerCount; i++) {
      this.partToStickerMap[this.stickerToPartMap[i]][this.stickerToFaceMap[i]] = i;

      this.stickers[i] = new Node3D.Node3D();
      this.stickerOrientations[i] = new Node3D.Node3D();
      this.stickerExplosions[i] = new Node3D.Node3D();
      this.stickerLocations[i] = new Node3D.Node3D();
      this.stickerTranslations[i] = new Node3D.Node3D();

      this.stickerOrientations[i].add(this.stickers[i]);
      this.stickerExplosions[i].add(this.stickerOrientations[i]);
      this.stickerLocations[i].add(this.stickerExplosions[i]);
      this.stickerTranslations[i].add(this.stickerLocations[i]);
      this.add(this.stickerTranslations[i]);

      this.developedStickers[i] = new Node3D.Node3D();

      this.currentStickerTransforms[i] = new Node3D.Node3D();
      this.add(this.currentStickerTransforms[i]);
      this.identityStickerLocations[i] = new J3DIMath.J3DIMatrix4();
    }
  }

  cubeChanged(evt) {
    this.updateCube();
  }
  cubeTwisted(evt) {
    if (this.repainter == null) {
      this.updateCube();
      return;
    }

    let axis = evt.getAxis();
    let angle = evt.getAngle();
    let model = this.getCube();

    let partIndices = new Array(this.partCount);
    let orientations = new Array(this.partCount);
    let locations = evt.getAffectedLocations();
    let count = locations.length;

    for (let i = 0; i < count; i++) {
      partIndices[i] = model.getPartAt(locations[i]);
      orientations[i] = model.getPartOrientation(partIndices[i]);
    }

    let finalCount = count;
    let self = this;
    let interpolator = new SplineInterpolator.SplineInterpolator(0, 0, 1, 1);
    let start = new Date().getTime();
    let duration = this.attributes.getTwistDuration() * Math.abs(angle);
    let token=new Object();
    this.isTwisting = token;
    let f = function () {
      if (self.isTwisting!==token) {
        // Twisting was aborted. Complete this twisting animation.
        self.validateTwist(partIndices, locations, orientations, finalCount, axis, angle, 1.0);
        return;
      }
      let now = new Date().getTime();
      let elapsed = now - start;
      let value = elapsed / duration;
      if (value < 1) {
        self.validateTwist(partIndices, locations, orientations, finalCount, axis, angle, interpolator.getFraction(value));
        self.repainter.repaint(f);
      } else {
        self.validateTwist(partIndices, locations, orientations, finalCount, axis, angle, 1.0);
        self.isTwisting = null;
      }
    };
    if (this.repainter != null) {
      this.repainter.repaint(f);
    }
  }
  validateTwist(partIndices, locations, orientations, partCount, axis, angle, alpha) {
    let rotation = this.updateTwistRotation;
    rotation.makeIdentity();
    let rad = (90 * angle * (1 - alpha));
    switch (axis) {
      case 0:
        rotation.rotate(rad, -1, 0, 0);
        break;
      case 1:
        rotation.rotate(rad, 0, -1, 0);
        break;
      case 2:
        rotation.rotate(rad, 0, 0, 1);
        break;
    }

    let orientationMatrix = this.updateTwistOrientation;
    for (let i = 0; i < partCount; i++) {
      orientationMatrix.makeIdentity();
      if (partIndices[i] < this.edgeOffset) { //=> part is a corner
        // Base location of a corner part is urf. (= corner part 0)
        switch (orientations[i]) {
          case 0:
            break;
          case 1:
            orientationMatrix.rotate(90, 0, 0, 1);
            orientationMatrix.rotate(90, -1, 0, 0);
            break;
          case 2:
            orientationMatrix.rotate(90, 0, 0, -1);
            orientationMatrix.rotate(90, 0, 1, 0);
            break;
        }
      } else if (partIndices[i] < this.sideOffset) { //=> part is an edge
        if (orientations[i] == 1) {
          // Base location of an edge part is ur. (= edge part 0)
          if (this.layerCount == 3
          || this.layerCount == 5 && partIndices[i] - this.edgeOffset < 12
          ) {
            orientationMatrix.rotateZ(90);
            orientationMatrix.rotateX(180);
          }
        }
      } else if (partIndices[i] < this.centerOffset) {//=> part is a side
        if (orientations[i] > 0) {
          // Base location of a side part is r. (= side part 0)
          if (this.layerCount==3
          || this.layerCount == 5 && partIndices[i] - this.sideOffset < 6
          ) {
            orientationMatrix.rotate(90 * orientations[i], -1, 0, 0);
          }
        }
      }
      this.partOrientations[partIndices[i]].matrix.load(orientationMatrix);
      let transform = this.partLocations[partIndices[i]].matrix;
      transform.load(rotation);
      transform.multiply(this.identityPartLocations[locations[i]]);
    }
  }

  /* Immediately completes the current twisting animation. */
   finishTwisting() {
     this.isTwisting=null;
   }

  updateCube() {
    //this.stopAnimation();
    this.isCubeValid = false;
    this.validateCube();
    this.fireStateChanged();
  }

  validateCube() {
    if (!this.isCubeValid) {
      this.isCubeValid = true;
      let model = this.cube;
      let partIndices = new Array(this.partCount);
      let locations = new Array(this.partCount);
      let orientations = new Array(this.partCount);
      for (let i = 0; i < this.partCount; i++) {
        locations[i] = i;
        partIndices[i] = model.getPartAt(locations[i]);
        orientations[i] = model.getPartOrientation(partIndices[i]);
      }
      this.validateTwist(partIndices, locations, orientations, this.partCount, 0, 0, 1);
    }
  }
  updateAttributes() {
    this.isAttributesValid = false;
    this.validateAttributes();
  }
  validateAttributes() {
    if (!this.isAttributesValid) {
      this.isAttributesValid = true;

      this.doValidateDevelopAttributes();
      this.doValidateAttributes();
    }
  }
   doValidateAttributes() {
      let a = this.attributes;
      for (let i = 0; i < this.stickerObjs.length; i++) {
          this.stickerObjs[i].hasTexture = a.stickersImageURL != null;
      }
      for (let i = 0; i < a.getPartCount(); i++) {
          this.parts[i].visible = a.isPartVisible(i);
      }
  }
  doValidateDevelopAttributes() {
    if (this.attributes.developmentFactor == this.cachedDevelopmentFactor) {
      return;
    }
    this.cachedDevelopmentFactor = this.attributes.developmentFactor;

    let m1 = new J3DIMath.J3DIMatrix4();
    let m2 = new J3DIMath.J3DIMatrix4();

    for (let i = 0; i < this.stickerCount; i++) {
      let j = this.stickerToPartMap[i];
      m1.load(this.partLocations[j].matrix);
      m1.multiply(this.partExplosions[j].matrix);
      m1.multiply(this.partOrientations[j].matrix);
      m1.multiply(this.parts[j].matrix);

      m2.load(this.stickerTranslations[i].matrix);
      m2.multiply(this.stickerLocations[i].matrix);
      m2.multiply(this.stickerExplosions[i].matrix);
      m2.multiply(this.stickerOrientations[i].matrix);
      m2.multiply(this.stickers[i].matrix);

      this.currentStickerTransforms[i].matrix.load(J3DIMath.rigidLerp(m1, m2, this.attributes.developmentFactor));
    }
  }

  // protected abstract void validateTwist(int[] partIndices, int[] locations, int[] orientations, int length, int axis, int angle, float alpha);

  /**
   * Adds a listener for ChangeEvent's.
   *
   * A listener must have a stateChanged() function.
   */
  addChangeListener(l) {
    this.listenerList[this.listenerList.length] = l;
  }

  /**
   * Removes a listener for CubeEvent's.
   */
  removeChangeListener(l) {
    for (let i = 0; i < this.listenerList.length; i++) {
      if (this.listenerList[i] == l) {
        this.listenerList = this.listenerList.slice(0, i) + this.listenerList.slice(i + 1);
        break;
      }
    }
  }

  /**
   * Notify all listeners that have registered leterest for
   * notification on this event type.
   */
  fireStateChanged() {
    let event = new ChangeEvent(this);
    // Guaranteed to return a non-null array
    let listeners = this.listenerList;
    // Process the listeners last to first, notifying
    // those that are leterested in this event
    for (let i = listeners.length - 1; i >= 0; i -= 1) {
      listeners[i].stateChanged(event);
    }
  }

  repaint() {
    if (this.repaintFunction != null) {
      this.repaintFunction();
    }
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
   * @return uv  Intersection UV coordinates: 2D vector on the intersection plane.
   * @return t   The distance that the ray traveled to the intersection point.
   * @return axis  The twist axis.
   * @return layerMask The twist layer mask.
   * @return angle The twist angle.
   */
  intersect(ray) {
    let cubeSize = this.partSize * this.cube.layerCount;

    let box = {pMin: new J3DIMath.J3DIVector3(-cubeSize / 2, -cubeSize / 2, -cubeSize / 2),
      pMax: new J3DIMath.J3DIVector3(cubeSize / 2, cubeSize / 2, cubeSize / 2)};
    let isect = J3DIMath.intersectBox(ray, box);

    if (isect != null) {
      let face = isect.face;
      let u = Math.floor(isect.uv[0] * this.cube.layerCount);
      let v = Math.floor(isect.uv[1] * this.cube.layerCount);

      isect.location = this.boxClickToLocationMap[face][u][v];
      isect.axis = this.boxClickToAxisMap[face][u][v];
      isect.layerMask = this.boxClickToLayerMap[face][u][v];
      isect.angle = this.boxClickToAngleMap[face][u][v];
      isect.part = this.cube.getPartAt(isect.location);
      if (!this.attributes.isPartVisible(isect.part)) {
        isect = null;
      }
    }

    return isect;
  }
  /** Intersection test for a ray with a developed cube.
   * The ray must be given as an object with {point:J3DIVector3, dir:J3DIVector3}
   * in the model coordinates of the cube.
   *
   * Returns null if no intersection, or the intersection data:
   * {point:J3DIVector3, uv:J3DIVector3, t:float, axis:int, layerMask:int, angle:int,
   *  ...}
   *
   * @return point Intersection point: 3D vector.
   * @return uv  Intersection UV coordinates: 2D vector on the intersection plane.
   * @return t   The distance that the ray traveled to the intersection point.
   * @return axis  The twist axis.
   * @return layerMask The twist layer mask.
   * @return angle The twist angle.
   * @return sticker The sticker index.
   * @return part The part index.
   * @return face The face index.
   */
  intersectDeveloped(ray) {
    let isect = null;
    let plane = {point: new J3DIMath.J3DIVector3(), normal: new J3DIMath.J3DIVector3()};
    let m = new J3DIMath.J3DIMatrix4();

    let layerCount = this.cube.layerCount;
    let partSize = this.partSize;

    plane.point.load(0, 0, -0.5 * layerCount * this.partSize);
    plane.normal.load(0, 0, -1);

    isect = J3DIMath.intersectPlane(ray, plane);
    if (isect != null) {
      let tileU = -1 - Math.floor((isect.uv[0] - (1.5 * layerCount * partSize)) / partSize);
      let tileV = Math.floor((isect.uv[1] + (1.5 * layerCount * partSize)) / partSize);
      //console.log('col:'+(tileU)+'row:'+(tileV));

      if (tileV >= 0 && tileV < layerCount
        && tileU >= layerCount && tileU < layerCount * 2) {
        isect.face = 1;
      } else if (tileV >= layerCount && tileV < layerCount * 2
        && tileU >= 0 && tileU < (layerCount * 4)) {
        switch (Math.floor(tileU / layerCount)) {
          case 0:
            isect.face = 3;
            break;
          case 1:
            isect.face = 2;
            break;
          case 2:
            isect.face = 0;
            break;
          case 3:
            isect.face = 5;
            break;
          default:
            return null; // should never happen
        }
      } else if (tileV >= layerCount * 2 && tileV < layerCount * 3
        && tileU >= layerCount && tileU < layerCount * 2) {
        isect.face = 4;
      } else {
        return null;
      }
      isect.sticker = isect.face * layerCount * layerCount + (tileV % layerCount) * layerCount + tileU % layerCount;
      isect.part = this.getPartIndexForStickerIndex(isect.sticker);
      isect.plane = plane;
    }

    return isect;
  }

  getCube() {
    return this.cube;
  }

   /* Immediately completes the current twisting animation. */
   finishTwisting() {
    // subclasses can override this methods
   }

   /** Sets the repainter for animation. Set this value to null to prevent animation.
    *  Set this value to an object which has a repaint() method. The repaint() method
    *  must paint the current state of the Cube3D.
    */
   setRepainter(newValue) {
     this.repainter=newValue;
   }
   getRepainter() {
     return this.repainter;
   }
   /** Gets the size of the cube in centimeters. */
   getCubeSize() {
    return this.cubeSize;
   }

  updateExplosionFactor(factor) {
    if (factor == null) {
      factor = this.attributes.explosionFactor;
    }
    let explosionShift = this.partSize * 1.5;
    let baseShift = explosionShift * factor;
    let shift = 0;
    let a = this.attributes;
    for (let i = 0; i < this.cornerCount; i++) {
      let index = this.cornerOffset + i;
      shift = baseShift + a.partExplosion[index];
      this.partExplosions[index].matrix.makeIdentity();
      this.partExplosions[index].matrix.translate(shift, shift, -shift);//ruf
    }
    for (let i = 0; i < this.edgeCount; i++) {
      let index = this.edgeOffset + i;
      shift = baseShift + a.partExplosion[index];
      this.partExplosions[index].matrix.makeIdentity();
      this.partExplosions[index].matrix.translate(shift, shift, 0);//ru
    }
    for (let i = 0; i < this.sideCount; i++) {
      let index = this.sideOffset + i;
      shift = baseShift + a.partExplosion[index];
      this.partExplosions[index].matrix.makeIdentity();
      this.partExplosions[index].matrix.translate(shift, 0, 0);//r
    }
    this.fireStateChanged();
  }

  createAttributes() {
    let layerCount = this.cube.getLayerCount();
    let stickersPerFace = layerCount*layerCount;
    let a = new CubeAttributes.CubeAttributes(
        this.partCount,
        6 * stickersPerFace,
        [stickersPerFace, stickersPerFace, stickersPerFace, stickersPerFace, stickersPerFace, stickersPerFace]
        );
    let partsPhong = [0.5, 0.6, 0.4, 16.0];//shiny plastic [ambient, diffuse, specular, shininess]
    for (let i = 0; i < this.partCount; i++) {
      a.partsFillColor[i] = [24, 24, 24, 255];
      a.partsPhong[i] = partsPhong;
    }
    a.partsFillColor[this.centerOffset] = [240, 240, 240, 255];

    let faceColors = [//Right, Up, Front, Left, Down, Back
      [255, 210, 0, 255], // Yellow
      [0, 51, 115, 255], // Blue
      [140, 0, 15, 255], // Red
      [248, 248, 248, 255], // White
      [0, 115, 47, 255], // Green
      [255, 70, 0, 255], // Orange
    ];

    let stickersPhong = [0.8, 0.2, 0.1, 8.0];//shiny paper [ambient, diffuse, specular, shininess]

    let faceOffset=0;
    for (let i=0;i<6;i++) {
    for (let j=0;j<a.getStickerCount(i);j++) {
      a.stickersFillColor[faceOffset+j]=faceColors[i];
      a.stickersPhong[faceOffset+j]=stickersPhong;
    }
    faceOffset+=a.getStickerCount(i)
    }

    return a;
  }
  makeClonesWithRotatedTextures(obj) {
      let s0 = obj;
      let s90 = new J3DI.J3DIObj();
      s90.setTo(s0);
      s90.rotateTexture(90);
      let s180 = new J3DI.J3DIObj();
      s180.setTo(s0);
      s180.rotateTexture(180);
      let s270 = new J3DI.J3DIObj();
      s270.setTo(s0);
      s270.rotateTexture(270);

      return [s0,s90,s180,s270];
  }

  initCornerR() {
    let s0,s90,s180,s270;
    [s0,s90,s180,s270] = this.makeClonesWithRotatedTextures(this.cornerR0Obj);
    let stickerMap = this.partToStickerMap;

    let o=this.cornerOffset;
    this.stickerObjs[ stickerMap[o+0][1] ] = s0.clone();
    this.stickerObjs[ stickerMap[o+1][1] ] = s180.clone();
    this.stickerObjs[ stickerMap[o+2][1] ] = s0.clone();
    this.stickerObjs[ stickerMap[o+3][1] ] = s180.clone();
    this.stickerObjs[ stickerMap[o+4][1] ] = s0.clone();
    this.stickerObjs[ stickerMap[o+5][1] ] = s180.clone();
    this.stickerObjs[ stickerMap[o+6][1] ] = s0.clone();
    this.stickerObjs[ stickerMap[o+7][1] ] = s180.clone();
  }
  initCornerF() {
    let s0,s90,s180,s270;
    [s0,s90,s180,s270] = this.makeClonesWithRotatedTextures(this.cornerF0Obj);
    let stickerMap = this.partToStickerMap;

    let o=this.cornerOffset;
    this.stickerObjs[ stickerMap[o+0][2] ] = s0.clone();
    this.stickerObjs[ stickerMap[o+1][2] ] = s180.clone();
    this.stickerObjs[ stickerMap[o+2][2] ] = s0.clone();
    this.stickerObjs[ stickerMap[o+3][2] ] = s180.clone();
    this.stickerObjs[ stickerMap[o+4][2] ] = s0.clone();
    this.stickerObjs[ stickerMap[o+5][2] ] = s180.clone();
    this.stickerObjs[ stickerMap[o+6][2] ] = s0.clone();
    this.stickerObjs[ stickerMap[o+7][2] ] = s180.clone();
  }

  initCornerU() {
    let s0,s90,s180,s270;
    [s0,s90,s180,s270] = this.makeClonesWithRotatedTextures(this.cornerU0Obj);
    let stickerMap = this.partToStickerMap;

    let o = this.cornerOffset;
    this.stickerObjs[ stickerMap[o+0][0] ] = s0.clone();
    this.stickerObjs[ stickerMap[o+1][0] ] = s90.clone();
    this.stickerObjs[ stickerMap[o+2][0] ] = s90.clone();
    this.stickerObjs[ stickerMap[o+3][0] ] = s0.clone();
    this.stickerObjs[ stickerMap[o+4][0] ] = s180.clone();
    this.stickerObjs[ stickerMap[o+5][0] ] = s270.clone();
    this.stickerObjs[ stickerMap[o+6][0] ] = s270.clone();
    this.stickerObjs[ stickerMap[o+7][0] ] = s180.clone();
  }
  
  initMiddleEdgeU() {
    let s0,s90,s180,s270;
    [s0,s90,s180,s270] = this.makeClonesWithRotatedTextures(this.edgeU0Obj);
    let stickerMap = this.partToStickerMap;

    if (this.layerCount & 1 == 1) {
        let o=this.edgeOffset;
        this.stickerObjs[ stickerMap[o+0][0] ] = s0.clone();
        this.stickerObjs[ stickerMap[o+1][0] ] = s180.clone();
        this.stickerObjs[ stickerMap[o+2][0] ] = s0.clone();
        this.stickerObjs[ stickerMap[o+3][0] ] = s90.clone();
        this.stickerObjs[ stickerMap[o+4][0] ] = s0.clone();
        this.stickerObjs[ stickerMap[o+5][0] ] = s270.clone();
        this.stickerObjs[ stickerMap[o+6][0] ] = s180.clone();
        this.stickerObjs[ stickerMap[o+7][0] ] = s180.clone();
        this.stickerObjs[ stickerMap[o+8][0] ] = s180.clone();
        this.stickerObjs[ stickerMap[o+9][0] ] = s90.clone();
        this.stickerObjs[ stickerMap[o+10][0] ] = s0.clone();
        this.stickerObjs[ stickerMap[o+11][0] ] = s270.clone();
    }
  }
  
  initSliceEdgeU(edgeUObject, edgeOffset) {
    let s0,s90,s180,s270;
    [s0,s90,s180,s270] = this.makeClonesWithRotatedTextures(edgeUObject);
    let stickerMap = this.partToStickerMap;
    let o=edgeOffset;
    this.stickerObjs[ stickerMap[o+0][1] ] = s90.clone();
    this.stickerObjs[ stickerMap[o+1][1] ] = s0.clone();
    this.stickerObjs[ stickerMap[o+2][0] ] = s0.clone();
    this.stickerObjs[ stickerMap[o+3][0] ] = s90.clone();
    this.stickerObjs[ stickerMap[o+4][0] ] = s0.clone();
    this.stickerObjs[ stickerMap[o+5][1] ] = s270.clone();
    this.stickerObjs[ stickerMap[o+6][0] ] = s180.clone();
    this.stickerObjs[ stickerMap[o+7][1] ] = s0.clone();
    this.stickerObjs[ stickerMap[o+8][1] ] = s270.clone();
    this.stickerObjs[ stickerMap[o+9][1] ] = s270.clone();
    this.stickerObjs[ stickerMap[o+10][0] ] = s0.clone();
    this.stickerObjs[ stickerMap[o+11][0] ] = s270.clone();
    this.stickerObjs[ stickerMap[o+12][0] ] = s0.clone();
    this.stickerObjs[ stickerMap[o+13][0] ] = s180.clone();
    this.stickerObjs[ stickerMap[o+14][1] ] = s270.clone();
    this.stickerObjs[ stickerMap[o+15][1] ] = s90.clone();
    this.stickerObjs[ stickerMap[o+16][1] ] = s180.clone();
    this.stickerObjs[ stickerMap[o+17][0] ] = s270.clone();
    this.stickerObjs[ stickerMap[o+18][1] ] = s90.clone();
    this.stickerObjs[ stickerMap[o+19][0] ] = s180.clone();
    this.stickerObjs[ stickerMap[o+20][0] ] = s180.clone();
    this.stickerObjs[ stickerMap[o+21][0] ] = s90.clone();
    this.stickerObjs[ stickerMap[o+22][1] ] = s180.clone();
    this.stickerObjs[ stickerMap[o+23][1] ] = s90.clone(); 
  }
  
  initEdgeU() {
    //subclass responsibility
  }
  
  initMiddleEdgeR() {
    let stickerMap = this.partToStickerMap;
    let s0,s90,s180,s270;
    [s0,s90,s180,s270] = this.makeClonesWithRotatedTextures(this.edgeR0Obj);

    let o=this.edgeOffset;
    this.stickerObjs[ stickerMap[o+0][1] ] = s0.clone();
    this.stickerObjs[ stickerMap[o+1][1] ] = s270.clone();
    this.stickerObjs[ stickerMap[o+2][1] ] = s180.clone();
    this.stickerObjs[ stickerMap[o+3][1] ] = s0.clone();
    this.stickerObjs[ stickerMap[o+4][1] ] = s90.clone();
    this.stickerObjs[ stickerMap[o+5][1] ] = s180.clone();
    this.stickerObjs[ stickerMap[o+6][1] ] = s0.clone();
    this.stickerObjs[ stickerMap[o+7][1] ] = s270.clone();
    this.stickerObjs[ stickerMap[o+8][1] ] = s180.clone();
    this.stickerObjs[ stickerMap[o+9][1] ] = s180.clone();
    this.stickerObjs[ stickerMap[o+10][1] ] = s90.clone();
    this.stickerObjs[ stickerMap[o+11][1] ] = s0.clone();
  }
  initSliceEdgeR(edgeRObject, edgeOffset) {
    let stickerMap = this.partToStickerMap;
    let s0,s90,s180,s270;
    [s0,s90,s180,s270] = this.makeClonesWithRotatedTextures(edgeRObject);
    let o=edgeOffset;
    
    this.stickerObjs[ stickerMap[o+0][0] ] = s270.clone();
    this.stickerObjs[ stickerMap[o+1][0] ] = s90.clone();
    this.stickerObjs[ stickerMap[o+2][1] ] = s180.clone();
    this.stickerObjs[ stickerMap[o+3][1] ] = s0.clone();
    this.stickerObjs[ stickerMap[o+4][1] ] = s90.clone();
    this.stickerObjs[ stickerMap[o+5][0] ] = s180.clone();
    this.stickerObjs[ stickerMap[o+6][1] ] = s0.clone();
    this.stickerObjs[ stickerMap[o+7][0] ] = s90.clone();
    this.stickerObjs[ stickerMap[o+8][0] ] = s90.clone();
    this.stickerObjs[ stickerMap[o+9][0] ] = s0.clone();
    this.stickerObjs[ stickerMap[o+10][1] ] = s90.clone();
    this.stickerObjs[ stickerMap[o+11][1] ] = s0.clone();

    this.stickerObjs[ stickerMap[o+12][1] ] = s0.clone();
    this.stickerObjs[ stickerMap[o+13][1] ] = s270.clone();
    this.stickerObjs[ stickerMap[o+14][0] ] = s270.clone();
    this.stickerObjs[ stickerMap[o+15][0] ] = s0.clone();
    this.stickerObjs[ stickerMap[o+16][0] ] = s270.clone();
    this.stickerObjs[ stickerMap[o+17][1] ] = s180.clone();
    this.stickerObjs[ stickerMap[o+18][0] ] = s90.clone();
    this.stickerObjs[ stickerMap[o+19][1] ] = s270.clone();
    this.stickerObjs[ stickerMap[o+20][1] ] = s180.clone();
    this.stickerObjs[ stickerMap[o+21][1] ] = s180.clone();
    this.stickerObjs[ stickerMap[o+22][0] ] = s270.clone();
    this.stickerObjs[ stickerMap[o+23][0] ] = s180.clone();  
  }

  initEdgeR() {
    //subclass responsibility
  }
  initSideR() {
    let stickerMap = this.partToStickerMap;

    let s0,s90,s180,s270;
    [s0,s90,s180,s270] = this.makeClonesWithRotatedTextures(this.sideR0Obj);

    if (this.layerCount & 1 == 1) {
        let o=this.sideOffset;
        this.stickerObjs[ stickerMap[o+0][0]] = s0.clone();//r
        this.stickerObjs[stickerMap[o+1][0]] = s180.clone();//u
        this.stickerObjs[stickerMap[o+2][0]] = s270.clone();//f
        this.stickerObjs[stickerMap[o+3][0]] = s90.clone();//l
        this.stickerObjs[stickerMap[o+4][0]] = s90.clone();//d
        this.stickerObjs[stickerMap[o+5][0]] = s180.clone();//b
    }
    if (this.layerCount == 4) {
        let o=this.sideOffset;
        this.stickerObjs[ stickerMap[o+0][0] ] = s180.clone();//r
        this.stickerObjs[ stickerMap[o+1][0] ] = s0.clone();//u
        this.stickerObjs[ stickerMap[o+2][0] ] = s90.clone();//f
        this.stickerObjs[ stickerMap[o+3][0] ] = s270.clone();//l
        this.stickerObjs[ stickerMap[o+4][0] ] = s270.clone();//d
        this.stickerObjs[ stickerMap[o+5][0] ] = s0.clone();//b
    
        this.stickerObjs[ stickerMap[o+6][0] ] = s90.clone();//r
        this.stickerObjs[ stickerMap[o+7][0] ] = s270.clone();//u
        this.stickerObjs[ stickerMap[o+8][0] ] = s0.clone();//f
        this.stickerObjs[ stickerMap[o+9][0] ] = s180.clone();//l
        this.stickerObjs[ stickerMap[o+10][0] ] = s180.clone();//d
        this.stickerObjs[ stickerMap[o+11][0] ] = s270.clone();//b
    
        this.stickerObjs[ stickerMap[o+12][0] ] = s0.clone();//r
        this.stickerObjs[ stickerMap[o+13][0] ] = s180.clone();//u
        this.stickerObjs[ stickerMap[o+14][0] ] = s270.clone();//f
        this.stickerObjs[ stickerMap[o+15][0] ] = s90.clone();//l
        this.stickerObjs[ stickerMap[o+16][0] ] = s90.clone();//d
        this.stickerObjs[ stickerMap[o+17][0] ] = s180.clone();//b
    
        this.stickerObjs[ stickerMap[o+18][0] ] = s270.clone();//r
        this.stickerObjs[ stickerMap[o+19][0] ] = s90.clone();//u
        this.stickerObjs[ stickerMap[o+20][0] ] = s180.clone();//f
        this.stickerObjs[ stickerMap[o+21][0] ] = s0.clone();//l
        this.stickerObjs[ stickerMap[o+22][0] ] = s0.clone();//d
        this.stickerObjs[ stickerMap[o+23][0] ] = s90.clone();//b
    }
    if (this.layerCount == 5) {
        for (let i=1;i<9;i++) {
            let o=this.sideOffset+i*6;
            [s0,s90,s180,s270] = this.makeClonesWithRotatedTextures(
                i&1==1?this.sideR1Obj:this.sideR2Obj
                );
            this.stickerObjs[ stickerMap[o+0][0]] = s0.clone();//r
            this.stickerObjs[stickerMap[o+1][0]] = s180.clone();//u
            this.stickerObjs[stickerMap[o+2][0]] = s270.clone();//f
            this.stickerObjs[stickerMap[o+3][0]] = s90.clone();//l
            this.stickerObjs[stickerMap[o+4][0]] = s90.clone();//d
            this.stickerObjs[stickerMap[o+5][0]] = s180.clone();//b
        }
    }
  }
  initTextureScaleFactor(fraction) {
    let attr = this.attributes;

    for (let i = 0; i < this.stickerObjs.length; i++) {
      if (!this.stickerObjs[i].loaded)
        continue;

      if (this.stickerObjs[i].isTextureScaled)
        continue;
      if (i * 2 + 1 < this.stickerOffsets.length) {
        this.stickerObjs[i].textureOffsetX = this.stickerOffsets[i * 2];
        this.stickerObjs[i].textureOffsetY = this.stickerOffsets[i * 2 + 1];
      }
      this.stickerObjs[i].textureScale = fraction;
      this.stickerObjs[i].isTextureScaled = true;
    }

    this.isAttributesValid = false;
  }


  loadGeometry() {
    // ----------------------------
    // Load geometry
    let self = this;
    let fRepaint = function () {
      self.repaint();
    };

    let modelUrl = this.getModelUrl();

    // create the parts
    this.cornerObjs = new Array(this.cornerCount);
    for (let i=0;i<this.cornerCount;i++){
        this.cornerObjs[i]=new J3DI.J3DIObj();
    }
    this.edgeObjs = new Array(this.edgeCount);
    this.edge_rObjs = new Array(this.edgeCount);
    this.edge_uObjs = new Array(this.edgeCount);
    for (let i=0;i<this.edgeCount;i++){
        this.edgeObjs[i]=new J3DI.J3DIObj();
    }
    this.sideObjs = new Array(this.sideCount);
    for (let i=0;i<this.sideCount;i++){
        this.sideObjs[i]=new J3DI.J3DIObj();
    }
    this.cornerR0Obj = new J3DI.J3DIObj();
    this.cornerU0Obj = new J3DI.J3DIObj();
    this.cornerF0Obj = new J3DI.J3DIObj();
    this.edgeR0Obj = new J3DI.J3DIObj();
    this.edgeU0Obj = new J3DI.J3DIObj();
    this.edgeR12Obj = new J3DI.J3DIObj();
    this.edgeU12Obj = new J3DI.J3DIObj();
    this.edgeR24Obj = new J3DI.J3DIObj();
    this.edgeU24Obj = new J3DI.J3DIObj();
    this.sideR0Obj = new J3DI.J3DIObj();
    this.sideR1Obj = new J3DI.J3DIObj();
    this.sideR2Obj = new J3DI.J3DIObj();
    this.centerObj = new J3DI.J3DIObj();
    this.stickerObjs = new Array(this.attributes.getStickerCount());
    for (let i = 0; i < this.stickerObjs.length; i++) {
      this.stickerObjs[i] = new J3DI.J3DIObj();
    }

    // load the 3d model
    J3DI.loadObj(null, modelUrl, function(obj) {
      self.onObjLoaded(obj);
      self.repaint();
    });
  }

  onObjLoaded(obj) {
    for (let i=0;i<this.cornerCount;i++){
        this.cornerObjs[i].setTo(obj);
        this.cornerObjs[i].selectedObject = "corner0";
    }
    for (let i = 0; i < this.edgeCount;i++){
        this.edgeObjs[i].setTo(obj);
        if (this.layerCount == 5) {
            this.edgeObjs[i].selectedObject = (i<12) ? "edge0" : "edge12";
        } else if (this.layerCount == 6) {
            this.edgeObjs[i].selectedObject = (i<24) ? "edge0" : "edge24";
        } else {
            this.edgeObjs[i].selectedObject = "edge0";
        }
    }
    for (let i = 0; i < this.sideCount; i++){
        this.sideObjs[i].setTo(obj);
        if (this.layerCount == 5) {
            switch (Math.floor(i / 6)) {
            case 0:
                this.sideObjs[i].selectedObject = "side";
                break;
            case 1:
            case 3:
            case 5:
            case 7:
                this.sideObjs[i].selectedObject = "side1";
                break;
            case 2:
            case 4:
            case 6:
            case 8:
                this.sideObjs[i].selectedObject = "side2";
                break;
            }
        } else {
            this.sideObjs[i].selectedObject = "side0";
        }
    }
    this.cornerR0Obj.setTo(obj);
    this.cornerR0Obj.selectedObject = "cornerR0";
    this.cornerU0Obj.setTo(obj);
    this.cornerU0Obj.selectedObject = "cornerU0";
    this.cornerF0Obj.setTo(obj);
    this.cornerF0Obj.selectedObject = "cornerF0";

    this.edgeR0Obj.setTo(obj);
    this.edgeR0Obj.selectedObject = "edgeR0";
    this.edgeU0Obj.setTo(obj);
    this.edgeU0Obj.selectedObject = "edgeU0";

    this.edgeR12Obj.setTo(obj);
    this.edgeR12Obj.selectedObject = "edgeR12";
    this.edgeU12Obj.setTo(obj);
    this.edgeU12Obj.selectedObject = "edgeU12";

    this.edgeR24Obj.setTo(obj);
    this.edgeR24Obj.selectedObject = "edgeR24";
    this.edgeU24Obj.setTo(obj);
    this.edgeU24Obj.selectedObject = "edgeU24";

    this.sideR0Obj.setTo(obj);
    this.sideR0Obj.selectedObject = "sideR0";
    this.sideR1Obj.setTo(obj);
    this.sideR1Obj.selectedObject = "sideR1";
    this.sideR2Obj.setTo(obj);
    this.sideR2Obj.selectedObject = "sideR2";
    this.centerObj.setTo(obj);
    this.centerObj.selectedObject = "center";

    this.initCornerR();
    this.initCornerU();
    this.initCornerF();
    this.initEdgeR();
    this.initEdgeU();
    this.initSideR();
    this.initTextureScaleFactor(this.textureScaleFactor);
  }
}

/**
 * This function computes sticker offsets for
 * a texture map which is structured as follows:
 * <pre>
 *   0 1 2 3 4 5 6 7 8
 *        +-----+
 * 0      |     |
 * 1      |  U  |
 * 2      |     |
 *  +-----+-----+-----+
 * 3|     |     |     |
 * 4|  L  |  F  |  R  |
 * 5|     |     |     |
 *  +-----+-----+-----+
 * 6      |     |     |
 * 7      |  D  |  B  |
 * 8      |     |     |
 *        +-----+-----+
 * </pre>
 * For a 3x3 cube this function yields the following output:
 * stickerOffsets = [
 *   6,3, 7,3, 8,3, //right
 *   6,4, 7,4, 8,4,
 *   6,5, 7,5, 8,5,
 *
 *   3,0, 4,0, 5,0, //up
 *   3,1, 4,1, 5,1, //
 *   3,2, 4,2, 5,2,
 *
 *   3,3, 4,3, 5,3, //front
 *   3,4, 4,4, 5,4,
 *   3,5, 4,5, 5,5,
 *
 *   0,3, 1,3, 2,3, //left
 *   0,4, 1,4, 2,4,
 *   0,5, 1,5, 2,5,
 *
 *   3,6, 4,6, 5,6, //down
 *   3,7, 4,7, 5,7,
 *   3,8, 4,8, 5,8,
 *
 *   6,6, 7,6, 8,6, //back
 *  6,7, 7,7, 8,7,
 *  6,8, 7,8, 8,8
 */
let computeStickerOffsets = function(layerCount) {
  //        right,  up,  front, left,  down,  back
  let faceOffsets=[ [2,1],  [1,0], [1,1], [0,1], [1,2], [2,2] ];
  let a=new Array(6*layerCount*layerCount*2);
  let i=0;
  for (let face=0;face<6;face++) {
  let [offx,offy] = faceOffsets[face];
  for (let y = 0; y < layerCount; y++) {
    for (let x = 0; x < layerCount; x++) {
      a[i++] = offx * layerCount + x;
      a[i++] = offy * layerCount + y;
    }
  }
  }
  return a;
}

// ------------------
// MODULE API
// ------------------
export default {
  Cube3D: Cube3D,
  computeStickerOffsets: computeStickerOffsets,
};

