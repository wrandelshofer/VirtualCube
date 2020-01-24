/* @(#)PocketCube.mjs
 * Copyright (c) 2018 Werner Randelshofer, Switzerland. MIT License.
 */

import Cube from './Cube.mjs';

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
 */
class PocketCube extends Cube.Cube {
  /** Creates a new instance. */
  constructor() {
    super(2);
    this.reset();
  }

  /**
   * Returns the current layer mask on which the orientation of the part lies.
   * Returns 0 if no mask can be determined (the center part).
   */
  getPartLayerMask(part, orientation) {
    let face = this.getPartFace(part, orientation);
    if (part < this.cornerLoc.length) { // corner parts
        return (face < 3) ? 2 : 1;
    } else { // center part
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
    if (angle == 0) {
        return; // NOP
    }

    // Convert angle -2 to 2 to simplify the switch statements
    let an = (angle == -2) ? 2 : angle;

    if ((layerMask & 1) != 0) {
        let repeat;
        switch (an) {
        case -1: repeat=1; break;
        case  1: repeat=3; break;
        case  2: repeat=2; break;
        }
        for (let i=0;i<repeat;i++) {
            // twist at left, bottom, back
            switch (axis) {
            case 0: this.twistL(); break;
            case 1: this.twistD(); break;
            case 2: this.twistB(); break;
            }
        }
    }
    if ((layerMask & 2) != 0) {
        let repeat;
        switch (an) {
        case -1: repeat=3; break;
        case  1: repeat=1; break;
        case  2: repeat=2; break;
        }
        for (let i=0;i<repeat;i++) {
            // twist at right, top, front
            switch (axis) {
            case 0: this.twistR(); break;
            case 1: this.twistU(); break;
            case 2: this.twistF(); break;
            }
        }
    }
  }
  twistR() {
      this.fourCycle(this.cornerLoc, 0, 1, 3, 2, this.cornerOrient, 1, 2, 1, 2, 3);
  }
  twistU() {
      this.fourCycle(this.cornerLoc, 0, 2, 4, 6, this.cornerOrient, 0, 0, 0, 0, 3);
  }
  twistF() {
      this.fourCycle(this.cornerLoc, 6, 7, 1, 0, this.cornerOrient, 1, 2, 1, 2, 3);
  }
  twistL() {
      this.fourCycle(this.cornerLoc, 6, 4, 5, 7, this.cornerOrient, 2, 1, 2, 1, 3);
  }
  twistD() {
      this.fourCycle(this.cornerLoc, 7, 5, 3, 1, this.cornerOrient, 0, 0, 0, 0, 3);
  }
  twistB() {
      this.fourCycle(this.cornerLoc, 2, 3, 5, 4, this.cornerOrient, 1, 2, 1, 2, 3);
  }

  clone() {
      let that = new PocketCube();
      that.setTo(this);
      return that;
  }
}

// ------------------
// MODULE API    
// ------------------
export default {
    PocketCube: PocketCube,
};
