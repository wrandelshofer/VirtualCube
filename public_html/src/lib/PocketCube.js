/*
 * @(#)PocketCube.js  1.0  2014-01-17
 * Copyright (c) 2014 Werner Randelshofer, Switzerland.
 * You may only use this software in accordance with the license terms.
 */
"use strict";

// --------------
// require.js
// --------------
define("PocketCube", ["Cube"],
function (Cube) {

  /**
   * Represents the state of a 2-times sliced cube (Pocket Cube) by the location 
   * and orientation of its parts.
   * <p>
   * A Pocket Cube has 8 corner parts.
   * The parts divide each face of the cube into 2 x 2 layers.
   * <p>
   * The following diagram shows the initial orientations and locations of 
   * the corner parts:
   * <pre>
   *         +---+---+
   *         |4.0|2.0|
   *         +--- ---+ 
   *  ulb ufl|6.0|0.0|urf ubr  
   * +---+---+---+---+---+---+---+---+
   * |4.1|6.2|6.1|0.2|0.1|2.2|2.1|4.2|
   * +--- ---+--- ---+--- ---+--- ---+
   * |5.2|7.1|7.2|1.1|1.2|3.1|3.2|5.1|
   * +---+---+---+---+---+---+---+---+
   *  dbl dlf|7.0|1.0|dfr drb
   *         +--- ---+
   *         |5.0|3.0|
   *         +---+---+
   * </pre>
   * <p>
   * For more information about the location and orientation of the parts see
   * {@link Cube}.
   * <p>
   * <b>Stickers</b>
   * <p>
   * The following diagram shows the arrangement of stickers on a Pocket Cube:
   * The number before the comma is the first dimension (faces), the number
   * after the comma is the second dimension (stickers).
   * <pre>
   *         +---+---+
   *      ulb|1,0|1,1|ubr
   *         +--- ---+ 
   *      ufl|1,2|1,3|urf
   * +---+---+---+---+---+---+---+---+
   * |3,0|3,1|2,0|2,1|0,0|0,1|5,0|5,1|
   * +--- ---+--- ---+--- ---+--- ---+
   * |3,2|3,3|2,2|2,3|0,2|0,3|5,2|5,3|
   * +---+---+---+---+---+---+---+---+
   *      dlf|4,0|4,1|dfr
   *         +--- ---+
   *      dbl|4,2|4,3|drb
   *         +---+---+
   * </pre>
   */


  /** Creates a new instance. */
  class PocketCube extends Cube.Cube {
    constructor() {
      super(2);
      this.reset();
    }

    /**
     * Returns the current layer mask on which the orientation of the part lies.
     * Returns 0 if no mask can be determined (the center part).
     */
    getPartLayerMask(part, orientation) {
      var face = this.getPartFace(part, orientation);
      if (part < this.cornerLoc.length) {
        // corner parts
        return (face < 3) ? 2 : 1;
      } else {
        // center part
        return 0;
      }
    }

    getPartSwipeAxis(part, orientation, swipeDirection) {
      if (part < this.cornerLoc.length) {
        // corner parts
        var loc = this.getCornerLocation(part);
        var ori = (3 - this.getPartOrientation(part) + orientation) % 3;
        return this.CORNER_SWIPE_TABLE[loc][ori][swipeDirection][0];
      } else {
        // center part
        return -1;
      }
    }

    getPartSwipeLayerMask(part, orientation, swipeDirection) {
      if (part < this.cornerLoc.length) {
        // corner parts
        var loc = this.getCornerLocation(part);
        var ori = (3 - this.getPartOrientation(part) + orientation) % 3;
        return this.CORNER_SWIPE_TABLE[loc][ori][swipeDirection][1];
      } else {
        // center part
        return 0;
      }
    }

    getPartSwipeAngle(part, orientation, swipeDirection) {
      if (part < this.cornerLoc.length) {
        // corner parts
        var loc = this.getCornerLocation(part);
        var ori = this.getPartOrientation(part);
        var sori = (3 - ori + orientation) % 3;
        var dir = swipeDirection;
        var angle = this.CORNER_SWIPE_TABLE[loc][sori][dir][2];
        if (ori == 2 && (sori == 0 || sori == 2)) {
          angle = -angle;
        } else if (ori == 1 && (sori == 1 || sori == 2)) {
          angle = -angle;
        }
        return angle;
      } else {
        // center part
        return 0;
      }
    }

    /**
     * Transforms the cube without firing an event.
     *
     * @param  axis  0=x, 1=y, 2=z axis.
     * @param  layerMask A bitmask specifying the layers to be transformed.
     *           The size of the layer mask depends on the value returned by
     *           <code>getLayerCount(axis)</code>. The layer mask has the
     *           following meaning:
     *           7=rotate the whole cube;<br>
     *           1=twist slice near the axis (left, down, back)<br>
     *           2=twist slice in the middle of the axis<br>
     *           4=twist slice far away from the axis (right, top, up)
     * @param  angle  positive values=clockwise rotation<br>
     *                negative values=counterclockwise rotation<br>
     *               1=90 degrees<br>
     *               2=180 degrees
     */
    transform0(axis, layerMask, angle) {
      if (this.DEBUG) {
        window.console.log("PocketCube#" + (this) + ".transform(ax=" + axis + ",msk=" + layerMask + ",ang:" + angle + ")");
      }
      {
        if (axis < 0 || axis > 2) {
          throw ("axis: " + axis);
        }

        if (layerMask < 0 || layerMask >= 1 << this.layerCount) {
          throw ("layerMask: " + layerMask);
        }

        if (angle < -2 || angle > 2) {
          throw ("angle: " + angle);
        }

        if (angle == 0) {
          return; // NOP
        }

        // Convert angle -2 to 2 to simplify the switch statements
        var an = (angle == -2) ? 2 : angle;

        if ((layerMask & 1) != 0) {
          // twist at left, bottom, back
          switch (axis) {
            case 0: // x
              switch (an) {
                case - 1:
                  this.twistL();
                  break;
                case 1:
                  this.twistL();
                  this.twistL();
                  this.twistL();
                  break;
                case 2:
                  this.twistL();
                  this.twistL();
                  break;
              }
              break;
            case 1: // y
              switch (an) {
                case - 1:
                  this.twistD();
                  break;
                case 1:
                  this.twistD();
                  this.twistD();
                  this.twistD();
                  break;
                case 2:
                  this.twistD();
                  this.twistD();
                  break;
              }
              break;
            case 2: // z
            switch (an) {
              case - 1:
                this.twistB();
                break;
              case 1:
                this.twistB();
                this.twistB();
                this.twistB();
                break;
              case 2:
                this.twistB();
                this.twistB();
                break;
            }
          }
        }

        if ((layerMask & 2) != 0) {
          // twist at right, top, front
          switch (axis) {
            case 0: // x
              switch (an) {
                case 1:
                  this.twistR();
                  break;
                case - 1:
                  this.twistR();
                  this.twistR();
                  this.twistR();
                  break;
                case 2:
                  this.twistR();
                  this.twistR();
                  break;
              }
              break;
            case 1: // y
              switch (an) {
                case 1:
                  this.twistU();
                  break;
                case - 1:
                  this.twistU();
                  this.twistU();
                  this.twistU();
                  break;
                case 2:
                  this.twistU();
                  this.twistU();
                  break;
              }
              break;
            case 2: // z
            switch (an) {
              case 1:
                this.twistF();
                break;
              case - 1:
                this.twistF();
                this.twistF();
                this.twistF();
                break;
              case 2:
                this.twistF();
                this.twistF();
                break;
            }
          }
        }
      }
    }
    /**
     * R.
     * <pre>
     *             +---+---+---+
     *             |   |   |2.0|
     *             +---     ---+
     *             |     1     |
     *             +---     ---+
     *             |   |   |0.0|
     * +---+---+---+---+---+---+---+---+---+---+---+---+
     * |   |   |   |   |   |0.2|0.1|   |2.2|2.1|   |   |
     * +---     ---+---     ---+---    +---+---     ---+
     * |     3     |     2     |     0     |     5     |
     * +---     ---+---     ---+---    +---+---     ---+
     * |   |   |   |   |   |1.1|1.2|   |3.1|3.2|   |   |
     * +---+---+---+---+---+---+---+---+---+---+---+---+
     *             |   |   |1.0|
     *             +---     ---+
     *             |     4     |
     *             +---     ---+
     *             |   |   |3.0|
     *             +---+---+---+
     * </pre>
     */
    twistR() {
      this.fourCycle(this.cornerLoc, 0, 1, 3, 2, this.cornerOrient, 1, 2, 1, 2, 3);
    }

    /**
     * U.
     * <pre>
     *             +---+---+---+
     *             |4.0|   |2.0|
     *             +---     ---+
     *             |     1     |
     *             +---     ---+
     *             |6.0|   |0.0|
     * +---+---+---+---+---+---+---+---+---+---+---+---+
     * |4.1|   |6.2|6.1|   |0.2|0.1|   |2.2|2.1|   |4.2|
     * +---     ---+---     ---+---    +---+---     ---+
     * |     3     |     2     |     0     |     5     |
     * +---     ---+---     ---+---    +---+---     ---+
     * |   |   |   |   |   |   |   |   |   |   |   |   |
     * +---+---+---+---+---+---+---+---+---+---+---+---+
     *             |   |   |   |
     *             +---     ---+
     *             |     4     |
     *             +---     ---+
     *             |   |   |   |
     *             +---+---+---+
     * </pre>
     */
    twistU() {
      this.fourCycle(this.cornerLoc, 0, 2, 4, 6, this.cornerOrient, 0, 0, 0, 0, 3);
    }

    /**
     * F.
     * <pre>
     *             +---+---+---+
     *             |   |   |   |
     *             +---     ---+
     *             |     1     |
     *             +---     ---+
     *             |6.0|   |0.0|
     * +---+---+---+---+---+---+---+---+---+---+---+---+
     * |   |   |6.2|6.1|   |0.2|0.1|   |   |   |   |   |
     * +---     ---+---     ---+---    +---+---     ---+
     * |     3     |     2     |     0     |     5     |
     * +---     ---+---     ---+---    +---+---     ---+
     * |   |   |7.1|7.2|   |1.1|1.2|   |   |   |   |   |
     * +---+---+---+---+---+---+---+---+---+---+---+---+
     *             |7.0|   |1.0|
     *             +---     ---+
     *             |     4     |
     *             +---     ---+
     *             |   |   |   |
     *             +---+---+---+
     * </pre>
     */
    twistF() {
      this.fourCycle(this.cornerLoc, 6, 7, 1, 0, this.cornerOrient, 1, 2, 1, 2, 3);
    }

    /**
     * L.
     * <pre>
     *             +---+---+---+
     *             |4.0|   |   |
     *             +---     ---+
     *             |     1     |
     *             +---     ---+
     *             |6.0|   |   |
     * +---+---+---+---+---+---+---+---+---+---+---+---+
     * |4.1|   |6.2|6.1|   |   |   |   |   |   |   |4.2|
     * +---     ---+---     ---+---    +---+---     ---+
     * |     3     |     2     |     0     |     5     |
     * +---     ---+---     ---+---    +---+---     ---+
     * |5.2|   |7.1|7.2|   |   |   |   |   |   |   |5.1|
     * +---+---+---+---+---+---+---+---+---+---+---+---+
     *             |7.0|   |   |
     *             +---     ---+
     *             |     4     |
     *             +---     ---+
     *             |5.0|   |   |
     *             +---+---+---+
     * </pre>
     */
    twistL() {
      this.fourCycle(this.cornerLoc, 6, 4, 5, 7, this.cornerOrient, 2, 1, 2, 1, 3);
    }

    /**
     * D.
     * <pre>
     *             +---+---+---+
     *             |   |   |   |
     *             +---     ---+
     *             |     1     |
     *             +---     ---+
     *             |   |   |   |
     * +---+---+---+---+---+---+---+---+---+---+---+---+
     * |   |   |   |   |   |   |   |   |   |   |   |   |
     * +---     ---+---     ---+---    +---+---     ---+
     * |     3     |     2     |     0     |     5     |
     * +---     ---+---     ---+---    +---+---     ---+
     * |5.2|   |7.1|7.2|   |1.1|1.2|   |3.1|3.2|   |5.1|
     * +---+---+---+---+---+---+---+---+---+---+---+---+
     *             |7.0|   |1.0|
     *             +---     ---+
     *             |     4     |
     *             +---     ---+
     *             |5.0|   |3.0|
     *             +---+---+---+
     * </pre>
     */
    twistD() {
      this.fourCycle(this.cornerLoc, 7, 5, 3, 1, this.cornerOrient, 0, 0, 0, 0, 3);
    }

    /**
     * B.
     * <pre>
     *             +---+---+---+
     *             |4.0|   |2.0|
     *             +---     ---+
     *             |     1     |
     *             +---     ---+
     *             |   |   |   |
     * +---+---+---+---+---+---+---+---+---+---+---+---+
     * |4.1|   |   |   |   |   |   |   |2.2|2.1|   |4.2|
     * +---     ---+---     ---+---    +---+---     ---+
     * |     3     |     2     |     0     |     5     |
     * +---     ---+---     ---+---    +---+---     ---+
     * |5.2|   |   |   |   |   |   |   |3.1|3.2|   |5.1|
     * +---+---+---+---+---+---+---+---+---+---+---+---+
     *             |   |   |   |
     *             +---     ---+
     *             |     4     |
     *             +---     ---+
     *             |5.0|   |3.0|
     *             +---+---+---+
     * </pre>
     */
    twistB() {
      this.fourCycle(this.cornerLoc, 2, 3, 5, 4, this.cornerOrient, 1, 2, 1, 2, 3);
    }

    /**
     * Returns an array of stickers which reflect the current state of the cube.
     * <p>
     * The following diagram shows the indices of the array. The number before
     * the comma is the first dimension (faces), the number after the comma
     * is the second dimension (stickers).
     * <p>
     * The values of the array elements is the face index: 0..5.
     * <pre>
     *         +---+---+
     *      ulb|1,0|1,1|ubr
     *         +--- ---+ 
     *      ufl|1,2|1,3|urf
     * +---+---+---+---+---+---+---+---+
     * |3,0|3,1|2,0|2,1|0,0|0,1|5,0|5,1|
     * +--- ---+--- ---+--- ---+--- ---+
     * |3,2|3,3|2,2|2,3|0,2|0,3|5,2|5,3|
     * +---+---+---+---+---+---+---+---+
     *      dlf|4,0|4,1|dfr
     *         +--- ---+
     *      dbl|4,2|4,3|drb
     *         +---+---+
     * </pre>
     * @return A two dimensional array. First dimension: faces.
     * Second dimension: sticker index on the faces.
     */
    toStickers() {
      throw "Not supported yet.";
    }

    /**
     * Sets the cube to a state where the faces of the parts map to the provided
     * stickers array.
     *
     * @see #toStickers
     *
     * @param stickers An array of dimensions [6][9] containing sticker values
     *                 in the range [0,5] for the six faces right, up, front,
     *                 left, down, back.
     */
    setToStickers(stickers) {
      throw "Not supported yet.";
    }

    clone() {
      var that = new PocketCube();
      that.setTo(this);
      return that;
    }
  }

  /**
   * Set this variable to true to get debug output when the cube is transformed.
   */
  PocketCube.prototype.DEBUG = false;
  /**
   * Holds the number of side parts, which is 0.
   */
  PocketCube.prototype.NUMBER_OF_SIDE_PARTS = 0;
  /**
   * Holds the number of edge parts, which is 0.
   */
  PocketCube.prototype.NUMBER_OF_EDGE_PARTS = 0;
  /**
   * This is used for mapping side part locations
   * to/from sticker positions on the cube.
   *
   * @see #toStickers
   */
  PocketCube.prototype.SIDE_TRANSLATION = [];
  /**
   * This is used for mapping edge part locations and orientations
   * to/from sticker positions on the cube.
   * <p>
   * Description:<br>
   * edge orientation 0: face index, sticker index.
   * edge orientation 1: face index, sticker index.
   *
   * @see #toStickers
   */
  PocketCube.prototype.EDGE_TRANSLATION = [];
  /**
   * This is used for mapping corner part locations and orientations
   * to/from sticker positions on the cube.
   * <p>
   * Description:<br>
   * corner orientation 0, face index, 
   * corner orientation 1, face index, 
   * corner orientation 2, face index
   *
   * @see #toStickers
   */
  PocketCube.prototype.CORNER_TRANSLATION = [
    [1, 3, 0, 0, 2, 1], // 0 urf 
    [4, 1, 2, 3, 0, 2], // 1 dfr
    [1, 1, 5, 0, 0, 1], // 2 ubr
    [4, 3, 0, 3, 5, 3], // 3 drb
    [1, 0, 3, 0, 5, 1], // 4 ulb
    [4, 2, 5, 3, 3, 2], // 5 dbl
    [1, 2, 2, 0, 3, 1], // 6 ufl
    [4, 0, 3, 3, 2, 2] // 7 dlf
  ];
  /**
   * First dimension: edge part index.
   * Second dimension: orientation.
   * Third dimension: swipe direction
   * Fourth dimension: axis,layermask,angle
   */
  PocketCube.prototype.EDGE_SWIPE_TABLE = [];
  /** Side swipe table.
   * First dimension: side part index.
   * Second dimension: swipe direction
   * Third dimension: axis,layermask,angle
   */
  PocketCube.prototype.SIDE_SWIPE_TABLE = [];

// Construct the name to part map.
  let cornerParts = ["urf", "dfr", "ubr", "drb", "ulb", "dbl", "ufl", "dlf"]
  let partMap = {center: 8};
  for (let i = 0; i < cornerParts.length; i++) {
    let name = cornerParts[i];
    let key1 = name.charAt(0) + name.charAt(1) + name.charAt(2);
    let key2 = name.charAt(0) + name.charAt(2) + name.charAt(1);
    let key3 = name.charAt(1) + name.charAt(0) + name.charAt(2);
    let key4 = name.charAt(1) + name.charAt(2) + name.charAt(0);
    let key5 = name.charAt(2) + name.charAt(0) + name.charAt(1);
    let key6 = name.charAt(2) + name.charAt(1) + name.charAt(0);
    partMap[key1] = i;
    partMap[key2] = i;
    partMap[key3] = i;
    partMap[key4] = i;
    partMap[key5] = i;
    partMap[key6] = i;
  }
  /**
   * Maps the name of a part to its part index.
   */
  PocketCube.prototype.NAME_PART_MAP = partMap;

// ------------------
// MODULE API    
// ------------------
  return {
    PocketCube: PocketCube,
    newPocketCube: function () {
      return new PocketCube();
    }
  };
});
