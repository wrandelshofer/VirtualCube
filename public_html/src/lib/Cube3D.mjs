/* @(#)Cube3D.mjs
 * Copyright (c) 2018 Werner Randelshofer, Switzerland. MIT License.
 */

// --------------
// require.js
// --------------
import Node3D from './Node3D.mjs';
import J3DIMath from './J3DIMath.mjs';
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
  constructor() {
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

    this.cube = null;
    this.cubeSize = 5; // cube size in centimeters
    this.cornerCount = 0;
    this.edgeCount = 0;
    this.sideCount = 0;

    this.centerCount = 0;
    this.partCount = 0;
    this.cornerOffset = 0;
    this.edgeOffset = 0;
    this.sideOffset = 0;
    this.centerOffset = 0;
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
    this.partSize = 3;

    this.developedStickerTranslations = [];
    this.developedStickers = [];
    this.identityDevelopedMatrix = [];

    this.currentStickerTransforms = [];
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
          if (this.edgeCount==12) {
            orientationMatrix.rotateZ(90);
            orientationMatrix.rotateX(180);
          }
        }
      } else if (partIndices[i] < this.centerOffset) {//=> part is a side
        if (orientations[i] > 0) {
          // Base location of a side part is r. (= side part 0)
          if (this.sideCount==6) {
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
    // subclasses can override this methods
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
   * @return uv  Intersecton UV coordinates: 2D vector on the intersection plane.
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
   * @return uv  Intersecton UV coordinates: 2D vector on the intersection plane.
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
}

/**
 * This function computes sticker offsets for
 * a texture map which is structured as follows:
 * <pre>
 *   0 1 2 3 4 5 6 7 8
 *    +-----+
 * 0    |   |
 * 1    |  U  |
 * 2    |   |
 *  +-----+-----+-----+
 * 3|   |   |   |
 * 4|  L  |  F  |  R  |
 * 5|   |   |   |
 *  +-----+-----+-----+
 * 6    |   |   |
 * 7    |  D  |  B  |
 * 8    |   |   |
 *    +-----+-----+
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
  for (let y=0;y<layerCount;y++) {
    for (let x=0;x<layerCount;x++) {
    a[i++] = offx*layerCount+x;
    a[i++] = offy*layerCount+y;
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

