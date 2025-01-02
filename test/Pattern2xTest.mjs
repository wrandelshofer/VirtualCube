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
        print("Pattern2xTest id="+id+" layerCount="+layerCount+" failed.")
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
         { id: "Move.U2", layerCount: 2, script: "U2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(ulb,urf) (ufl,ubr)", },
         { id: "Move.T1U2", layerCount: 2, script: "T1U2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(ulb,urf) (ufl,ubr)", },
         { id: "Move.N1U2", layerCount: 2, script: "N1U2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(ulb,urf) (ufl,ubr)", },
         { id: "Move.F2", layerCount: 2, script: "F2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dlf,urf) (ufl,dfr)", },
         { id: "Move.T1F2", layerCount: 2, script: "T1F2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dlf,urf) (ufl,dfr)", },
         { id: "Move.N1F2", layerCount: 2, script: "N1F2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dlf,urf) (ufl,dfr)", },
         { id: "Move.R2", layerCount: 2, script: "R2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(drb,urf) (ubr,dfr)", },
         { id: "Move.T1R2", layerCount: 2, script: "T1R2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(drb,urf) (ubr,dfr)", },
         { id: "Move.N1R2", layerCount: 2, script: "N1R2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(drb,urf) (ubr,dfr)", },
         { id: "Move.CF", layerCount: 2, script: "CF", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(dfr,lfd,ufl,rfu) (drb,ldb,ulb,rub)", },
         { id: "Move.TF", layerCount: 2, script: "TF", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(dfr,lfd,ufl,rfu) (drb,ldb,ulb,rub)", },
         { id: "Move.T2F", layerCount: 2, script: "T2F", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(dfr,lfd,ufl,rfu) (drb,ldb,ulb,rub)", },
         { id: "Move.CU", layerCount: 2, script: "CU", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(ufl,ulb,ubr,urf) (dlf,dbl,drb,dfr)", },
         { id: "Move.TU", layerCount: 2, script: "TU", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(ufl,ulb,ubr,urf) (dlf,dbl,drb,dfr)", },
         { id: "Move.T2U", layerCount: 2, script: "T2U", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(ufl,ulb,ubr,urf) (dlf,dbl,drb,dfr)", },
         { id: "Move.CU2", layerCount: 2, script: "CU2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(ulb,urf) (dbl,dfr) (ufl,ubr) (dlf,drb)", },
         { id: "Move.TU2", layerCount: 2, script: "TU2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(ulb,urf) (dbl,dfr) (ufl,ubr) (dlf,drb)", },
         { id: "Move.T2U2", layerCount: 2, script: "T2U2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(ulb,urf) (dbl,dfr) (ufl,ubr) (dlf,drb)", },
         { id: "Move.CR", layerCount: 2, script: "CR", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(ubr,bdr,dfr,fur) (dbl,fdl,ufl,bul)", },
         { id: "Move.TR", layerCount: 2, script: "TR", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(ubr,bdr,dfr,fur) (dbl,fdl,ufl,bul)", },
         { id: "Move.T2R", layerCount: 2, script: "T2R", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(ubr,bdr,dfr,fur) (dbl,fdl,ufl,bul)", },
         { id: "Move.F", layerCount: 2, script: "F", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(dfr,lfd,ufl,rfu)", },
         { id: "Move.T1F", layerCount: 2, script: "T1F", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(dfr,lfd,ufl,rfu)", },
         { id: "Move.N1F", layerCount: 2, script: "N1F", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(dfr,lfd,ufl,rfu)", },
         { id: "Move.CF2", layerCount: 2, script: "CF2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(dlf,urf) (ufl,dfr) (dbl,ubr) (ulb,drb)", },
         { id: "Move.TF2", layerCount: 2, script: "TF2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(dlf,urf) (ufl,dfr) (dbl,ubr) (ulb,drb)", },
         { id: "Move.T2F2", layerCount: 2, script: "T2F2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(dlf,urf) (ufl,dfr) (dbl,ubr) (ulb,drb)", },
         { id: "Move.U", layerCount: 2, script: "U", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ufl,ulb,ubr,urf)", },
         { id: "Move.T1U", layerCount: 2, script: "T1U", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ufl,ulb,ubr,urf)", },
         { id: "Move.N1U", layerCount: 2, script: "N1U", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ufl,ulb,ubr,urf)", },
         { id: "Move.CR2", layerCount: 2, script: "CR2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(drb,urf) (ubr,dfr) (dlf,ulb) (ufl,dbl)", },
         { id: "Move.TR2", layerCount: 2, script: "TR2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(drb,urf) (ubr,dfr) (dlf,ulb) (ufl,dbl)", },
         { id: "Move.T2R2", layerCount: 2, script: "T2R2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(drb,urf) (ubr,dfr) (dlf,ulb) (ufl,dbl)", },
         { id: "Move.R", layerCount: 2, script: "R", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ubr,bdr,dfr,fur)", },
         { id: "Move.T1R", layerCount: 2, script: "T1R", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ubr,bdr,dfr,fur)", },
         { id: "Move.N1R", layerCount: 2, script: "N1R", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ubr,bdr,dfr,fur)", },
         { id: "Move.CD", layerCount: 2, script: "CD", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(ubr,ulb,ufl,urf) (drb,dbl,dlf,dfr)", },
         { id: "Move.TD", layerCount: 2, script: "TD", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(ubr,ulb,ufl,urf) (drb,dbl,dlf,dfr)", },
         { id: "Move.T2D", layerCount: 2, script: "T2D", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(ubr,ulb,ufl,urf) (drb,dbl,dlf,dfr)", },
         { id: "Move.D2", layerCount: 2, script: "D2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dbl,dfr) (dlf,drb)", },
         { id: "Move.T1D2", layerCount: 2, script: "T1D2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dbl,dfr) (dlf,drb)", },
         { id: "Move.N1D2", layerCount: 2, script: "N1D2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dbl,dfr) (dlf,drb)", },
         { id: "Move.B2", layerCount: 2, script: "B2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dbl,ubr) (ulb,drb)", },
         { id: "Move.T1B2", layerCount: 2, script: "T1B2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dbl,ubr) (ulb,drb)", },
         { id: "Move.N1B2", layerCount: 2, script: "N1B2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dbl,ubr) (ulb,drb)", },
         { id: "Move.CL2", layerCount: 2, script: "CL2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(drb,urf) (ubr,dfr) (dlf,ulb) (ufl,dbl)", },
         { id: "Move.TL2", layerCount: 2, script: "TL2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(drb,urf) (ubr,dfr) (dlf,ulb) (ufl,dbl)", },
         { id: "Move.T2L2", layerCount: 2, script: "T2L2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(drb,urf) (ubr,dfr) (dlf,ulb) (ufl,dbl)", },
         { id: "Move.CD2", layerCount: 2, script: "CD2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(ulb,urf) (dbl,dfr) (ufl,ubr) (dlf,drb)", },
         { id: "Move.TD2", layerCount: 2, script: "TD2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(ulb,urf) (dbl,dfr) (ufl,ubr) (dlf,drb)", },
         { id: "Move.T2D2", layerCount: 2, script: "T2D2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(ulb,urf) (dbl,dfr) (ufl,ubr) (dlf,drb)", },
         { id: "Move.CB2", layerCount: 2, script: "CB2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(dlf,urf) (ufl,dfr) (dbl,ubr) (ulb,drb)", },
         { id: "Move.TB2", layerCount: 2, script: "TB2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(dlf,urf) (ufl,dfr) (dbl,ubr) (ulb,drb)", },
         { id: "Move.T2B2", layerCount: 2, script: "T2B2", btm: 0, ftm: 0, qtm: 0, order: 2, perm: "(dlf,urf) (ufl,dfr) (dbl,ubr) (ulb,drb)", },
         { id: "Move.L2", layerCount: 2, script: "L2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dlf,ulb) (ufl,dbl)", },
         { id: "Move.T1L2", layerCount: 2, script: "T1L2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dlf,ulb) (ufl,dbl)", },
         { id: "Move.N1L2", layerCount: 2, script: "N1L2", btm: 1, ftm: 1, qtm: 2, order: 2, perm: "(dlf,ulb) (ufl,dbl)", },
         { id: "Move.CB", layerCount: 2, script: "CB", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(ufl,lfd,dfr,rfu) (ulb,ldb,drb,rub)", },
         { id: "Move.TB", layerCount: 2, script: "TB", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(ufl,lfd,dfr,rfu) (ulb,ldb,drb,rub)", },
         { id: "Move.T2B", layerCount: 2, script: "T2B", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(ufl,lfd,dfr,rfu) (ulb,ldb,drb,rub)", },
         { id: "Move.CL", layerCount: 2, script: "CL", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(dfr,bdr,ubr,fur) (ufl,fdl,dbl,bul)", },
         { id: "Move.TL", layerCount: 2, script: "TL", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(dfr,bdr,ubr,fur) (ufl,fdl,dbl,bul)", },
         { id: "Move.T2L", layerCount: 2, script: "T2L", btm: 0, ftm: 0, qtm: 0, order: 4, perm: "(dfr,bdr,ubr,fur) (ufl,fdl,dbl,bul)", },
         { id: "Move.B", layerCount: 2, script: "B", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ulb,ldb,drb,rub)", },
         { id: "Move.T1B", layerCount: 2, script: "T1B", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ulb,ldb,drb,rub)", },
         { id: "Move.N1B", layerCount: 2, script: "N1B", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ulb,ldb,drb,rub)", },
         { id: "Move.D", layerCount: 2, script: "D", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(drb,dbl,dlf,dfr)", },
         { id: "Move.T1D", layerCount: 2, script: "T1D", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(drb,dbl,dlf,dfr)", },
         { id: "Move.N1D", layerCount: 2, script: "N1D", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(drb,dbl,dlf,dfr)", },
         { id: "Move.L", layerCount: 2, script: "L", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ufl,fdl,dbl,bul)", },
         { id: "Move.T1L", layerCount: 2, script: "T1L", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ufl,fdl,dbl,bul)", },
         { id: "Move.N1L", layerCount: 2, script: "N1L", btm: 1, ftm: 1, qtm: 1, order: 4, perm: "(ufl,fdl,dbl,bul)", },
    ];

    var passCount = 0;
    var failCount = 0;
    for (const elem of data) {
        let success = testPattern(elem.id,elem.layerCount,elem.script,elem.btm,elem.ftm,elem.qtm,elem.order,elem.perm);
        if(success)passCount++;else failCount++;
    }
    print("Pattern2xTest failed: "+failCount+" passed: "+passCount+ " of: "+(passCount+failCount)+" tests.");
    return passCount>0&&failCount==0;
}