/* @(#)Cube.mjs
 * Copyright (c) 2020 Werner Randelshofer, Switzerland. MIT License.
 */

let module = {
  log: (false && console != null && console.log != null) ? console.log : ()=>{},
  info: (true && console != null && console.info != null) ? console.info : ()=>{},
  warning: (true && console != null && console.warn != null) ? console.warn : ()=>{},
  error: (true && console != null && console.error != null) ? console.error : ()=>{}
}

/**
* Base class for classes which implement a Rubik's Cube like puzzle.
* <p>
* This class provides support for event listeners, and it defines the variables
* which hold the location and orientation of the cube parts.
*/
/** <p>
* <b>Faces and Axes</b>
* <p>
* This class defines the location of the six faces of the cube, as shown below:
* <pre>
*             +---+---+---+
*             |           |
*             |           |
*             |    1 u    |
*             |           |
*             |           |
* +---+---+---+---+---+---+---+---+---+---+---+---+
* |           |           |           |           |
* |           |           |           |           |
* |    3 l    |    2 f    |    0 r    |    5 b    |
* |           |           |           |           |
* |           |           |           |           |
* +---+---+---+---+---+---+---+---+---+---+---+---+
*             |           |
*             |           |
*             |    4 d    |
*             |           |
*             |           |
*             +---+---+---+
* </pre>
* The numbers represent the ID's of the faces: 0=right, 1=up, 2=front, 3=left,
* 4=down, 5=back.
* <p>
* The face ID's are symmetric along the axis from the right-up-front corner
* through the left-down-back corner of the cube.
* <p>
* <ul>
* <li>The x-axis passes from the center of face 3 through the center of face 0.
* </li>
* <li>The y-axis passes from the center of face 4 through the center of face 1.
* </li>
* <li>The z-axis passes from the center of face 5 through the center of face 2.
* </li>
* </ul>
* <p>
*/
/**
*  <b>Corner parts</b>
* <p>
* This class defines the initial locations and orientations of the corner parts
* as shown below:
* <pre>
*             +---+---+---+
*          ulb|4.0|   |2.0|ubr
*             +---     ---+
*             |     u     |
*             +---     ---+
*          ufl|6.0|   |0.0|urf
* +---+---+---+---+---+---+---+---+---+---+---+---+
* |4.1|   |6.2|6.1|   |0.2|0.1|   |2.2|2.1|   |4.2|
* +---     ---+---     ---+---     ---+---     ---+
* |     l     |     f     |     r     |     b     |
* +---     ---+---     ---+---     ---+---     ---+
* |5.2|   |7.1|7.2|   |1.1|1.2|   |3.1|3.2|   |5.1|
* +---+---+---+---+---+---+---+---+---+---+---+---+
*          dlf|7.0|   |1.0|dfr
*             +---     ---+
*             |     d     |
*             +---     ---+
*          dbl|5.0|   |3.0|drb
*             +---+---+---+
* </pre>
* <p>
* The numbers before the dots represents the ID's of the corner parts. There are
* 12 corner parts with ID's ranging from 0 through 11.  Since a corner part is
* visible on three faces of the cube, the ID of each part is shown 3 times.
* <p>
* The numbers after the dots indicate the orientations of the corner parts.
* Each corner part can have three different orientations: 0=initial,
* 1=tilted counterclockwise and 2=titled clockwise.
* <p>
* The orientations of the corner parts are symmetric along the axis from the
* right-up-front corner through the left-down-back corner of the cube.
* <pre>
*       +-----------+              +-----------+
*      /4.0/   /2.0/|             /1.0/   /3.0/|
*     +---     ---+.2            +---     ---+.2
*    /     u     /|/|           /     d     /|/|
*   +---     ---+   +          +---     ---+   +
*  /6.0/   /0.0/|  /|         /7.0/   /5.0/|  /|
* +---+---+---*.1  .1        +---+---+---*.1  .1
* | .1|   | .2|/ r|/         | .1|   | .2|/ b|/
* +---     ---+   +          +---     ---+   +
* |     f     |/|/           |     l     |/|/
* +---     ---+.2            +---     ---+.2
* | .2|   | .1|/             |.2 |   | .1|/
* +---+---+---+              +---+---+---+
* </pre>
* <p>
* Here is an alternative representation of the initial locations and
* orientations of the corner parts as a list:
* <ul>
* <li>0: urf</li><li>1: dfr</li><li>2: ubr</li><li>3: drb</li>
* <li>4: ulb</li><li>5: dbl</li><li>6: ufl</li><li>7: dlf</li>
* </ul>
* <p>
*/
/** <b>Edge parts</b>
* <p>
* This class defines the orientations of the edge parts and the location
* of the first 12 edges.
* (The locations of additional edge parts are defined by subclasses):
* <pre>
*               +----+---+----+
*               |    |3.1|    |
*               |    +---+    |
*               +---+     +---+
*             ul|6.0|  u  |0.0|ur
*               +---+     +---+
*               |    +---+    |
*               |    |9.1|    |
* +----+---+----+----+---+----+----+---+----+----+---+----+
* |    |6.1|    |    |9.0|fu  |    |0.1|    |    |3.0|bu  |
* |    +---+    |    +---+    |    +---+    |    +---+    |
* +---+     +---+---+     +---+---+     +---+---+     +---+
* |7.0|  l  10.0|10.1  f  |1.1|1.0|  r  |4.0|4.1|  b  |7.1|
* +---+     +---+---+     +---+---+     +---+---+     +---+
* |lb  +---+  lf|    +---+    |rf  +---+  rb|    +---+    |
* |    |8.1|    |    11.0|fd  |    |2.1|    |    |5.0|bd  |
* +----+---+----+----+---+----+----+---+----+----+---+----+
*               |    11.1|    |
*               |    +---+    |
*               +---+     +---+
*             dl|8.0|  d  |2.0|dr
*               +---+     +---+
*               |    +---+    |
*               |    |5.1|    |
*               +----+---+----+
* </pre>
* The numbers after the dots indicate the orientations of the edge parts.
* Each edge part can have two different orientations: 0=initial, 1=flipped.
* <pre>
*               +----+---+----+
*               |    |3.1|    |
*               |    +---+    |
*               +---+     +---+
*             ul|6.0|  u  |0.0|ur
*               +---+     +---+
*               |    +---+    |
*               |    |9.1|    |
* +----+---+----+----+---+----+----+---+----+----+---+----+
* |    |6.1|    |    |9.0|fu  |    |0.1|    |    |3.0|bu  |
* |    +---+    |    +---+    |    +---+    |    +---+    |
* +---+     +---+---+     +---+---+     +---+---+     +---+
* |7.0|  l  10.0|10.1  f  |1.1|1.0|  r  |4.0|4.1|  b  |7.1|
* +---+     +---+---+     +---+---+     +---+---+     +---+
* |lb  +---+  lf|    +---+    |rf  +---+  rb|    +---+    |
* |    |8.1|    |    11.0|fd  |    |2.1|    |    |5.0|bd  |
* +----+---+----+----+---+----+----+---+----+----+---+----+
*               |    11.1|    |
*               |    +---+    |
*               +---+     +---+
*             dl|8.0|  d  |2.0|dr
*               +---+     +---+
*               |    +---+    |
*               |    |5.1|    |
*               +----+---+----+
* </pre>
* <p>
* The orientations of the edge parts are symmetric along the axis from the
* front-up edge through the back-down edge of the cube.
* <pre>
*       +-----------+      +-----------+
*      /   / 3 /   /|      |\   \11 \   \
*     +--- --- ---+ +      + +--- --- ---+
*    /6.0/ u /0.0/|/|      |\|\8.0\ d \2.0\
*   +--- --- ---+  4.0   10.0  +--- --- ---+
*  /   / 9 /   /| |/|      |\ \|\   \ 5 \   \
* +---+-*-+---+  r  +      +  l  +---+-*-+---+
* |   |9.0|   |/| |/        \|\ \|   |5.0|   |
* +--- --- ---+  2.1        6.1  +--- --- ---+
* |10 | f | 1 |/|/            \|\| 7 | b | 4 |
* +--- --- ---+ +              + +--- --- ---+
* |   11.0|   |/                \|   |3.0|   |
* +---+---+---+                  +---+---+---+
* </pre>
* <p>
* Here is an alternative representation of the initial locations and
* orientations of the edge parts as a list:
* <ul>
* <li> 0: ur</li><li> 1: rf</li><li> 2: dr</li>
* <li> 3: bu</li><li> 4: rb</li><li> 5: bd</li>
* <li> 6: ul</li><li> 7: lb</li><li> 8: dl</li>
* <li> 9: fu</li><li>10: lf</li><li>11: fd</li>
* </ul>
* <p>
*/
/** <b>Side parts</b>
* <p>
* This class defines the orientations of the side parts as shown below
* (The locations of the side parts are defined by subclasses):
* <pre>
*             +-----------+
*             |     .1    |
*             |   +---+ u |
*             | .0| 1 |.2 |
*             |   +---+   |
*             |     .3    |
* +-----------+-----------+-----------+-----------+
* |     .0    |     .2    |     .3    |    .1     |
* |   +---+ l |   +---+ f |   +---+ r |   +---+ b |
* | .3| 3 |.1 | .1| 2 |.3 | .2| 0 |.0 | .0| 5 |.2 |
* |   +---+   |   +---+   |   +---+   |   +---+   |
* |     .2    |    .0     |     .1    |     .3    |
* +-----------+-----------+-----------+-----------+
*             |     .0    |
*             |   +---+ d |
*             | .3| 4 |.1 |
*             |   +---+   |
*             |     .2    |
*             +-----------+
* </pre>
* The numbers after the dots indicate the orientations of the side parts.
* Each side part can have four different orientations: 0=initial,
* 1=tilted clockwise, 2=flipped, 3=tilted counterclockwise.
* <p>
* The orientations of the side parts are symmetric along the axis from the
* right-up-front corner through the left-down-back corner of the cube.
* <pre>
*       +-----------+              +-----------+
*      /     .1    /|             /     .1    /|
*     +    ---    +r+            +    ---    +b+
*    / .0/ 1 /.2 /  |           / .0/ 4 /.2 /  |
*   +    ---    +.3 +          +    ---    +.3 +
*  / u   .3    / /|.0         / d   .3    / /|.0
* +---+---+---*  0  +        +---+---+---*  5  +
* | f   .2    .2|/ /         | l   .2    .2|/ /
* +    ---    + .1+          +    ---    + .1+
* | .1| 2 |.3 |  /           | .1| 3 |.3 |  /
* +    ---    + +            +    ---    + +
* |     .0    |/             |     .0    |/
* +---+---+---+              +---+---+---+
* </pre>
* <p>
* Here is an alternative representation of the initial locations and
* orientations of the side parts as a list:
* <ul>
* <li>0: r</li> <li>1: u</li> <li>2: f</li>
* <li>3: l</li> <li>4: d</li> <li>5: b</li>
* </ul>
*/

// ===============================
//
// CubeEvent
//
// ===============================

/** Cube event. */
class CubeEvent {
  constructor(source, axis, layerMask, angle) {
    this.source = source;
    this.axis = axis;
    this.angle = angle;
    this.layerMask = layerMask;
  }

  /**
   * Returns a list of part ID's, for each part location which is affected
   * if a cube is transformed using the axis, layerMaska and angle
   * parameters of this event.
   */
  getAffectedLocations() {
    let c1 = this.source.clone();
    c1.reset();
    c1.transform(this.axis, this.layerMask, this.angle);
    return c1.getUnsolvedParts();
  }
}

// ===============================
//
// Cube
//
// ===============================

class Cube {
  /**
   * Creates a new instance.
   * @param layerCount number of layers on the x, y and z axis.
   *
   * @throws IllegalArgumentException if the layer count is smaller than 2.
   */
  constructor(layerCount) {
    if (layerCount < 2) {
      throw new IllegalArgumentException("this.layerCount: " + this.layerCount + " < 2");
    }
    this.layerCount = layerCount;

    this.cornerLoc = new Array(8);
    this.cornerOrient = new Array(8);
    this.listenerList = [];

    if (this.layerCount > 2) {
      this.edgeLoc = new Array((this.layerCount - 2) * 12);
      this.edgeOrient = new Array(this.edgeLoc.length);
      this.sideLoc = new Array((this.layerCount - 2) * (this.layerCount - 2) * 6);
      this.sideOrient = new Array(this.sideLoc.length);
    } else {
      this.edgeLoc = this.edgeOrient = this.sideLoc = this.sideOrient = new Array(0);
    }

    // The owner is used to coordinate series of transformations (such as twisting)
    // that may only be performed by one entity at a time.
    this.owner = null;

    // This is set to true if a series of transformations shall be canceled.
    // Lengthy operations should check from time to time if cancel was requested
    // and then stop their operation as soon as possible.
    this.cancel = false;
  }

  /** Attempts to lock the cube for the specified owner.
   * Returns true on success.
   */
  lock(owner) {
    if (this.owner == null || this.owner === owner) {
      this.owner = owner;
      return true;
    }
    return false;
  }
  /** Attempts to unlock the cube from the specified owner.
   * Returns true on success.
   */
  unlock(owner) {
    if (this.owner === owner) {
      this.owner = null;
      return true;
    }
    return false;
  }

  /**
   * Compares two cubes for equality.
   */
  equals(that) {
    return that.getLayerCount() == this.layerCount
      && arraysEquals(that.getCornerLocations(), this.cornerLoc)
      && arraysEquals(that.getCornerOrientations(), this.cornerOrient)
      && arraysEquals(that.getEdgeLocations(), this.edgeLoc)
      && arraysEquals(that.getEdgeOrientations(), this.edgeOrient)
      && arraysEquals(that.getSideLocations(), this.sideLoc)
      && arraysEquals(that.getSideOrientations(), this.sideOrient);
  }

  /**
   * Returns the hash code for the cube.
   */

  hashCode() {
    let hash = 0;
    let sub = 0;
    for (let i = 0; i < this.cornerLoc.length; i++) {
      sub = sub << 1 + this.cornerLoc[i];
    }
    hash |= sub;
    sub = 0;
    for (let i = 0; i < this.edgeLoc.length; i++) {
      sub = sub << 1 + this.edgeLoc[i];
    }
    hash |= sub;
    sub = 0;
    for (let i = 0; i < this.sideLoc.length; i++) {
      sub = sub << 1 + this.sideLoc[i];
    }
    return hash;
  }

  /**
   * Resets the cube to its initial (ordered) state.
   */
  reset() {
    this.transformType = this.IDENTITY_TRANSFORM;

    let i;
    for (i = 0; i < this.cornerLoc.length; i++) {
      this.cornerLoc[i] = i;
      this.cornerOrient[i] = 0;
    }

    for (i = 0; i < this.edgeLoc.length; i++) {
      this.edgeLoc[i] = i;
      this.edgeOrient[i] = 0;
    }

    for (i = 0; i < this.sideLoc.length; i++) {
      this.sideLoc[i] = i;
      this.sideOrient[i] = 0;
    }

    this.fireCubeChanged(new CubeEvent(this, 0, 0, 0));
  }

  /**
   * Returns true if the cube is in its ordered (solved) state.
   */
  isSolved() {
    let i;
    for (i = 0; i < this.cornerLoc.length; i++) {
      if (this.cornerLoc[i] != i) {
        return false;
      }
      if (this.cornerOrient[i] != 0) {
        return false;
      }
    }

    for (i = 0; i < this.edgeLoc.length; i++) {
      if (this.edgeLoc[i] != i) {
        return false;
      }
      if (this.edgeOrient[i] != 0) {
        return false;
      }
    }

    for (i = 0; i < this.sideLoc.length; i++) {
      if (this.sideLoc[i] != i) {
        return false;
      }
      if (this.sideOrient[i] != 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Adds a listener for CubeEvent's.
   *
   * A listener must have a cubeTwisted() and a cubeChanged() function.
   */
  addCubeListener(l) {
    this.listenerList[this.listenerList.length] = l;
  }

  /**
   * Removes a listener for CubeEvent's.
   */
  removeCubeListener(l) {
    for (let i = 0; i < this.listenerList.length; i++) {
      if (this.listenerList[i] == l) {
        this.listenerList = this.listenerList.slice(0, i) + this.listenerList.slice(i + 1);
        break;
      }
    }
  }
  /**
   * Notify all listeners that have registered varerest for
   * notification on this event type.
   */
  fireCubeTwisted(event) {
    if (!this.quiet) {
      // Guaranteed to return a non-null array
      let listeners = this.listenerList;
      // Process the listeners last to first, notifying
      // those that are varerested in this event
      for (let i = listeners.length - 1; i >= 0; i -= 1) {
        listeners[i].cubeTwisted(event);
      }
    }
  }

  /**
   * Notify all listeners that have registered varerest for
   * notification on this event type.
   */
  fireCubeChanged(event) {
    if (!this.quiet) {
      // Guaranteed to return a non-null array
      let listeners = this.listenerList;
      // Process the listeners last to first, notifying
      // those that are varerested in this event
      for (let i = listeners.length - 1; i >= 0; i -= 1) {
        listeners[i].cubeChanged(event);
      }
    }
  }

  /**
   * Set this to false to prevent notification of listeners.
   * Setting this to true will fire a cubeChanged event.
   */
  setQuiet(b) {
    if (b != this.quiet) {
      this.quiet = b;
      if (!this.quiet) {
        this.fireCubeChanged(new CubeEvent(this, 0, 0, 0));
      }
    }
  }

  isQuiet() {
    return this.quiet;
  }

  /**
   * Returns the locations of all corner parts.
   */

  getCornerLocations() {
    return this.cornerLoc;
  }

  /**
   * Returns the orientations of all corner parts.
   */

  getCornerOrientations() {
    return this.cornerOrient;
  }

  /**
   * Sets the locations and orientations of all corner parts.
   */

  setCorners(locations, orientations) {
    {
      this.transformType = this.UNKNOWN_TRANSFORM;

      this.cornerLoc = locations.slice(0, this.cornerLoc.length);
      this.cornerOrient = orientations.slice(0, this.cornerOrient.length);
    }
    this.fireCubeChanged(new CubeEvent(this, 0, 0, 0));
  }

  /**
   * Gets the corner part at the specified location.
   */

  getCornerAt(location) {
    return this.cornerLoc[location];
  }

  /**
   * Gets the location of the specified corner part.
   */

  getCornerLocation(corner) {
    let i;
    if (this.cornerLoc[corner] == corner) {
      return corner;
    }
    for (i = this.cornerLoc.length - 1; i >= 0; i--) {
      if (this.cornerLoc[i] == corner) {
        break;
      }
    }
    return i;
  }

  /**
   * Returns the number of corner parts.
   */

  getCornerCount() {
    return this.cornerLoc.length;
  }

  /**
   * Returns the number of edge parts.
   */

  getEdgeCount() {
    return this.edgeLoc.length;
  }

  /**
   * Returns the number of side parts.
   */

  getSideCount() {
    return this.sideLoc.length;
  }

  /**
   * Gets the orientation of the specified corner part.
   */

  getCornerOrientation(corner) {
    return this.cornerOrient[this.getCornerLocation(corner)];
  }

  /**
   * Returns the locations of all edge parts.
   */

  getEdgeLocations() {
    return this.edgeLoc;
  }

  /**
   * Returns the orientations of all edge parts.
   */

  getEdgeOrientations() {
    return this.edgeOrient;
  }

  /**
   * Sets the locations and orientations of all edge parts.
   */
  setEdges(locations, orientations) {
    {
      this.transformType = this.UNKNOWN_TRANSFORM;
      this.edgeLoc = locations.slice(0, this.edgeLoc.length);
      this.edgeOrientations = this.edgeOrient.slice(0, this.edgeOrient.length);
    }
    this.fireCubeChanged(new CubeEvent(this, 0, 0, 0));
  }

  /**
   * Gets the edge part at the specified location.
   */
  getEdgeAt(location) {
    return this.edgeLoc[location];
  }

  /**
   * Gets the location of the specified edge part.
   */
  getEdgeLocation(edge) {
    let i;
    if (this.edgeLoc[edge] == edge) {
      return edge;
    }
    for (i = this.edgeLoc.length - 1; i >= 0; i--) {
      if (this.edgeLoc[i] == edge) {
        break;
      }
    }
    return i;
  }

  /**
   * Gets the orientation of the specified edge part.
   */
  getEdgeOrientation(edge) {
    return this.edgeOrient[this.getEdgeLocation(edge)];
  }

  /**
   * Returns the locations of all side parts.
   */
  getSideLocations() {
    return this.sideLoc;
  }

  /**
   * Returns the orientations of all side parts.
   */
  getSideOrientations() {
    return this.sideOrient;
  }

  /**
   * Sets the locations and orientations of all side parts.
   */
  setSides(locations, orientations) {
    {
      this.transformType = this.UNKNOWN_TRANSFORM;
      this.sideLoc = locations.slice(0, this.sideLoc.length);
      this.sideOrient = orientations.slice(0, this.sideOrient.length);
    }
    this.fireCubeChanged(new CubeEvent(this, 0, 0, 0));
  }

  /**
   * Gets the side part at the specified location.
   */
  getSideAt(location) {
    return this.sideLoc[location];
  }

  /**
   * Gets the face on which the sticker of the specified side part can
   * be seen.
   */
  getSideFace(sidePart) {
    return this.getSideLocation(sidePart) % 6;
  }

  /**
   * Gets the location of the specified side part.
   */
  getSideLocation(side) {
    let i;
    if (this.sideLoc[side] == side) {
      return side;
    }
    for (i = this.sideLoc.length - 1; i >= 0; i--) {
      if (this.sideLoc[i] == side) {
        break;
      }
    }
    return i;
  }

  /**
   * Gets the orientation of the specified side part.
   */
  getSideOrientation(side) {
    return this.sideOrient[this.getSideLocation(side)];
  }

  /**
   * Copies the permutation of the specified cube to this cube.
   *
   * @param tx The cube to be applied to this cube object.
   */
  setTo(that) {
    if (that.getLayerCount() != this.getLayerCount()) {
      throw ("that.layers=" + that.getLayerCount() + " must match this.layers=" + this.getLayerCount());
    }

    this.transformType = that.transformType;
    this.transformAxis = that.transformAxis;
    this.transformAngle = that.transformAngle;
    this.transformMask = that.transformMask;

    this.sideLoc = that.getSideLocations().slice(0, this.sideLoc.length);
    this.sideOrient = that.getSideOrientations().slice(0, this.sideOrient.length);
    this.edgeLoc = that.getEdgeLocations().slice(0, this.edgeLoc.length);
    this.edgeOrient = that.getEdgeOrientations().slice(0, this.edgeOrient.length);
    this.cornerLoc = that.getCornerLocations().slice(0, this.cornerLoc.length);
    this.cornerOrient = that.getCornerOrientations().slice(0, this.cornerOrient.length);
    this.fireCubeChanged(new CubeEvent(this, 0, 0, 0));
  }

  /**
   * Returns the number of layers on the x, y and z axis.
   */
  getLayerCount() {
    return this.layerCount;
  }

  /**
   * Transforms the cube and fires a cubeTwisted event. The actual work
   * is done in method transform0.
   *
   * @param  axis  0=x, 1=y, 2=z axis.
   * @param  layerMask A bitmask specifying the layers to be transformed.
   *           The size of the layer mask depends on the value returned by
   *           <code>getLayerCount(axis)</code>. For a 3x3x3 cube, the layer mask has the
   *           following meaning:
   *           7=rotate the whole cube;<br>
   *           1=twist slice near the axis (left, bottom, behind)<br>
   *           2=twist slice in the middle of the axis<br>
   *           4=twist slice far away from the axis (right, top, front)
   * @param  angle  positive values=clockwise rotation<br>
   *                negative values=counterclockwise rotation<br>
   *               1=90 degrees<br>
   *               2=180 degrees
   *
   * @see #getLayerCount()
   */
  transform(axis, layerMask, angle) {
    // Update transform type
    {
      switch (this.transformType) {
        case this.IDENTITY_TRANSFORM:
          this.transformAxis = axis;
          this.transformMask = layerMask;
          this.transformAngle = angle;
          this.transformType = this.SINGLE_AXIS_TRANSFORM;
          break;
        case this.SINGLE_AXIS_TRANSFORM:
          if (this.transformAxis == axis) {
            if (this.transformAngle == angle) {
              if (this.transformMask == layerMask) {
                this.transformAngle = (this.transformAngle + angle) % 3;
              } else if ((this.transformMask & layerMask) == 0) {
                this.transformMask |= layerMask;
              } else {
                this.transformType = this.GENERAL_TRANSFORM;
              }
            } else {
              if (this.transformMask == layerMask) {
                this.transformAngle = (this.transformAngle + angle) % 3;
              } else {
                this.transformType = this.GENERAL_TRANSFORM;
              }
            }
          } else {
            this.transformType = this.GENERAL_TRANSFORM;
          }
          break;
      }

      // Perform the transform
      this.transform0(axis, layerMask, angle);
    }

    // Inform listeners.
    if (!this.isQuiet()) {
      this.fireCubeTwisted(new CubeEvent(this, axis, layerMask, angle));
    }
  }

  /**
   * Transforms the cube and fires a cubeTwisted event.
   *
   * @param  axis  0=x, 1=y, 2=z axis.
   * @param  layerMask A bitmask specifying the layers to be transformed.
   *           The size of the layer mask depends on the value returned by
   *           <code>getLayerCount(axis)</code>. For a 3x3x3 cube, the layer mask has the
   *           following meaning:
   *           7=rotate the whole cube;<br>
   *           1=twist slice near the axis (left, bottom, behind)<br>
   *           2=twist slice in the middle of the axis<br>
   *           4=twist slice far away from the axis (right, top, front)
   * @param  angle  positive values=clockwise rotation<br>
   *                negative values=counterclockwise rotation<br>
   *               1=90 degrees<br>
   *               2=180 degrees
   *
   * @see #getLayerCount()
   */
  // protected abstract void transform0(axis, layerMask, angle);

  /**
   * Applies the permutation of the specified cube to this cube and fires a
   * cubeChanged event.
   *
   * @param tx The cube to be used to transform this cube object.
   * @exception InvalidArgumentException, if one or more of the values returned
   * by <code>tx.getLayourCount(axis)</code> are different from this cube.
   *
   * @see #getLayerCount()
   */
  transformFromCube(tx) {
    if (tx.getLayerCount() != this.getLayerCount()) {
      throw ("tx.layers=" + tx.getLayerCount() + " must match this.layers=" + this.getLayerCount());
    }

    let taxis = 0, tangle = 0, tmask = 0;
    {
      {
        {
          let atx = tx;
          switch (atx.transformType) {
            case this.IDENTITY_TRANSFORM:
              return; // nothing to do
            case SINGLE_AXIS_TRANSFORM:
              taxis = atx.transformAxis;
              tangle = atx.transformAngle;
              tmask = atx.transformMask;
              break;
          }
        }

        if (tmask == 0) {
          this.transformType = this.UNKNOWN_TRANSFORM;
          let tempLoc;
          let tempOrient;

          tempLoc = this.cornerLoc.slice(0);
          tempOrient = this.cornerOrient.slice(0);
          let txLoc = tx.getCornerLocations();
          let txOrient = tx.getCornerOrientations();
          for (let i = 0; i < txLoc.length; i++) {
            this.cornerLoc[i] = tempLoc[txLoc[i]];
            this.cornerOrient[i] = (tempOrient[txLoc[i]] + txOrient[i]) % 3;
          }

          tempLoc = this.edgeLoc.slice(0);
          tempOrient = this.edgeOrient.slice(0);
          txLoc = tx.getEdgeLocations();
          txOrient = tx.getEdgeOrientations();
          for (let i = 0; i < txLoc.length; i++) {
            this.edgeLoc[i] = tempLoc[txLoc[i]];
            this.edgeOrient[i] = (tempOrient[txLoc[i]] + txOrient[i]) % 2;
          }

          tempLoc = this.sideLoc.slice(0);
          tempOrient = this.sideOrient.slice(0);
          txLoc = tx.getSideLocations();
          txOrient = tx.getSideOrientations();
          for (let i = 0; i < txLoc.length; i++) {
            this.sideLoc[i] = tempLoc[txLoc[i]];
            this.sideOrient[i] = (tempOrient[txLoc[i]] + txOrient[i]) % 4;
          }
        }
      }
    }
    if (tmask == 0) {
      this.fireCubeChanged(new CubeEvent(this, 0, 0, 0));
    } else {
      this.transform(taxis, tmask, tangle);
    }
  }

  /**
   * Performs a two cycle permutation and orientation change.
   */
  twoCycle(
            loc, l1, l2,
            orient, o1, o2,
            modulo) {
    let swap;

    swap = loc[l1];
    loc[l1] = loc[l2];
    loc[l2] = swap;

    swap = orient[l1];
    orient[l1] = (orient[l2] + o1) % modulo;
    orient[l2] = (swap + o2) % modulo;
  }

  /**
   * Performs a four cycle permutation and orientation change.
   */
  fourCycle(
            loc, l1, l2, l3, l4,
            orient, o1, o2, o3, o4,
            modulo) {
    let swap;

    swap = loc[l1];
    loc[l1] = loc[l2];
    loc[l2] = loc[l3];
    loc[l3] = loc[l4];
    loc[l4] = swap;

    swap = orient[l1];
    orient[l1] = (orient[l2] + o1) % modulo;
    orient[l2] = (orient[l3] + o2) % modulo;
    orient[l3] = (orient[l4] + o3) % modulo;
    orient[l4] = (swap + o4) % modulo;
  }

  /**
   * Returns the face at which the indicated orientation
   * of the part is located.
   */
  getPartFace(part, orient) {
    {
      if (part < this.cornerLoc.length) {
        return getCornerFace(part, orient);
      } else if (part < this.cornerLoc.length + this.edgeLoc.length) {
        return getEdgeFace(part - this.cornerLoc.length, orient);
      } else if (part < this.cornerLoc.length + this.edgeLoc.length + this.sideLoc.length) {
        return getSideFace(part - this.cornerLoc.length - this.edgeLoc.length);
      } else {
        return getCenterSide(orient);
      }
    }
  }

  /**
   * Returns the orientation of the specified part.
   */
  getPartOrientation(part) {
    if (part < this.cornerLoc.length) {
      return this.getCornerOrientation(part);
    } else if (part < this.cornerLoc.length + this.edgeLoc.length) {
      return this.getEdgeOrientation(part - this.cornerLoc.length);
    } else if (part < this.cornerLoc.length + this.edgeLoc.length + this.sideLoc.length) {
      return this.getSideOrientation(part - this.cornerLoc.length - this.edgeLoc.length);
    } else {
      return this.getCubeOrientation();
    }
  }

  /**
   * Returns the location of the specified part.
   */
  getPartLocation(part) {
    if (part < this.cornerLoc.length) {
      return this.getCornerLocation(part);
    } else if (part < this.cornerLoc.length + this.edgeLoc.length) {
      return this.cornerLoc.length + this.getEdgeLocation(part - this.cornerLoc.length);
    } else if (part < this.cornerLoc.length + this.edgeLoc.length + this.sideLoc.length) {
      return this.cornerLoc.length + this.edgeLoc.length + this.getSideLocation(part - this.cornerLoc.length - this.edgeLoc.length);
    } else {
      return 0;
    }
  }

  /**
   * Returns the current axis on which the orientation of the part lies.
   * Returns -1 if the part lies on none or multiple axis (the center part).
   */
  getPartAxis(part, orientation) {
    if (part < this.cornerLoc.length) {
      // Corner parts
      let face = getPartFace(part, orientation);
      return (face) % 3;
    } else if (part < this.cornerLoc.length + this.edgeLoc.length) {
      // Edge parts
      return EDGE_TO_AXIS_MAP[getEdgeLocation(part - this.cornerLoc.length) % 12];
    } else if (part < this.cornerLoc.length + this.edgeLoc.length + this.sideLoc.length) {
      // Side parts
      let face = getPartFace(part, orientation);
      return (face) % 3;
    } else {
      return -1;
    }
  }

  /**
   * Returns the angle which is clockwise for the specified part orientation.
   * Returns 1 or -1.
   * Returns 0 if the direction can not be determined (the center part).
   */
  getPartAngle(part, orientation) {
    if (part >= this.cornerLoc.length && part < this.cornerLoc.length + this.edgeLoc.length) {
      // Edge parts
      return EDGE_TO_ANGLE_MAP[getEdgeLocation(part - this.cornerLoc.length) % 12][(getEdgeOrientation(part - this.cornerLoc.length) + orientation) % 2];
    } else {
      // Corner parts and Side parts
      let side = getPartFace(part, orientation);
      switch (side) {
        case 0:
        case 1:
        case 2:
          return 1;
        case 3:
        case 4:
        case 5:
        default:
          return -1;
      }
    }
  }

  /**
   * Returns the type of the specified part.
   */
  getPartType(part) {
    if (part < this.cornerLoc.length) {
      return this.CORNER_PART;
    } else if (part < this.cornerLoc.length + this.edgeLoc.length) {
      return this.EDGE_PART;
    } else if (part < this.cornerLoc.length + this.edgeLoc.length + this.sideLoc.length) {
      return this.SIDE_PART;
    } else {
      return this.CENTER_PART;
    }
  }

  /**
   * Returns the location of the specified part.
   */
  getPartAt(location) {
    let result = null;
    if (location < this.cornerLoc.length) {
      result = this.getCornerAt(location);
    } else if (location < this.cornerLoc.length + this.edgeLoc.length) {
      result = this.cornerLoc.length + this.getEdgeAt(location - this.cornerLoc.length);
    } else if (location < this.cornerLoc.length + this.edgeLoc.length + this.sideLoc.length) {
      result = this.cornerLoc.length + this.edgeLoc.length + this.getSideAt(location - this.cornerLoc.length - this.edgeLoc.length);
    } else {
      result = this.cornerLoc.length + this.edgeLoc.length + this.sideLoc.length;
    }
    module.log('getPartAt(' + location + "):" + result);
    return result;
  }

  /**
   * Returns the typed (part) index for a part index.
   * The typed index is the index which poconsts consto this.edgeLoc,.edgeOrient,
   * .cornerLoc,.cornerOrient,.sideLoc,.sideOrient respectively.
   */
  getTypedIndexForPartIndex(part) {
    if (part < this.cornerLoc.length) {
      return part;
    } else if (part < this.cornerLoc.length + this.edgeLoc.length) {
      return part - this.cornerLoc.length;
    } else if (part < this.cornerLoc.length + this.edgeLoc.length + this.sideLoc.length) {
      return part - this.cornerLoc.length - this.edgeLoc.length;
    } else {
      return part - this.cornerLoc.length - this.edgeLoc.length - this.sideLoc.length;
    }
  }

  /**
   * Returns the side at which the indicated orientation
   * of the center part is located.
   *
   * @return The side. A value ranging from 0 to 5.
   * <code><pre>
   *     +---+
   *     | 5 |
   * +---+---+---+---+
   * | 4 | 0 | 1 | 3 |
   * +---+---+---+---+
   *     | 2 |
   *     +---+
   * </pre></code>
   */
  getCenterSide(orient) {
    return this.CENTER_TO_SIDE_MAP[getCubeOrientation()][orient];
  }

  /**
   * Returns the face an which the sticker at the specified orientation
   * of the edge can be seen.
   */
  getEdgeFace(edge, orient) {
    let loc = getEdgeLocation(edge) % 12;
    let ori = (this.edgeOrient[loc] + orient) % 2;

    return this.EDGE_TO_FACE_MAP[loc][ori];
  }

  /**
   * Returns the face on which the sticker at the specified orientation
   * of the corner can be seen.
   */
  getCornerFace(corner, orient) {
    let loc = getCornerLocation(corner);
    let ori = (3 + orient - this.cornerOrient[loc]) % 3;
    return this.CORNER_TO_FACE_MAP[loc][ori];
  }

  /**
   * Returns the orientation of the whole cube.
   * @return The orientation of the cube, or -1 if
   * the orientation can not be determined.
   */
  getCubeOrientation() {
    // The cube has no orientation, if it has no side parts.
    if (this.sideLoc.length == 0) {
      return -1;
    }

    // The location of the front side and the right
    // side are used to determine the orientation
    // of the cube.
    switch (this.sideLoc[2] * 6 + this.sideLoc[0]) {
      case 2 * 6 + 0:
        return 0; // Front at front, Right at right
      case 4 * 6 + 0:
        return 1; // Front at Bottom, Right at right, CR
      case 5 * 6 + 0:
        return 2; // Back, Right, CR2
      case 1 * 6 + 0:
        return 3; // Top, Right, CR'
      case 0 * 6 + 5:
        return 4; // Right, Back, CU
      case 5 * 6 + 3:
        return 5; // Back, Left, CU2
      case 3 * 6 + 2:
        return 6; // Left, Front, CU'
      case 2 * 6 + 1:
        return 7; // Front, Top, CF
      case 2 * 6 + 3:
        return 8; // Front, Left, CF2
      case 2 * 6 + 4:
        return 9; // Front, Bottom, CF'
      case 0 * 6 + 1:
        return 10; // Right, Top, CR CU
      case 1 * 6 + 3:
        return 11; // Top, Left, CR CU2
      case 3 * 6 + 4:
        return 12; // Left, Down, CR CU'
      case 0 * 6 + 2:
        return 13; // Right, Front, CR2 CU
      case 3 * 6 + 5:
        return 14; // Left, Back, CR2 CU'
      case 0 * 6 + 4:
        return 15; // Right, Down, CR' CU
      case 4 * 6 + 3:
        return 16; // Down, Left, CR' CU2
      case 3 * 6 + 1:
        return 17; // Left, Up, CR' CU'
      case 4 * 6 + 1:
        return 18; // Down, Up, CR CF
      case 4 * 6 + 5:
        return 19; // Down, Back, CR CF'
      case 5 * 6 + 4:
        return 20; // Back, Down, CR2 CF
      case 5 * 6 + 1:
        return 21; // Back, Up, CR2 CF'
      case 1 * 6 + 5:
        return 22; // Up, Back, CR' CF
      case 1 * 6 + 2:
        return 23; // Up, Front, CR' CF'
      default:
        return -1;
    }
  }

  getPartCount() {
    return getCornerCount() + getEdgeCount() + getSideCount() + 1;
  }

  /**
   * Returns an array of part ID's, for each part in this cube,
   * which is not at its initial location or has not its initial
   * orientation.
   */
  getUnsolvedParts() {
    let a = new Array(this.cornerLoc.length + this.edgeLoc.length + this.sideLoc.length);
    let count = 0;
    for (let i = 0; i < this.cornerLoc.length; i++) {
      if (this.cornerLoc[i] != i || this.cornerOrient[i] != 0) {
        a[count++] = i;
      }
    }
    for (let i = 0; i < this.edgeLoc.length; i++) {
      if (this.edgeLoc[i] != i || this.edgeOrient[i] != 0) {
        a[count++] = i + this.cornerLoc.length;
      }
    }
    for (let i = 0; i < this.sideLoc.length; i++) {
      if (this.sideLoc[i] != i || this.sideOrient[i] != 0) {
        a[count++] = i + this.cornerLoc.length + this.edgeLoc.length;
      }
    }
    let result = new Array(count);
    result = a.slice(0, count);
    return result;
  }

  /** Scrambles the cube. */
  scramble(scrambleCount) {
    if (scrambleCount == null)
      scrambleCount = 21;

    this.setQuiet(true);

    // Keep track of previous axis, to avoid two subsequent moves on
    // the same axis.
    let prevAxis = -1;
    let axis, layerMask, angle;
    for (let i = 0; i < scrambleCount; i++) {
      while ((axis = Math.floor(Math.random() * 3)) == prevAxis) {
      }
      prevAxis = axis;
  //    while ((layerMask = Math.floor(Math.random()*(1 << this.layerCount))) == 0) {}
      layerMask = 1 << Math.floor(Math.random() * this.layerCount);
      while ((angle = Math.floor(Math.random() * 5) - 2) == 0) {
      }
      this.transform(axis, layerMask, angle);
    }

    this.setQuiet(false);
  }
}

/** Identifier for the corner part type. */
Cube.prototype.CORNER_PART = 0;
/** Identifier for the edge part type. */
Cube.prototype.EDGE_PART = 1;
/** Identifier for the side part type. */
Cube.prototype.SIDE_PART = 2;
/** Identifier for the center part type. */
Cube.prototype.CENTER_PART = 3;
/**
* Holds the number of corner parts, which is 8.
*/
Cube.prototype.NUMBER_OF_CORNER_PARTS = 8;
/**
* Listener support.
*/
Cube.prototype.listenerList = [];
/**
* Set this to true if listeners shall not be notified
* about state changes.
*/
Cube.prototype.quiet = false;
/**
* Number of layers on the x, y and z axis.
*/
Cube.prototype.layerCount;
/**
* This array holds the locations of the corner parts.
* <p>
* The value of an array element represents the ID of a corner part. The
* value must be element of {0..7}.
* <p>
* Each array element has a unique value.
* <p>
* Initially each corner part with ID i is located at Cube.prototype.cornerLoc[i].
*/
Cube.prototype.cornerLoc = [];
/**
* This array holds the orientations of the corner parts.
* <p>
* The value of an array element represents the orientation of a corner part.
* The value must be element of {0, 1, 2}.
* <ul>
* <li>0 = initial orientation</li>
* <li>1 = tilted counterclockwise</li>
* <li>2 = tilted clockwise</li>
* </ul>
* <p>
* Multiple array elements can have the same value.
* <p>
* Initially each corner part is oriented at orientation 0.
*/
Cube.prototype.cornerOrient = [];
/**
* This array holds the locations of the edge parts.
* <p>
* The value of an array element represents the ID of an edge part. The
* value must be element of {0..(n-1)}. Whereas n is the number of edge
* parts.
* <p>
* Each array element has a unique value.
* <p>
* Initially each edge part with ID i is located at Cube.prototype.edgeLoc[i].
*/
Cube.prototype.edgeLoc = [];
/**
* This array holds the orientations of the edge parts.
* <p>
* The value of an array element represents the orientation of an edge part.
* The value must be element of {0, 1}.
* <ul>
* <li>0 = initial orientation</li>
* <li>1 = flipped</li>
* </ul>
* <p>
* Multiple array elements can have the same value.
* <p>
* Initially each edge part is oriented at orientation 0.
*/
Cube.prototype.edgeOrient = [];
/**
* This array holds the locations of the side parts.
* <p>
* The value of an array element represents the ID of a side part. The
* value must be element of {0..(n-1)}. Whereas n is the number of side
* parts.
* <p>
* Each array element has a unique value.
* <p>
* Initially each side part with ID i is located at Cube.prototype.sideLoc[i].
*/
Cube.prototype.sideLoc = [];
/**
* This array holds the orientations of the side parts.
* <p>
* The value of an array element represents the orientation of a side part.
* The value must be element of {0, 1, 2, 4}.
* <ul>
* <li>0 = initial orientation</li>
* <li>1 = tilted counterclockwise</li>
* <li>2 = flipped</li>
* <li>3 = tilted clockwise</li>
* </ul>
* <p>
* Multiple array elements can have the same value.
* <p>
* Initially each side part is oriented at orientation 0.
*/
Cube.prototype.sideOrient = [];

/** Transformation types of the cube. */
Cube.prototype.IDENTITY_TRANSFORM = 0;
Cube.prototype.SINGLE_AXIS_TRANSFORM = 1;
Cube.prototype.GENERAL_TRANSFORM = 2;
Cube.prototype.UNKNOWN_TRANSFORM = 3;
/**
* This field caches the current transformation type of the cube.
*/
Cube.prototype.transformType = 0;//=Cube.prototype.IDENTITY_TRANSFORM;
/** If Cube.prototype.transformType is SINGLE_AXIS_TRANSFORM, this field holds the
* transformation axis. Otherwise, the value of this field is undefined.
*/
Cube.prototype.transformAxis = 0;
/** If Cube.prototype.transformType is SINGLE_AXIS_TRANSFORM, this field holds the
* transformation angle. Otherwise, the value of this field is undefined.
*/
Cube.prototype.transformAngle = 0;
/** If Cube.prototype.transformType is SINGLE_AXIS_TRANSFORM, this field holds the
* transformation mask. Otherwise, the value of this field is undefined.
*/
Cube.prototype.transformMask = 0;
/**
* This array maps corner parts to the six faces of the cube.
* <p>
* The first dimension of the array represents the locations, the
* second dimension the orientations. The values represent the 6 faces:
* 0=right, 1=up, 2=front, 3=left, 4=down, 5=back.
*/
Cube.prototype.CORNER_TO_FACE_MAP = [
[1, 0, 2], // urf
[4, 2, 0], // dfr
[1, 5, 0], // ubr
[4, 0, 5], // drb
[1, 3, 5], // ulb
[4, 5, 3], // dbl
[1, 2, 3], // ufl
[4, 3, 2], // dlf
];
/**
* This array maps edge parts to the three axes of the cube.
* <p>
* The index represents the ID of an edge.
* The values represent the 3 axes 0=x, 1=y and 2=z.
*/
Cube.prototype.EDGE_TO_AXIS_MAP = [
2, // edge 0
1, //      1
2, //      2
0, //      3
1,
0,
2,
1,
2,
0,
1,
0
];
/**
* This array maps edge parts to rotation angles over the three axes of the
* cube.
* <p>
* The index for the first dimension represents the location,
* the index for the second dimension the orientation.
* The value 1 represents clockwise angle, -1 represents
* counterclockwise angle.
*/
Cube.prototype.EDGE_TO_ANGLE_MAP = [
[1, -1], // edge 0 ur
[1, -1], //      1 rf
[-1, 1], //      2 dr
[-1, 1], //      3 bu
[-1, 1], //      4 rb
[1, -1], //      5 bd
[-1, 1], //      6 ul
[1, -1], //      7 lb
[1, -1], //      8 dl
[1, -1], //      9 fu
[-1, 1], //     10 lf
[-1, 1] //     11 fd
];
/**
* This array maps edge parts to the 6 faces of the cube.
* <p>
* The index for the first dimension represents the location,
* the index for the second dimension the orientation.
* The values represent the 6 faces:
* 0=right, 1=up, 2=front, 3=left, 4=down, 5=back.
*/
Cube.prototype.EDGE_TO_FACE_MAP = [
[1, 0], // edge 0 ur
[0, 2], //      1 rf
[4, 0], //      2 dr
[5, 1], //      3 bu
[0, 5], //      4 rb
[5, 0], //      5 bd
[1, 3], //      6 ul
[3, 5], //      7 lb
[4, 3], //      8 dl
[2, 1], //      9 fu
[3, 2], //     10 lf
[2, 4] //     11 fd
];
/**
* This is used for mapping center part orientations
* to the 6 sides of the cube.
* <p>
* The index for the first dimension represents the location,
* the index for the second dimension the orientation.
* The values represent the 6 sides.
*/
Cube.prototype.CENTER_TO_SIDE_MAP = [
//[f, r, d, b, l, u ]
[0, 1, 2, 3, 4, 5] // 0: Front at front, Right at right
, [5, 1, 0, 2, 4, 3]// 1: Bottom, Right, CR
, [3, 1, 5, 0, 4, 2]// 2: Back, Right, CR2
, [2, 1, 3, 5, 4, 0]// 3: Top, Right, CR'
, [4, 0, 2, 1, 3, 5]// 4: Right, Back, CU
, [3, 4, 2, 0, 1, 5]// 5: Back, Left, CU2
, [1, 3, 2, 4, 0, 5] // 6: // Left, Front, CU'
, [0, 2, 4, 3, 5, 1] // 7: // Front, Top, CF
, [0, 4, 5, 3, 1, 2] // 8: // Front, Left, CF2
, [0, 5, 1, 3, 2, 4] // 9: // Front, Bottom, CF'
, [5, 0, 4, 2, 3, 1] // 10: // Right, Top, CR CU
, [5, 4, 3, 2, 1, 0] // 11: // Top, Left, CR CU2
, [5, 3, 1, 2, 0, 4] // 12: // Left, Down, CR CU'
, [1, 0, 5, 4, 3, 2] // 13: // Right, Front, CR2 CU
, [4, 3, 5, 1, 0, 2] // 14: // Left, Back, CR2 CU'
, [2, 0, 1, 5, 3, 4] // 15: // Right, Down, CR' CU
, [2, 4, 0, 5, 1, 3] // 16: // Down, Left, CR' CU2
, [2, 3, 4, 5, 0, 1] // 17: // Left, Up, CR' CU'
, [1, 2, 0, 4, 5, 3] // 18: // Down, Up, CR CF
, [4, 5, 0, 1, 2, 3] // 19: // Down, Back, CR CF'
, [3, 2, 1, 0, 5, 4] // 20: // Back, Down, CR2 CF
, [3, 5, 4, 0, 2, 1] // 21: // Back, Up, CR2 CF'
, [4, 2, 3, 1, 5, 0] // 22: // Up, Back, CR' CF
, [1, 5, 3, 4, 2, 0] // 23: // Up, Front, CR' CF'
//[f, r, d, b, l, u ]
];
/* Corner swipe table.
* First dimension: side part index.
* Second dimension: orientation.
* Third dimension: swipe direction
* Fourth dimension: axis,layermask,angle
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
* </pre>*/
Cube.prototype.CORNER_SWIPE_TABLE = [
[// 0 urf
  [//u
    [2, 4, 1], // axis, layerMask, angle
    [0, 4, -1],
    [2, 4, -1],
    [0, 4, 1]
  ],
  [//r
    [1, 4, 1],
    [2, 4, -1],
    [1, 4, -1],
    [2, 4, 1]
  ],
  [//f
    [0, 4, -1],
    [1, 4, 1],
    [0, 4, 1],
    [1, 4, -1]
  ]
], [// 1 dfr
  [//d
    [0, 4, 1], // axis, layerMask, angle
    [2, 4, -1],
    [0, 4, -1],
    [2, 4, 1]
  ],
  [//f
    [1, 1, -1], // axis, layerMask, angle
    [0, 4, -1],
    [1, 1, 1],
    [0, 4, 1]
  ],
  [//r
    [2, 4, -1], // axis, layerMask, angle
    [1, 1, -1],
    [2, 4, 1],
    [1, 1, 1]
  ]
], [// 2 ubr
  [//u
    [0, 4, 1], // axis, layerMask, angle
    [2, 1, 1],
    [0, 4, -1],
    [2, 1, -1]
  ],
  [//b
    [1, 4, 1], // axis, layerMask, angle
    [0, 4, -1],
    [1, 4, -1],
    [0, 4, 1]
  ],
  [//r
    [2, 1, 1], // axis, layerMask, angle
    [1, 4, 1],
    [2, 1, -1],
    [1, 4, -1]
  ]
], [// 3 drb
  [//d
    [2, 1, -1], // axis, layerMask, angle
    [0, 4, -1],
    [2, 1, 1],
    [0, 4, 1]
  ],
  [//r
    [1, 1, -1], // axis, layerMask, angle
    [2, 1, 1],
    [1, 1, 1],
    [2, 1, -1]
  ],
  [//b
    [0, 4, -1], // axis, layerMask, angle
    [1, 1, -1],
    [0, 4, 1],
    [1, 1, 1]
  ]
], [// 4 ulb
  [//u
    [2, 1, -1], // axis, layerMask, angle
    [0, 1, 1],
    [2, 1, 1],
    [0, 1, -1]
  ],
  [//l
    [1, 4, 1], // axis, layerMask, angle
    [2, 1, 1],
    [1, 4, -1],
    [2, 1, -1]
  ],
  [//b
    [0, 1, 1], // axis, layerMask, angle
    [1, 4, 1],
    [0, 1, -1],
    [1, 4, -1]
  ]
], [// 5 dbl
  [//d
    [0, 1, -1], // axis, layerMask, angle
    [2, 1, 1],
    [0, 1, 1],
    [2, 1, -1]
  ],
  [//b
    [1, 1, -1], // axis, layerMask, angle
    [0, 1, 1],
    [1, 1, 1],
    [0, 1, -1]
  ],
  [//l
    [2, 1, 1], // axis, layerMask, angle
    [1, 1, -1],
    [2, 1, -1],
    [1, 1, 1]
  ]
], [// 6 ufl
  [//u
    [0, 1, -1], // axis, layerMask, angle
    [2, 4, -1],
    [0, 1, 1],
    [2, 4, 1]
  ],
  [//f
    [1, 4, 1], // axis, layerMask, angle
    [0, 1, 1],
    [1, 4, -1],
    [0, 1, -1]
  ],
  [//l
    [2, 4, -1], // axis, layerMask, angle
    [1, 4, 1],
    [2, 4, 1],
    [1, 4, -1]
  ]
], [// 7 dlf
  [//d
    [2, 4, 1], // axis, layerMask, angle
    [0, 1, 1],
    [2, 4, -1],
    [0, 1, -1]
  ],
  [//l
    [1, 1, -1], // axis, layerMask, angle
    [2, 4, -1],
    [1, 1, 1],
    [2, 4, 1]
  ],
  [//f
    [0, 1, 1], // axis, layerMask, angle
    [1, 1, -1],
    [0, 1, -1],
    [1, 1, 1]
  ]
]
];

/** Checks if the given arrays are equal. */
function arraysEquals(a, b) {
    if (a===b) {
        return true;
    }
    if (a==null || b==null){
        return false;
    }

    let length = a.length;
    if (b.length != length){
        return false;
    }

    for (let i=0,n=a.length;i<n;i++) {
        if (a[i]!=b[i]) return false;
    }
    return true;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * Represents the state of a 2-times sliced cube (Pocket Cube) by the location
 * and orientation of its parts.
 * <p>
 * A Pocket Cube has 8 corner parts.
 * The parts divide each face of the cube consto 2 x 2 layers.
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
 */
class PocketCube extends Cube {
  /** Creates a new instance. */
  constructor() {
    super(2);
    this.reset();
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
// Construct the name to part map.
{
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
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * Represents the state of a 3-times sliced cube (Rubik's Cube) by the location 
 * and orientation of its parts.
 * <p>
 * A Rubik's Cube has 8 corner parts, 12 edge parts, 6 face parts and one
 * center part. The parts divide each face of the cube consto 3 x 3 layers.
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
 */
class RubiksCube extends Cube {
  /** Creates a new instance. */
  constructor() {
    super(3);
    this.reset();
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
        switch (axis) {
        case 0: this.twistMR(); break;
        case 1: this.twistMU(); break;
        case 2: this.twistMF(); break;
        }
      }
    }

    if ((layerMask & 4) != 0) {
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
    this.fourCycle(this.edgeLoc, 0, 1, 2, 4, this.edgeOrient, 1, 1, 1, 1, 2);
    this.sideOrient[0] = (this.sideOrient[0] + 3) % 4;
  }

  twistU() {
    this.fourCycle(this.cornerLoc, 0, 2, 4, 6, this.cornerOrient, 0, 0, 0, 0, 3);
    this.fourCycle(this.edgeLoc, 0, 3, 6, 9, this.edgeOrient, 1, 1, 1, 1, 2);
    this.sideOrient[1] = (this.sideOrient[1] + 3) % 4;
  }

  twistF() {
    this.fourCycle(this.cornerLoc, 6, 7, 1, 0, this.cornerOrient, 1, 2, 1, 2, 3);
    this.fourCycle(this.edgeLoc, 9, 10, 11, 1, this.edgeOrient, 1, 1, 1, 1, 2);
    this.sideOrient[2] = (this.sideOrient[2] + 3) % 4;
  }

  twistL() {
    this.fourCycle(this.cornerLoc, 6, 4, 5, 7, this.cornerOrient, 2, 1, 2, 1, 3);
    this.fourCycle(this.edgeLoc, 6, 7, 8, 10, this.edgeOrient, 1, 1, 1, 1, 2);
    this.sideOrient[3] = (this.sideOrient[3] + 3) % 4;
  }

  twistD() {
    this.fourCycle(this.cornerLoc, 7, 5, 3, 1, this.cornerOrient, 0, 0, 0, 0, 3);
    this.fourCycle(this.edgeLoc, 2, 11, 8, 5, this.edgeOrient, 1, 1, 1, 1, 2);
    this.sideOrient[4] = (this.sideOrient[4] + 3) % 4;
  }

  twistB() {
    this.fourCycle(this.cornerLoc, 2, 3, 5, 4, this.cornerOrient, 1, 2, 1, 2, 3);
    this.fourCycle(this.edgeLoc, 3, 4, 5, 7, this.edgeOrient, 1, 1, 1, 1, 2);
    this.sideOrient[5] = (this.sideOrient[5] + 3) % 4;
  }

  twistMR() {
    this.fourCycle(this.edgeLoc, 3, 9, 11, 5, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 2, 4, 5, 1, this.sideOrient, 2, 3, 2, 1, 4);
  }

  twistMU() {
    this.fourCycle(this.edgeLoc, 1, 4, 7, 10, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 3, 2, 0, 5, this.sideOrient, 2, 1, 2, 3, 4);
  }

  twistMF() {
    this.fourCycle(this.edgeLoc, 0, 6, 8, 2, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 0, 1, 3, 4, this.sideOrient, 1, 2, 3, 2, 4);
  }

  clone() {
    let that = new RubiksCube();
    that.setTo(this);
    return that;
  }
}
// Construct the name to part map.
{
  let cornerParts = ["urf", "dfr", "ubr", "drb", "ulb", "dbl", "ufl", "dlf"];
  let edgeParts = ["ur", "rf", "dr", "bu", "rb", "bd", "ul", "lb", "dl", "fu", "lf", "fd"];
  let sideParts = ["r", "u", "f", "l", "d", "b"];
  let partMap = {center: 8 + 12 + 6};
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
      partMap[key1] = i + 8;
      partMap[key2] = i + 8;
  }
  for (let i = 0; i < sideParts.length; i++) {
      let name = sideParts[i];
      let key1 = name;
      partMap[key1] = i + 8 + 12;
  }
  /**
   * Maps the name of a part to its part index.
   */
  RubiksCube.prototype.NAME_PART_MAP = partMap;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Cube4
/**
 * Represents the state of a 4-times sliced cube (Revenge Cube) by the location 
 * and orientation of its parts.
 * <p>
 * A Revenge Cube has 8 corner parts, 24 edge parts, 24 side parts and one
 * center part. The parts divide each face of the cube consto 4 x 4 layers.
 * <p>
 * <b>Corner parts</b>
 * <p>
 * The following diagram shows the initial orientations and locations of 
 * the corner parts:
 * <pre>
 *                 +---+---+---+---+
 *                 |4.0|       |2.0|
 *                 +---+       +---+
 *                 |               |
 *                 +       u       +
 *                 |               |
 *                 +---+       +---+
 *                 |6.0|       |0.0|
 * +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 * |4.1|       |6.2|6.1|       |0.2|0.1|       |2.2|2.1|       |4.2|
 * +---+       +---+---+       +---+---+       +---+---+       +---+
 * |               |               |               |               |
 * +       l       +       f       +       r       +       b       +
 * |               |               |               |               |
 * +---+       +---+---+       +---+---+       +---+---+       +---+
 * |5.2|       |7.1|7.2|       |1.1|1.2|       |3.1|3.2|       |5.1|
 * +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 *                 |7.0|       |1.0|
 *                 +---+       +---+
 *                 |               |
 *                 +       d       +
 *                 |               |
 *                 +---+       +---+
 *                 |5.0|       |3.0|
 *                 +---+---+---+---+
 * </pre>
 * <p>
 * <b>Edge parts</b>
 * <p>
 * The following diagram shows the initial orientations and locations of 
 * the edge parts. The first 12 edges are located near the origins of the
 * x-, y- and z-axis. The second 12 edges are located far from the origin
 * of the x-, y- and z-axis.
 * <pre>
 *                         X---&gt;
 *                   +---+---+---+---+
 *                   |   |3.1|15 |   |
 *                 Z +---+---+---+---+ Z
 *                 | |6.0|       |0.0| |
 *                 v +---+   u   +---+ v
 *                   |18 |       |12 |
 *                   +---+---+---+---+
 *         Z---&gt;     |   |9.1|21 |   |      &lt;---Z           &lt;---X
 *   +---+---+---+---+---+---*---+---+---+---+---+---+---+---+---+---+
 *   |   |6.1|18 |   |   |9.0|21 |   |   |12 |0.1|   |   |15 |3.0|   |
 *   +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 * ^ |19 |       |22 |22 |       |13 |13 |       |16 |16 |       |19 | ^
 * | +---+   l   +---+---+   f   +---+---+   r   +---+---+   b   +---+ |
 * Y |7.0|       10.0|10.1       |1.1|1.0|       |4.0|4.1|       |7.1| Y
 *   +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 *   |   |8.1|20 |   |   11.0|23 |   |   |14 |2.1|   |   |17 |5.0|   |
 *   +---+---+---+---+---+---+---+---+---+---+---+---+---+---*---+---+
 *         Z---&gt;     |   11.1|23 |   |      &lt;---Z            &lt;---X
 *                   +---+---+---+---+
 *                   |20 |       |14 |
 *                   +---+   d   +---+ ^
 *                   |8.0|       |2.0| |
 *                   +---+---+---+---+ Z
 *                   |   |5.1|17 |   |
 *                   +---+---+---+---+
 *                       X---&gt;
 * </pre>
 * <p>
 * <b>Side parts</b>
 * <p>
 * The following diagram shows the initial orientation and location of 
 * the face parts:
 * <pre>
 *                 +---+---+---+---+
 *                 |      .1       |
 *                 +   +---+---+   +
 *                 |   | 1 | 7 |   |
 *                 + .0+---+---+.2 +
 *                 |   |19 |13 |   |
 *                 +   +---+---+   +
 *                 |      .3       |
 * +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 * |      .0       |      .2       |      .3       |      .1       |
 * +   +---+---+   +   +---+---+   +   +---+---+   +   +---+---+   +
 * |   |21 | 3 |   |   | 8 |14 |   |   |12 |18 |   |   | 5 |11 |   |
 * + .3+---+---+.1 + .1+---+---+.3 + .2+---+---+.0 + .0+---+---+.2 +
 * |   |15 | 9 |   |   | 2 |20 |   |   | 6 | 0 |   |   |23 |17 |   |
 * +   +---+---+   +   +---+---+   +   +---+---+   +   +---+---+   +
 * |      .2       |      .0       |      .1       |      .3       |
 * +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 *                 |      .0       |
 *                 +   +---+---+   +
 *                 |   |22 | 4 |   |
 *                 + .3+---+---+.1 +
 *                 |   |16 |10 |   |
 *                 +   +---+---+   +
 *                 |      .2       |
 *                 +---+---+---+---+
 * </pre>
 * <p>
 * For more information about the location and orientation of the parts see
 * {@link Cube}.
 */
class RevengeCube extends Cube {
  /** Creates a new instance. */
  constructor() {
    super(4);
    this.reset();
  }

  /**
  * Transforms the cube and fires a cubeTwisted event.
  *
  * @param  axis  0=x, 1=y, 2=z axis.
  * @param  layerMask A bitmask specifying the layers to be transformed.
  *           The size of the layer mask depends on the value returned by
  *           <code>getLayerCount(axis)</code>. For a 3x3x3 cube, the layer mask has the
  *           following meaning:
  *           15=rotate the whole cube;<br>
  *           1=twist slice near the axis (left, down, back)<br>
  *           2=twist slice in the near middle of the axis<br>
  *           4=twist slice in the far middle of the axis<br>
  *           8=twist slice far away from the axis (right, up, front)
  * @param  angle  positive values=clockwise rotation<br>
  *                negative values=counterclockwise rotation<br>
  *               1=90 degrees<br>
  *               2=180 degrees
  *
  * @see #getLayerCount()
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
      case -1: repeat=1; break;
      case  1: repeat=3; break;
      case  2: repeat=2; break;
      }
      for (let i=0;i<repeat;i++) {
        switch (axis) {
        case 0: this.twistML(); break;
        case 1: this.twistMD(); break;
        case 2: this.twistMB(); break;
        }
      }
    }
    if ((layerMask & 4) != 0) {
      let repeat;
      switch (an) {
      case -1: repeat=3; break;
      case  1: repeat=1; break;
      case  2: repeat=2; break;
      }
      for (let i=0;i<repeat;i++) {
        switch (axis) {
        case 0: this.twistMR(); break;
        case 1: this.twistMU(); break;
        case 2: this.twistMF(); break;
        }
      }
    }
    if ((layerMask & 8) != 0) {
      let repeat;
      switch (an) {
      case -1: repeat=3; break;
      case  1: repeat=1; break;
      case  2: repeat=2; break;
      }
      for (let i=0;i<repeat;i++) {
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
    this.fourCycle(this.edgeLoc, 12, 1, 2, 16, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 0, 13, 14, 4, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 0, 18, 12, 6, this.sideOrient, 3, 3, 3, 3, 4);
  }
  twistU() {
    this.fourCycle(this.cornerLoc, 0, 2, 4, 6, this.cornerOrient, 0, 0, 0, 0, 3);
    this.fourCycle(this.edgeLoc, 0, 3, 18, 21, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 12, 15, 6, 9, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 1, 19, 13, 7, this.sideOrient, 3, 3, 3, 3, 4);
  }
  twistF() {
    this.fourCycle(this.cornerLoc, 6, 7, 1, 0, this.cornerOrient, 1, 2, 1, 2, 3);
    this.fourCycle(this.edgeLoc, 21, 22, 11, 1, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 9, 10, 23, 13, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 2, 20, 14, 8, this.sideOrient, 3, 3, 3, 3, 4);
  }
  twistL() {
    this.fourCycle(this.cornerLoc, 6, 4, 5, 7, this.cornerOrient, 2, 1, 2, 1, 3);
    this.fourCycle(this.edgeLoc, 6, 7, 20, 22, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 18, 19, 8, 10, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 3, 21, 15, 9, this.sideOrient, 3, 3, 3, 3, 4);
  }
  twistD() {
    this.fourCycle(this.cornerLoc, 7, 5, 3, 1, this.cornerOrient, 0, 0, 0, 0, 3);
    this.fourCycle(this.edgeLoc, 2, 23, 20, 5, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 14, 11, 8, 17, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 4, 22, 16, 10, this.sideOrient, 3, 3, 3, 3, 4);
  }
  twistB() {
    this.fourCycle(this.cornerLoc, 2, 3, 5, 4, this.cornerOrient, 1, 2, 1, 2, 3);
    this.fourCycle(this.edgeLoc, 3, 16, 17, 7, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 15, 4, 5, 19, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 5, 23, 17, 11, this.sideOrient, 3, 3, 3, 3, 4);
  }
  twistMR() {
    this.fourCycle(this.edgeLoc, 15, 21, 23, 17, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 7, 14, 4, 23, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 13, 20, 10, 5, this.sideOrient, 1, 2, 3, 2, 4);
  }
  twistMU() {
    this.fourCycle(this.edgeLoc, 19, 22, 13, 16, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 3, 14, 18, 11, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 21, 8, 12, 5, this.sideOrient, 2, 1, 2, 3, 4);
  }
  twistMF() {
    this.fourCycle(this.edgeLoc, 12, 18, 20, 14, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 6, 13, 3, 22, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 12, 19, 9, 4, this.sideOrient, 1, 2, 3, 2, 4);
  }
  twistML() {
    this.fourCycle(this.edgeLoc, 5, 11, 9, 3, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 2, 19, 11, 16, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 8, 1, 17, 22, this.sideOrient, 3, 2, 1, 2, 4);
  }
  twistMD() {
    this.fourCycle(this.edgeLoc, 1, 10, 7, 4, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 0, 20, 9, 17, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 6, 2, 15, 23, this.sideOrient, 3, 2, 1, 2, 4);
  }
  twistMB() {
    this.fourCycle(this.edgeLoc, 0, 2, 8, 6, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 0, 16, 21, 7, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 18, 10, 15, 1, this.sideOrient, 2, 1, 2, 3, 4);
  }
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Cube5
/**
 * Represents the state of a 5-times sliced cube (Professor Cube) by the 
 * location and orientation of its parts.
 * <p>
 * A Professor Cube has 8 corner parts, 36 edge parts, 54 side parts and one
 * center part. The parts divide each face of the cube consto 5 x 5 layers.
 * <p>
 * <b>Corner parts</b>
 * <p>
 * The following diagram shows the initial orientations and locations of 
 * the corner parts:
 * <pre>
 *                     +---+---+---+---+---+
 *                     |4.0|           |2.0|
 *                     +---+           +---+
 *                     |                   |
 *                     +                   +
 *                     |         u         |
 *                     +                   +
 *                     |                   |
 *                     +---+           +---+
 *                     |6.0|           |0.0|
 * +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 * |4.1|           |6.2|6.1|           |0.2|0.1|           |2.2|2.1|           |4.2|
 * +---+           +---+---+           +---+---+           +---+---+           +---+
 * |                   |                   |                   |                   |
 * +                   +                   +                   +                   +
 * |         l         |         f         |         r         |     b             |
 * +                   +                   +                   +                   +
 * |                   |                   |                   |                   |
 * +---+           +---+---+           +---+---+           +---+---+           +---+
 * |5.2|           |7.1|7.2|           |1.1|1.2|           |3.1|3.2|           |5.1|
 * +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 *                     |7.0|           |1.0|
 *                     +---+           +---+
 *                     |                   |
 *                     +                   +
 *                     |         d         |
 *                     +                   +
 *                     |                   |
 *                     +---+           +---+
 *                     |5.0|           |3.0|
 *                     +---+---+---+---+---+
 * </pre>
 * <p>
 * <b>Edge parts</b>
 * <p>
 * The following diagram shows the initial orientations and locations of 
 * the edge parts. The first 12 edges are located at the center of the x-, y-,
 * and z-axis. The second 12 edges are located near the origins of the
 * x-, y- and z-axis. The last 12 edges are located far from the origin
 * of the x-, y- and z-axis.
 * <pre>
 *                             X---&gt;
 *                       +---+---+---+---+---+
 *                       |   |15 |3.1| 27|   |
 *                       +---+---+---+---+---+
 *                       |18 |           |12 |
 *                     Z +---+           +---+ Z
 *                     | |6.0|     u     |0.0| |
 *                     V +---+           +---+ V
 *                       |30 |           |24 |
 *                       +---+---+---+---+---+
 *           Z---&gt;       |   |21 |9.1|33 |   |       &lt;---Z               &lt;---X
 *   +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 *   |   |18 |6.1|30 |   |   |21 |9.0|33 |   |   |24 |0.1|12 |   |   |27 |3.0|15 |   |
 *   +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 *   |31 |           |34 |34 |           |25 |25 |           |28 |28 |           |31 |
 * ^ +---+           +---+---+           +---+---+           +---+---+           +---+ ^
 * | |7.0|    l      10.0|10.1     f     |1.1|1.0|     r     |4.0|4.1|     b     |7.1| |
 * Y +---+           +---+---+           +---+---+           +---+---+           +---+ Y
 *   |19 |           |22 |22 |           |13 |13 |           |16 |16 |           |19 |
 *   +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 *   |   |20 |8.1|32 |   |   |23 11.0|35 |   |   |26 |2.1|14 |   |   |29 |5.0| 17|   |
 *   +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 *                       |   |23 11.1|35 |   |       &lt;---Z               &lt;---X
 *                       +---+---+---+---+---+
 *                       |32 |           |26 |
 *                       +---+           +---+ ^
 *                       |8.0|     d     |2.0| |
 *                       +---+           +---+ Z
 *                       |20 |           |14 |
 *                       +---+---+---+---+---+
 *                       |   |17 |5.1|29 |   |
 *                       +---+---+---+---+---+
 *                                X--&gt;
 * </pre>
 * <p>
 * <b>Side parts</b>
 * <p>
 * The following diagram shows the initial orientation and location of 
 * the side parts:
 * <pre>
 *                     +---+---+---+---+---+
 *                     |        .1         |
 *                     +   +---+---+---+   +
 *                     |   | 7 |37 |13 |   |
 *                     +   +---+---+---+   +
 *                     | .0|31 | 1 |43 |.2 |
 *                     +   +---+---+---+   +
 *                     |   |25 |49 |19 |   |
 *                     +   +---+---+---+   +
 *                     |        .3         |
 * +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 * |        .0         |        .2         |        .3         |        .1         |
 * +   +---+---+---+   +   +---+---+---+   +   +---+---+---+   +   +---+---+---+   +
 * |   |27 |33 | 9 |   |   |14 |44 |20 |   |   |18 |48 |24 |   |   |11 |41 |17 |   |
 * +   +---+---+---+   +   +---+---+---+   +   +---+---+---+   +   +---+---+---+   +
 * | .3|51 | 3 |39 |.1 | .1|38 | 2 |50 |.3 | .2|42 | 0 |30 |.0 | .0|35 | 5 |47 |.2 |
 * +   +---+---+---+   +   +---+---+---+   +   +---+---+---+   +   +---+---+---+   +
 * |   |21 |45 |15 |   |   | 8 |32 |26 |   |   |12 |36 | 6 |   |   |29 |53 |23 |   |
 * +   +---+---+---+   +   +---+---+---+   +   +---+---+---+   +   +---+---+---+   +
 * |        .2         |        .0         |        .1         |        .3         |
 * +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 *                     |        .0         |
 *                     +   +---+---+---+   +
 *                     |   |28 |34 |10 |   |
 *                     +   +---+---+---+   +
 *                     | .3|52 | 4 |40 |.1 |
 *                     +   +---+---+---+   +
 *                     |   |22 |46 |16 |   |
 *                     +   +---+---+---+   +
 *                     |        .2         |
 *                     +---+---+---+---+---+
 * </pre>
 */
class ProfessorCube extends Cube {
    /** Creates a new instance. */
    constructor() {
        super(5);
        this.reset();
    }

    /**
     * Transforms the cube and fires a cubeTwisted event.
     *
     * @param  axis  0=x, 1=y, 2=z axis.
     * @param  layerMask A bitmask specifying the layers to be transformed.
     *           The size of the layer mask depends on the value returned by
     *           <code>getLayerCount(axis)</code>. For a 3x3x3 cube, the layer mask has the
     *           following meaning:
     *           31=rotate the whole cube;<br>
     *           1=twist slice near the axis (left, down, back)<br>
     *           2=twist slice in the near middle of the axis<br>
     *           4=twist slice in the middle of the axis<br>
     *           8=twist slice in the far middle of the axis<br>
     *           16=twist slice far away from the axis (right, up, front)
     * @param  angle  positive values=clockwise rotation<br>
     *                negative values=counterclockwise rotation<br>
     *               1=90 degrees<br>
     *               2=180 degrees
     *
     * @see #getLayerCount()
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
      case -1: repeat=1; break;
      case  1: repeat=3; break;
      case  2: repeat=2; break;
      }
      for (let i=0;i<repeat;i++) {
        switch (axis) {
        case 0: this.twistNL(); break;
        case 1: this.twistND(); break;
        case 2: this.twistNB(); break;
        }
      }
    }
    if ((layerMask & 4) != 0) {
      let repeat;
      switch (an) {
      case -1: repeat=3; break;
      case  1: repeat=1; break;
      case  2: repeat=2; break;
      }
      for (let i=0;i<repeat;i++) {
        switch (axis) {
        case 0: this.twistMR(); break;
        case 1: this.twistMU(); break;
        case 2: this.twistMF(); break;
        }
      }
    }
    if ((layerMask & 8) != 0) {
      let repeat;
      switch (an) {
      case -1: repeat=3; break;
      case  1: repeat=1; break;
      case  2: repeat=2; break;
      }
      for (let i=0;i<repeat;i++) {
        switch (axis) {
        case 0: this.twistNR(); break;
        case 1: this.twistNU(); break;
        case 2: this.twistNF(); break;
        }
      }
    }
    if ((layerMask & 16) != 0) {
      let repeat;
      switch (an) {
      case -1: repeat=3; break;
      case  1: repeat=1; break;
      case  2: repeat=2; break;
      }
      for (let i=0;i<repeat;i++) {
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
    this.fourCycle(this.edgeLoc, 0, 1, 2, 4, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 12, 25, 26, 16, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 24, 13, 14, 28, this.edgeOrient, 1, 1, 1, 1, 2);
    this.sideOrient[0] = (this.sideOrient[0] + 3) % 4;
    for (let i = 0; i < 48; i += 24) {
      this.fourCycle(this.sideLoc, 6 + i, 24 + i, 18 + i, 12 + i, this.sideOrient, 3, 3, 3, 3, 4);
    }
  }
  twistU() {
    this.fourCycle(this.cornerLoc, 0, 2, 4, 6, this.cornerOrient, 0, 0, 0, 0, 3);
    this.fourCycle(this.edgeLoc, 0, 3, 6, 9, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 12, 15, 30, 33, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 24, 27, 18, 21, this.edgeOrient, 1, 1, 1, 1, 2);
    this.sideOrient[1] = (this.sideOrient[1] + 3) % 4;
    for (let i = 0; i < 48; i += 24) {
      this.fourCycle(this.sideLoc, 7 + i, 25 + i, 19 + i, 13 + i, this.sideOrient, 3, 3, 3, 3, 4);
    }
  }
  twistF() {
    this.fourCycle(this.cornerLoc, 6, 7, 1, 0, this.cornerOrient, 1, 2, 1, 2, 3);
    this.fourCycle(this.edgeLoc, 9, 10, 11, 1, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 21, 22, 35, 25, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 33, 34, 23, 13, this.edgeOrient, 1, 1, 1, 1, 2);
    this.sideOrient[2] = (this.sideOrient[2] + 3) % 4;
    for (let i = 0; i < 48; i += 24) {
      this.fourCycle(this.sideLoc, 8 + i, 26 + i, 20 + i, 14 + i, this.sideOrient, 3, 3, 3, 3, 4);
    }
  }
  twistL() {
    this.fourCycle(this.cornerLoc, 6, 4, 5, 7, this.cornerOrient, 2, 1, 2, 1, 3);
    this.fourCycle(this.edgeLoc, 6, 7, 8, 10, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 18, 19, 32, 34, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 30, 31, 20, 22, this.edgeOrient, 1, 1, 1, 1, 2);
    this.sideOrient[3] = (this.sideOrient[3] + 3) % 4;
    for (let i = 0; i < 48; i += 24) {
      this.fourCycle(this.sideLoc, 9 + i, 27 + i, 21 + i, 15 + i, this.sideOrient, 3, 3, 3, 3, 4);
    }
  }
  twistD() {
    this.fourCycle(this.cornerLoc, 7, 5, 3, 1, this.cornerOrient, 0, 0, 0, 0, 3);
    this.fourCycle(this.edgeLoc, 2, 11, 8, 5, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 26, 23, 20, 29, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 14, 35, 32, 17, this.edgeOrient, 1, 1, 1, 1, 2);
    this.sideOrient[4] = (this.sideOrient[4] + 3) % 4;
    for (let i = 0; i < 48; i += 24) {
      this.fourCycle(this.sideLoc, 10 + i, 28 + i, 22 + i, 16 + i, this.sideOrient, 3, 3, 3, 3, 4);
    }
  }
  twistB() {
    this.fourCycle(this.cornerLoc, 2, 3, 5, 4, this.cornerOrient, 1, 2, 1, 2, 3);
    this.fourCycle(this.edgeLoc, 3, 4, 5, 7, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 27, 16, 17, 31, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 15, 28, 29, 19, this.edgeOrient, 1, 1, 1, 1, 2);
    this.sideOrient[5] = (this.sideOrient[5] + 3) % 4;
    for (let i = 0; i < 48; i += 24) {
      this.fourCycle(this.sideLoc, 11 + i, 29 + i, 23 + i, 17 + i, this.sideOrient, 3, 3, 3, 3, 4);
    }
  }
  twistMR() {
    this.fourCycle(this.edgeLoc, 3, 9, 11, 5, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 2, 4, 5, 1, this.sideOrient, 2, 3, 2, 1, 4);
    this.fourCycle(this.sideLoc, 44, 34, 53, 37, this.sideOrient, 2, 3, 2, 1, 4);
    this.fourCycle(this.sideLoc, 32, 46, 41, 49, this.sideOrient, 2, 3, 2, 1, 4);
  }
  twistMU() {
    this.fourCycle(this.edgeLoc, 1, 4, 7, 10, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 3, 2, 0, 5, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 51, 38, 42, 35, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 39, 50, 30, 47, this.sideOrient, 2, 1, 2, 3, 4);
  }
  twistMF() {
    this.fourCycle(this.edgeLoc, 0, 6, 8, 2, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 0, 1, 3, 4, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 48, 31, 45, 40, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 36, 43, 33, 52, this.sideOrient, 1, 2, 3, 2, 4);
  }
  twistNR() {
    this.fourCycle(this.edgeLoc, 27, 33, 35, 29, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 13, 20, 10, 29, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 43, 50, 40, 35, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 19, 26, 16, 11, this.sideOrient, 1, 2, 3, 2, 4);
    }
  twistNU() {
    this.fourCycle(this.edgeLoc, 25, 28, 31, 34, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 33, 44, 48, 41, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 27, 14, 18, 11, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 9, 20, 24, 17, this.sideOrient, 2, 1, 2, 3, 4);
  }
  twistNF() {
    this.fourCycle(this.edgeLoc, 24, 30, 32, 26, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 42, 49, 39, 34, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 18, 25, 15, 10, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 12, 19, 9, 28, this.sideOrient, 1, 2, 3, 2, 4);
  }
  twistNL() {
    this.fourCycle(this.edgeLoc, 17, 23, 21, 15, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 8, 25, 17, 22, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 38, 31, 47, 52, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 14, 7, 23, 28, this.sideOrient, 3, 2, 1, 2, 4);
  }
  twistND() {
    this.fourCycle(this.edgeLoc, 13, 22, 19, 16, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 36, 32, 45, 53, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 12, 8, 21, 29, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 6, 26, 15, 23, this.sideOrient, 3, 2, 1, 2, 4);
  }
  twistNB() {
    this.fourCycle(this.edgeLoc, 18, 12, 14, 20, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 6, 22, 27, 13, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 30, 46, 51, 37, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 24, 16, 21, 7, this.sideOrient, 2, 1, 2, 3, 4);
  }
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Cube6
/**
 * Represents the state of a 6-times sliced cube (such as a V-Cube 6) by the 
 * location and orientation of its parts.
 * <p>
 * A V-Cube 6 has 8 corner parts, 48 edge parts, 96 side parts and one
 * center part. The parts divide each face of the cube consto 6 x 6 layers.
 * <p>
 * <b>Corner parts</b>
 * <p>
 * The following diagram shows the initial orientations and locations of 
 * the corner parts:
 * <pre>
 *                         +---+---+---+---+---+---+
 *                         |4.0|               |2.0|
 *                         +---+               +---+
 *                         |                       |
 *                         +                       +
 *                         |                       |
 *                         +           u           +
 *                         |                       |
 *                         +                       +
 *                         |                       |
 *                         +---+               +---+
 *                         |6.0|               |0.0|
 * +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 * |4.1|               |6.2|6.1|               |0.2|0.1|               |2.2|2.1|               |4.2|
 * +---+               +---+---+               +---+---+               +---+---+               +---+
 * |                       |                       |                       |                       |
 * +                       +                       +                       +                       +
 * |                       |                       |                       |                       |
 * +           l           +           f           +           r           +           b           +
 * |                       |                       |                       |                       |
 * +                       +                       +                       +                       +
 * |                       |                       |                       |                       |
 * +---+               +---+---+               +---+---+               +---+---+               +---+
 * |5.2|               |7.1|7.2|               |1.1|1.2|               |3.1|3.2|               |5.1|
 * +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 *                         |7.0|               |1.0|
 *                         +---+               +---+
 *                         |                       |
 *                         +                       +
 *                         |           d           |
 *                         +                       +
 *                         |                       |
 *                         +                       +
 *                         |                       |
 *                         +---+               +---+
 *                         |5.0|               |3.0|
 *                         +---+---+---+---+---+---+
 * </pre>
 * <p>
 * <b>Edge parts</b>
 * <p>
 * The following diagram shows the initial orientations and locations of 
 * the edge parts. The first 12 edges are located near the origins of the
 * x-, y- and z-axis. The second 12 edges are located far from the origin
 * of the x-, y- and z-axis. The third 12 edges are located near the origins of
 * the axes. The fourth 12 edges are again located near the origins of the axes. 
 * <pre>
 *                                     X---&gt;
 *                           +---+---+---+---+---+---+
 *                           |   |27 |3.1|15 |39 |   |
 *                           +---+---+---+---+---+---+
 *                           |30 |               |24 |
 *                           +---+               +---+  
 *                           |6.0|               |0.0|
 *                         Z +---+       u       +---+ Z
 *                         | |18 |               |12 | |
 *                         V +---+               +---+ V
 *                           |42 |               |36 |
 *                           +---+---+---+---+---+---+
 *           Z---&gt;           |   |33 |9.1|21 |45 |   |       &lt;---Z                   &lt;---X
 *   +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 *   |   |30 |18 |6.1|42 |   |   |33 |9.0|21 |45 |   |   |36 |12 |0.1|24 |   |   |39 |15 |3.0|27 |   |
 *   +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 *   |43 |               |46 |46 |               |37 |37 |               |40 |40 |               |43 |
 * ^ +---+               +---+---+               +---+---+               +---+---+               +---+ ^
 * | |19 |               |22 |22 |               |13 |13 |               |16 |16 |               |19 | |
 * Y +---+       l       +---+---+       f       +---+---+       r       +---+---+       b       +---+ Y
 *   |7.0|               10.0|10.1               |1.1|1.0|               |4.0|4.1|               |7.1| 
 *   +---+               +---+---+               +---+---+               +---+---+               +---+  
 *   |31 |               |34 |34 |               |25 |25 |               |28 |28 |               |31 |
 *   +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 *   |   |32 |8.1|20 |44 |   |   |35 11.0|23 |47 |   |   |38 |14 |2.1|26 |   |   |41 |17 |5.0|29 |   |
 *   +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 *                           |   |35 11.1|23 |47 |   |       &lt;---Z                   &lt;---X
 *                           +---+---+---+---+---+---+
 *                           |44 |               |38 |
 *                           +---+               +---+ ^
 *                           |20 |               |14 | |
 *                           +---+       d       +---+ Z
 *                           |8.0|               |2.0| 
 *                           +---+               +---+  
 *                           |32 |               |26 |
 *                           +---+---+---+---+---+---+
 *                           |   |29 |5.1|17 |41 |   |
 *                           +---+---+---+---+---+---+
 *                                    X--&gt;
 * </pre>
 * <p>
 * <b>Side parts</b>
 * <p>
 * The following diagram shows the initial orientation and location of 
 * the side parts:
 * <pre>
 *                         +---+---+---+---+---+---+
 *                         |          .1           |
 *                         +   +---+---+---+---+   +
 *                         |   |25 |79 |55 |31 |   |
 *                         +   +---+---+---+---+   +
 *                         |   |49 | 1 | 7 |85 |   |
 *                         + .0+---+---+---+---+.2 +
 *                         |   |73 |19 |13 |61 |   |
 *                         +   +---+---+---+---+   +
 *                         |   |43 |67 |91 |37 |   |
 *                         +   +---+---+---+---+   +
 *                         |          .3           |
 * +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 * |          .0           |          .2           |          .3           |          .1           |
 * +   +---+---+---+---+   +   +---+---+---+---+   +   +---+---+---+---+   +   +---+---+---+---+   +
 * |   |45 |75 |51 |27 |   |   |32 |86 |62 |38 |   |   |36 |90 |66 |42 |   |   |29 |83 |59 |35 |   |
 * +   +---+---+---+---+   +   +---+---+---+---+   +   +---+---+---+---+   +   +---+---+---+---+   +
 * |   |69 |21 | 3 |81 |   |   |56 | 8 |14 |92 |   |   |60 |12 |18 |72 |   |   |53 | 5 |11 |89 |   |
 * + .3+---+---+---+---+.1 + .1+---+---+---+---+.3 + .2+---+---+---+---+.0 + .0+---+---+---+---+.2 +
 * |   |93 |15 | 9 |57 |   |   |80 | 2 |20 |68 |   |   |84 | 6 | 0 |48 |   |   |77 |23 |17 |65 |   |
 * +   +---+---+---+---+   +   +---+---+---+---+   +   +---+---+---+---+   +   +---+---+---+---+   +
 * |   |39 |63 |87 |33 |   |   |26 |50 |74 |44 |   |   |30 |54 |78 |24 |   |   |47 |71 |95 |41 |   |
 * +   +---+---+---+---+   +   +---+---+---+---+   +   +---+---+---+---+   +   +---+---+---+---+   +
 * |          .2           |          .0           |          .1           |          .3           |
 * +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 *                         |          .0           |
 *                         +   +---+---+---+---+   +
 *                         |   |46 |76 |52 |28 |   |
 *                         +   +---+---+---+---+   +
 *                         |   |70 |22 | 4 |82 |   |
 *                         + .3+---+---+---+---+.1 +
 *                         |   |94 |16 |10 |58 |   |
 *                         +   +---+---+---+---+   +
 *                         |   |40 |64 |88 |34 |   |
 *                         +   +---+---+---+---+   +
 *                         |          .2           |
 *                         +---+---+---+---+---+---+
 * </pre>
 */
class Cube6 extends Cube {
  /** Creates a new instance. */
  constructor() {
    super(6);
    this.reset();
  }
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
      case -1: repeat=1; break;
      case  1: repeat=3; break;
      case  2: repeat=2; break;
      }
      for (let i=0;i<repeat;i++) {
        switch (axis) {
        case 0: this.twistNL(); break;
        case 1: this.twistND(); break;
        case 2: this.twistNB(); break;
        }
      }
    }
    if ((layerMask & 4) != 0) {
      let repeat;
      switch (an) {
      case -1: repeat=1; break;
      case  1: repeat=3; break;
      case  2: repeat=2; break;
      }
      for (let i=0;i<repeat;i++) {
        switch (axis) {
        case 0: this.twistML(); break;
        case 1: this.twistMD(); break;
        case 2: this.twistMB(); break;
        }
      }
    }
    if ((layerMask & 8) != 0) {
      let repeat;
      switch (an) {
      case -1: repeat=3; break;
      case  1: repeat=1; break;
      case  2: repeat=2; break;
      }
      for (let i=0;i<repeat;i++) {
        switch (axis) {
        case 0: this.twistMR(); break;
        case 1: this.twistMU(); break;
        case 2: this.twistMF(); break;
        }
      }
    }
    if ((layerMask & 16) != 0) {
      let repeat;
      switch (an) {
      case -1: repeat=3; break;
      case  1: repeat=1; break;
      case  2: repeat=2; break;
      }
      for (let i=0;i<repeat;i++) {
        switch (axis) {
        case 0: this.twistNR(); break;
        case 1: this.twistNU(); break;
        case 2: this.twistNF(); break;
        }
      }
    }
    if ((layerMask & 32) != 0) {
      let repeat;
      switch (an) {
      case -1: repeat=3; break;
      case  1: repeat=1; break;
      case  2: repeat=2; break;
      }
      for (let i=0;i<repeat;i++) {
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
    this.fourCycle(this.edgeLoc, 12, 1, 2, 16, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 0, 13, 14, 4, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 24, 37, 38, 28, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 36, 25, 26, 40, this.edgeOrient, 1, 1, 1, 1, 2);
    for (let i = 0; i < 96; i += 24) {
      this.fourCycle(this.sideLoc, 0 + i, 18 + i, 12 + i, 6 + i, this.sideOrient, 3, 3, 3, 3, 4);
    }
  }
  twistU() {
    this.fourCycle(this.cornerLoc, 0, 2, 4, 6, this.cornerOrient, 0, 0, 0, 0, 3);
    this.fourCycle(this.edgeLoc, 0, 3, 18, 21, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 12, 15, 6, 9, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 24, 27, 42, 45, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 39, 30, 33, 36, this.edgeOrient, 1, 1, 1, 1, 2);
    for (let i = 0; i < 96; i += 24) {
      this.fourCycle(this.sideLoc, 1 + i, 19 + i, 13 + i, 7 + i, this.sideOrient, 3, 3, 3, 3, 4);
    }
  }
  twistF() {
    this.fourCycle(this.cornerLoc, 6, 7, 1, 0, this.cornerOrient, 1, 2, 1, 2, 3);
    this.fourCycle(this.edgeLoc, 21, 22, 11, 1, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 9, 10, 23, 13, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 33, 34, 47, 37, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 45, 46, 35, 25, this.edgeOrient, 1, 1, 1, 1, 2);
    for (let i = 0; i < 96; i += 24) {
      this.fourCycle(this.sideLoc, 2 + i, 20 + i, 14 + i, 8 + i, this.sideOrient, 3, 3, 3, 3, 4);
    }
  }
  twistL() {
    this.fourCycle(this.cornerLoc, 6, 4, 5, 7, this.cornerOrient, 2, 1, 2, 1, 3);
    this.fourCycle(this.edgeLoc, 6, 7, 20, 22, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 18, 19, 8, 10, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 30, 31, 44, 46, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 42, 43, 32, 34, this.edgeOrient, 1, 1, 1, 1, 2);
    for (let i = 0; i < 96; i += 24) {
      this.fourCycle(this.sideLoc, 3 + i, 21 + i, 15 + i, 9 + i, this.sideOrient, 3, 3, 3, 3, 4);
    }
  }
  twistD() {
    this.fourCycle(this.cornerLoc, 7, 5, 3, 1, this.cornerOrient, 0, 0, 0, 0, 3);
    this.fourCycle(this.edgeLoc, 2, 23, 20, 5, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 14, 11, 8, 17, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 26, 47, 44, 29, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 38, 35, 32, 41, this.edgeOrient, 1, 1, 1, 1, 2);
    for (let i = 0; i < 96; i += 24) {
      this.fourCycle(this.sideLoc, 4 + i, 22 + i, 16 + i, 10 + i, this.sideOrient, 3, 3, 3, 3, 4);
    }
  }
  twistB() {
    this.fourCycle(this.cornerLoc, 2, 3, 5, 4, this.cornerOrient, 1, 2, 1, 2, 3);
    this.fourCycle(this.edgeLoc, 3, 16, 17, 7, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 15, 4, 5, 19, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 27, 40, 41, 31, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.edgeLoc, 39, 28, 29, 43, this.edgeOrient, 1, 1, 1, 1, 2);
    for (let i = 0; i < 96; i += 24) {
      this.fourCycle(this.sideLoc, 5 + i, 23 + i, 17 + i, 11 + i, this.sideOrient, 3, 3, 3, 3, 4);
    }
  }
  twistMR() {
    this.fourCycle(this.edgeLoc, 15, 21, 23, 17, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 7, 14, 4, 23, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 13, 20, 10, 5, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 55, 62, 52, 71, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 91, 74, 88, 83, this.sideOrient, 1, 2, 3, 2, 4);
  }
  twistMU() {
    this.fourCycle(this.edgeLoc, 19, 22, 13, 16, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 3, 14, 18, 11, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 21, 8, 12, 5, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 69, 56, 60, 53, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 81, 92, 72, 89, this.sideOrient, 2, 1, 2, 3, 4);
  }
  twistMF() {
    this.fourCycle(this.edgeLoc, 12, 18, 20, 14, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 6, 13, 3, 22, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 12, 19, 9, 4, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 54, 61, 51, 70, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 90, 73, 87, 82, this.sideOrient, 1, 2, 3, 2, 4);
  }
  twistML() {
    this.fourCycle(this.edgeLoc, 5, 11, 9, 3, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 2, 19, 11, 16, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 8, 1, 17, 22, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 50, 67, 59, 64, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 86, 79, 95, 76, this.sideOrient, 3, 2, 1, 2, 4);
  }
  twistMD() {
    this.fourCycle(this.edgeLoc, 1, 10, 7, 4, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 0, 20, 9, 17, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 6, 2, 15, 23, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 48, 68, 57, 65, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 84, 80, 93, 77, this.sideOrient, 3, 2, 1, 2, 4);
  }
  twistMB() {
    this.fourCycle(this.edgeLoc, 0, 2, 8, 6, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 0, 16, 21, 7, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 18, 10, 15, 1, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 66, 58, 63, 49, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 78, 94, 75, 85, this.sideOrient, 2, 1, 2, 3, 4);
  }
  twistNR() {
    this.fourCycle(this.edgeLoc, 39, 45, 47, 41, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 31, 38, 28, 47, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 85, 92, 82, 77, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 61, 68, 58, 53, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 37, 44, 34, 29, this.sideOrient, 1, 2, 3, 2, 4);
    }
  twistNU() {
    this.fourCycle(this.edgeLoc, 43, 46, 37, 40, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 45, 32, 36, 29, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 75, 86, 90, 83, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 51, 62, 66, 59, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 27, 38, 42, 35, this.sideOrient, 2, 1, 2, 3, 4);
  }
  twistNF() {
    this.fourCycle(this.edgeLoc, 36, 42, 44, 38, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 36, 43, 33, 28, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 60, 67, 57, 52, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 84, 91, 81, 76, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 30, 37, 27, 46, this.sideOrient, 1, 2, 3, 2, 4);
  }
  twistNL() {
    this.fourCycle(this.edgeLoc, 29, 35, 33, 27, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 32, 25, 41, 46, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 56, 49, 65, 70, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 80, 73, 89, 94, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 26, 43, 35, 40, this.sideOrient, 3, 2, 1, 2, 4);
  }
  twistND() {
    this.fourCycle(this.edgeLoc, 25, 34, 31, 28, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 30, 26, 39, 47, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 54, 50, 63, 71, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 78, 74, 87, 95, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 24, 44, 33, 41, this.sideOrient, 3, 2, 1, 2, 4);
  }
  twistNB() {
    this.fourCycle(this.edgeLoc, 24, 26, 32, 30, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 42, 34, 39, 25, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 72, 88, 93, 79, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 48, 64, 69, 55, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 24, 40, 45, 31, this.sideOrient, 2, 1, 2, 3, 4);
  }
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Cube7
/**
 * Represents the state of a 7-times sliced cube (such as a V-Cube 7) by the
 * location and orientation of its parts.
 * <p>
 * A V-Cube 7 has 8 corner parts, 60 edge parts, 150 side parts and one
 * center part. The parts divide each face of the cube consto 7 x 7 layers.
 * <p>
 * <b>Corner parts</b>
 * <p>
 * The following diagram shows the initial orientations and locations of 
 * the corner parts:
 * <pre>
 *                             +---+---+---+---+---+---+---+
 *                             |4.0|                   |2.0|
 *                             +---+                   +---+
 *                             |                           |
 *                             +                           +
 *                             |                           |
 *                             +                           +
 *                             |             u             |
 *                             +                           +
 *                             |                           |
 *                             +                           +
 *                             |                           |
 *                             +---+                   +---+
 *                             |6.0|                   |0.0|
 * +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 * |4.1|                   |6.2|6.1|                   |0.2|0.1|                   |2.2|2.1|                   |4.2|
 * +---+                   +---+---+                   +---+---+                   +---+---+                   +---+
 * |                           |                           |                           |                           |
 * +                           +                           +                           +                           +
 * |                           |                           |                           |                           |
 * +                           +                           +                           +                           +
 * |             l             |             f             |             r             |             b             |
 * +                           +                           +                           +                           +
 * |                           |                           |                           |                           |
 * +                           +                           +                           +                           +
 * |                           |                           |                           |                           |
 * +---+                   +---+---+                   +---+---+                   +---+---+                   +---+
 * |5.2|                   |7.1|7.2|                   |1.1|1.2|                   |3.1|3.2|                   |5.1|
 * +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 *                             |7.0|                   |1.0|
 *                             +---+                   +---+
 *                             |                           |
 *                             +                           +
 *                             |                           |
 *                             +                           +
 *                             |             d             |
 *                             +                           +
 *                             |                           |
 *                             +                           +
 *                             |                           |
 *                             +---+                   +---+
 *                             |5.0|                   |3.0|
 *                             +---+---+---+---+---+---+---+
 * </pre>
 * <p>
 * <b>Edge parts</b>
 * <p>
 * The following diagram shows the initial orientations and locations of 
 * the edge parts. The first 12 edges are located at the center of the x-, y-,
 * and z-axis. The second 12 edges are located near the origins of the
 * x-, y- and z-axis. The last 12 edges are located far from the origin
 * of the x-, y- and z-axis.
 * <pre>
 *                                           X---&gt;
 *                               +---+---+---+---+---+---+---+
 *                               |   |39 |15 |3.1| 27|51 |   |
 *                               +---+---+---+---+---+---+---+
 *                               |42 |                   |36 |
 *                               +---+                   +---+ 
 *                               |18 |                   |12 |
 *                             Z +---+                   +---+ Z
 *                             | |6.0|         u         |0.0| |
 *                             V +---+                   +---+ V
 *                               |30 |                   |24 |
 *                               +---+                   +---+ 
 *                               |54 |                   |48 |
 *                               +---+---+---+---+---+---+---+
 *               Z---&gt;           |   |45 |21 |9.1|33 |57 |   |           &lt;---Z                       &lt;---X    
 *   +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 *   |   |42 |18 |6.1|30 |54 |   |   |45 |21 |9.0|33 |57 |   |   |48 |24 |0.1|12 |36 |   |   |51 |27 |3.0|15 |39 |   |
 *   +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 *   |55 |                   |58 |58 |                   |49 |49 |                   |52 |52 |                   |55 |
 *   +---+                   +---+---+                   +---+---+                   +---+---+                   +---+  
 *   |31 |                   |34 |34 |                   |25 |25 |                   |28 |28 |                   |31 |
 * ^ +---+                   +---+---+                   +---+---+                   +---+---+                   +---+ ^
 * | |7.0|        l          10.0|10.1         f         |1.1|1.0|         r         |4.0|4.1|         b         |7.1| |
 * Y +---+                   +---+---+                   +---+---+                   +---+---+                   +---+ Y
 *   |19 |                   |22 |22 |                   |13 |13 |                   |16 |16 |                   |19 |
 *   +---+                   +---+---+                   +---+---+                   +---+---+                   +---+  
 *   |43 |                   |46 |46 |                   |37 |37 |                   |40 |40 |                   |43 |
 *   +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 *   |   |44 |20 |8.1|32 |56 |   |   |47 |23 11.0|35 |59 |   |   |50 |26 |2.1|14 |38 |   |   |53 |29 |5.0| 17|41 |   |
 *   +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 *                               |   |47 |23 11.1|35 |59 |   |           &lt;---Z                       &lt;---X
 *                               +---+---+---+---+---+---+---+
 *                               |56 |                   |50 |
 *                               +---+                   +---+ 
 *                               |32 |                   |26 |
 *                               +---+                   +---+ ^
 *                               |8.0|         d         |2.0| |
 *                               +---+                   +---+ Z
 *                               |20 |                   |14 |
 *                               +---+                   +---+ 
 *                               |44 |                   |38 |
 *                               +---+---+---+---+---+---+---+
 *                               |   |41 |17 |5.1|29 |53 |   |
 *                               +---+---+---+---+---+---+---+
 *                                           X--&gt;
 * </pre>
 * <p>
 * <b>Side parts</b>
 * <p>
 * The following diagram shows the initial orientation and location of 
 * the side parts:
 * <pre>
 *                             +---+---+---+---+---+---+---+
 *                             |            .1             |
 *                             +   +---+---+---+---+---+   +
 *                             |   |55 |133|85 |109|61 |   |
 *                             +   +---+---+---+---+---+   +
 *                             |   |103| 7 |37 |13 |139|   |
 *                             +   +---+---+---+---+---+   +
 *                             | .0|79 |31 | 1 |43 |91 |.2 |
 *                             +   +---+---+---+---+---+   +
 *                             |   |127|25 |49 |19 |115|   |
 *                             +   +---+---+---+---+---+   +
 *                             |   |73 |121|97 |145|67 |   |
 *                             +   +---+---+---+---+---+   +
 *                             |            .3             |
 * +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 * |            .0             |            .2             |            .3             |            .1             |
 * +   +---+---+---+---+---+   +   +---+---+---+---+---+   +   +---+---+---+---+---+   +   +---+---+---+---+---+   +
 * |   |75 |129|81 |105|57 |   |   |62 |140|92 |116|68 |   |   |66 |144|96 |120|72 |   |   |59 |137|89 |113|65 |   |
 * +   +---+---+---+---+---+   +   +---+---+---+---+---+   +   +---+---+---+---+---+   +   +---+---+---+---+---+   +
 * |   |123|27 |33 | 9 |135|   |   |110|14 |44 |20 |146|   |   |114|18 |48 |24 |126|   |   |107|11 |41 |17 |143|   |
 * +   +---+---+---+---+---+   +   +---+---+---+---+---+   +   +---+---+---+---+---+   +   +---+---+---+---+---+   +
 * | .3|99 |51 | 3 |39 |87 |.1 | .1|86 |38 | 2 |50 |98 |.3 | .2|90 |42 | 0 |30 |78 |.0 | .0|83 |35 | 5 |47 |95 |.2 |
 * +   +---+---+---+---+---+   +   +---+---+---+---+---+   +   +---+---+---+---+---+   +   +---+---+---+---+---+   +
 * |   |147|21 |45 |15 |111|   |   |134| 8 |32 |26 |122|   |   |138|12 |36 | 6 |102|   |   |131|29 |53 |23 |119|   |
 * +   +---+---+---+---+---+   +   +---+---+---+---+---+   +   +---+---+---+---+---+   +   +---+---+---+---+---+   +
 * |   |69 |117|93 |141|63 |   |   |56 |104|80 |128|74 |   |   |60 |108|84 |132|54 |   |   |77 |125|101|149|71 |   |
 * +   +---+---+---+---+---+   +   +---+---+---+---+---+   +   +---+---+---+---+---+   +   +---+---+---+---+---+   +
 * |            .2             |            .0             |            .1             |            .3             |
 * +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 *                             |            .0             |
 *                             +   +---+---+---+---+---+   +
 *                             |   |76 |130|82 |106|58 |   |
 *                             +   +---+---+---+---+---+   +
 *                             |   |124|28 |34 |10 |136|   |
 *                             +   +---+---+---+---+---+   +
 *                             | .3|100|52 | 4 |40 |88 |.1 |
 *                             +   +---+---+---+---+---+   +
 *                             |   |148|22 |46 |16 |112|   |
 *                             +   +---+---+---+---+---+   +
 *                             |   |70 |118|94 |142|64 |   |
 *                             +   +---+---+---+---+---+   +
 *                             |            .2             |
 *                             +---+---+---+---+---+---+---+
 * </pre>
 */
class Cube7 extends Cube {
  /** Creates a new instance. */
  constructor() {
    super(7);
    this.reset();
  }
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
      case -1: repeat=1; break;
      case  1: repeat=3; break;
      case  2: repeat=2; break;
      }
      for (let i=0;i<repeat;i++) {
        switch (axis) {
        case 0: this.twistNL(); break;
        case 1: this.twistND(); break;
        case 2: this.twistNB(); break;
        }
      }
    }
    if ((layerMask & 4) != 0) {
      let repeat;
      switch (an) {
      case -1: repeat=1; break;
      case  1: repeat=3; break;
      case  2: repeat=2; break;
      }
      for (let i=0;i<repeat;i++) {
        switch (axis) {
        case 0: this.twistN3L(); break;
        case 1: this.twistN3D(); break;
        case 2: this.twistN3B(); break;
        }
      }
    }
    if ((layerMask & 8) != 0) {
      let repeat;
      switch (an) {
      case -1: repeat=3; break;
      case  1: repeat=1; break;
      case  2: repeat=2; break;
      }
      for (let i=0;i<repeat;i++) {
        switch (axis) {
        case 0: this.twistMR(); break;
        case 1: this.twistMU(); break;
        case 2: this.twistMF(); break;
        }
      }
    }
    if ((layerMask & 16) != 0) {
      let repeat;
      switch (an) {
      case -1: repeat=3; break;
      case  1: repeat=1; break;
      case  2: repeat=2; break;
      }
      for (let i=0;i<repeat;i++) {
        switch (axis) {
        case 0: this.twistN3R(); break;
        case 1: this.twistN3U(); break;
        case 2: this.twistN3F(); break;
        }
      }
    }
    if ((layerMask & 32) != 0) {
      let repeat;
      switch (an) {
      case -1: repeat=3; break;
      case  1: repeat=1; break;
      case  2: repeat=2; break;
      }
      for (let i=0;i<repeat;i++) {
        switch (axis) {
        case 0: this.twistNR(); break;
        case 1: this.twistNU(); break;
        case 2: this.twistNF(); break;
        }
      }
    }
    if ((layerMask & 64) != 0) {
      let repeat;
      switch (an) {
      case -1: repeat=3; break;
      case  1: repeat=1; break;
      case  2: repeat=2; break;
      }
      for (let i=0;i<repeat;i++) {
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
    this.fourCycle(this.edgeLoc, 0, 1, 2, 4, this.edgeOrient, 1, 1, 1, 1, 2);
    for (let i = 0; i < 48; i += 24) {
      this.fourCycle(this.edgeLoc, 12 + i, 25 + i, 26 + i, 16 + i, this.edgeOrient, 1, 1, 1, 1, 2);
    }
    for (let i = 0; i < 48; i += 24) {
      this.fourCycle(this.edgeLoc, 24 + i, 13 + i, 14 + i, 28 + i, this.edgeOrient, 1, 1, 1, 1, 2);
    }
    this.sideOrient[0] = (this.sideOrient[0] + 3) % 4;
    for (let i = 0; i < 144; i += 24) {
      this.fourCycle(this.sideLoc, 6 + i, 24 + i, 18 + i, 12 + i, this.sideOrient, 3, 3, 3, 3, 4);
    }
  }
  twistU() {
    this.fourCycle(this.cornerLoc, 0, 2, 4, 6, this.cornerOrient, 0, 0, 0, 0, 3);
    this.fourCycle(this.edgeLoc, 0, 3, 6, 9, this.edgeOrient, 1, 1, 1, 1, 2);
    for (let i = 0; i < 48; i += 24) {
      this.fourCycle(this.edgeLoc, 12 + i, 15 + i, 30 + i, 33 + i, this.edgeOrient, 1, 1, 1, 1, 2);
    }
    for (let i = 0; i < 48; i += 24) {
      this.fourCycle(this.edgeLoc, 24 + i, 27 + i, 18 + i, 21 + i, this.edgeOrient, 1, 1, 1, 1, 2);
    }
    this.sideOrient[1] = (this.sideOrient[1] + 3) % 4;
    for (let i = 0; i < 144; i += 24) {
      this.fourCycle(this.sideLoc, 7 + i, 25 + i, 19 + i, 13 + i, this.sideOrient, 3, 3, 3, 3, 4);
    }
  }
  twistF() {
    this.fourCycle(this.cornerLoc, 6, 7, 1, 0, this.cornerOrient, 1, 2, 1, 2, 3);
    this.fourCycle(this.edgeLoc, 9, 10, 11, 1, this.edgeOrient, 1, 1, 1, 1, 2);
    for (let i = 0; i < 48; i += 24) {
      this.fourCycle(this.edgeLoc, 21 + i, 22 + i, 35 + i, 25 + i, this.edgeOrient, 1, 1, 1, 1, 2);
    }
    for (let i = 0; i < 48; i += 24) {
      this.fourCycle(this.edgeLoc, 33 + i, 34 + i, 23 + i, 13 + i, this.edgeOrient, 1, 1, 1, 1, 2);
    }
    this.sideOrient[2] = (this.sideOrient[2] + 3) % 4;
    for (let i = 0; i < 144; i += 24) {
      this.fourCycle(this.sideLoc, 8 + i, 26 + i, 20 + i, 14 + i, this.sideOrient, 3, 3, 3, 3, 4);
    }
  }
  twistL() {
    this.fourCycle(this.cornerLoc, 6, 4, 5, 7, this.cornerOrient, 2, 1, 2, 1, 3);
    this.fourCycle(this.edgeLoc, 6, 7, 8, 10, this.edgeOrient, 1, 1, 1, 1, 2);
    for (let i = 0; i < 48; i += 24) {
      this.fourCycle(this.edgeLoc, 18 + i, 19 + i, 32 + i, 34 + i, this.edgeOrient, 1, 1, 1, 1, 2);
    }
    for (let i = 0; i < 48; i += 24) {
      this.fourCycle(this.edgeLoc, 30 + i, 31 + i, 20 + i, 22 + i, this.edgeOrient, 1, 1, 1, 1, 2);
    }
    this.sideOrient[3] = (this.sideOrient[3] + 3) % 4;
    for (let i = 0; i < 144; i += 24) {
      this.fourCycle(this.sideLoc, 9 + i, 27 + i, 21 + i, 15 + i, this.sideOrient, 3, 3, 3, 3, 4);
    }
  }
  twistD() {
    this.fourCycle(this.cornerLoc, 7, 5, 3, 1, this.cornerOrient, 0, 0, 0, 0, 3);
    this.fourCycle(this.edgeLoc, 2, 11, 8, 5, this.edgeOrient, 1, 1, 1, 1, 2);
    for (let i = 0; i < 48; i += 24) {
      this.fourCycle(this.edgeLoc, 26 + i, 23 + i, 20 + i, 29 + i, this.edgeOrient, 1, 1, 1, 1, 2);
    }
    for (let i = 0; i < 48; i += 24) {
      this.fourCycle(this.edgeLoc, 14 + i, 35 + i, 32 + i, 17 + i, this.edgeOrient, 1, 1, 1, 1, 2);
    }
    this.sideOrient[4] = (this.sideOrient[4] + 3) % 4;
    for (let i = 0; i < 144; i += 24) {
      this.fourCycle(this.sideLoc, 10 + i, 28 + i, 22 + i, 16 + i, this.sideOrient, 3, 3, 3, 3, 4);
    }
  }
  twistB() {
    this.fourCycle(this.cornerLoc, 2, 3, 5, 4, this.cornerOrient, 1, 2, 1, 2, 3);
    this.fourCycle(this.edgeLoc, 3, 4, 5, 7, this.edgeOrient, 1, 1, 1, 1, 2);
    for (let i = 0; i < 48; i += 24) {
      this.fourCycle(this.edgeLoc, 27 + i, 16 + i, 17 + i, 31 + i, this.edgeOrient, 1, 1, 1, 1, 2);
    }
    for (let i = 0; i < 48; i += 24) {
      this.fourCycle(this.edgeLoc, 15 + i, 28 + i, 29 + i, 19 + i, this.edgeOrient, 1, 1, 1, 1, 2);
    }
    this.sideOrient[5] = (this.sideOrient[5] + 3) % 4;
    for (let i = 0; i < 144; i += 24) {
      this.fourCycle(this.sideLoc, 11 + i, 29 + i, 23 + i, 17 + i, this.sideOrient, 3, 3, 3, 3, 4);
    }
  }
  twistMR() {
    this.fourCycle(this.edgeLoc, 3, 9, 11, 5, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 2, 4, 5, 1, this.sideOrient, 2, 3, 2, 1, 4);
    this.fourCycle(this.sideLoc, 44, 34, 53, 37, this.sideOrient, 2, 3, 2, 1, 4);
    this.fourCycle(this.sideLoc, 32, 46, 41, 49, this.sideOrient, 2, 3, 2, 1, 4);
    this.fourCycle(this.sideLoc, 92, 82, 101, 85, this.sideOrient, 2, 3, 2, 1, 4);
    this.fourCycle(this.sideLoc, 80, 94, 89, 97, this.sideOrient, 2, 3, 2, 1, 4);
  }
  twistMU() {
    this.fourCycle(this.edgeLoc, 1, 4, 7, 10, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 3, 2, 0, 5, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 51, 38, 42, 35, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 39, 50, 30, 47, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 99, 86, 90, 83, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 87, 98, 78, 95, this.sideOrient, 2, 1, 2, 3, 4);
  }
  twistMF() {
    this.fourCycle(this.edgeLoc, 0, 6, 8, 2, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 0, 1, 3, 4, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 48, 31, 45, 40, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 36, 43, 33, 52, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 96, 79, 93, 88, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 84, 91, 81, 100, this.sideOrient, 1, 2, 3, 2, 4);
  }
  twistN3R() {
    this.fourCycle(this.edgeLoc, 27, 33, 35, 29, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 43, 50, 40, 35, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 13, 20, 10, 29, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 19, 26, 16, 11, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 109, 116, 106, 125, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 145, 128, 142, 137, this.sideOrient, 1, 2, 3, 2, 4);
  }
  twistN3U() {
    this.fourCycle(this.edgeLoc, 25, 28, 31, 34, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 33, 44, 48, 41, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 27, 14, 18, 11, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 9, 20, 24, 17, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 123, 110, 114, 107, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 135, 146, 126, 143, this.sideOrient, 2, 1, 2, 3, 4);
  }
  twistN3F() {
    this.fourCycle(this.edgeLoc, 24, 30, 32, 26, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 42, 49, 39, 34, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 18, 25, 15, 10, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 12, 19, 9, 28, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 144, 127, 141, 136, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 108, 115, 105, 124, this.sideOrient, 1, 2, 3, 2, 4);
  }
  twistN3L() {
    this.fourCycle(this.edgeLoc, 17, 23, 21, 15, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 38, 31, 47, 52, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 8, 25, 17, 22, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 14, 7, 23, 28, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 104, 121, 113, 118, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 140, 133, 149, 130, this.sideOrient, 3, 2, 1, 2, 4);
  }
  twistN3D() {
    this.fourCycle(this.edgeLoc, 13, 22, 19, 16, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 36, 32, 45, 53, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 12, 8, 21, 29, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 6, 26, 15, 23, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 138, 134, 147, 131, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 102, 122, 111, 119, this.sideOrient, 3, 2, 1, 2, 4);
  }
  twistN3B() {
    this.fourCycle(this.edgeLoc, 18, 12, 14, 20, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 30, 46, 51, 37, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 6, 22, 27, 13, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 24, 16, 21, 7, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 132, 148, 129, 139, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 120, 112, 117, 103, this.sideOrient, 2, 1, 2, 3, 4);
  }
  twistNR() {
    this.fourCycle(this.edgeLoc, 51, 57, 59, 53, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 61, 68, 58, 77, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 139, 146, 136, 131, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 91, 98, 88, 83, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 115, 122, 112, 107, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 67, 74, 64, 59, this.sideOrient, 1, 2, 3, 2, 4);
  }
  twistNU() {
    this.fourCycle(this.edgeLoc, 55, 58, 49, 52, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 75, 62, 66, 59, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 129, 140, 144, 137, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 81, 92, 96, 89, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 105, 116, 120, 113, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 57, 68, 72, 65, this.sideOrient, 2, 1, 2, 3, 4);
  }
  twistNF() {
    this.fourCycle(this.edgeLoc, 48, 54, 56, 50, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 66, 73, 63, 58, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 114, 121, 111, 106, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 90, 97, 87, 82, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 138, 145, 135, 130, this.sideOrient, 1, 2, 3, 2, 4);
    this.fourCycle(this.sideLoc, 60, 67, 57, 76, this.sideOrient, 1, 2, 3, 2, 4);
  }
  twistNL() {
    this.fourCycle(this.edgeLoc, 41, 47, 45, 39, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 70, 56, 73, 65, this.sideOrient, 2, 3, 2, 1, 4);
    this.fourCycle(this.sideLoc, 148, 134, 127, 143, this.sideOrient, 2, 3, 2, 1, 4);
    this.fourCycle(this.sideLoc, 100, 86, 79, 95, this.sideOrient, 2, 3, 2, 1, 4);
    this.fourCycle(this.sideLoc, 124, 110, 103, 119, this.sideOrient, 2, 3, 2, 1, 4);
    this.fourCycle(this.sideLoc, 76, 62, 55, 71, this.sideOrient, 2, 3, 2, 1, 4);
  }
  twistND() {
    this.fourCycle(this.edgeLoc, 37, 46, 43, 40, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 60, 56, 69, 77, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 108, 104, 117, 125, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 84, 80, 93, 101, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 132, 128, 141, 149, this.sideOrient, 3, 2, 1, 2, 4);
    this.fourCycle(this.sideLoc, 54, 74, 63, 71, this.sideOrient, 3, 2, 1, 2, 4);
  }
  twistNB() {
    this.fourCycle(this.edgeLoc, 42, 36, 38, 44, this.edgeOrient, 1, 1, 1, 1, 2);
    this.fourCycle(this.sideLoc, 72, 64, 69, 55, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 126, 142, 147, 133, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 78, 94, 99, 85, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 102, 118, 123, 109, this.sideOrient, 2, 1, 2, 3, 4);
    this.fourCycle(this.sideLoc, 54, 70, 75, 61, this.sideOrient, 2, 1, 2, 3, 4);
  }
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function createCube(layerCount) {
  switch (layerCount) {
    case 2: return new PocketCube();
    case 3: return new RubiksCube();
    case 4: return new RevengeCube();
    case 5: return new ProfessorCube();
    case 6: return new Cube6();
    case 7: return new Cube7();
    default: throw "Cannot create a cube with "+layerCount+" layers.";
  }
}
// ------------------
// MODULE API    
// ------------------
export default {
  Cube: Cube,
  createCube: createCube,
}
