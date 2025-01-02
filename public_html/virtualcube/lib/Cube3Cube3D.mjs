/* @(#)Cube3Cube3D.mjs
 * Copyright (c) 2023 Werner Randelshofer, Switzerland. MIT License.
 */

import Cube3D from './Cube3D.mjs';
import Cube from './Cube.mjs';
import CubeAttributes from './CubeAttributes.mjs';
import SplineInterpolator from './SplineInterpolator.mjs';
import J3DI from './J3DI.mjs';
import J3DIMath from './J3DIMath.mjs';
import Node3D from './Node3D.mjs';


let module = {
  log: (false) ? console.log : () => {
  },
  info: (true) ? console.info : () => {
  },
  warning: (true) ? console.warning : () => {
  },
  error: (true) ? console.error : () => {
  }
}

/** Constructor
 * Creates the 3D geometry of a Rubik's Cube.
 *  Subclasses must call initAbstractCube3Cube3D().
 */
class AbstractCube3Cube3D extends Cube3D.Cube3D {
  constructor(partSize) {
  super(3,partSize);

  // rotate corners into place
  let o = this.cornerOffset;

  // 0:urf
  //--no transformation---
  // 1:dfr
  this.identityPartLocations[o + 1].rotateZ(180);
  this.identityPartLocations[o + 1].rotateY(90);
  // 2:ubr
  this.identityPartLocations[o + 2].rotateY(270);
  // 3:drb
  this.identityPartLocations[o + 3].rotateZ(180);
  this.identityPartLocations[o + 3].rotateY(180);
  // 4:ulb
  this.identityPartLocations[o + 4].rotateY(180);
  // 5:dbl
  this.identityPartLocations[o + 5].rotateX(180);
  this.identityPartLocations[o + 5].rotateY(90);
  // 6:ufl
  this.identityPartLocations[o + 6].rotateY(90);
  // 7:dlf
  this.identityPartLocations[o + 7].rotateZ(180);

  //
  o = this.edgeOffset;

  // Move all edge parts to up right (ur)
  // nothing to do

  // Rotate edge parts into place
  // ur
  //--no transformation--
  // rf
  this.identityPartLocations[o + 1].rotateZ(-90);
  this.identityPartLocations[o + 1].rotateY(90);
  // dr
  this.identityPartLocations[o + 2].rotateX(180);
  // bu
  this.identityPartLocations[o + 3].rotateZ(90);
  this.identityPartLocations[o + 3].rotateX(90);
  // rb
  this.identityPartLocations[o + 4].rotateZ(-90);
  this.identityPartLocations[o + 4].rotateY(-90);
  // bd
  this.identityPartLocations[o + 5].rotateX(90);
  this.identityPartLocations[o + 5].rotateY(-90);
  // ul
  this.identityPartLocations[o + 6].rotateY(180);
  // lb
  this.identityPartLocations[o + 7].rotateZ(90);
  this.identityPartLocations[o + 7].rotateY(-90);
  // dl
  this.identityPartLocations[o + 8].rotateY(180);
  this.identityPartLocations[o + 8].rotateX(180);
  // fu
  this.identityPartLocations[o + 9].rotateX(-90);
  this.identityPartLocations[o + 9].rotateY(-90);
  // lf
  this.identityPartLocations[o + 10].rotateY(90);
  this.identityPartLocations[o + 10].rotateX(-90);
  // fd
  this.identityPartLocations[o + 11].rotateZ(-90);
  this.identityPartLocations[o + 11].rotateX(-90);

  o = this.sideOffset;

  // Move all side parts to right (= position of side[0]
  // nothing to do

  // Rotate the side parts into place
  // r
  // --no transformation--
  // u
  this.identityPartLocations[o + 1].rotate(90, 0, 0, 1);
  this.identityPartLocations[o + 1].rotate(-90, 1, 0, 0);
  // f
  this.identityPartLocations[o + 2].rotate(90, 0, 1, 0);
  this.identityPartLocations[o + 2].rotate(90, 1, 0, 0);
  // l
  this.identityPartLocations[o + 3].rotate(180, 0, 1, 0);
  this.identityPartLocations[o + 3].rotate(-90, 1, 0, 0);
  // d
  this.identityPartLocations[o + 4].rotate(90, 0, 0, -1);
  this.identityPartLocations[o + 4].rotate(180, 1, 0, 0);
  // b
  this.identityPartLocations[o + 5].rotate(90, 0, -1, 0);
  this.identityPartLocations[o + 5].rotate(180, 1, 0, 0);
  }

  getPartIndexForStickerIndex(stickerIndex) {
    return this.stickerToPartMap[stickerIndex];
  }

  getPartOrientationForStickerIndex(stickerIndex) {
    return this.stickerToFaceMap[stickerIndex];
  }
  getStickerIndexForPartIndex(partIndex, orientation) {
    return this.partToStickerMap[partIndex][orientation];
  }

  initEdgeR() {
    this.initMiddleEdgeR();
  }

  initEdgeU() {
    this.initMiddleEdgeU();
  }
}

/**
 * Maps stickers to cube parts.
 * <p>
 * Sticker indices:
 * <pre>
 *       +---+---+---+
 *       |1,0|1,1|1,2|
 *       +--- --- ---+
 *       |1,3|1,4|1,5|
 *       +--- --- ---+
 *       |1,6|1,7|1,8|
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 * |3,0|3,1|3,2|2,0|2,1|2,2|0,0|0,1|0,2|5,0|5,1|5,2|
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |3,3|3,4|3,5|2,3|2,4|2,5|0,3|0,4|0,5|5,3|5,4|5,5|
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |3,6|3,7|3,8|2,6|2,7|2,8|0,6|0,7|0,8|5,6|5,7|5,8|
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 *       |4,0|4,1|4,2|
 *       +--- --- ---+
 *       |4,3|4,4|4,5|
 *       +--- --- ---+
 *       |4,6|4,7|4,8|
 *       +---+---+---+
 * </pre>
 * Sticker indices absolute values:
 * <pre>
 *       +---+---+---+
 *       | 9 |10 |11 |
 *       +--- --- ---+
 *       |12 |13 |14 |
 *       +--- --- ---+
 *       |15 |16 |17 |
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 * |27 |28 |29 |18 |19 |20 | 0 | 1 | 2 |45 |46 |47 |
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |30 |31 |32 |21 |22 |23 | 3 | 4 | 5 |48 |49 |50 |
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |33 |34 |35 |24 |25 |26 | 6 | 7 | 8 |51 |52 |53 |
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 *       |36 |37 |38 |
 *       +--- --- ---+
 *       |39 |40 |41 |
 *       +--- --- ---+
 *       |42 |43 |44 |
 *       +---+---+---+
 * </pre>
 * <p>
 * Part indices:
 * <pre>
 *        +----+----+----+
 *        | 4.0|11.1| 2.0|
 *        +----    ----+
 *        |14.0 21  8.0|
 *        +----    ----+
 *        | 6.0|17.1| 0.0|
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 * | 4.1|14.1| 6.2| 6.1|17.0| 0.2| 0.1| 8.1| 2.2| 2.1|11.0| 4.2|
 * +----    ----+----    ----+----    ----+----    ----+
 * |15.0 23   18.0|18   22  9.1| 9.0 20   12.0|12   25   15.1|
 * +----    ----+----    ----+----    ----+----    ----+
 * | 5.2|16.1| 7.1| 7.2|19.0| 1.1| 1.2|10.1| 3.1| 3.2|13.0| 5.1|
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 *        | 7.0|19.1| 1.0|
 *        +----    ----+
 *        |16.0 24   10.0|
 *        +----    ----+
 *        |5.0 |13.1| 3.0|
 *        +----+----+----+
 * </pre>
 */
AbstractCube3Cube3D.prototype.stickerToPartMap = [
  0, 8, 2,/**/ 9, 20, 12,/**/ 1, 10, 3, // right
  4, 11, 2,/**/ 14, 21, 8,/**/ 6, 17, 0, // up
  6, 17, 0,/**/ 18, 22, 9,/**/ 7, 19, 1, // front
  4, 14, 6,/**/ 15, 23, 18,/**/ 5, 16, 7, // left
  7, 19, 1,/**/ 16, 24, 10,/**/ 5, 13, 3, // down
  2, 11, 4,/**/ 12, 25, 15,/**/ 3, 13, 5  // back
];

/** Maps parts to stickers. This is a two dimensional array. The first
 * dimension is the part index, the second dimension the orientation of
 * the part.
 * This map is filled in by the init method!!
 */
AbstractCube3Cube3D.prototype.partToStickerMap = null;

/**
 * Gets the face of the part which holds the indicated sticker.
 * The sticker index is interpreted according to this scheme:
 * <pre>
 *       +---+---+---+
 *       |1,0|1,1|1,2|
 *       +--- --- ---+
 *       |1,3|1,4|1,5|
 *       +--- --- ---+
 *       |1,6|1,7|1,8|
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 * |3,0|3,1|3,2|2,0|2,1|2,2|0,0|0,1|0,2|5,0|5,1|5,2|
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |3,3|3,4|3,5|2,3|2,4|2,5|0,3|0,4|0,5|5,3|5,4|5,5|
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |3,6|3,7|3,8|2,6|2,7|2,8|0,6|0,7|0,8|5,6|5,7|5,8|
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 *       |4,0|4,1|4,2|
 *       +--- --- ---+
 *       |4,3|4,4|4,5|
 *       +--- --- ---+
 *       |4,6|4,7|4,8|
 *       +---+---+---+
 * </pre>
 * The faces (or orientation of the parts) according to this scheme:
 * <pre>
 *        +----+----+----+
 *        | 4.0|11.1| 2.0|
 *        +----    ----+
 *        |14.0 21  8.0|
 *        +----    ----+
 *        | 6.0|17.1| 0.0|
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 * | 4.1|14.1| 6.2| 6.1|17.0| 0.2| 0.1| 8.1| 2.2| 2.1|11.0| 4.2|
 * +----    ----+----    ----+----    ----+----    ----+
 * |15.0 23   18.0|18.1 22  9.1| 9.0 20   12.0|12.1 25   15.1|
 * +----    ----+----    ----+----    ----+----    ----+
 * | 5.2|16.1| 7.1| 7.2|19.0| 1.1| 1.2|10.1| 3.1| 3.2|13.0| 5.1|
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 *        | 7.0|19.1| 1.0|
 *        +----    ----+
 *        |16.0 24   10.0|
 *        +----    ----+
 *        |5.0 |13.1| 3.0|
 *        +----+----+----+
 * </pre>
 */
AbstractCube3Cube3D.prototype.stickerToFaceMap = [
  1, 1, 2,/**/ 0, 0, 0,/**/ 2, 1, 1, // right
  0, 1, 0,/**/ 0, 0, 0,/**/ 0, 1, 0, // up
  1, 0, 2,/**/ 1, 0, 1,/**/ 2, 0, 1, // front
  1, 1, 2,/**/ 0, 0, 0,/**/ 2, 1, 1, // left
  0, 1, 0,/**/ 0, 0, 0,/**/ 0, 1, 0, // down
  1, 0, 2,/**/ 1, 0, 1,/**/ 2, 0, 1 // back
];

AbstractCube3Cube3D.prototype.boxClickToLocationMap = [
  [[7, 10 + 8, 6], [8 + 8, 3 + 8 + 12, 6 + 8], [5, 7 + 8, 4]], // left
  [[7, 8 + 8, 5], [11 + 8, 4 + 8 + 12, 5 + 8], [1, 2 + 8, 3]], // down
  [[7, 10 + 8, 6], [11 + 8, 2 + 8 + 12, 9 + 8], [1, 1 + 8, 0]], // front
  [[1, 1 + 8, 0], [2 + 8, 0 + 8 + 12, 0 + 8], [3, 4 + 8, 2]], // right ←
  [[6, 6 + 8, 4], [9 + 8, 1 + 8 + 12, 3 + 8], [0, 0 + 8, 2]], // up
  [[5, 7 + 8, 4], [5 + 8, 5 + 8 + 12, 3 + 8], [3, 4 + 8, 2]], // back
];
AbstractCube3Cube3D.prototype.boxClickToAxisMap = [
  [[0, 1, 0], [2, 0, 2], [0, 1, 0]], // left
  [[1, 2, 1], [0, 1, 0], [1, 2, 1]], // down
  [[2, 1, 2], [0, 2, 0], [2, 1, 2]], // front
  [[0, 1, 0], [2, 0, 2], [0, 1, 0]], // right
  [[1, 2, 1], [0, 1, 0], [1, 2, 1]], // up
  [[2, 1, 2], [0, 2, 0], [2, 1, 2]], // back
];
AbstractCube3Cube3D.prototype.boxClickToAngleMap = [
  [[-1, -1, -1], [-1, -1, 1], [-1, 1, -1]],
  [[-1, 1, -1], [1, -1, -1], [-1, -1, -1]],
  [[1, 1, 1], [-1, 1, 1], [1, -1, 1]],
  [[1, 1, 1], [1, 1, -1], [1, -1, 1]],
  [[1, -1, 1], [-1, 1, 1], [1, 1, 1]],
  [[-1, -1, -1], [1, -1, -1], [-1, 1, -1]],
];
AbstractCube3Cube3D.prototype.boxClickToLayerMap = [
  [[1, 2, 1], [2, 1, 2], [1, 2, 1]],
  [[1, 2, 1], [2, 1, 2], [1, 2, 1]],
  [[4, 2, 4], [2, 4, 2], [4, 2, 4]],
  [[4, 2, 4], [2, 4, 2], [4, 2, 4]],
  [[4, 2, 4], [2, 4, 2], [4, 2, 4]],
  [[1, 2, 1], [2, 1, 2], [1, 2, 1]],
];
AbstractCube3Cube3D.prototype.boxSwipeToAxisMap = [
  [1, 2, 1, 2], // left
  [2, 0, 2, 0], // down
  [1, 0, 1, 0], // front
  [1, 2, 1, 2], // right
  [2, 0, 2, 0], // up
  [1, 0, 1, 0], // back
];
AbstractCube3Cube3D.prototype.boxSwipeToAngleMap = [
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
 *  4 = layer 2
 */
AbstractCube3Cube3D.prototype.boxSwipeToLayerMap = [
  [[[1, 4, 1, 4], [2, 4, 2, 4], [4, 4, 4, 4]],
   [[1, 2, 1, 2], [2, 2, 2, 2], [4, 2, 4, 2]],
   [[1, 1, 1, 1], [2, 1, 2, 1], [4, 1, 4, 1]]], // left
  [[[4, 1, 4, 1], [2, 1, 2, 1], [1, 1, 1, 1]],
   [[4, 2, 4, 2], [2, 2, 2, 2], [1, 2, 1, 2]],
   [[4, 4, 4, 4], [2, 4, 2, 4], [1, 4, 1, 4]]], // down
  [[[1, 1, 1, 1], [2, 1, 2, 1], [4, 1, 4, 1]],
   [[1, 2, 1, 2], [2, 2, 2, 2], [4, 2, 4, 2]],
   [[1, 4, 1, 4], [2, 4, 2, 4], [4, 4, 4, 4]]], // front
  [[[1, 4, 1, 4], [2, 4, 2, 4], [4, 4, 4, 4]],
   [[1, 2, 1, 2], [2, 2, 2, 2], [4, 2, 4, 2]],
   [[1, 1, 1, 1], [2, 1, 2, 1], [4, 1, 4, 1]]], // right
  [[[4, 1, 4, 1], [2, 1, 2, 1], [1, 1, 1, 1]],
   [[4, 2, 4, 2], [2, 2, 2, 2], [1, 2, 1, 2]],
    [[4, 4, 4, 4], [2, 4, 2, 4], [1, 4, 1, 4]]], // up
  [[[1, 1, 1, 1], [2, 1, 2, 1], [4, 1, 4, 1]],
   [[1, 2, 1, 2], [2, 2, 2, 2], [4, 2, 4, 2]],
   [[1, 4, 1, 4], [2, 4, 2, 4], [4, 4, 4, 4]]], // back
];
/**
 * The following properties may have different values depending on
 * the 3D model being used.
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
 */
AbstractCube3Cube3D.prototype.stickerOffsets = Cube3D.computeStickerOffsets(3);

// ------------------
class Cube3Cube3D extends AbstractCube3Cube3D {
  /** Constructor
   * Creates the 3D geometry of a "Rubik's Cube".
   * You must call loadGeometry() after constructing a new instance.
   */
  constructor(partSize) {
    super(partSize);
  }

  getModelUrl() {
    return this.baseUrl + '/' + this.relativeUrl;
  }
}

// ------------------
function createCube3D(levelOfDetail) {
  let partSize;
  let relativeUrl;
  switch (levelOfDetail) {
  case 0: partSize=18; relativeUrl = 'models/rubikscube-0.obj'; break;
  case 1: partSize=18; relativeUrl = 'models/rubikscube-1.obj'; break;
  case 2: partSize=18; relativeUrl = 'models/rubikscube-2.obj'; break;
  case 3: partSize=18; relativeUrl = 'models/rubikscube-3.obj'; break;
  default: partSize=18; relativeUrl = 'models/rubikscube-2.obj'; break;
  }

  const c = new Cube3Cube3D(partSize);
  c.baseUrl = 'lib/';
  c.relativeUrl = relativeUrl;
  return c;
}
// ------------------
// MODULE API
// ------------------
export default {
  AbstractCube3Cube3D: AbstractCube3Cube3D,
  createCube3D: createCube3D,
};

