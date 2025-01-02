/* This file contains tests for ScriptParser.mjs.
 *
 * Assert that
 *   ScriptParser.parse(script).apply(cube)
 *   yields the expected results.
 */

import Cube from '../public_html/virtualcube/lib/Cube.mjs';
import Cubes from '../public_html/virtualcube/lib/Cubes.mjs';
import ScriptParser from '../public_html/virtualcube/lib/ScriptParser.mjs';
import ScriptNotation from '../public_html/virtualcube/lib/ScriptNotation.mjs';
import MoveMetrics from '../public_html/virtualcube/lib/MoveMetrics.mjs';

const notations = [
    null,
    null,
    new ScriptNotation.DefaultNotation(2),
    new ScriptNotation.DefaultNotation(3),
    new ScriptNotation.DefaultNotation(4),
    new ScriptNotation.DefaultNotation(5),
    new ScriptNotation.DefaultNotation(6),
    new ScriptNotation.DefaultNotation(7),
    ];

const parsers = [
    null,
    null,
    new ScriptParser.ScriptParser(notations[2]),
    new ScriptParser.ScriptParser(notations[3]),
    new ScriptParser.ScriptParser(notations[4]),
    new ScriptParser.ScriptParser(notations[5]),
    new ScriptParser.ScriptParser(notations[6]),
    new ScriptParser.ScriptParser(notations[7]),
    ];

/*
 * Returns true on success, false on failure.
 */
function testPattern(id,layerCount,script,expectedBtm,expectedFtm,expectedQtm,expectedOrder,expectedPermutation) {
    let cube = Cube.createCube(layerCount);
    let notation = notations[layerCount];
    let parser = parsers[layerCount];

    let parsedScript = parser.parse(script);
    parsedScript.applyTo(cube);

    let permutation = Cubes.toPermutationString(cube);
    let order = Cubes.getVisibleOrder(cube);
    let btm = MoveMetrics.getBlockTurnCount(parsedScript);
    let ftm = MoveMetrics.getFaceTurnCount(parsedScript);
    let qtm = MoveMetrics.getQuarterTurnCount(parsedScript);

    if (expectedPermutation != permutation
        ||expectedBtm!=btm
        ||expectedFtm!=ftm
        ||expectedQtm!=qtm
        ||expectedOrder!=order
        ) {
        print("Pattern3xTest id="+id+" layerCount="+layerCount+" failed.")
        print("  expected btm="+expectedBtm+" ftm="+expectedFtm+" qtm="+expectedQtm);
        print("  actual   btm="+btm+" ftm="+ftm+" qtm="+qtm);
        print("  expected perm="+expectedPermutation.replaceAll("\n"," "));
        print("  actual   perm="+permutation.replaceAll("\n"," "));
        return false;
    } else {
        //print("Pattern2xTest id="+id+" layerCount="+layerCount+" passed.")
    }

    return true;
}

 /*
  * Returns true on success, false on failure.
  */
export function test() {
     let data = [
        { id: "Move.MU", layerCount: 3, script: "MU", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(rf,fl,lb,br)\n(r,-f,+l,++b)", },
        { id: "Move.M1U", layerCount: 3, script: "M1U", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(rf,fl,lb,br)\n(r,-f,+l,++b)", },
        { id: "Move.WU", layerCount: 3, script: "WU", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(rf,fl,lb,br)\n(r,-f,+l,++b)", },
        { id: "Move.NU", layerCount: 3, script: "NU", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(rf,fl,lb,br)\n(r,-f,+l,++b)", },
        { id: "Move.N2U", layerCount: 3, script: "N2U", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(rf,fl,lb,br)\n(r,-f,+l,++b)", },
        { id: "Move.MF", layerCount: 3, script: "MF", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(ur,rd,dl,lu)\n(r,++d,-l,+u)", },
        { id: "Move.M1F", layerCount: 3, script: "M1F", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(ur,rd,dl,lu)\n(r,++d,-l,+u)", },
        { id: "Move.WF", layerCount: 3, script: "WF", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(ur,rd,dl,lu)\n(r,++d,-l,+u)", },
        { id: "Move.NF", layerCount: 3, script: "NF", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(ur,rd,dl,lu)\n(r,++d,-l,+u)", },
        { id: "Move.N2F", layerCount: 3, script: "N2F", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(ur,rd,dl,lu)\n(r,++d,-l,+u)", },
        { id: "Move.MR", layerCount: 3, script: "MR", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(bu,db,fd,uf)\n(u,++b,-d,+f)", },
        { id: "Move.M1R", layerCount: 3, script: "M1R", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(bu,db,fd,uf)\n(u,++b,-d,+f)", },
        { id: "Move.WR", layerCount: 3, script: "WR", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(bu,db,fd,uf)\n(u,++b,-d,+f)", },
        { id: "Move.NR", layerCount: 3, script: "NR", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(bu,db,fd,uf)\n(u,++b,-d,+f)", },
        { id: "Move.N2R", layerCount: 3, script: "N2R", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(bu,db,fd,uf)\n(u,++b,-d,+f)", },
        { id: "Move.VR", layerCount: 3, script: "VR", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(dbl,fdl,ufl,bul)\n(bu,db,fd,uf) (ul,bl,dl,fl)\n(-l) (u,++b,-d,+f)", },
        { id: "Move.V2R", layerCount: 3, script: "V2R", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(dbl,fdl,ufl,bul)\n(bu,db,fd,uf) (ul,bl,dl,fl)\n(-l) (u,++b,-d,+f)", },
        { id: "Move.VR2", layerCount: 3, script: "VR2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dlf,ulb) (ufl,dbl)\n(bu,fd) (bd,fu) (ul,dl) (lb,lf)\n(++l) (u,-d) (f,+b)", },
        { id: "Move.V2R2", layerCount: 3, script: "V2R2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dlf,ulb) (ufl,dbl)\n(bu,fd) (bd,fu) (ul,dl) (lb,lf)\n(++l) (u,-d) (f,+b)", },
        { id: "Move.MR2", layerCount: 3, script: "MR2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(bu,fd) (bd,fu)\n(u,-d) (f,+b)", },
        { id: "Move.M1R2", layerCount: 3, script: "M1R2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(bu,fd) (bd,fu)\n(u,-d) (f,+b)", },
        { id: "Move.WR2", layerCount: 3, script: "WR2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(bu,fd) (bd,fu)\n(u,-d) (f,+b)", },
        { id: "Move.NR2", layerCount: 3, script: "NR2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(bu,fd) (bd,fu)\n(u,-d) (f,+b)", },
        { id: "Move.N2R2", layerCount: 3, script: "N2R2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(bu,fd) (bd,fu)\n(u,-d) (f,+b)", },
        { id: "Move.CF", layerCount: 3, script: "CF", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(dfr,lfd,ufl,rfu) (drb,ldb,ulb,rub)\n(ur,rd,dl,lu) (rf,df,lf,uf) (bu,br,bd,bl)\n(+f) (-b) (r,++d,-l,+u)", },
        { id: "Move.T3F", layerCount: 3, script: "T3F", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(dfr,lfd,ufl,rfu) (drb,ldb,ulb,rub)\n(ur,rd,dl,lu) (rf,df,lf,uf) (bu,br,bd,bl)\n(+f) (-b) (r,++d,-l,+u)", },
        { id: "Move.CF2", layerCount: 3, script: "CF2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(dlf,urf) (ufl,dfr) (dbl,ubr) (ulb,drb)\n(ur,dl) (rf,lf) (dr,ul) (bu,bd) (rb,lb) (fu,fd)\n(++f) (++b) (r,-l) (u,+d)", },
        { id: "Move.T3F2", layerCount: 3, script: "T3F2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(dlf,urf) (ufl,dfr) (dbl,ubr) (ulb,drb)\n(ur,dl) (rf,lf) (dr,ul) (bu,bd) (rb,lb) (fu,fd)\n(++f) (++b) (r,-l) (u,+d)", },
        { id: "Move.CU", layerCount: 3, script: "CU", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(ufl,ulb,ubr,urf) (dlf,dbl,drb,dfr)\n(ur,uf,ul,ub) (rf,fl,lb,br) (dr,df,dl,db)\n(+u) (-d) (r,-f,+l,++b)", },
        { id: "Move.T3U", layerCount: 3, script: "T3U", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(ufl,ulb,ubr,urf) (dlf,dbl,drb,dfr)\n(ur,uf,ul,ub) (rf,fl,lb,br) (dr,df,dl,db)\n(+u) (-d) (r,-f,+l,++b)", },
        { id: "Move.TU2", layerCount: 3, script: "TU2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(ulb,urf) (ufl,ubr)\n(ur,ul) (rf,lb) (bu,fu) (rb,lf)\n(++u) (r,+l) (f,-b)", },
        { id: "Move.T2U2", layerCount: 3, script: "T2U2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(ulb,urf) (ufl,ubr)\n(ur,ul) (rf,lb) (bu,fu) (rb,lf)\n(++u) (r,+l) (f,-b)", },
        { id: "Move.CU2", layerCount: 3, script: "CU2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(ulb,urf) (dbl,dfr) (ufl,ubr) (dlf,drb)\n(ur,ul) (rf,lb) (dr,dl) (bu,fu) (rb,lf) (bd,fd)\n(++u) (++d) (r,+l) (f,-b)", },
        { id: "Move.T3U2", layerCount: 3, script: "T3U2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(ulb,urf) (dbl,dfr) (ufl,ubr) (dlf,drb)\n(ur,ul) (rf,lb) (dr,dl) (bu,fu) (rb,lf) (bd,fd)\n(++u) (++d) (r,+l) (f,-b)", },
        { id: "Move.MF2", layerCount: 3, script: "MF2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(ur,dl) (dr,ul)\n(r,-l) (u,+d)", },
        { id: "Move.M1F2", layerCount: 3, script: "M1F2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(ur,dl) (dr,ul)\n(r,-l) (u,+d)", },
        { id: "Move.WF2", layerCount: 3, script: "WF2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(ur,dl) (dr,ul)\n(r,-l) (u,+d)", },
        { id: "Move.NF2", layerCount: 3, script: "NF2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(ur,dl) (dr,ul)\n(r,-l) (u,+d)", },
        { id: "Move.N2F2", layerCount: 3, script: "N2F2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(ur,dl) (dr,ul)\n(r,-l) (u,+d)", },
        { id: "Move.CR", layerCount: 3, script: "CR", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(ubr,bdr,dfr,fur) (dbl,fdl,ufl,bul)\n(ur,br,dr,fr) (bu,db,fd,uf) (ul,bl,dl,fl)\n(+r) (-l) (u,++b,-d,+f)", },
        { id: "Move.T3R", layerCount: 3, script: "T3R", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(ubr,bdr,dfr,fur) (dbl,fdl,ufl,bul)\n(ur,br,dr,fr) (bu,db,fd,uf) (ul,bl,dl,fl)\n(+r) (-l) (u,++b,-d,+f)", },
        { id: "Move.TR2", layerCount: 3, script: "TR2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(drb,urf) (ubr,dfr)\n(ur,dr) (rf,rb) (bu,fd) (bd,fu)\n(++r) (u,-d) (f,+b)", },
        { id: "Move.T2R2", layerCount: 3, script: "T2R2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(drb,urf) (ubr,dfr)\n(ur,dr) (rf,rb) (bu,fd) (bd,fu)\n(++r) (u,-d) (f,+b)", },
        { id: "Move.CR2", layerCount: 3, script: "CR2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(drb,urf) (ubr,dfr) (dlf,ulb) (ufl,dbl)\n(ur,dr) (rf,rb) (bu,fd) (bd,fu) (ul,dl) (lb,lf)\n(++r) (++l) (u,-d) (f,+b)", },
        { id: "Move.T3R2", layerCount: 3, script: "T3R2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(drb,urf) (ubr,dfr) (dlf,ulb) (ufl,dbl)\n(ur,dr) (rf,rb) (bu,fd) (bd,fu) (ul,dl) (lb,lf)\n(++r) (++l) (u,-d) (f,+b)", },
        { id: "Move.TR", layerCount: 3, script: "TR", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ubr,bdr,dfr,fur)\n(ur,br,dr,fr) (bu,db,fd,uf)\n(+r) (u,++b,-d,+f)", },
        { id: "Move.T2R", layerCount: 3, script: "T2R", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ubr,bdr,dfr,fur)\n(ur,br,dr,fr) (bu,db,fd,uf)\n(+r) (u,++b,-d,+f)", },
        { id: "Move.SR", layerCount: 3, script: "SR", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(ubr,bdr,dfr,fur) (dbl,fdl,ufl,bul)\n(ur,br,dr,fr) (ul,bl,dl,fl)\n(+r) (-l)", },
        { id: "Move.S1R", layerCount: 3, script: "S1R", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(ubr,bdr,dfr,fur) (dbl,fdl,ufl,bul)\n(ur,br,dr,fr) (ul,bl,dl,fl)\n(+r) (-l)", },
        { id: "Move.SR2", layerCount: 3, script: "SR2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(drb,urf) (ubr,dfr) (dlf,ulb) (ufl,dbl)\n(ur,dr) (rf,rb) (ul,dl) (lb,lf)\n(++r) (++l)", },
        { id: "Move.S1R2", layerCount: 3, script: "S1R2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(drb,urf) (ubr,dfr) (dlf,ulb) (ufl,dbl)\n(ur,dr) (rf,rb) (ul,dl) (lb,lf)\n(++r) (++l)", },
        { id: "Move.R2", layerCount: 3, script: "R2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(drb,urf) (ubr,dfr)\n(ur,dr) (rf,rb)\n(++r)", },
        { id: "Move.T1R2", layerCount: 3, script: "T1R2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(drb,urf) (ubr,dfr)\n(ur,dr) (rf,rb)\n(++r)", },
        { id: "Move.N1R2", layerCount: 3, script: "N1R2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(drb,urf) (ubr,dfr)\n(ur,dr) (rf,rb)\n(++r)", },
        { id: "Move.F", layerCount: 3, script: "F", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(dfr,lfd,ufl,rfu)\n(rf,df,lf,uf)\n(+f)", },
        { id: "Move.T1F", layerCount: 3, script: "T1F", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(dfr,lfd,ufl,rfu)\n(rf,df,lf,uf)\n(+f)", },
        { id: "Move.N1F", layerCount: 3, script: "N1F", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(dfr,lfd,ufl,rfu)\n(rf,df,lf,uf)\n(+f)", },
        { id: "Move.SF", layerCount: 3, script: "SF", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(dfr,lfd,ufl,rfu) (drb,ldb,ulb,rub)\n(rf,df,lf,uf) (bu,br,bd,bl)\n(+f) (-b)", },
        { id: "Move.S1F", layerCount: 3, script: "S1F", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(dfr,lfd,ufl,rfu) (drb,ldb,ulb,rub)\n(rf,df,lf,uf) (bu,br,bd,bl)\n(+f) (-b)", },
        { id: "Move.SF2", layerCount: 3, script: "SF2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(dlf,urf) (ufl,dfr) (dbl,ubr) (ulb,drb)\n(rf,lf) (bu,bd) (rb,lb) (fu,fd)\n(++f) (++b)", },
        { id: "Move.S1F2", layerCount: 3, script: "S1F2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(dlf,urf) (ufl,dfr) (dbl,ubr) (ulb,drb)\n(rf,lf) (bu,bd) (rb,lb) (fu,fd)\n(++f) (++b)", },
        { id: "Move.TF2", layerCount: 3, script: "TF2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dlf,urf) (ufl,dfr)\n(ur,dl) (rf,lf) (dr,ul) (fu,fd)\n(++f) (r,-l) (u,+d)", },
        { id: "Move.T2F2", layerCount: 3, script: "T2F2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dlf,urf) (ufl,dfr)\n(ur,dl) (rf,lf) (dr,ul) (fu,fd)\n(++f) (r,-l) (u,+d)", },
        { id: "Move.VF", layerCount: 3, script: "VF", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(drb,ldb,ulb,rub)\n(ur,rd,dl,lu) (bu,br,bd,bl)\n(-b) (r,++d,-l,+u)", },
        { id: "Move.V2F", layerCount: 3, script: "V2F", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(drb,ldb,ulb,rub)\n(ur,rd,dl,lu) (bu,br,bd,bl)\n(-b) (r,++d,-l,+u)", },
        { id: "Move.VF2", layerCount: 3, script: "VF2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dbl,ubr) (ulb,drb)\n(ur,dl) (dr,ul) (bu,bd) (rb,lb)\n(++b) (r,-l) (u,+d)", },
        { id: "Move.V2F2", layerCount: 3, script: "V2F2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dbl,ubr) (ulb,drb)\n(ur,dl) (dr,ul) (bu,bd) (rb,lb)\n(++b) (r,-l) (u,+d)", },
        { id: "Move.F2", layerCount: 3, script: "F2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dlf,urf) (ufl,dfr)\n(rf,lf) (fu,fd)\n(++f)", },
        { id: "Move.T1F2", layerCount: 3, script: "T1F2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dlf,urf) (ufl,dfr)\n(rf,lf) (fu,fd)\n(++f)", },
        { id: "Move.N1F2", layerCount: 3, script: "N1F2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dlf,urf) (ufl,dfr)\n(rf,lf) (fu,fd)\n(++f)", },
        { id: "Move.TF", layerCount: 3, script: "TF", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(dfr,lfd,ufl,rfu)\n(ur,rd,dl,lu) (rf,df,lf,uf)\n(+f) (r,++d,-l,+u)", },
        { id: "Move.T2F", layerCount: 3, script: "T2F", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(dfr,lfd,ufl,rfu)\n(ur,rd,dl,lu) (rf,df,lf,uf)\n(+f) (r,++d,-l,+u)", },
        { id: "Move.U", layerCount: 3, script: "U", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ufl,ulb,ubr,urf)\n(ur,uf,ul,ub)\n(+u)", },
        { id: "Move.T1U", layerCount: 3, script: "T1U", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ufl,ulb,ubr,urf)\n(ur,uf,ul,ub)\n(+u)", },
        { id: "Move.N1U", layerCount: 3, script: "N1U", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ufl,ulb,ubr,urf)\n(ur,uf,ul,ub)\n(+u)", },
        { id: "Move.SU", layerCount: 3, script: "SU", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(ufl,ulb,ubr,urf) (dlf,dbl,drb,dfr)\n(ur,uf,ul,ub) (dr,df,dl,db)\n(+u) (-d)", },
        { id: "Move.S1U", layerCount: 3, script: "S1U", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(ufl,ulb,ubr,urf) (dlf,dbl,drb,dfr)\n(ur,uf,ul,ub) (dr,df,dl,db)\n(+u) (-d)", },
        { id: "Move.SU2", layerCount: 3, script: "SU2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(ulb,urf) (dbl,dfr) (ufl,ubr) (dlf,drb)\n(ur,ul) (dr,dl) (bu,fu) (bd,fd)\n(++u) (++d)", },
        { id: "Move.S1U2", layerCount: 3, script: "S1U2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(ulb,urf) (dbl,dfr) (ufl,ubr) (dlf,drb)\n(ur,ul) (dr,dl) (bu,fu) (bd,fd)\n(++u) (++d)", },
        { id: "Move.U2", layerCount: 3, script: "U2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(ulb,urf) (ufl,ubr)\n(ur,ul) (bu,fu)\n(++u)", },
        { id: "Move.T1U2", layerCount: 3, script: "T1U2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(ulb,urf) (ufl,ubr)\n(ur,ul) (bu,fu)\n(++u)", },
        { id: "Move.N1U2", layerCount: 3, script: "N1U2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(ulb,urf) (ufl,ubr)\n(ur,ul) (bu,fu)\n(++u)", },
        { id: "Move.VU", layerCount: 3, script: "VU", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(dlf,dbl,drb,dfr)\n(rf,fl,lb,br) (dr,df,dl,db)\n(-d) (r,-f,+l,++b)", },
        { id: "Move.V2U", layerCount: 3, script: "V2U", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(dlf,dbl,drb,dfr)\n(rf,fl,lb,br) (dr,df,dl,db)\n(-d) (r,-f,+l,++b)", },
        { id: "Move.VU2", layerCount: 3, script: "VU2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dbl,dfr) (dlf,drb)\n(rf,lb) (dr,dl) (rb,lf) (bd,fd)\n(++d) (r,+l) (f,-b)", },
        { id: "Move.V2U2", layerCount: 3, script: "V2U2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dbl,dfr) (dlf,drb)\n(rf,lb) (dr,dl) (rb,lf) (bd,fd)\n(++d) (r,+l) (f,-b)", },
        { id: "Move.MU2", layerCount: 3, script: "MU2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(rf,lb) (rb,lf)\n(r,+l) (f,-b)", },
        { id: "Move.M1U2", layerCount: 3, script: "M1U2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(rf,lb) (rb,lf)\n(r,+l) (f,-b)", },
        { id: "Move.WU2", layerCount: 3, script: "WU2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(rf,lb) (rb,lf)\n(r,+l) (f,-b)", },
        { id: "Move.NU2", layerCount: 3, script: "NU2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(rf,lb) (rb,lf)\n(r,+l) (f,-b)", },
        { id: "Move.N2U2", layerCount: 3, script: "N2U2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(rf,lb) (rb,lf)\n(r,+l) (f,-b)", },
        { id: "Move.TU", layerCount: 3, script: "TU", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ufl,ulb,ubr,urf)\n(ur,uf,ul,ub) (rf,fl,lb,br)\n(+u) (r,-f,+l,++b)", },
        { id: "Move.T2U", layerCount: 3, script: "T2U", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ufl,ulb,ubr,urf)\n(ur,uf,ul,ub) (rf,fl,lb,br)\n(+u) (r,-f,+l,++b)", },
        { id: "Move.R", layerCount: 3, script: "R", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ubr,bdr,dfr,fur)\n(ur,br,dr,fr)\n(+r)", },
        { id: "Move.T1R", layerCount: 3, script: "T1R", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ubr,bdr,dfr,fur)\n(ur,br,dr,fr)\n(+r)", },
        { id: "Move.N1R", layerCount: 3, script: "N1R", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ubr,bdr,dfr,fur)\n(ur,br,dr,fr)\n(+r)", },
        { id: "Move.TB", layerCount: 3, script: "TB", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ulb,ldb,drb,rub)\n(ur,lu,dl,rd) (bu,bl,bd,br)\n(+b) (r,+u,-l,++d)", },
        { id: "Move.T2B", layerCount: 3, script: "T2B", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ulb,ldb,drb,rub)\n(ur,lu,dl,rd) (bu,bl,bd,br)\n(+b) (r,+u,-l,++d)", },
        { id: "Move.MD", layerCount: 3, script: "MD", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(rf,br,lb,fl)\n(r,++b,+l,-f)", },
        { id: "Move.M1D", layerCount: 3, script: "M1D", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(rf,br,lb,fl)\n(r,++b,+l,-f)", },
        { id: "Move.WD", layerCount: 3, script: "WD", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(rf,br,lb,fl)\n(r,++b,+l,-f)", },
        { id: "Move.ND", layerCount: 3, script: "ND", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(rf,br,lb,fl)\n(r,++b,+l,-f)", },
        { id: "Move.N2D", layerCount: 3, script: "N2D", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(rf,br,lb,fl)\n(r,++b,+l,-f)", },
        { id: "Move.ML", layerCount: 3, script: "ML", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(bu,uf,fd,db)\n(u,+f,-d,++b)", },
        { id: "Move.M1L", layerCount: 3, script: "M1L", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(bu,uf,fd,db)\n(u,+f,-d,++b)", },
        { id: "Move.WL", layerCount: 3, script: "WL", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(bu,uf,fd,db)\n(u,+f,-d,++b)", },
        { id: "Move.NL", layerCount: 3, script: "NL", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(bu,uf,fd,db)\n(u,+f,-d,++b)", },
        { id: "Move.N2L", layerCount: 3, script: "N2L", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(bu,uf,fd,db)\n(u,+f,-d,++b)", },
        { id: "Move.CB", layerCount: 3, script: "CB", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(ufl,lfd,dfr,rfu) (ulb,ldb,drb,rub)\n(ur,lu,dl,rd) (rf,uf,lf,df) (bu,bl,bd,br)\n(-f) (+b) (r,+u,-l,++d)", },
        { id: "Move.T3B", layerCount: 3, script: "T3B", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(ufl,lfd,dfr,rfu) (ulb,ldb,drb,rub)\n(ur,lu,dl,rd) (rf,uf,lf,df) (bu,bl,bd,br)\n(-f) (+b) (r,+u,-l,++d)", },
        { id: "Move.L2", layerCount: 3, script: "L2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dlf,ulb) (ufl,dbl)\n(ul,dl) (lb,lf)\n(++l)", },
        { id: "Move.T1L2", layerCount: 3, script: "T1L2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dlf,ulb) (ufl,dbl)\n(ul,dl) (lb,lf)\n(++l)", },
        { id: "Move.N1L2", layerCount: 3, script: "N1L2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dlf,ulb) (ufl,dbl)\n(ul,dl) (lb,lf)\n(++l)", },
        { id: "Move.D2", layerCount: 3, script: "D2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dbl,dfr) (dlf,drb)\n(dr,dl) (bd,fd)\n(++d)", },
        { id: "Move.T1D2", layerCount: 3, script: "T1D2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dbl,dfr) (dlf,drb)\n(dr,dl) (bd,fd)\n(++d)", },
        { id: "Move.N1D2", layerCount: 3, script: "N1D2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dbl,dfr) (dlf,drb)\n(dr,dl) (bd,fd)\n(++d)", },
        { id: "Move.B2", layerCount: 3, script: "B2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dbl,ubr) (ulb,drb)\n(bu,bd) (rb,lb)\n(++b)", },
        { id: "Move.T1B2", layerCount: 3, script: "T1B2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dbl,ubr) (ulb,drb)\n(bu,bd) (rb,lb)\n(++b)", },
        { id: "Move.N1B2", layerCount: 3, script: "N1B2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dbl,ubr) (ulb,drb)\n(bu,bd) (rb,lb)\n(++b)", },
        { id: "Move.CL2", layerCount: 3, script: "CL2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(drb,urf) (ubr,dfr) (dlf,ulb) (ufl,dbl)\n(ur,dr) (rf,rb) (bu,fd) (bd,fu) (ul,dl) (lb,lf)\n(++r) (++l) (u,-d) (f,+b)", },
        { id: "Move.T3L2", layerCount: 3, script: "T3L2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(drb,urf) (ubr,dfr) (dlf,ulb) (ufl,dbl)\n(ur,dr) (rf,rb) (bu,fd) (bd,fu) (ul,dl) (lb,lf)\n(++r) (++l) (u,-d) (f,+b)", },
        { id: "Move.VB2", layerCount: 3, script: "VB2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dlf,urf) (ufl,dfr)\n(ur,dl) (rf,lf) (dr,ul) (fu,fd)\n(++f) (r,-l) (u,+d)", },
        { id: "Move.V2B2", layerCount: 3, script: "V2B2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dlf,urf) (ufl,dfr)\n(ur,dl) (rf,lf) (dr,ul) (fu,fd)\n(++f) (r,-l) (u,+d)", },
        { id: "Move.VL2", layerCount: 3, script: "VL2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(drb,urf) (ubr,dfr)\n(ur,dr) (rf,rb) (bu,fd) (bd,fu)\n(++r) (u,-d) (f,+b)", },
        { id: "Move.V2L2", layerCount: 3, script: "V2L2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(drb,urf) (ubr,dfr)\n(ur,dr) (rf,rb) (bu,fd) (bd,fu)\n(++r) (u,-d) (f,+b)", },
        { id: "Move.SB2", layerCount: 3, script: "SB2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(dlf,urf) (ufl,dfr) (dbl,ubr) (ulb,drb)\n(rf,lf) (bu,bd) (rb,lb) (fu,fd)\n(++f) (++b)", },
        { id: "Move.S1B2", layerCount: 3, script: "S1B2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(dlf,urf) (ufl,dfr) (dbl,ubr) (ulb,drb)\n(rf,lf) (bu,bd) (rb,lb) (fu,fd)\n(++f) (++b)", },
        { id: "Move.SL2", layerCount: 3, script: "SL2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(drb,urf) (ubr,dfr) (dlf,ulb) (ufl,dbl)\n(ur,dr) (rf,rb) (ul,dl) (lb,lf)\n(++r) (++l)", },
        { id: "Move.S1L2", layerCount: 3, script: "S1L2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(drb,urf) (ubr,dfr) (dlf,ulb) (ufl,dbl)\n(ur,dr) (rf,rb) (ul,dl) (lb,lf)\n(++r) (++l)", },
        { id: "Move.SD2", layerCount: 3, script: "SD2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(ulb,urf) (dbl,dfr) (ufl,ubr) (dlf,drb)\n(ur,ul) (dr,dl) (bu,fu) (bd,fd)\n(++u) (++d)", },
        { id: "Move.S1D2", layerCount: 3, script: "S1D2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(ulb,urf) (dbl,dfr) (ufl,ubr) (dlf,drb)\n(ur,ul) (dr,dl) (bu,fu) (bd,fd)\n(++u) (++d)", },
        { id: "Move.VD2", layerCount: 3, script: "VD2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(ulb,urf) (ufl,ubr)\n(ur,ul) (rf,lb) (bu,fu) (rb,lf)\n(++u) (r,+l) (f,-b)", },
        { id: "Move.V2D2", layerCount: 3, script: "V2D2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(ulb,urf) (ufl,ubr)\n(ur,ul) (rf,lb) (bu,fu) (rb,lf)\n(++u) (r,+l) (f,-b)", },
        { id: "Move.TD2", layerCount: 3, script: "TD2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dbl,dfr) (dlf,drb)\n(rf,lb) (dr,dl) (rb,lf) (bd,fd)\n(++d) (r,+l) (f,-b)", },
        { id: "Move.T2D2", layerCount: 3, script: "T2D2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dbl,dfr) (dlf,drb)\n(rf,lb) (dr,dl) (rb,lf) (bd,fd)\n(++d) (r,+l) (f,-b)", },
        { id: "Move.TB2", layerCount: 3, script: "TB2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dbl,ubr) (ulb,drb)\n(ur,dl) (dr,ul) (bu,bd) (rb,lb)\n(++b) (r,-l) (u,+d)", },
        { id: "Move.T2B2", layerCount: 3, script: "T2B2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dbl,ubr) (ulb,drb)\n(ur,dl) (dr,ul) (bu,bd) (rb,lb)\n(++b) (r,-l) (u,+d)", },
        { id: "Move.MB2", layerCount: 3, script: "MB2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(ur,dl) (dr,ul)\n(r,-l) (u,+d)", },
        { id: "Move.M1B2", layerCount: 3, script: "M1B2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(ur,dl) (dr,ul)\n(r,-l) (u,+d)", },
        { id: "Move.WB2", layerCount: 3, script: "WB2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(ur,dl) (dr,ul)\n(r,-l) (u,+d)", },
        { id: "Move.NB2", layerCount: 3, script: "NB2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(ur,dl) (dr,ul)\n(r,-l) (u,+d)", },
        { id: "Move.N2B2", layerCount: 3, script: "N2B2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(ur,dl) (dr,ul)\n(r,-l) (u,+d)", },
        { id: "Move.TL2", layerCount: 3, script: "TL2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dlf,ulb) (ufl,dbl)\n(bu,fd) (bd,fu) (ul,dl) (lb,lf)\n(++l) (u,-d) (f,+b)", },
        { id: "Move.T2L2", layerCount: 3, script: "T2L2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dlf,ulb) (ufl,dbl)\n(bu,fd) (bd,fu) (ul,dl) (lb,lf)\n(++l) (u,-d) (f,+b)", },
        { id: "Move.ML2", layerCount: 3, script: "ML2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(bu,fd) (bd,fu)\n(u,-d) (f,+b)", },
        { id: "Move.M1L2", layerCount: 3, script: "M1L2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(bu,fd) (bd,fu)\n(u,-d) (f,+b)", },
        { id: "Move.WL2", layerCount: 3, script: "WL2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(bu,fd) (bd,fu)\n(u,-d) (f,+b)", },
        { id: "Move.NL2", layerCount: 3, script: "NL2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(bu,fd) (bd,fu)\n(u,-d) (f,+b)", },
        { id: "Move.N2L2", layerCount: 3, script: "N2L2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(bu,fd) (bd,fu)\n(u,-d) (f,+b)", },
        { id: "Move.MD2", layerCount: 3, script: "MD2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(rf,lb) (rb,lf)\n(r,+l) (f,-b)", },
        { id: "Move.M1D2", layerCount: 3, script: "M1D2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(rf,lb) (rb,lf)\n(r,+l) (f,-b)", },
        { id: "Move.WD2", layerCount: 3, script: "WD2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(rf,lb) (rb,lf)\n(r,+l) (f,-b)", },
        { id: "Move.ND2", layerCount: 3, script: "ND2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(rf,lb) (rb,lf)\n(r,+l) (f,-b)", },
        { id: "Move.N2D2", layerCount: 3, script: "N2D2", btm: 1, ftm: 2, qtm: 4, order: 2, perm: "(rf,lb) (rb,lf)\n(r,+l) (f,-b)", },
        { id: "Move.CD2", layerCount: 3, script: "CD2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(ulb,urf) (dbl,dfr) (ufl,ubr) (dlf,drb)\n(ur,ul) (rf,lb) (dr,dl) (bu,fu) (rb,lf) (bd,fd)\n(++u) (++d) (r,+l) (f,-b)", },
        { id: "Move.T3D2", layerCount: 3, script: "T3D2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(ulb,urf) (dbl,dfr) (ufl,ubr) (dlf,drb)\n(ur,ul) (rf,lb) (dr,dl) (bu,fu) (rb,lf) (bd,fd)\n(++u) (++d) (r,+l) (f,-b)", },
        { id: "Move.CB2", layerCount: 3, script: "CB2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(dlf,urf) (ufl,dfr) (dbl,ubr) (ulb,drb)\n(ur,dl) (rf,lf) (dr,ul) (bu,bd) (rb,lb) (fu,fd)\n(++f) (++b) (r,-l) (u,+d)", },
        { id: "Move.T3B2", layerCount: 3, script: "T3B2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(dlf,urf) (ufl,dfr) (dbl,ubr) (ulb,drb)\n(ur,dl) (rf,lf) (dr,ul) (bu,bd) (rb,lb) (fu,fd)\n(++f) (++b) (r,-l) (u,+d)", },
        { id: "Move.CD", layerCount: 3, script: "CD", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(ubr,ulb,ufl,urf) (drb,dbl,dlf,dfr)\n(ur,ub,ul,uf) (rf,br,lb,fl) (dr,db,dl,df)\n(-u) (+d) (r,++b,+l,-f)", },
        { id: "Move.T3D", layerCount: 3, script: "T3D", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(ubr,ulb,ufl,urf) (drb,dbl,dlf,dfr)\n(ur,ub,ul,uf) (rf,br,lb,fl) (dr,db,dl,df)\n(-u) (+d) (r,++b,+l,-f)", },
        { id: "Move.CL", layerCount: 3, script: "CL", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(dfr,bdr,ubr,fur) (ufl,fdl,dbl,bul)\n(ur,fr,dr,br) (bu,uf,fd,db) (ul,fl,dl,bl)\n(-r) (+l) (u,+f,-d,++b)", },
        { id: "Move.T3L", layerCount: 3, script: "T3L", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(dfr,bdr,ubr,fur) (ufl,fdl,dbl,bul)\n(ur,fr,dr,br) (bu,uf,fd,db) (ul,fl,dl,bl)\n(-r) (+l) (u,+f,-d,++b)", },
        { id: "Move.VB", layerCount: 3, script: "VB", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ufl,lfd,dfr,rfu)\n(ur,lu,dl,rd) (rf,uf,lf,df)\n(-f) (r,+u,-l,++d)", },
        { id: "Move.V2B", layerCount: 3, script: "V2B", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ufl,lfd,dfr,rfu)\n(ur,lu,dl,rd) (rf,uf,lf,df)\n(-f) (r,+u,-l,++d)", },
        { id: "Move.VL", layerCount: 3, script: "VL", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(dfr,bdr,ubr,fur)\n(ur,fr,dr,br) (bu,uf,fd,db)\n(-r) (u,+f,-d,++b)", },
        { id: "Move.V2L", layerCount: 3, script: "V2L", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(dfr,bdr,ubr,fur)\n(ur,fr,dr,br) (bu,uf,fd,db)\n(-r) (u,+f,-d,++b)", },
        { id: "Move.SB", layerCount: 3, script: "SB", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(ufl,lfd,dfr,rfu) (ulb,ldb,drb,rub)\n(rf,uf,lf,df) (bu,bl,bd,br)\n(-f) (+b)", },
        { id: "Move.S1B", layerCount: 3, script: "S1B", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(ufl,lfd,dfr,rfu) (ulb,ldb,drb,rub)\n(rf,uf,lf,df) (bu,bl,bd,br)\n(-f) (+b)", },
        { id: "Move.SL", layerCount: 3, script: "SL", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(dfr,bdr,ubr,fur) (ufl,fdl,dbl,bul)\n(ur,fr,dr,br) (ul,fl,dl,bl)\n(-r) (+l)", },
        { id: "Move.S1L", layerCount: 3, script: "S1L", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(dfr,bdr,ubr,fur) (ufl,fdl,dbl,bul)\n(ur,fr,dr,br) (ul,fl,dl,bl)\n(-r) (+l)", },
        { id: "Move.SD", layerCount: 3, script: "SD", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(ubr,ulb,ufl,urf) (drb,dbl,dlf,dfr)\n(ur,ub,ul,uf) (dr,db,dl,df)\n(-u) (+d)", },
        { id: "Move.S1D", layerCount: 3, script: "S1D", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(ubr,ulb,ufl,urf) (drb,dbl,dlf,dfr)\n(ur,ub,ul,uf) (dr,db,dl,df)\n(-u) (+d)", },
        { id: "Move.VD", layerCount: 3, script: "VD", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ubr,ulb,ufl,urf)\n(ur,ub,ul,uf) (rf,br,lb,fl)\n(-u) (r,++b,+l,-f)", },
        { id: "Move.V2D", layerCount: 3, script: "V2D", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ubr,ulb,ufl,urf)\n(ur,ub,ul,uf) (rf,br,lb,fl)\n(-u) (r,++b,+l,-f)", },
        { id: "Move.TD", layerCount: 3, script: "TD", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(drb,dbl,dlf,dfr)\n(rf,br,lb,fl) (dr,db,dl,df)\n(+d) (r,++b,+l,-f)", },
        { id: "Move.T2D", layerCount: 3, script: "T2D", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(drb,dbl,dlf,dfr)\n(rf,br,lb,fl) (dr,db,dl,df)\n(+d) (r,++b,+l,-f)", },
        { id: "Move.MB", layerCount: 3, script: "MB", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(ur,lu,dl,rd)\n(r,+u,-l,++d)", },
        { id: "Move.M1B", layerCount: 3, script: "M1B", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(ur,lu,dl,rd)\n(r,+u,-l,++d)", },
        { id: "Move.WB", layerCount: 3, script: "WB", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(ur,lu,dl,rd)\n(r,+u,-l,++d)", },
        { id: "Move.NB", layerCount: 3, script: "NB", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(ur,lu,dl,rd)\n(r,+u,-l,++d)", },
        { id: "Move.N2B", layerCount: 3, script: "N2B", btm: 1, ftm: 2, qtm: 2, order: 4, perm: "(ur,lu,dl,rd)\n(r,+u,-l,++d)", },
        { id: "Move.TL", layerCount: 3, script: "TL", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ufl,fdl,dbl,bul)\n(bu,uf,fd,db) (ul,fl,dl,bl)\n(+l) (u,+f,-d,++b)", },
        { id: "Move.T2L", layerCount: 3, script: "T2L", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ufl,fdl,dbl,bul)\n(bu,uf,fd,db) (ul,fl,dl,bl)\n(+l) (u,+f,-d,++b)", },
        { id: "Move.B", layerCount: 3, script: "B", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ulb,ldb,drb,rub)\n(bu,bl,bd,br)\n(+b)", },
        { id: "Move.T1B", layerCount: 3, script: "T1B", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ulb,ldb,drb,rub)\n(bu,bl,bd,br)\n(+b)", },
        { id: "Move.N1B", layerCount: 3, script: "N1B", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ulb,ldb,drb,rub)\n(bu,bl,bd,br)\n(+b)", },
        { id: "Move.D", layerCount: 3, script: "D", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(drb,dbl,dlf,dfr)\n(dr,db,dl,df)\n(+d)", },
        { id: "Move.T1D", layerCount: 3, script: "T1D", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(drb,dbl,dlf,dfr)\n(dr,db,dl,df)\n(+d)", },
        { id: "Move.N1D", layerCount: 3, script: "N1D", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(drb,dbl,dlf,dfr)\n(dr,db,dl,df)\n(+d)", },
        { id: "Move.L", layerCount: 3, script: "L", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ufl,fdl,dbl,bul)\n(ul,fl,dl,bl)\n(+l)", },
        { id: "Move.T1L", layerCount: 3, script: "T1L", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ufl,fdl,dbl,bul)\n(ul,fl,dl,bl)\n(+l)", },
        { id: "Move.N1L", layerCount: 3, script: "N1L", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ufl,fdl,dbl,bul)\n(ul,fl,dl,bl)\n(+l)", },
    ];

    var passCount = 0;
    var failCount = 0;
    for (const elem of data) {
        let success = testPattern(elem.id,elem.layerCount,elem.script,elem.btm,elem.ftm,elem.qtm,elem.order,elem.perm);
        if(success)passCount++;else failCount++;
    }
    print("Pattern3xTest failed: "+failCount+" passed: "+passCount+ " of: "+(passCount+failCount)+" tests.");
    return passCount>0&&failCount==0;
}