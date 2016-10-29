/*
 * @(#)Notation.js  0.1  2011-08-12
 *
 * Copyright (c) 2011-2012 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

// --------------
// require.js
// --------------
define("Notation", [],
function () {

  /** Defines a symbol. */
  class Symbol {
    /**
     * 
     * @param {String} name
     * @param {String} alternativeName
     * @param {Array<Symbol>} terminalSymbols
     */
    constructor(name, alternativeName, terminalSymbols) {
      this.name = name;
      this.alternativeName = alternativeName;
      this.subSymbols = terminalSymbols;
    }
    isTerminalSymbol() {
      return this.subSymbols == null;
    }
    isSubSymbol(s) {
      if (subSymbols != null) {
        for (let i = 0; i < subSymbols.length; i++) {
          if (s == subSymbols[i])
            return true;
        }
        return false;
      } else {
        return s == this;
      }
    }
    getSubSymbols() {
      return this.subSymbols;// XXX should return a clone
    }

    getName() {
      return this.name;
    }

    getAlternativeName() {
      return this.alternativeName;
    }

    toString() {
      return this.name;
    }
  }

let Symbols={
      /**
     * Terminal symbols.
     */
    NOP:new Symbol("NOP"),
    MOVE:new Symbol("move", "twist"),
    FACE_R:new Symbol("permR"),
    FACE_U:new Symbol("permU"),
    FACE_F:new Symbol("permF"),
    FACE_L:new Symbol("permL"),
    FACE_D:new Symbol("permD"),
    FACE_B:new Symbol("permB"),
    PERMUTATION_PLUS:new Symbol("permPlus"),
    PERMUTATION_MINUS:new Symbol("permMinus"),
    PERMUTATION_PLUSPLUS:new Symbol("permPlusPlus"),
    PERMUTATION_BEGIN:new Symbol("permBegin","permutationBegin"),
    PERMUTATION_END:new Symbol("permEnd","permutationEnd"),
    PERMUTATION_DELIMITER:new Symbol("permDelim","permutationDelimiter"),
    DELIMITER:new Symbol("delimiter", "statementDelimiter"),
    INVERSION_BEGIN:new Symbol("inversionBegin"),
    INVERSION_END:new Symbol("inversionEnd"),
    INVERSION_DELIMITER:new Symbol("inversionDelim"),
    INVERTOR:new Symbol("invertor"),
    REFLECTION_BEGIN:new Symbol("reflectionBegin"),
    REFLECTION_END:new Symbol("reflectionEnd"),
    REFLECTION_DELIMITER:new Symbol("reflectionDelim"),
    REFLECTOR:new Symbol("reflector"),
    GROUPING_BEGIN:new Symbol("groupingBegin","sequenceBegin"),
    GROUPING_END:new Symbol("groupingEnd","sequenceEnd"),
    REPETITION_BEGIN:new Symbol("repetitionBegin","repetitorBegin"),
    REPETITION_END:new Symbol("repetitionEnd","repetitorEnd"),
    REPETITION_DELIMITER:new Symbol("repetitionDelim","repetitorDelimiter"),
    COMMUTATION_BEGIN:new Symbol("commutationBegin","commutatorBegin"),
    COMMUTATION_END:new Symbol("commutationEnd","commutatorEnd"),
    COMMUTATION_DELIMITER:new Symbol("commutationDelim","commutatorDelimiter"),
    CONJUGATION_BEGIN:new Symbol("conjugationBegin","conjugatorBegin"),
    CONJUGATION_END:new Symbol("conjugationEnd","conjugatorEnd"),
    CONJUGATION_DELIMITER:new Symbol("conjugationDelim","conjugatorDelimiter"),
    ROTATION_BEGIN:new Symbol("rotationBegin","rotatorBegin"),
    ROTATION_END:new Symbol("rotationEnd","rotatorEnd"),
    ROTATION_DELIMITER:new Symbol("rotationDelim","rotatorDelimiter"),
    MACRO:new Symbol("macro"),
    MULTILINE_COMMENT_BEGIN:new Symbol("commentMultiLineBegin", "slashStarCommentBegin"),
    MULTILINE_COMMENT_END:new Symbol("commentMultiLineEnd", "slashStarCommentEnd"),
    SINGLELINE_COMMENT_BEGIN:new Symbol("commentSingleLineBegin", "slashSlashComment"),
}
    Symbols.COMMUTATION=new Symbol("commutation", [
        Symbols.COMMUTATION_BEGIN,
        Symbols.COMMUTATION_END,
        Symbols.COMMUTATION_DELIMITER
    ]);
    Symbols.CONJUGATION=new Symbol("conjugation", [
        Symbols.CONJUGATION_BEGIN,
        Symbols.CONJUGATION_END,
        Symbols.CONJUGATION_DELIMITER
    ]);
    Symbols.GROUPING=new Symbol("grouping", [
        Symbols.GROUPING_BEGIN,
        Symbols.GROUPING_END
    ]);
    Symbols.INVERSION=new Symbol("inversion", [
        Symbols.INVERSION_BEGIN,
        Symbols.INVERSION_END,
        Symbols.INVERSION_DELIMITER,
        Symbols.INVERTOR
    ]);
    Symbols.PERMUTATION=new Symbol("permutation", [
        Symbols.FACE_R,
        Symbols.FACE_U,
        Symbols.FACE_F,
        Symbols.FACE_L,
        Symbols.FACE_D,
        Symbols.FACE_B,
        Symbols.PERMUTATION_PLUS,
        Symbols.PERMUTATION_MINUS,
        Symbols.PERMUTATION_PLUSPLUS,
        Symbols.PERMUTATION_BEGIN,
        Symbols.PERMUTATION_END,
        Symbols.PERMUTATION_DELIMITER
    ]);
    Symbols.REFLECTION=new Symbol("reflection", [
        Symbols.REFLECTION_BEGIN,
        Symbols.REFLECTION_END,
        Symbols.REFLECTION_DELIMITER,
        Symbols.REFLECTOR
    ]);
    Symbols.REPETITION=new Symbol("repetition", [
        Symbols.REPETITION_BEGIN,
        Symbols.REPETITION_END,
        Symbols.REPETITION_DELIMITER
    ]);
    Symbols.ROTATION=new Symbol("rotation", [
        Symbols.ROTATION_BEGIN,
        Symbols.ROTATION_END,
        Symbols.ROTATION_DELIMITER
    ]);
    Symbols.COMMENT=new Symbol("comment", [
        Symbols.MULTILINE_COMMENT_BEGIN,
        Symbols.MULTILINE_COMMENT_END,
        Symbols.SINGLELINE_COMMENT_BEGIN
    ]);
    Symbols.STATEMENT=new Symbol("statement", [
        Symbols.NOP,
        Symbols.MOVE,
        Symbols.GROUPING,
        Symbols.INVERSION,
        Symbols.REFLECTION,
        Symbols.CONJUGATION,
        Symbols.COMMUTATION,
        Symbols.ROTATION,
        Symbols.PERMUTATION,
        Symbols.DELIMITER,
        Symbols.REPETITION
    ]);
    Symbols.SEQUENCE=new Symbol("sequence", [
        Symbols.STATEMENT,
        Symbols.COMMENT
    ]);


  /** Defines a notation. */
  class Notation {

  }
  /** Defines a default notation. */
  class DefaultNotation extends Notation {

  }


// ------------------
// MODULE API    
// ------------------
  return {
    Notation: Notation,
    DefaultNotation: DefaultNotation,
    Symbol: Symbol,
    Symbols:Symbols,
  };
});
