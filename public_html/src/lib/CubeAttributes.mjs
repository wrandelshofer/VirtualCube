/* @(#)CubeAttributes.mjs
 * Copyright (c) 2018 Werner Randelshofer, Switzerland. MIT License.
 */

    let module = {
      log: (false) ? console.log : ()=>{},
      info: (true) ? console.info : ()=>{},
      warning: (true) ? console.warning : ()=>{},
      error: (true) ? console.error : ()=>{}
    }

/** 
 * Holds the attributes of a Rubik's Cube like puzzle.
 */
class CubeAttributes {
  constructor(partCount, stickerCount, stickerCounts) {
    this. alpha = (-25 / 180.0 * Math.PI);
    this. beta = (45  / 180.0 * Math.PI);

    this.partsVisible = new Array(partCount);//boolean
    this.partsFillColor = new Array(partCount);//[r,g,b,a]
    this.partsPhong = new Array(partCount);//[ambient, diffuse, specular, shininess]
    this.stickersVisible = new Array(stickerCount);//boolean
    this.stickersFillColor = new Array(stickerCount);//[r,g,b,a]
    this.stickersPhong = new Array(stickerCount);//[ambient, diffuse, specular, shininess]
    this.stickerCounts = stickerCounts;//integer array for each face
    this.partExplosion = new Array(partCount);//float
    this.stickerExplosion = new Array(stickerCount);//float
    this.xRot=-25;
    this.yRot=-45;
    this.scaleFactor=1.0;
    this.explosionFactor=0;
    this.developmentFactor=0; // range [0,1]
    
    this.stickersImageURL=null;
    this.stickersImageVisible=true;
    
    // The twist duration of the cube.
    this.twistDuration=500;
    
    // The twist duration that will be set on twistDuration when the user
    // performs an twist operation.
    this.userTwistDuration=500;
    
    // The twist duration that will be set on twistDuration when the program
    // performs a scramble operation.
    this.scrambleTwistDuration=200;
    
    this.backgroundColor=[0, 0, 0, 0]; //[r,g,b,a]
    
    for (let i=0;i<partCount;i++) {
      this.partsVisible[i]=true;
      this.stickersVisible[i]=true;
      this.partExplosion[i]=0;
    }
    
    // The following values must be initialized explicitly
    this.faceCount=stickerCounts.length;
    this.stickerOffsets=new Array(stickerCounts);
    this.stickerOffsets[0]=0;
    for (let i=0;i<stickerCounts-1;i++) {
      this.stickerOffsets[i+1]=this.stickerOffsets[i]+stickerCounts[i];
    }
  }
  
  getFaceCount() {
    return this.faceCount;
  }
  getStickerOffset(face) {
    return this.stickerOffsets[face];
  }
  getStickerCount(face) {
    return this.stickerCounts[face];
  }
  getPartCount() {
    return this.partsVisible.length;
  }
  setExplosionFactor(newValue) {
      this.explosionFactor=newValue;
  }
  setScaleFactor(newValue) {
      this.scaleFactor=newValue;
  }
  setAlpha(newValue) {
      this.alpha=newValue;
  }
  setBeta(newValue) {
      this.beta=newValue;
  }
  setStickersImageUrl(newValue) {
      this.stickersImageURL=newValue;
  }
  getStickersImageUrl() {
      return this.stickersImageURL;
  }
  setStickersImageVisible(newValue) {
      this.stickersImageVisible=newValue;
  }
  setPartVisible(partIndex, newValue) {
    this.partsVisible[partIndex]=newValue;
  }
  isPartVisible(partIndex) {
    return this.partsVisible[partIndex];
  }
  setBackgroundColor(newValue) {
    this.backgroundColor = newValue;
  }
  setStickerFillColor(index, newValue) {
    this.stickersFillColor[index] = newValue;
  }
  setPartVisible(index, newValue) {
    this.partsVisible[index] = newValue;
  }
  setStickerVisible(index, newValue) {
    this.stickersVisible[index] = newValue;
  }
  setPartFillColor(index, newValue) {
    this.partsFillColor[index] = newValue;
  }
  setTwistDuration(newValue) {
    this.twistDuration = newValue;
  }
  /**
   * Gets the specified sticker fill color.
   * @param {type} index of sticker
   * @returns {Array} with [r,g,b,a] values
   */
  getStickerFillColor(index) {
      return this.stickersFillColor[index];
  }
  getTwistDuration() {
      return this.twistDuration;
  }
  getScrambleTwistDuration() {
      return this.scrambleTwistDuration;
  }
  getUserTwistDuration() {
      return this.userTwistDuration;
  }
}


// ------------------
// MODULE API    
// ------------------
export default {
    CubeAttributes : CubeAttributes,
}
