/*
 * @(#)RubiksCube.js  1.0.2  2014-01-17
 *
 * Copyright (c) 2011-2014 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

// --------------
// require.js
// --------------
define("RubiksCube", ["Cube"],
function (Cube) {

  /**
   * Represents the state of a 3-times sliced cube (Rubik's Cube) by the location 
   * and orientation of its parts.
   * <p>
   * A Rubik's Cube has 8 corner parts, 12 edge parts, 6 face parts and one
   * center part. The parts divide each face of the cube into 3 x 3 layers.
   * <p>
   * <b>Corner parts</b>
   * <p>
   * The following diagram shows the initial orientations and locations of 
   * the corner parts:
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
   * |5.2|   |7.1|7.2|   |1.1|1.2|   |3.1|3.2|   |5.1|
   * +---+---+---+---+---+---+---+---+---+---+---+---+
   *             |7.0|   |1.0|
   *             +---     ---+
   *             |     4     |
   *             +---     ---+
   *             |5.0|   |3.0|
   *             +---+---+---+
   * </pre>
   * <p>
   * <b>Edge parts</b>
   * <p>
   * The following diagram shows the initial orientations and locations of 
   * the edge parts:
   * <pre>
   *             +---+---+---+
   *             |   |3.1|   |
   *             +--- --- ---+
   *             |6.0| 1 |0.0|
   *             +--- --- ---+
   *             |   |9.1|   |
   * +---+---+---+---+---+---+---+---+---+---+---+---+
   * |   |6.1|   |   |9.0|   |   |0.1|   |   |3.0|   |
   * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
   * |7.0| 3 10.0|10.1 2 |1.1|1.0| 0 |4.0|4.1| 5 |7.1|
   * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
   * |   |8.1|   |   |11.0   |   |2.1|   |   |5.0|   |
   * +---+---+---+---+---+---+---+---+---+---+---+---+
   *             |   |11.1   |
   *             +--- --- ---+
   *             |8.0| 4 |2.0|
   *             +--- --- ---+
   *             |   |5.1|   |
   *             +---+---+---+
   * </pre>
   * <p>
   * <b>Side parts</b>
   * <p>
   * The following diagram shows the initial orientation and location of 
   * the face parts:
   * <pre>
   *             +------------+
   *             |     .1     |
   *             |    ---     |
   *             | .0| 1 |.2  |
   *             |    ---     |
   *             |     .3     |
   * +-----------+------------+-----------+-----------+
   * |     .0    |     .2     |     .3    |    .1     |
   * |    ---    |    ---     |    ---    |    ---    |
   * | .3| 3 |.1 | .1| 2 |.3  | .2| 0 |.0 | .0| 5 |.2 |
   * |    ---    |    ---     |    ---    |    ---    |
   * |     .2    |    .0      |     .1    |     .3    |
   * +-----------+------------+-----------+-----------+
   *             |     .0     |
   *             |    ---     |
   *             | .3| 4 |.1  |
   *             |    ---     |
   *             |     .2     |
   *             +------------+
   * </pre>
   * <p>
   * For more information about the location and orientation of the parts see
   * {@link Cube}.
   * <p>
   * <b>Stickers</b>
   * <p>
   * The following diagram shows the arrangement of stickers on a Rubik's Cube:
   * The number before the comma is the first dimension (faces), the number
   * after the comma is the second dimension (stickers).
   * <pre>
   *             +---+---+---+
   *             |1,0|1,1|1,2|
   *             +--- --- ---+
   *             |1,3|1,4|1,5|
   *             +--- --- ---+
   *             |1,6|1,7|1,8|
   * +---+---+---+---+---+---+---+---+---+---+---+---+
   * |3,0|3,1|3,2|2,0|2,1|2,2|0,0|0,1|0,2|5,0|5,1|5,2|
   * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
   * |3,3|3,4|3,5|2,3|2,4|2,5|0,3|0,4|0,5|5,3|5,4|5,5|
   * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
   * |3,6|3,7|3,8|2,6|2,7|2,8|0,6|0,7|0,8|5,6|5,7|5,8|
   * +---+---+---+---+---+---+---+---+---+---+---+---+
   *             |4,0|4,1|4,2|
   *             +--- --- ---+
   *             |4,3|4,4|4,5|
   *             +--- --- ---+
   *             |4,6|4,7|4,8|
   *             +---+---+---+
   * </pre>
   */


  /** Creates a new instance. */
  class RubiksCube extends Cube.Cube {
    constructor() {
      super(3);
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
        return (face < 3) ? 4 : 1;
      } else if (part < this.cornerLoc.length + this.edgeLoc.length) {
        // edge parts
        return 2;
      } else if (part < this.cornerLoc.length + this.edgeLoc.length + this.sideLoc.length) {
        // side parts
        return (face < 3) ? 4 : 1;
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
      } else if (part < this.cornerLoc.length + this.edgeLoc.length) {
        // edge parts
        var edgeIndex = part - this.cornerLoc.length;
        var loc = this.getEdgeLocation(edgeIndex);
        var ori = (2 - this.getPartOrientation(part) + orientation) % 2;
        return this.EDGE_SWIPE_TABLE[loc][ori][swipeDirection][0];
      } else if (part < this.cornerLoc.length + this.edgeLoc.length + this.sideLoc.length) {
        // side parts
        var loc = this.getSideLocation(part - this.cornerLoc.length - this.edgeLoc.length);
        var ori = (4 - this.getPartOrientation(part) + swipeDirection) % 4;
        return this.SIDE_SWIPE_TABLE[loc][ori][0];
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
      } else if (part < this.cornerLoc.length + this.edgeLoc.length) {
        // edge parts
        var edgeIndex = part - this.cornerLoc.length;
        var loc = this.getEdgeLocation(edgeIndex);
        var ori = (2 - this.getPartOrientation(part) + orientation) % 2;
        return this.EDGE_SWIPE_TABLE[loc][ori][swipeDirection][1];
      } else if (part < this.cornerLoc.length + this.edgeLoc.length + this.sideLoc.length) {
        // side parts
        var loc = this.getSideLocation(part - this.cornerLoc.length - this.edgeLoc.length);
        var ori = (4 - this.getPartOrientation(part) + swipeDirection) % 4;
        return this.SIDE_SWIPE_TABLE[loc][ori][1];
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
      } else if (part < this.cornerLoc.length + this.edgeLoc.length) {
        // edge parts
        var edgeIndex = part - this.cornerLoc.length;
        var loc = this.getEdgeLocation(edgeIndex);
        var ori = this.getEdgeOrientation(edgeIndex);
        var sori = (2 - ori + orientation) % 2;
        var dir = swipeDirection;
        var angle = this.EDGE_SWIPE_TABLE[loc][sori][dir][2];
        return angle;
      } else if (part < this.cornerLoc.length + this.edgeLoc.length + this.sideLoc.length) {
        // side parts
        var loc = this.getSideLocation(part - this.cornerLoc.length - this.edgeLoc.length);
        var ori = (4 - this.getPartOrientation(part) + swipeDirection) % 4;
        return this.SIDE_SWIPE_TABLE[loc][ori][2];
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
        window.console.log("RubiksCube#" + (this) + ".transform(ax=" + axis + ",msk=" + layerMask + ",ang:" + angle + ")");
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
          // twist at left middle, bottom middle, back middle
          switch (axis) {
            case 0: // x
              switch (an) {
                case 1:
                  this.twistMR();
                  break;
                case - 1:
                  this.twistMR();
                  this.twistMR();
                  this.twistMR();
                  break;
                case 2:
                  this.twistMR();
                  this.twistMR();
                  break;
              }
              break;
            case 1: // y
              switch (an) {
                case 1:
                  this.twistMU();
                  break;
                case - 1:
                  this.twistMU();
                  this.twistMU();
                  this.twistMU();
                  break;
                case 2:
                  this.twistMU();
                  this.twistMU();
                  break;
              }
              break;
            case 2: // z
            switch (an) {
              case 1:
                this.twistMF();
                break;
              case - 1:
                this.twistMF();
                this.twistMF();
                this.twistMF();
                break;
              case 2:
                this.twistMF();
                this.twistMF();
                break;
            }
          }
        }

        if ((layerMask & 4) != 0) {
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
     *                +----+----+----+
     *                |    |    | 2.0|
     *                +---- ---- ----+
     *                |    |    | 0.0|
     *                +---- ---- ----+
     *                |    |    | 0.0|
     * +----+----+----+----+----+----+----+----+----+----+----+----+
     * |    |    |    |    |    | 0.2| 0.1| 0.1| 2.2| 2.1|    |    |
     * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
     * |    |    |    |    |    | 1.1| 1.0| 0.0| 4.0| 4.1|    |    |
     * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
     * |    |    |    |    |    | 1.1| 1.2| 2.1| 3.1| 3.2|    |    |
     * +----+----+----+----+----+----+----+----+----+----+----+----+
     *                |    |    | 1.0|
     *                +---- ---- ----+
     *                |    |    | 2.0|
     *                +---- ---- ----+
     *                |    |    | 3.0|
     *                +----+----+----+
     * </pre>
     */
    twistR() {
      this.fourCycle(this.cornerLoc, 0, 1, 3, 2, this.cornerOrient, 1, 2, 1, 2, 3);
      this.fourCycle(this.edgeLoc, 0, 1, 2, 4, this.edgeOrient, 1, 1, 1, 1, 2);
      this.sideOrient[0] = (this.sideOrient[0] + 3) % 4;
    }

    /**
     * U.
     * <pre>
     *                +----+----+----+
     *                | 4.0| 3.1| 2.0|
     *                +---- ---- ----+
     *                | 6.0| 1.2| 0.0|
     *                +---- ---- ----+
     *                | 6.0| 9.1| 0.0|
     * +----+----+----+----+----+----+----+----+----+----+----+----+
     * | 4.1| 6.1| 6.2| 6.1| 9.0| 0.2| 0.1| 0.1| 2.2| 2.1| 3.0| 4.2|
     * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
     * |    |    |    |    |    |    |    |    |    |    |    |    |
     * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
     * |    |    |    |    |    |    |    |    |    |    |    |    |
     * +----+----+----+----+----+----+----+----+----+----+----+----+
     *                |    |    |    |
     *                +---- ---- ----+
     *                |    |    |    |
     *                +---- ---- ----+
     *                |    |    |    |
     *                +----+----+----+
     * </pre>
     */
    twistU() {
      this.fourCycle(this.cornerLoc, 0, 2, 4, 6, this.cornerOrient, 0, 0, 0, 0, 3);
      this.fourCycle(this.edgeLoc, 0, 3, 6, 9, this.edgeOrient, 1, 1, 1, 1, 2);
      this.sideOrient[1] = (this.sideOrient[1] + 3) % 4;
    }

    /**
     * F.
     * <pre>
     *                +----+----+----+
     *                |    |    |    |
     *                +---- ---- ----+
     *                |    |    |    |
     *                +---- ---- ----+
     *                | 6.0| 9.1| 0.0|
     * +----+----+----+----+----+----+----+----+----+----+----+----+
     * |    |    | 6.2| 6.1| 9.0| 0.2| 0.1|    |    |    |    |    |
     * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
     * |    |    |10.0|10.1| 2.3| 1.1| 1.0|    |    |    |    |    |
     * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
     * |    |    | 7.1| 7.2|11.0| 1.1| 1.2|    |    |    |    |    |
     * +----+----+----+----+----+----+----+----+----+----+----+----+
     *                | 7.0|11.1| 1.0|
     *                +---- ---- ----+
     *                |    |    |    |
     *                +---- ---- ----+
     *                |    |    |    |
     *                +----+----+----+
     * </pre>
     */
    twistF() {
      this.fourCycle(this.cornerLoc, 6, 7, 1, 0, this.cornerOrient, 1, 2, 1, 2, 3);
      this.fourCycle(this.edgeLoc, 9, 10, 11, 1, this.edgeOrient, 1, 1, 1, 1, 2);
      this.sideOrient[2] = (this.sideOrient[2] + 3) % 4;
    }

    /**
     * L.
     * <pre>
     *                +----+----+----+
     *                | 4.0|    |    |
     *                +---- ---- ----+
     *                | 6.0|    |    |
     *                +---- ---- ----+
     *                | 6.0|    |    |
     * +----+----+----+----+----+----+----+----+----+----+----+----+
     * | 4.1| 6.1| 6.2| 6.1|    |    |    |    |    |    |    | 4.2|
     * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
     * | 7.0| 3.1|10.0|10.1|    |    |    |    |    |    |    | 7.1|
     * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
     * | 5.2| 8.1| 7.1| 7.2|    |    |    |    |    |    |    | 5.1|
     * +----+----+----+----+----+----+----+----+----+----+----+----+
     *                | 7.0|    |    |
     *                +---- ---- ----+
     *                | 8.0|    |    |
     *                +---- ---- ----+
     *                | 5.0|    |    |
     *                +----+----+----+
     * </pre>
     */
    twistL() {
      this.fourCycle(this.cornerLoc, 6, 4, 5, 7, this.cornerOrient, 2, 1, 2, 1, 3);
      this.fourCycle(this.edgeLoc, 6, 7, 8, 10, this.edgeOrient, 1, 1, 1, 1, 2);
      this.sideOrient[3] = (this.sideOrient[3] + 3) % 4;
    }

    /**
     * D.
     * <pre>
     *                +----+----+----+
     *                |    |    |    |
     *                +---- ---- ----+
     *                |    |    |    |
     *                +---- ---- ----+
     *                |    |    |    |
     * +----+----+----+----+----+----+----+----+----+----+----+----+
     * |    |    |    |    |    |    |    |    |    |    |    |    |
     * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
     * |    |    |    |    |    |    |    |    |    |    |    |    |
     * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
     * | 5.2| 8.1| 7.1| 7.2|11.0| 1.1| 1.2| 2.1| 3.1| 3.2| 5.0| 5.1|
     * +----+----+----+----+----+----+----+----+----+----+----+----+
     *                | 7.0|11.1| 1.0|
     *                +---- ---- ----+
     *                | 8.0| 4.1| 2.0|
     *                +---- ---- ----+
     *                | 5.0| 5.1| 3.0|
     *                +----+----+----+
     * </pre>
     */
    twistD() {
      this.fourCycle(this.cornerLoc, 7, 5, 3, 1, this.cornerOrient, 0, 0, 0, 0, 3);
      this.fourCycle(this.edgeLoc, 2, 11, 8, 5, this.edgeOrient, 1, 1, 1, 1, 2);
      this.sideOrient[4] = (this.sideOrient[4] + 3) % 4;
    }

    /**
     * B.
     * <pre>
     *                +----+----+----+
     *                | 4.0| 3.1| 2.0|
     *                +---- ---- ----+
     *                |    |    |    |
     *                +---- ---- ----+
     *                |    |    |    |
     * +----+----+----+----+----+----+----+----+----+----+----+----+
     * | 4.1|    |    |    |    |    |    |    | 2.2| 2.1| 3.0| 4.2|
     * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
     * | 7.0|    |    |    |    |    |    |    | 4.0| 4.1| 5.2| 7.1|
     * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
     * | 5.2|    |    |    |    |    |    |    | 3.1| 3.2| 5.0| 5.1|
     * +----+----+----+----+----+----+----+----+----+----+----+----+
     *                |    |    |    |
     *                +---- ---- ----+
     *                |    |    |    |
     *                +---- ---- ----+
     *                | 5.0| 5.1| 3.0|
     *                +----+----+----+
     * </pre>
     */
    twistB() {
      this.fourCycle(this.cornerLoc, 2, 3, 5, 4, this.cornerOrient, 1, 2, 1, 2, 3);
      this.fourCycle(this.edgeLoc, 3, 4, 5, 7, this.edgeOrient, 1, 1, 1, 1, 2);
      this.sideOrient[5] = (this.sideOrient[5] + 3) % 4;
    }

    /**
     * MR.
     * <pre>
     *                +----+----+----+
     *                |    | 3.1|    |
     *                +---- ---- ----+
     *                |    | 1.2|    |
     *                +---- ---- ----+
     *                |    | 9.1|    |
     * +----+----+----+----+----+----+----+----+----+----+----+----+
     * |    |    |    |    | 9.0|    |    |    |    |    | 3.0|    |
     * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
     * |    |    |    |    | 2.3|    |    |    |    |    | 5.2|    |
     * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
     * |    |    |    |    |11.0|    |    |    |    |    | 5.0|    |
     * +----+----+----+----+----+----+----+----+----+----+----+----+
     *                |    |11.1|    |
     *                +---- ---- ----+
     *                |    | 4.1|    |
     *                +---- ---- ----+
     *                |    | 5.1|    |
     *                +----+----+----+
     * </pre>
     */
    twistMR() {
      this.fourCycle(this.edgeLoc, 3, 9, 11, 5, this.edgeOrient, 1, 1, 1, 1, 2);
      this.fourCycle(this.sideLoc, 2, 4, 5, 1, this.sideOrient, 2, 3, 2, 1, 4);
    }

    /**
     * MU.
     * <pre>
     *                +----+----+----+
     *                |    |    |    |
     *                +---- ---- ----+
     *                |    |    |    |
     *                +---- ---- ----+
     *                |    |    |    |
     * +----+----+----+----+----+----+----+----+----+----+----+----+
     * |    |    |    |    |    |    |    |    |    |    |    |    |
     * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
     * | 7.0| 3.1|10.0|10.1| 2.3| 1.1| 1.0| 0.0| 5.0| 4.1| 5.2| 7.1|
     * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
     * |    |    |    |    |    |    |    |    |    |    |    |    |
     * +----+----+----+----+----+----+----+----+----+----+----+----+
     *                |    |    |    |
     *                +---- ---- ----+
     *                |    |    |    |
     *                +---- ---- ----+
     *                |    |    |    |
     *                +----+----+----+
     * </pre>
     */
    twistMU() {
      this.fourCycle(this.edgeLoc, 1, 4, 7, 10, this.edgeOrient, 1, 1, 1, 1, 2);
      this.fourCycle(this.sideLoc, 3, 2, 0, 5, this.sideOrient, 2, 1, 2, 3, 4);
    }

    /**
     * MF.
     * <pre>
     *                +----+----+----+
     *                |    |    |    |
     *                +---- ---- ----+
     *                | 6.0| 1.2| 0.0|
     *                +---- ---- ----+
     *                |    |    |    |
     * +----+----+----+----+----+----+----+----+----+----+----+----+
     * |    | 6.1|    |    |    |    |    | 0.1|    |    |    |    |
     * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
     * |    | 3.1|    |    |    |    |    | 0.0|    |    |    |    |
     * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
     * |    | 8.1|    |    |    |    |    | 2.1|    |    |    |    |
     * +----+----+----+----+----+----+----+----+----+----+----+----+
     *                |    |    |    |
     *                +---- ---- ----+
     *                | 8.0| 4.1| 2.0|
     *                +---- ---- ----+
     *                |    |    |    |
     *                +----+----+----+
     * </pre>
     */
    twistMF() {
      this.fourCycle(this.edgeLoc, 0, 6, 8, 2, this.edgeOrient, 1, 1, 1, 1, 2);
      this.fourCycle(this.sideLoc, 0, 1, 3, 4, this.sideOrient, 1, 2, 3, 2, 4);
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
     *             +---+---+---+
     *             |1,0|1,1|1,2|
     *             +--- --- ---+
     *             |1,3|1,4|1,5|
     *             +--- --- ---+
     *             |1,6|1,7|1,8|
     * +---+---+---+---+---+---+---+---+---+---+---+---+
     * |3,0|3,1|3,2|2,0|2,1|2,2|0,0|0,1|0,2|5,0|5,1|5,2|
     * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
     * |3,3|3,4|3,5|2,3|2,4|2,5|0,3|0,4|0,5|5,3|5,4|5,5|
     * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
     * |3,6|3,7|3,8|2,6|2,7|2,8|0,0|0,1|0,2|5,0|5,1|5,2|
     * +---+---+---+---+---+---+---+---+---+---+---+---+
     *             |4,0|4,1|4,2|
     *             +--- --- ---+
     *             |4,3|4,4|4,5|
     *             +--- --- ---+
     *             |4,6|4,7|4,8|
     *             +---+---+---+
     * </pre>
     * @return A two dimensional array. First dimension: faces.
     * Second dimension: sticker index on the faces.
     */
    toStickers() {
      var stickers = new Array(6);
      for (var i = 0; i < 6; i++) {
        stickers[i] = new Array(9);
      }

      // Map face parts onto stickers.
      for (var i = 0; i < 6; i++) {
        var loc = this.sideLoc[i];
        stickers[this.SIDE_TRANSLATION[i][0]][this.SIDE_TRANSLATION[i][1]] = this.SIDE_TRANSLATION[loc][0];
      }

      // Map edge parts onto stickers
      for (var i = 0; i < 12; i++) {
        var loc = this.edgeLoc[i];
        var orient = this.edgeOrient[i];
        stickers[this.EDGE_TRANSLATION[i][0]][this.EDGE_TRANSLATION[i][1]] =
        (orient == 0) ? this.EDGE_TRANSLATION[loc][0] : this.EDGE_TRANSLATION[loc][2];
        stickers[this.EDGE_TRANSLATION[i][2]][this.EDGE_TRANSLATION[i][3]] =
        (orient == 0) ? this.EDGE_TRANSLATION[loc][2] : this.EDGE_TRANSLATION[loc][0];
      }

      // Map corner parts onto stickers
      for (var i = 0; i < 8; i++) {
        var loc = this.cornerLoc[i];
        var orient = this.cornerOrient[i];
        stickers[this.CORNER_TRANSLATION[i][0]][this.CORNER_TRANSLATION[i][1]] =
        (orient == 0)
        ? this.CORNER_TRANSLATION[loc][0]
        : ((orient == 1)
        ? this.CORNER_TRANSLATION[loc][2]
        : this.CORNER_TRANSLATION[loc][4]);
        stickers[this.CORNER_TRANSLATION[i][2]][this.CORNER_TRANSLATION[i][3]] =
        (orient == 0)
        ? this.CORNER_TRANSLATION[loc][2]
        : ((orient == 1)
        ? this.CORNER_TRANSLATION[loc][4]
        : this.CORNER_TRANSLATION[loc][0]);
        stickers[this.CORNER_TRANSLATION[i][4]][this.CORNER_TRANSLATION[i][5]] =
        (orient == 0)
        ? this.CORNER_TRANSLATION[loc][4]
        : ((orient == 1)
        ? this.CORNER_TRANSLATION[loc][0]
        : this.CORNER_TRANSLATION[loc][2]);
      }
      /*
       for (var i = 0; i < stickers.length; i++) {
       System.out.prvar("  " + i + ":");
       for (var j = 0; j < stickers[i].length; j++) {
       if (j != 0) {
       System.out.prvar(',');
       }
       System.out.prvar(stickers[i][j]);
       }
       window.console.log();
       }*/

      return stickers;
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
      var i = 0, j = 0, cube;

      var tempSideLoc = new Array(6);
      var tempSideOrient = new Array(6);
      var tempEdgeLoc = new Array(12);
      var tempEdgeOrient = new Array(12);
      var tempCornerLoc = new Array(8);
      var tempCornerOrient = new Array(8);

      // Translate face cubes to match stickers.
      try {
        for (i = 0; i < 6; i++) {
          for (j = 0; j < 6; j++) {
            if (this.SIDE_TRANSLATION[j][0] == stickers[i][this.SIDE_TRANSLATION[j][1]]) {
              tempSideLoc[i] = this.SIDE_TRANSLATION[j][0];
              break;
            }
          }
          //this.sideOrient[i] = 0; // already done by reset
        }
      } catch (e) {
        throw ("Invalid side cube " + i);
      }

      for (i = 0; i < 5; i++) {
        for (j = i + 1; j < 6; j++) {
          if (tempSideLoc[i] == tempSideLoc[j]) {
            throw ("Duplicate side cubes " + i + "+" + j);
          }
        }
      }
      // Translate edge cubes to match stickers.
      for (i = 0; i < 12; i++) {
        var f0 = stickers[this.EDGE_TRANSLATION[i][0]][this.EDGE_TRANSLATION[i][1]];
        var f1 = stickers[this.EDGE_TRANSLATION[i][2]][this.EDGE_TRANSLATION[i][3]];
        for (cube = 0; cube < 12; cube++) {
          if (this.EDGE_TRANSLATION[cube][0] == f0
          && this.EDGE_TRANSLATION[cube][2] == f1) {
            tempEdgeOrient[i] = 0; //??
            break;

          } else if (this.EDGE_TRANSLATION[cube][0] == f1
          && this.EDGE_TRANSLATION[cube][2] == f0) {
            tempEdgeOrient[i] = 1;
            break;
          }
        }
        if (cube == 12) {
          throw ("Invalid edge cube " + i);
        }

        tempEdgeLoc[i] = cube;
      }

      for (i = 0; i < 11; i++) {
        for (j = i + 1; j < 12; j++) {
          if (tempEdgeLoc[i] == tempEdgeLoc[j]) {
            throw "Duplicate edge cubes tempEdgeLoc[" + i + "]=" + tempEdgeLoc[i] + " tempEdgeLoc[" + j + "]=" + tempEdgeLoc[j];
          }
        }
      }

      // Translate corner cubes to match stickers.
      for (i = 0; i < 8; i++) {
        var f0 = stickers[this.CORNER_TRANSLATION[i][0]][this.CORNER_TRANSLATION[i][1]];
        var f1 = stickers[this.CORNER_TRANSLATION[i][2]][this.CORNER_TRANSLATION[i][3]];
        var f2 = stickers[this.CORNER_TRANSLATION[i][4]][this.CORNER_TRANSLATION[i][5]];
        for (cube = 0; cube < 8; cube++) {
          if (this.CORNER_TRANSLATION[cube][0] == f0
          && this.CORNER_TRANSLATION[cube][2] == f1
          && this.CORNER_TRANSLATION[cube][4] == f2) {
            tempCornerOrient[i] = 0;
            break;

          } else if (this.CORNER_TRANSLATION[cube][0] == f2
          && this.CORNER_TRANSLATION[cube][2] == f0
          && this.CORNER_TRANSLATION[cube][4] == f1) {
            tempCornerOrient[i] = 1;
            break;

          } else if (this.CORNER_TRANSLATION[cube][0] == f1
          && this.CORNER_TRANSLATION[cube][2] == f2
          && this.CORNER_TRANSLATION[cube][4] == f0) {
            tempCornerOrient[i] = 2;
            break;
          }
        }
        if (cube == 8) {
          throw "Invalid corner cube " + i;
        }
        tempCornerLoc[i] = cube;
      }

      for (i = 0; i < 7; i++) {
        for (j = i + 1; j < 8; j++) {
          if (tempCornerLoc[i] == tempCornerLoc[j]) {
            throw "Duplicate corner cubes tempCornerLoc[" + i + "]=" + tempCornerLoc[i] + " tempCornerLoc[" + j + "]=" + tempCornerLoc[j];
          }
        }
      }

      this.sideLoc = tempSideLoc;
      this.sideOrient = tempSideOrient;
      this.edgeLoc = tempEdgeLoc;
      this.edgeOrient = tempEdgeOrient;
      this.cornerLoc = tempCornerLoc;
      this.cornerOrient = tempCornerOrient;

      if (!isQuiet()) {
        fireCubeChanged(new CubeEvent(this, 0, 0, 0));
      }
    }

    clone() {
      var that = new RubiksCube();
      that.setTo(this);
      return that;
    }
  }

  /**
   * Set this variable to true to get debug output when the cube is transformed.
   */
  RubiksCube.prototype.DEBUG = false;
  /**
   * Holds the number of side parts, which is 6.
   */
  RubiksCube.prototype.NUMBER_OF_SIDE_PARTS = 6;
  /**
   * Holds the number of edge parts, which is 12.
   */
  RubiksCube.prototype.NUMBER_OF_EDGE_PARTS = 12;
  /**
   * This is used for mapping face part locations
   * to/from sticker positions on the cube.
   *
   * @see #toStickers
   */
  RubiksCube.prototype.SIDE_TRANSLATION = [
    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],
    [5, 4]
  ];
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
  RubiksCube.prototype.EDGE_TRANSLATION = [
    [1, 5, 0, 1], // edge 0 ur
    [0, 3, 2, 5], //      1 rf
    [4, 5, 0, 7], //      2 dr
    [5, 1, 1, 1], //      3 bu
    [0, 5, 5, 3], //      4 rb
    [5, 7, 4, 7], //      5 bd
    [1, 3, 3, 1], //      6 ul
    [3, 3, 5, 5], //      7 lb
    [4, 3, 3, 7], //      8 dl
    [2, 1, 1, 7], //      9 fu
    [3, 5, 2, 3], //     10 lf
    [2, 7, 4, 1] //     11 fd
  ];
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
  RubiksCube.prototype.CORNER_TRANSLATION = [
    [1, 8, 0, 0, 2, 2], // 0 urf 
    [4, 2, 2, 8, 0, 6], // 1 dfr
    [1, 2, 5, 0, 0, 2], // 2 ubr
    [4, 8, 0, 8, 5, 6], // 3 drb
    [1, 0, 3, 0, 5, 2], // 4 ulb
    [4, 6, 5, 8, 3, 6], // 5 dbl
    [1, 6, 2, 0, 3, 2], // 6 ufl
    [4, 0, 3, 8, 2, 6] // 7 dlf
  ];
  /**
   * First dimension: edge part index.
   * Second dimension: orientation.
   * Third dimension: swipe direction
   * Fourth dimension: axis,layermask,angle
   * <pre>
   *             +---+---+---+
   *             |   |3.1|   |
   *             +--- --- ---+
   *             |6.0| 1 |0.0|
   *             +--- --- ---+
   *             |   |9.1|   |
   * +---+---+---+---+---+---+---+---+---+---+---+---+
   * |   |6.1|   |   |9.0|   |   |0.1|   |   |3.0|   |
   * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
   * |7.0| 3 10.0|10.1 2 |1.1|1.0| 0 |4.0|4.1| 5 |7.1|
   * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
   * |   |8.1|   |   |11.0   |   |2.1|   |   |5.0|   |
   * +---+---+---+---+---+---+---+---+---+---+---+---+
   *             |   |11.1   |
   *             +--- --- ---+
   *             |8.0| 4 |2.0|
   *             +--- --- ---+
   *             |   |5.1|   |
   *             +---+---+---+
   * </pre>
   */
  RubiksCube.prototype.EDGE_SWIPE_TABLE = [
    [// edge 0 ur
      [//u
        [2, 2, 1], // axis, layerMask, angle
        [0, 4, -1],
        [2, 2, -1],
        [0, 4, 1]
      ],
      [//r
        [2, 2, -1], // axis, layerMask, angle
        [1, 4, -1],
        [2, 2, 1],
        [1, 4, 1]
      ], ],
    [//      1 rf
      [//r
        [1, 2, 1], // axis, layerMask, angle
        [2, 4, -1],
        [1, 2, -1],
        [2, 4, 1]
      ],
      [//f
        [1, 2, -1], // axis, layerMask, angle
        [0, 4, -1],
        [1, 2, 1],
        [0, 4, 1]
      ], ],
    [//      2 dr
      [//d
        [2, 2, -1], // axis, layerMask, angle
        [0, 4, -1],
        [2, 2, 1],
        [0, 4, 1]
      ],
      [//r
        [2, 2, 1], // axis, layerMask, angle
        [1, 1, 1],
        [2, 2, -1],
        [1, 1, -1]
      ], ],
    [//      3 bu
      [//b
        [0, 2, -1], // axis, layerMask, angle
        [1, 4, -1],
        [0, 2, 1],
        [1, 4, 1]
      ],
      [//u
        [0, 2, 1], // axis, layerMask, angle
        [2, 1, 1],
        [0, 2, -1],
        [2, 1, -1]
      ], ],
    [//      4 rb
      [//r
        [1, 2, -1], // axis, layerMask, angle
        [2, 1, 1],
        [1, 2, 1],
        [2, 1, -1]
      ],
      [//b
        [1, 2, 1], // axis, layerMask, angle
        [0, 4, -1],
        [1, 2, -1],
        [0, 4, 1]
      ], ],
    [//      5 bd
      [//b
        [0, 2, 1], // axis, layerMask, angle
        [1, 1, 1],
        [0, 2, -1],
        [1, 1, -1]
      ],
      [//d
        [0, 2, -1], // axis, layerMask, angle
        [2, 1, 1],
        [0, 2, 1],
        [2, 1, -1]
      ], ],
    [//      6 ul
      [//u
        [2, 2, -1], // axis, layerMask, angle
        [0, 1, 1],
        [2, 2, 1],
        [0, 1, -1]
      ],
      [//l
        [2, 2, 1], // axis, layerMask, angle
        [1, 4, -1],
        [2, 2, -1],
        [1, 4, 1]
      ], ],
    [//      7 lb
      [//l
        [1, 2, 1], // axis, layerMask, angle
        [2, 1, 1],
        [1, 2, -1],
        [2, 1, -1]
      ],
      [//b
        [1, 2, -1], // axis, layerMask, angle
        [0, 1, 1],
        [1, 2, 1],
        [0, 1, -1]
      ], ],
    [//      8 dl
      [//d
        [2, 2, 1], // axis, layerMask, angle
        [0, 1, 1],
        [2, 2, -1],
        [0, 1, -1]
      ],
      [//l
        [2, 2, -1], // axis, layerMask, angle
        [1, 1, 1],
        [2, 2, 1],
        [1, 1, -1]
      ], ],
    [//      9 fu
      [//f
        [0, 2, 1], // axis, layerMask, angle
        [1, 4, -1],
        [0, 2, -1],
        [1, 4, 1]
      ],
      [//u
        [0, 2, -1], // axis, layerMask, angle
        [2, 4, -1],
        [0, 2, 1],
        [2, 4, 1]
      ], ],
    [//     10 lf
      [//l
        [1, 2, -1], // axis, layerMask, angle
        [2, 4, -1],
        [1, 2, 1],
        [2, 4, 1]
      ],
      [//f
        [1, 2, 1], // axis, layerMask, angle
        [0, 1, 1],
        [1, 2, -1],
        [0, 1, -1]
      ], ],
    [//     11 fd
      [//f
        [0, 2, -1], // axis, layerMask, angle
        [1, 1, 1],
        [0, 2, 1],
        [1, 1, -1]
      ],
      [//d
        [0, 2, 1], // axis, layerMask, angle
        [2, 4, -1],
        [0, 2, -1],
        [2, 4, 1]
      ], ]
  ];
  /** Side swipe table.
   * First dimension: side part index.
   * Second dimension: swipe direction
   * Third dimension: axis,layermask,angle
   *
   * <pre>
   *             +------------+
   *             |     .1     |
   *             |    ---     |
   *             | .0| 1 |.2  |
   *             |    ---     |
   *             |     .3     |
   * +-----------+------------+-----------+-----------+
   * |     .0    |     .2     |     .3    |    .1     |
   * |    ---    |    ---     |    ---    |    ---    |
   * | .3| 3 |.1 | .1| 2 |.3  | .2| 0 |.0 | .0| 5 |.2 |
   * |    ---    |    ---     |    ---    |    ---    |
   * |     .2    |    .0      |     .1    |     .3    |
   * +-----------+------------+-----------+-----------+
   *             |     .0     |
   *             |    ---     |
   *             | .3| 4 |.1  |
   *             |    ---     |
   *             |     .2     |
   *             +------------+
   * </pre>
   */
  RubiksCube.prototype.SIDE_SWIPE_TABLE = [
    [// 0 r
      [1, 2, -1], // axis, layerMask, angle
      [2, 2, 1],
      [1, 2, 1],
      [2, 2, -1]
    ],
    [// 1 u
      [2, 2, -1],
      [0, 2, 1],
      [2, 2, 1],
      [0, 2, -1]
    ],
    [// 2 f
      [0, 2, -1],
      [1, 2, 1],
      [0, 2, 1],
      [1, 2, -1]
    ],
    [// 3 l
      [2, 2, 1],
      [1, 2, -1],
      [2, 2, -1],
      [1, 2, 1]
    ],
    [// 4 d
      [0, 2, 1],
      [2, 2, -1],
      [0, 2, -1],
      [2, 2, 1]
    ],
    [// 5 b
      [1, 2, 1],
      [0, 2, -1],
      [1, 2, -1],
      [0, 2, 1]
    ]
  ];
  
// Construct the name to part map.
  let cornerParts = ["urf", "dfr", "ubr", "drb", "ulb", "dbl", "ufl", "dlf"];
  let edgeParts=[ "ur","rf","dr","bu","rb","bd","ul","lb","dl","fu","lf","fd"];
  let sideParts=[ "r","u","f","l","d","b"];
  let partMap = {center: 8+12+6};
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
  for (let i = 0; i < edgeParts.length; i++) {
    let name = edgeParts[i];
    let key1 = name.charAt(0) + name.charAt(1);
    let key2 = name.charAt(1) + name.charAt(0);
    partMap[key1] = i+8;
    partMap[key2] = i+8;
  }
  for (let i = 0; i < sideParts.length; i++) {
    let name = sideParts[i];
    let key1 = name;
    partMap[key1] = i+8+12;
  }
/**
 * Maps the name of a part to its part index.
 */
RubiksCube.prototype.NAME_PART_MAP = partMap;



// ------------------
// MODULE API    
// ------------------
  return {
    RubiksCube: RubiksCube,
    newRubiksCube: function () {
      return new RubiksCube();
    }
  };
});
