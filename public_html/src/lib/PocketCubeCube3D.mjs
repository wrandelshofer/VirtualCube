/* @(#)PocketCubeCube3D.mjs
 * Copyright (c) 2018 Werner Randelshofer, Switzerland. MIT License.
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
 *  Subclasses must call initAbstractPocketCubeCube3D().
 */
class AbstractPocketCubeCube3D extends Cube3D.Cube3D {
  constructor(partSize) {
    super();

    this.partSize = partSize;
    this.cubeSize = partSize * 2;
    this.cornerCount = 8;
    this.edgeCount = 0;
    this.sideCount = 0;
    this.centerCount = 1;
    this.partCount = this.cornerCount + this.edgeCount + this.sideCount + this.centerCount;
    this.cornerOffset = 0;
    this.edgeOffset = 8;
    this.sideOffset = 8;
    this.centerOffset = 8;
    this.stickerCount = 4 * 6;

    this.cube = Cube.createCube(2);
    this.cube.addCubeListener(this);
    this.attributes = this.createAttributes();

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
      //this.currentDevelopedMatrix[i]=new J3DIMath.J3DIMatrix4();
      this.identityStickerLocations[i] = new J3DIMath.J3DIMatrix4();
    }

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
    this.identityPartLocations[cornerOffset + 1].rotate(180, 0, 0, 1);
    this.identityPartLocations[cornerOffset + 1].rotate(90, 0, 1, 0);
    // 2:ubr
    this.identityPartLocations[cornerOffset + 2].rotate(270, 0, 1, 0);
    // 3:drb
    this.identityPartLocations[cornerOffset + 3].rotate(180, 0, 0, 1);
    this.identityPartLocations[cornerOffset + 3].rotate(180, 0, 1, 0);
    // 4:ulb
    this.identityPartLocations[cornerOffset + 4].rotate(180, 0, 1, 0);
    // 5:dbl
    this.identityPartLocations[cornerOffset + 5].rotate(180, 1, 0, 0);
    this.identityPartLocations[cornerOffset + 5].rotate(90, 0, 1, 0);
    // 6:ufl
    this.identityPartLocations[cornerOffset + 6].rotate(90, 0, 1, 0);
    // 7:dlf
    this.identityPartLocations[cornerOffset + 7].rotate(180, 0, 0, 1);

    // ----------------------------
    // Reset all rotations
    for (let i = 0; i < this.partCount; i++) {
      this.partLocations[i].matrix.load(this.identityPartLocations[i]);
    }
  }

  loadGeometry() {
    // ----------------------------
    // Load geometry
    let self = this;
    let fRepaint = function () {
      self.repaint();
    };

    let modelUrl = this.getModelUrl();

    // parts
    this.centerObj = J3DI.loadObj(null, modelUrl + "center.obj", fRepaint);
    this.cornerObj = J3DI.loadObj(null, modelUrl + "corner.obj", fRepaint);

    // stickers
    this.stickerObjs = new Array(this.stickerCount);
    for (let i = 0; i < this.stickerObjs.length; i++) {
      this.stickerObjs[i] = new J3DI.J3DIObj();
    }
    this.corner_rObj = J3DI.loadObj(null, modelUrl + "corner_r.obj", function () {
      self.initAbstractPocketCubeCube3D_corner_r();
      self.repaint();
    });
    this.corner_uObj = J3DI.loadObj(null, modelUrl + "corner_u.obj", function () {
      self.initAbstractPocketCubeCube3D_corner_u();
      self.repaint();
    });
    this.corner_fObj = J3DI.loadObj(null, modelUrl + "corner_f.obj", function () {
      self.initAbstractPocketCubeCube3D_corner_f();
      self.repaint();
    });
  }

  validateAttributes() {
    if (!this.isAttributesValid) {
      this.isAttributesValid = true;

      for (let i = 0; i < this.stickerObjs.length; i++) {
        this.stickerObjs[i].hasTexture = this.attributes.stickersImageURL != null;
      }
    }
  }

  initAbstractPocketCubeCube3D_corner_r() {
    let s = this.corner_rObj;
    let s180 = new J3DI.J3DIObj();
    s180.setTo(s);
    s180.rotateTexture(180);

    this.stickerObjs[ this.partToStickerMap[0][1] ] = s.clone();
    this.stickerObjs[ this.partToStickerMap[1][1] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[2][1] ] = s.clone();
    this.stickerObjs[ this.partToStickerMap[3][1] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[4][1] ] = s.clone();
    this.stickerObjs[ this.partToStickerMap[5][1] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[6][1] ] = s.clone();
    this.stickerObjs[ this.partToStickerMap[7][1] ] = s180.clone();

    this.initAbstractPocketCubeCube3D_textureScales();
  }
  initAbstractPocketCubeCube3D_corner_f() {
    let s = this.corner_fObj;
    let s180 = new J3DI.J3DIObj();
    s180.setTo(s);
    s180.rotateTexture(180);

    this.stickerObjs[ this.partToStickerMap[0][2] ] = s.clone();
    this.stickerObjs[ this.partToStickerMap[1][2] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[2][2] ] = s.clone();
    this.stickerObjs[ this.partToStickerMap[3][2] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[4][2] ] = s.clone();
    this.stickerObjs[ this.partToStickerMap[5][2] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[6][2] ] = s.clone();
    this.stickerObjs[ this.partToStickerMap[7][2] ] = s180.clone();

    this.initAbstractPocketCubeCube3D_textureScales();
  }
  initAbstractPocketCubeCube3D_corner_u() {
    let s = this.corner_uObj;
    let s90 = new J3DI.J3DIObj();
    s90.setTo(s);
    s90.rotateTexture(90);
    let s180 = new J3DI.J3DIObj();
    s180.setTo(s);
    s180.rotateTexture(180);
    let s270 = new J3DI.J3DIObj();
    s270.setTo(s);
    s270.rotateTexture(270);

    this.stickerObjs[ this.partToStickerMap[0][0] ] = s.clone();
    this.stickerObjs[ this.partToStickerMap[1][0] ] = s90.clone();
    this.stickerObjs[ this.partToStickerMap[2][0] ] = s90.clone();
    this.stickerObjs[ this.partToStickerMap[3][0] ] = s.clone();
    this.stickerObjs[ this.partToStickerMap[4][0] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[5][0] ] = s270.clone();
    this.stickerObjs[ this.partToStickerMap[6][0] ] = s270.clone();
    this.stickerObjs[ this.partToStickerMap[7][0] ] = s180.clone();

    this.initAbstractPocketCubeCube3D_textureScales();
  }
  initAbstractPocketCubeCube3D_textureScales() {
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
      this.stickerObjs[i].textureScale = 84 / 512;
      this.stickerObjs[i].isTextureScaled = true;
    }

    this.isAttributesValid = false;
  }
  getPartIndexForStickerIndex(stickerIndex) {
    return stickerToPartMap[stickerIndex];
  }
  getStickerIndexForPartIndex(partIndex, orientationIndex) {
    return this.partToStickerMap[partIndex][orientationIndex];
  }
  /** Default cube attributes. */
  createAttributes() {
    let a = new CubeAttributes.CubeAttributes(this.partCount, 6 * 4, [4, 4, 4, 4, 4, 4]);
    let partsPhong = [0.5, 0.6, 0.4, 16.0];//shiny plastic [ambient, diffuse, specular, shininess]
    for (let i = 0; i < this.partCount; i++) {
      a.partsFillColor[i] = [40, 40, 40, 255];
      a.partsPhong[i] = partsPhong;
    }
    a.partsFillColor[this.centerOffset] = [240, 240, 240, 255];

    let faceColors = [
      [255, 210, 0, 255], // right: yellow
      [0, 51, 115, 255], // up   : blue
      [140, 0, 15, 255], // front: red
      [248, 248, 248, 255], // left : white
      [0, 115, 47, 255], // down : green
      [255, 70, 0, 255] // back : orange
    ];

    let stickersPhong = [0.8, 0.2, 0.1, 8.0];//shiny paper [ambient, diffuse, specular, shininess]

    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 4; j++) {
        a.stickersFillColor[i * 4 + j] = faceColors[i];
        a.stickersPhong[i * 4 + j] = stickersPhong;
      }
    }

    return a;
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
    this.fireStateChanged();
  }

  validateTwist(partIndices, locations, orientations, length, axis, angle, alpha) {
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
    for (let i = 0; i < length; i++) {
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
      }
      this.partOrientations[partIndices[i]].matrix.load(orientationMatrix);
      let transform = this.partLocations[partIndices[i]].matrix;
      transform.load(rotation);
      transform.multiply(this.identityPartLocations[locations[i]]);
    }
  }

  cubeTwisted(evt) {
    if (this.repainter == null) {
      this.updateCube();
      return;
    }

    let layerMask = evt.layerMask;
    let axis = evt.axis;
    let angle = evt.angle;
    let model = this.cube;

    let partIndices = new Array(this.partCount);
    let locations = new Array(this.partCount);
    let orientations = new Array(this.partCount);
    let count = 0;

    let affectedParts = evt.getAffectedLocations();
    count = affectedParts.length;
    locations = affectedParts.slice(0, count);
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
      if (!self.isTwisting===token) {
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
    this.repainter.repaint(f);
  }

  /* Immediately completes the current twisting animation. */
   finishTwisting() {
     this.isTwisting=null;
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
AbstractPocketCubeCube3D.prototype.stickerToPartMap = [
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
AbstractPocketCubeCube3D.prototype.partToStickerMap = null;

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
AbstractPocketCubeCube3D.prototype.stickerToFaceMap = [
  1, 2, 2, 1, // right
  0, 0, 0, 0, // up
  1, 2, 2, 1, // front
  1, 2, 2, 1, // left
  0, 0, 0, 0, // down
  1, 2, 2, 1 // back
];

AbstractPocketCubeCube3D.prototype.boxClickToLocationMap = [
  [[7, 6], [5, 4]], // left
  [[7, 5], [1, 3]], // down
  [[7, 6], [1, 0]], // front
  [[1, 0], [3, 2]], // right
  [[6, 4], [0, 2]], // up
  [[5, 4], [3, 2]], // back
];

AbstractPocketCubeCube3D.prototype.boxClickToAxisMap = [
  [[0, 0], [0, 0]], // left
  [[1, 1], [1, 1]], // down
  [[2, 2], [2, 2]], // front
  [[0, 0], [0, 0]], // right
  [[1, 1], [1, 1]], // up
  [[2, 2], [2, 2]], // back
];
AbstractPocketCubeCube3D.prototype.boxClickToAngleMap = [
  [[-1, -1], [-1, -1]],
  [[-1, -1], [-1, -1]],
  [[1, 1], [1, 1]],
  [[1, 1], [1, 1]],
  [[1, 1], [1, 1]],
  [[-1, -1], [-1, -1]],
];
AbstractPocketCubeCube3D.prototype.boxClickToLayerMap = [
  [[1, 1], [1, 1]],
  [[1, 1], [1, 1]],
  [[2, 2], [2, 2]],
  [[2, 2], [2, 2]],
  [[2, 2], [2, 2]],
  [[1, 1], [1, 1]],
];
AbstractPocketCubeCube3D.prototype.boxSwipeToAxisMap = [
  [1, 2, 1, 2], // left
  [2, 0, 2, 0], // down
  [1, 0, 1, 0], // front
  [1, 2, 1, 2], // right
  [2, 0, 2, 0], // up
  [1, 0, 1, 0], // back
];
AbstractPocketCubeCube3D.prototype.boxSwipeToAngleMap = [
  [-1, -1, 1, 1], // left
  [1, 1, -1, -1], // down
  [1, -1, -1, 1], // front
  [1, 1, -1, -1], // right
  [-1, -1, 1, 1], // up
  [-1, 1, 1, -1], // back
];
AbstractPocketCubeCube3D.prototype.boxSwipeToLayerMap = [
  [[[1, 2, 1, 2], [2, 2, 2, 2]], [[1, 1, 1, 1], [2, 1, 2, 1]]], // left
  [[[2, 1, 2, 1], [1, 1, 1, 1]], [[2, 2, 2, 2], [1, 2, 1, 2]]], // down
  [[[1, 1, 1, 1], [2, 1, 2, 1]], [[1, 2, 1, 2], [2, 2, 2, 2]]], // front
  [[[1, 2, 1, 2], [2, 2, 2, 2]], [[1, 1, 1, 1], [2, 1, 2, 1]]], // right
  [[[2, 1, 2, 1], [1, 1, 1, 1]], [[2, 2, 2, 2], [1, 2, 1, 2]]], // up
  [[[1, 1, 1, 1], [2, 1, 2, 1]], [[1, 2, 1, 2], [2, 2, 2, 2]]], // back
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
AbstractPocketCubeCube3D.prototype.stickerOffsets = Cube3D.computeStickerOffsets(2);

/** Constructor
 * Creates the 3D geometry of a "Pocket Cube".
 */
class PocketCubeCube3D extends AbstractPocketCubeCube3D {
  constructor(loadGeometry) {
  super(2.0);
  }
  loadGeometry() {
  super.loadGeometry();
  this.isDrawTwoPass=false;
  }

  getModelUrl() {
  return this.baseUrl+'/'+this.relativeUrl;
  }


  createAttributes() {
  let a=new CubeAttributes.CubeAttributes(this.partCount, 6*4, [4,4,4,4,4,4]);
  let partsPhong=[0.5,0.6,0.4,16.0];//shiny plastic [ambient, diffuse, specular, shininess]
  for (let i=0;i<this.partCount;i++) {
    a.partsFillColor[i]=[24,24,24,255];
    a.partsPhong[i]=partsPhong;
  }
  a.partsFillColor[this.centerOffset]=[240,240,240,255];

  let faceColors=[//Right, Up, Front, Left, Down, Back
    [255, 210, 0,255], // Yellow
    [0, 51, 115,255], // Blue
    [140, 0, 15,255], // Red
    [248, 248, 248,255], // White
    [0, 115, 47,255], // Green
    [255, 70, 0,255], // Orange
  ];

  let stickersPhong=[0.8,0.2,0.1,8.0];//shiny paper [ambient, diffuse, specular, shininess]

  let layerCount = this.cube.getLayerCount();
  let stickersPerFace = layerCount*layerCount;
  for (let i=0;i<6;i++) {
    for (let j=0;j<stickersPerFace;j++) {
    a.stickersFillColor[i*stickersPerFace+j]=faceColors[i];
    a.stickersPhong[i*stickersPerFace+j]=stickersPhong;
    }
  }

   return a;
  }
}


function createCube3D(levelOfDetail) {
  const c = new PocketCubeCube3D();
  c.baseUrl = 'lib/';
  switch (levelOfDetail) {
  case 1: c.relativeUrl = 'models/pocketcube-1/'; break; // low-res model that should not be taken apart
  case 2: c.relativeUrl = 'models/pocketcube-4/'; break; // med-res model that should not be taken apart
  case 3: c.relativeUrl = 'models/pocketcube-4/'; break; // high-res model that should not be taken apart
  case 4: c.relativeUrl = 'models/pocketcube-4/'; break; // low-res model that can be taken apart
  case 5: c.relativeUrl = 'models/pocketcube-4/'; break; // med-res model that can be taken apart
  default: c.relativeUrl = 'models/pocketcube-4/'; break; // high-res model that can be taken apart
  }
  return c;
}

// ------------------
// MODULE API
// ------------------
export default {
  AbstractPocketCubeCube3D: AbstractPocketCubeCube3D,
  createCube3D : createCube3D,
};
