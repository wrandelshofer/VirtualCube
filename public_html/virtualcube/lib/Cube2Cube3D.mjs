/* @(#)Cube2Cube3D.mjs
 * Copyright (c) 2023 Werner Randelshofer, Switzerland. MIT License.
 */

import Cube3D from './Cube3D.mjs';
import Cube from './Cube.mjs';
import CubeAttributes from './CubeAttributes.mjs';
import SplineInterpolator from './SplineInterpolator.mjs';
import J3DI from './J3DI.mjs';
import J3DIMath from './J3DIMath.mjs';
import Node3D from './Node3D.mjs';


/** Constructor
 * Creates the 3D geometry of a Rubik's Cube.
 *  Subclasses must call initAbstractCube2Cube3D().
 */
class AbstractCube2Cube3D extends Cube3D.Cube3D {
  constructor(partSize) {
    super(2, partSize);

    this.textureScaleFactor=84/512;

    /*
     * Corners
     *       +---+---+---+
     *      ulb|4.0|   |2.0|ubr
     *       +---+   +---+
     *       |   1   |
     *       +---+   +---+
     *      ufl|6.0|   |0.0|urf
     * +---+---+---+---+---+---+---+---+---+---+---+---+
     * |4.1|   |6.2|6.1|   |0.2|0.1|   |2.2|2.1|   |4.2|
     * +---+   +---+---+   +---+---+   +---+---+   +---+
     * |   3   |   2   |   0   |   5   |
     * +---+   +---+---+   +---+---+   +---+---+   +---+
     * |5.2|   |7.1|7.2|   |1.1|1.2|   |3.1|3.2|   |5.1|
     * +---+---+---+---+---+---+---+---+---+---+---+---+
     *      dlf|7.0|   |1.0|dfr
     *       +---+   +---+
     *       |   4   |
     *       +---+   +---+
     *      dbl|5.0|   |3.0|drb
     *       +---+---+---+
     */
    let cornerOffset = this.cornerOffset;

    // Move all corner parts to up right front (= position of corner[0]).
    // nothing to do

    // Rotate the corner parts into place

    // 0:urf
    //--no transformation---
    // 1:dfr
    this.identityPartLocations[cornerOffset + 1].rotateZ(180);
    this.identityPartLocations[cornerOffset + 1].rotateY(90);
    // 2:ubr
    this.identityPartLocations[cornerOffset + 2].rotateY(270);
    // 3:drb
    this.identityPartLocations[cornerOffset + 3].rotateZ(180);
    this.identityPartLocations[cornerOffset + 3].rotateY(180);
    // 4:ulb
    this.identityPartLocations[cornerOffset + 4].rotateY(180);
    // 5:dbl
    this.identityPartLocations[cornerOffset + 5].rotateX(180);
    this.identityPartLocations[cornerOffset + 5].rotateY(90);
    // 6:ufl
    this.identityPartLocations[cornerOffset + 6].rotateY(90);
    // 7:dlf
    this.identityPartLocations[cornerOffset + 7].rotateZ(180);

    // Move all corner parts to up right front (urf)
    /*
    let ps= this.partSize;
    for (let i = 0; i < this.cornerCount; i++) {
         this.identityPartLocations[cornerOffset + i].translate(ps*0.5,ps*0.5,ps*-0.5);
    }*/

    // ----------------------------
    // Reset all rotations
    for (let i = 0; i < this.partCount; i++) {
      this.partLocations[i].matrix.load(this.identityPartLocations[i]);
    }


  }

  initAbstractCube2Cube3D_corner_r() {
    this.initCornerR();
    this.initAbstractCube2Cube3D_textureScales();
  }
  initAbstractCube2Cube3D_corner_f() {
    this.initCornerF();
    this.initAbstractCube2Cube3D_textureScales();
  }
  initAbstractCube2Cube3D_corner_u() {
    this.initCornerU();
    this.initAbstractCube2Cube3D_textureScales();
  }


  getPartIndexForStickerIndex(stickerIndex) {
    return stickerToPartMap[stickerIndex];
  }
  getStickerIndexForPartIndex(partIndex, orientationIndex) {
    return this.partToStickerMap[partIndex][orientationIndex];
  }

  initEdgeR() {
  }

  initEdgeU() {
  }
}




/** Maps stickers to cube parts.
 * <p>
 * Sticker indices:
 * <pre>
 *     +---+---+
 *    ulb|1,0|1,1|ubr
 *     +--- ---+
 *  ulb ufl|1,2|1,3|urf ubr ubr ubl
 * +---+---+---+---+---+---+---+---+
 * |3,0|3,1|2,0|2,1|0,0|0,1|5,0|5,1|
 * +--- ---+--- ---+--- ---+--- ---+
 * |3,2|3,3|2,2|2,3|0,2|0,3|5,2|5,3|
 * +---+---+---+---+---+---+---+---+
 *  dbl dlf|4,0|4,1|dfr drb drb dbl
 *     +--- ---+
 *    dbl|4,2|4,3|drb
 *     +---+---+
 * </pre>
 * Sticker indices absolute values:
 * <pre>
 *     +---+---+
 *    ulb| 4 | 5 |ubr
 *     +--- ---+
 *  ulb ufl| 6 | 7 |urf ubr ubr ubl
 * +---+---+---+---+---+---+---+---+
 * |12 |13 | 8 | 9 | 0 | 1 |20 |21 |
 * +--- ---+--- ---+--- ---+--- ---+
 * |14 |15 |10 |11 | 2 | 3 |22 |23 |
 * +---+---+---+---+---+---+---+---+
 *  dbl dlf|16 |17 |dfr drb drb dbl
 *     +--- ---+
 *    dbl|18 |19 |drb
 *     +---+---+
 * </pre>
 * <p>
 * Part indices:
 * <pre>
 *     +---+---+
 *    ulb|4.0|2.0|ubr
 *     +--- ---+
 *  ulb ufl|6.0|0.0|urf ubr ubr ubl
 * +---+---+---+---+---+---+---+---+
 * |4.1|6.2|6.1|0.2|0.1|2.2|2.1|4.2|
 * +--- ---+--- ---+--- ---+--- ---+
 * |5.2|7.1|7.2|1.1|1.2|3.1|3.2|5.1|
 * +---+---+---+---+---+---+---+---+
 *  dbl dlf|7.0|1.0|dfr drb drb dbl
 *     +--- ---+
 *    dbl|5.0|3.0|drb
 *     +---+---+
 * </pre>
 */
AbstractCube2Cube3D.prototype.stickerToPartMap = [
  0, 2, 1, 3, // right
  4, 2, 6, 0, // up
  6, 0, 7, 1, // front
  4, 6, 5, 7, // left
  7, 1, 5, 3, // down
  2, 4, 3, 5  // back
];

/** Maps parts to stickers. This is a two dimensional array. The first
 * dimension is the part index, the second dimension the orientation of
 * the part.
 * This map is filled in by the init method!!
 */
AbstractCube2Cube3D.prototype.partToStickerMap = null;

/**
 * Gets the face of the part which holds the indicated sticker.
 * The sticker index is interpreted according to this scheme:
 * <pre>
 *     +---+---+
 *    ulb|1,0|1,1|ubr
 *     +--- ---+
 *  ulb ufl|1,2|1,3|urf ubr ubr ubl
 * +---+---+---+---+---+---+---+---+
 * |3,0|3,1|2,0|2,1|0,0|0,1|5,0|5,1|
 * +--- ---+--- ---+--- ---+--- ---+
 * |3,2|3,3|2,2|2,3|0,2|0,3|5,2|5,3|
 * +---+---+---+---+---+---+---+---+
 *  dbl dlf|4,0|4,1|dfr drb drb dbl
 *     +--- ---+
 *    dbl|4,2|4,3|drb
 *     +---+---+
 * </pre>
 * The faces (or orientation of the parts) according to this scheme:
 * <pre>
 *     +---+---+
 *    ulb|4.0|2.0|ubr
 *     +--- ---+
 *  ulb ufl|6.0|0.0|urf ubr ubr ubl
 * +---+---+---+---+---+---+---+---+
 * |4.1|6.2|6.1|0.2|0.1|2.2|2.1|4.2|
 * +--- ---+--- ---+--- ---+--- ---+
 * |5.2|7.1|7.2|1.1|1.2|3.1|3.2|5.1|
 * +---+---+---+---+---+---+---+---+
 *  dbl dlf|7.0|1.0|dfr drb drb dbl
 *     +--- ---+
 *    dbl|5.0|3.0|drb
 *     +---+---+
 * </pre>
 */
AbstractCube2Cube3D.prototype.stickerToFaceMap = [
  1, 2, 2, 1, // right
  0, 0, 0, 0, // up
  1, 2, 2, 1, // front
  1, 2, 2, 1, // left
  0, 0, 0, 0, // down
  1, 2, 2, 1 // back
];

AbstractCube2Cube3D.prototype.boxClickToLocationMap = [
  [[7, 6], [5, 4]], // left
  [[7, 5], [1, 3]], // down
  [[7, 6], [1, 0]], // front
  [[1, 0], [3, 2]], // right
  [[6, 4], [0, 2]], // up
  [[5, 4], [3, 2]], // back
];

AbstractCube2Cube3D.prototype.boxClickToAxisMap = [
  [[0, 0], [0, 0]], // left
  [[1, 1], [1, 1]], // down
  [[2, 2], [2, 2]], // front
  [[0, 0], [0, 0]], // right
  [[1, 1], [1, 1]], // up
  [[2, 2], [2, 2]], // back
];
AbstractCube2Cube3D.prototype.boxClickToAngleMap = [
  [[-1, -1], [-1, -1]],
  [[-1, -1], [-1, -1]],
  [[1, 1], [1, 1]],
  [[1, 1], [1, 1]],
  [[1, 1], [1, 1]],
  [[-1, -1], [-1, -1]],
];
AbstractCube2Cube3D.prototype.boxClickToLayerMap = [
  [[1, 1], [1, 1]],
  [[1, 1], [1, 1]],
  [[2, 2], [2, 2]],
  [[2, 2], [2, 2]],
  [[2, 2], [2, 2]],
  [[1, 1], [1, 1]],
];
AbstractCube2Cube3D.prototype.boxSwipeToAxisMap = [
  [1, 2, 1, 2], // left
  [2, 0, 2, 0], // down
  [1, 0, 1, 0], // front
  [1, 2, 1, 2], // right
  [2, 0, 2, 0], // up
  [1, 0, 1, 0], // back
];
AbstractCube2Cube3D.prototype.boxSwipeToAngleMap = [
  [-1, -1, 1, 1], // left
  [1, 1, -1, -1], // down
  [1, -1, -1, 1], // front
  [1, 1, -1, -1], // right
  [-1, -1, 1, 1], // up
  [-1, 1, 1, -1], // back
];
/*
 * Maps [face][u][v][swipeDirection] to a layerMask.
 * Meaning of layerMask values:
 *  0 = no layers
 *  1 = layer 0
 *  2 = layer 1
 */
AbstractCube2Cube3D.prototype.boxSwipeToLayerMap = [
  [[[1, 2, 1, 2], [2, 2, 2, 2]],
   [[1, 1, 1, 1], [2, 1, 2, 1]]], // left
  [[[2, 1, 2, 1], [1, 1, 1, 1]],
   [[2, 2, 2, 2], [1, 2, 1, 2]]], // down
  [[[1, 1, 1, 1], [2, 1, 2, 1]],
   [[1, 2, 1, 2], [2, 2, 2, 2]]], // front
  [[[1, 2, 1, 2], [2, 2, 2, 2]],
   [[1, 1, 1, 1], [2, 1, 2, 1]]], // right
  [[[2, 1, 2, 1], [1, 1, 1, 1]],
   [[2, 2, 2, 2], [1, 2, 1, 2]]], // up
  [[[1, 1, 1, 1], [2, 1, 2, 1]],
   [[1, 2, 1, 2], [2, 2, 2, 2]]], // back
];
/**
 * The following properties may have different values depending on
 * the 3D model being used.
 * <pre>
 *   0 1 2 3 4 5
 *    +---+
 * 0  | U |
 * 1  |   |
 *  +---+---+---+
 * 2| L | F | R |
 * 3|   |   |   |
 *  +---+---+---+
 * 4  | D | B |
 * 5  |   |   |
 *    +---+---+
 * </pre>
 */
AbstractCube2Cube3D.prototype.stickerOffsets = Cube3D.computeStickerOffsets(2);

/** Constructor
 * Creates the 3D geometry of a "Pocket Cube".
 */
class Cube2Cube3D extends AbstractCube2Cube3D {
  constructor(partSize) {
    super(partSize);
  }
  loadGeometry() {
    super.loadGeometry();
    this.isDrawTwoPass=false;
  }

  getModelUrl() {
    return this.baseUrl+'/'+this.relativeUrl;
  }
}


function createCube3D(levelOfDetail) {
  let partSize;
  let relativeUrl;
  switch (levelOfDetail) {
  case 0: partSize=20;relativeUrl = 'models/pocketcube-0.obj'; break;
  default: partSize=20;relativeUrl = 'models/pocketcube-1.obj'; break;
  }
  const c = new Cube2Cube3D(partSize);
  c.baseUrl = 'lib/';
  c.relativeUrl = relativeUrl;
  return c;
}

// ------------------
// MODULE API
// ------------------
export default {
  AbstractCube2Cube3D: AbstractCube2Cube3D,
  createCube3D : createCube3D,
};
