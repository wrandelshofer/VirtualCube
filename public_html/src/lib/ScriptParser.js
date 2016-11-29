/*
 * @(#)ScriptParser.js  0.1  2011-08-12
 * Copyright (c) 2011 Werner Randelshofer, Switzerland.
 * You may only use this software in accordance with the license terms.
 */
"use strict";
// --------------
// require.js
// --------------
define("ScriptParser", ["ScriptNotation", "ScriptAST", "Tokenizer"],
  function (Notation, AST, Tokenizer) {

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

    class ParseException extends Error {
      constructor(msg, start, end) {
        super(msg);
        this.msg = msg;
        this.start = start;
        this.end = end;
      }
      toString() {
        return this.msg + " at:" + this.start + ".." + this.end;
      }
    }

    /**
     * Represents an Abstract Syntax Tree Node
     */
    class Node {

    }

    class TwistNode extends Node {

      /** Script nodes. */
      constructor(axis, layerMask, angle) {
        this.axis = axis;
        this.angle = angle;
        this.layerMask = layerMask;
      }

      /** Applies the node to the specified cube. */
      applyTo(cube) {
        if (!this.doesNothing()) {
          cube.transform(this.axis, this.layerMask, this.angle);
        }
      }
      /** Applies the inverse of the node to the specified cube. */
      applyInverseTo(cube) {
        if (!this.doesNothing()) {
          cube.transform(this.axis, this.layerMask, -this.angle);
        }
      }
      /** Returns true if this node does nothing. */
      doesNothing() {
        return this.angle == 0 || this.layerMask == 0;
      }
      /** Tries to consume the given TwistNode. 
       * Returns true if successful.
       * This TwistNode may return true for doesNothing afterwards!);
       */
      consume(that) {
        if (that.axis == this.axis
          && that.layerMask == this.layerMask) {
          this.angle = (this.angle + that.angle) % 4;
          if (this.angle == 3)
            this.angle = -1;
          else if (this.angle == -3)
            this.angle = 1;
          return true;
        }
        return false;
      }
      toString() {
        return 'TwistNode{ax:' + this.axis + ' an:' + this.angle + ' lm:' + this.layerMask + '}';
      }
    }

    const UNKNOWN_MASK = 0;
    const GROUPING_MASK = 1;
    const CONJUGATION_MASK = 2;
    const COMMUTATION_MASK = 4;
    const ROTATION_MASK = 8;
    const PERMUTATION_MASK = 16;
    const INVERSION_MASK = 32;
    const REFLECTION_MASK = 64;
    /**
     * Implements a parser for a specific notation..
     */
    class ScriptParser {
      /**
       * Creates a new parser.
       * @param {Notation} notation
       * @param {Map<String,MacroNode>} localMacros
       */
      constructor(notation, localMacros) {
        this.notation = notation;
        this.macros = [];
        this.tokenizer = null;
        if (localMacros != null) {
          for (let macro in localMacros) {
            macros.push(macro);
          }
        }
        // global macros override local macros
        for (let macro in notation.getMacros()) {
          macros.push(macro);
        }
      }

      getTokenizer() {
        if (this.tokenizer == null) {
          let tt = new Tokenizer.Tokenizer();
          tt.skipWhitespace();
          tt.addNumbers();
          let tokenToSymbolMap = this.notation.getTokenToSymbolMap();
          for (let i in tokenToSymbolMap) {
            tt.addKeyword(i, tokenToSymbolMap[i]);
          }
          /*
           tt.addSpecials(this.notation.getSpecials());
           tt.addKeywords(this.notation.getKeywords());*/
          //tt.setSlashStarComment(...
          //tt.setSlashSlashComment(..,
          this.tokenizer = tt;
        }
        return this.tokenizer;
      }

      /**
       * Parses the specified string.
       * @param {type} str
       * @return {SequenceNode} the parsed script
       * @throws a message if the parsing fails.
       */
      parse(str) {
        let tt = this.getTokenizer();
        tt.setInput(str);
        let root = new AST.SequenceNode();
        let guard = str.length;
        while (tt.nextToken() != Tokenizer.TT_EOF) {
          tt.pushBack();
          this.parseExpression(tt, root);
          guard = guard - 1;
          if (guard < 0) {
            throw new Error("too many iterations! " + tt.getTokenType() + " pos:" + tt.pos);
          }
        }
        return root;
      }

      /**
       * Returns true if the array contains a symbol of the specified symbol type
       * @param {
       type} array of symbols
       * @param {type} type desired type
       * @return true if array contains a symbol of the specified type
       */
      containsType(symbols, type) {
        for (let i = 0; i < symbols.length; i++) {
          let s = symbols[i];
          if (s.getType() == type) {
            return true;
          }
        }
        return false;
      }

      /**
       * Returns true if the array contains a symbol of the specified symbol type
       * @param {
       type} array of symbols
       * @param {type} type desired type
       * @return true if array contains a symbol of the specified type
       */
      intersectsTypes(symbols, types) {
        for (let i = 0; i < symbols.length; i++) {
          let s = symbols[i];
          for (let j = 0; j < types.length; j++) {
            let type = types[j];
            if (s.getType() == type) {
              return true;
            }
          }
        }
        return false;
      }
      /**
       * Returns true if the array contains at least one symbol, and
       * only symbols of the specified symbol type.
       * 
       * @param {
       type} array of symbols
       * @param {type} type desired type
       * @return true if array contains a symbol of the specified type
       */
      isType(symbols, type) {
        for (let i = 0; i < symbols.length; i++) {
          let s = symbols[i];
          if (s.getType() != type) {
            return false;
          }
        }
        return symbols.length > 0;
      }

      /**
       * Parses a Statement.
       * 
       * @param {
       Tokenizer} t
       * @param {Node} parent
       * @returns {unresolved} the parsed statement
       * @throws parse exception
       */
      parseStatement(t, parent) {
        const ntn = this.notation;
        const Sym = Notation.Symbol;
        const Stx = Notation.Syntax;
        // Fetch the next token.
        if (t.nextToken() != Tokenizer.TT_KEYWORD) {
          throw new ParseException("Statement: \"" + t.getStringValue() + "\" is a " + t.getTokenType() + " but not a keyword.", t.getStartPosition(), t.getEndPosition());
        }

        let startPos = t.getStartPosition();
        let symbols = t.getSymbolValue();
// Evaluate: Macro
        if (symbols.length == 0) {
          throw new ParseException("Statement: Unknown statement " + t.sval, t.getStartPosition(), t.getEndPosition());
        }

// Is it a Macro?
        if (this.containsType(symbols, Sym.MACRO)) {
          t.pushBack();
          return this.parseMacro(t, parent);
        }

// Is it a Move?
        if (this.containsType(symbols, Sym.MOVE)) {
          t.pushBack();
          return this.parseMove(t, parent);
        }

// Is it a NOP?
        if (this.containsType(symbols, Sym.NOP)) {
          t.pushBack();
          return this.parseNOP(t, parent);
        }


// Is it a Permutation token? Parse a permutation.
        if ((ntn.isSyntax(Sym.PERMUTATION, Notation.Syntax.PREFIX)
          ||ntn.isSyntax(Sym.PERMUTATION, Notation.Syntax.PRECIRCUMFIX) // ??really??
          )
          &&  this.intersectsTypes(symbols, 
        [Sym.PERMUTATION_PLUS,  Sym.PERMUTATION_MINUS,  Sym.PERMUTATION_PLUSPLUS])) {
          let startpos = t.getStartPosition();
          let sign=symbols;
          t.nextToken();
          symbols = t.getSymbolValue();
          if (!this.containsType(symbols, Sym.PERMUTATION_BEGIN)) {
            throw new ParseException(
              "Permutation: Unexpected token - expected permutation begin.", t.getStartPosition(), t.getEndPosition());
          }

          let pnode = this.parsePermutation(t, parent, startpos, sign);
          return pnode;
        }
// Okay, it's not a move and not a permutation sign.
// Since we allow for some ambiguity of the
// tokens used by the grouping, conjugation, commutation and permutation
// statement it gets a little bit complicated here.
// Create a bit mask with a bit for each expected statement.
        let expressionMask
          = ((this.containsType(symbols, Sym.GROUPING_BEGIN)) ? GROUPING_MASK : UNKNOWN_MASK) | //
          ((ntn.isSyntax(Sym.CONJUGATION, Stx.PRECIRCUMFIX) && this.containsType(symbol, Sym.CONJUGATION_BEGIN)) ? CONJUGATION_MASK : UNKNOWN_MASK) | //
          ((ntn.isSyntax(Sym.COMMUTATION, Stx.PRECIRCUMFIX) && this.containsType(symbols, Sym.COMMUTATION_BEGIN)) ? COMMUTATION_MASK : UNKNOWN_MASK) | //
          ((ntn.isSyntax(Sym.ROTATION, Stx.PRECIRCUMFIX) && this.containsType(symbols, Sym.ROTATION_BEGIN)) ? ROTATION_MASK : UNKNOWN_MASK) | //
          ((ntn.isSyntax(Sym.INVERSION, Stx.CIRCUMFIX) && this.containsType(symbols, Sym.INVERSION_BEGIN)) ? INVERSION_MASK : UNKNOWN_MASK) | //
          ((ntn.isSyntax(Sym.REFLECTION, Stx.CIRCUMFIX) && this.containsType(symbols, Sym.REFLECTION_BEGIN)) ? REFLECTION_MASK : UNKNOWN_MASK) | //
          ((ntn.isSupported(Sym.PERMUTATION) && this.containsType(symbols, Sym.PERMUTATION_BEGIN)) ? PERMUTATION_MASK : UNKNOWN_MASK);
// Is it a Permutation Begin token without any ambiguity?
        if (expressionMask == PERMUTATION_MASK) {
          return this.parsePermutation(t, parent, p, null);
        }

// Is it an ambiguous permutation begin token?
        if ((expressionMask & PERMUTATION_MASK) == PERMUTATION_MASK) {
          let startPos = t.getStartPosition();
          // Look ahead
          if (t.nextToken() != Tokenizer.TT_KEYWORD) {
            throw new ParseException("Statement: keyword expected.", t.getStartPosition(), t.getEndPosition());
          }
          symbols = t.getSymbolValue();
          t.pushBack();
          if (symbols != null && this.intersectsTypes(symbols, Sym.PERMUTATION.getSubSymbols())) {
            return this.parsePermutation(t, parent, startPos);
          } else {
            return this.parseCompoundStatement(t, parent, startPos, expressionMask ^ PERMUTATION_MASK);
          }
        }

// Is it one of the other Begin tokens?
        if (expressionMask != UNKNOWN_MASK) {
          return this.parseCompoundStatement(t, parent, startPos, expressionMask);
        }

        throw new ParseException("Statement: illegal Statement " + t.sval, t.getStartPosition(), t.getEndPosition());
      }

      /** Parses the remainder of a permutation statement after its PERMUTATION_BEGIN token has been consumed. 
       * 
       * @param {Tokenizer} t
       * @param {Node} parent
       * @param {int} startPos the start position of the PERMUTATION_BEGIN begin token
       * @returns {unresolved} the parsed permutation
       * @throws parse exception
       */
      parsePermutation(t, parent, startPos, sign) {
        const ntn = this.notation;
        const Sym = Notation.Symbol;
        const Symbol = Notation.Symbol;
        const Syntax = Notation.Syntax;

        const permutation = new AST.PermutationNode(ntn.getLayerCount(), startPos, null);
        parent.add(permutation);
        permutation.setStartPosition(startPos);

        if (ntn.isSyntax(Symbol.PERMUTATION, Syntax.PRECIRCUMFIX)) {
            sign = this.parsePermutationSign(t, parent);
        }

        ThePermutation:
        while (true) {
            switch (t.nextToken()) {
                case Tokenizer.TT_WORD:

                    // Evaluate PermEnd
                    let symbols = t.getSymbolValue();
                    if (this.containsType(symbols, Sym.PERMUTATION_END)) {
                        permutation.setEndPosition(t.getEndPosition());
                        break ThePermutation;

                    } else {
                        t.pushBack();
                        this.parsePermutationItem(t, permutation);
                        if (t.nextToken() == Tokenizer.TT_WORD) {
                            symbols = t.getSymbolValue();
                            if (this.containsType(symbols, Sym.PERMUTATION_DELIMITER)) {

                            } else if (ntn.isSyntax(Symbol.PERMUTATION, Syntax.POSTCIRCUMFIX) 
                                    && (this.containsType(symbols, Symbol.PERMUTATION_PLUS) 
                                    || this.containsType(symbols, Symbol.PERMUTATION_MINUS) 
                                    || this.containsType(symbols, Symbol.PERMUTATION_PLUSPLUS))) {
                                t.pushBack();
                                sign = this.parsePermutationSign(t, parent);
                                if (t.nextToken() != Tokenizer.TT_WORD) {
                                    throw new ParseException(
                                            "Permutation: End expected.", t.getStartPosition(), t.getEndPosition());
                                }
                                token = fetchGreedy(t.sval);
                                if (this.containsType(symbols,Symbol.PERMUTATION_END)) {
                                    permutation.setEndPosition(t.getEndPosition());
                                    break ThePermutation;
                                } else {
                                    throw new ParseException(
                                            "Permutation: End expected.", t.getStartPosition(), t.getEndPosition());
                                }
                            } else {
                                t.pushBack();
                            }
                        } else {
                            t.pushBack();
                        }
                    }
                    break;
                case Tokenizer.TT_EOF:
                    throw new ParseException(
                            "Permutation: End missing.", t.getStartPosition(), t.getEndPosition());
                default:
                    throw new ParseException(
                            "Permutation: Internal error.", t.getStartPosition(), t.getEndPosition());
            }
        }

        if (ntn.isSyntax(Symbol.PERMUTATION, Syntax.SUFFIX)) {
            sign = this.parsePermutationSign(t, parent);
        }

        if (sign != null) {
            switch (permutation.getType()) {
                case 1:
                    break;
                case 2:
                    if (sign == Symbol.PERMUTATION_PLUSPLUS 
                            || sign == Symbol.PERMUTATION_MINUS) {
                        throw new ParseException(
                                "Permutation: Illegal sign.", t.getStartPosition(), t.getEndPosition());
                    }
                    break;
                case 3:
                    if (sign == Symbol.PERMUTATION_PLUSPLUS) {
                        throw new ParseException(
                                "Permutation: Illegal sign.", t.getStartPosition(), t.getEndPosition());
                    }
                    break;
            }
            permutation.setPermutationSign(sign);
            permutation.setEndPosition(t.getEndPosition());
        }

        return permutation;
      }
      /** Parses a compound statement after its XXX_BEGIN token has been consumed. 
       * 
       * @param {Tokenizer} t
       * @param {Node} parent
       * @param {int} startPos the start position of the XXX_BEGIN begin token
       * @param {int} beginTypeMask the mask indicating which XXX_BEGIN token was consumed
       * @returns {unresolved} the parsed compound statement
       * @throws parse exception
       */
      parseCompoundStatement(t, parent, startPos, beginTypeMask) {
        if (beginTypeMask == null)
          throw new Error(new Error("illegal argument: beginTypeMask:" + beginTypeMask));

        const ntn = this.notation;
        const Sym = Notation.Symbol;
        const Stx = Notation.Syntax;
        let seq1 = new AST.SequenceNode();
        seq1.setStartPosition(startPos);
        parent.add(seq1);
        let seq2 = null;
        let grouping = seq1;
        // The final type mask reflects the final type that we have determined
        // after parsing all of the grouping.
        let finalTypeMask = beginTypeMask & (GROUPING_MASK | CONJUGATION_MASK | COMMUTATION_MASK | ROTATION_MASK | REFLECTION_MASK | INVERSION_MASK);
        // Evaluate: {Statement} , (GROUPING_END | COMMUTATION_END | CONJUGATION_END | ROTATION_END) ;
        let guard = t.getInputLength();
        TheGrouping:
          while (true) {
          guard = guard - 1;
          if (guard < 0) {
            throw new Error("too many iterations");
          }

          switch (t.nextToken()) {
            case Tokenizer.TT_KEYWORD:
              let symbols = t.getSymbolValue();
              // Look ahead the nextElement token.

              let endTypeMask
                = ((this.containsType(symbols, Sym.GROUPING_END)) ? GROUPING_MASK : UNKNOWN_MASK) | //
                ((ntn.isSyntax(Sym.CONJUGATION, Stx.PRECIRCUMFIX) && this.containsType(symbols, Sym.CONJUGATION_END)) ? CONJUGATION_MASK : UNKNOWN_MASK) | //
                ((ntn.isSyntax(Sym.COMMUTATION, Stx.PRECIRCUMFIX) && this.containsType(symbols, Sym.COMMUTATION_END)) ? COMMUTATION_MASK : UNKNOWN_MASK) | //
                ((ntn.isSyntax(Sym.INVERSION, Stx.CIRCUMFIX) && this.containsType(symbols, Sym.INVERSION_END)) ? INVERSION_MASK : UNKNOWN_MASK) | //
                ((ntn.isSyntax(Sym.REFLECTION, Stx.CIRCUMFIX) && this.containsType(symbols, Sym.REFLECTION_END)) ? REFLECTION_MASK : UNKNOWN_MASK) | //
                ((ntn.isSyntax(Sym.ROTATION, Stx.PRECIRCUMFIX) && this.containsType(symbols, Sym.ROTATION_END)) ? ROTATION_MASK : UNKNOWN_MASK);
              let delimiterTypeMask
                = ((ntn.isSyntax(Sym.CONJUGATION, Stx.PRECIRCUMFIX) && this.containsType(symbols, Sym.CONJUGATION_DELIMITER)) ? CONJUGATION_MASK : 0)
                | ((ntn.isSyntax(Sym.COMMUTATION, Stx.PRECIRCUMFIX) && this.containsType(symbols, Sym.COMMUTATION_DELIMITER)) ? COMMUTATION_MASK : 0)
                | ((ntn.isSyntax(Sym.ROTATION, Stx.PRECIRCUMFIX) && this.containsType(symbols, Sym.ROTATION_DELIMITER)) ? ROTATION_MASK : 0);

              if (endTypeMask != 0) {
                finalTypeMask &= endTypeMask;
                grouping.setEndPosition(t.getEndPosition());
                break TheGrouping;
              } else if (delimiterTypeMask != 0) {
                finalTypeMask &= delimiterTypeMask;
                if (finalTypeMask == 0) {
                  throw new ParseException("Grouping: illegal delimiter:" + t.getStringValue(), t.getStartPosition(), t.getEndPosition());
                }
                if (seq2 == null) {
                  seq1.setEndPosition(t.getStartPosition());
                  seq2 = new AST.SequenceNode(ntn.getLayerCount());
                  seq2.setStartPosition(t.getEndPosition());
                  parent.add(seq2);
                  grouping = seq2;
                } else {
                  throw new ParseException("Grouping: Delimiter must occur only once", t.getStartPosition(), t.getEndPosition());
                }

              } else {
                t.pushBack();
                this.parseExpression(t, grouping);
              }
              break;
            case Tokenizer.TT_EOF:
              throw new ParseException("Grouping: End missing.", t.getStartPosition(), t.getEndPosition());
            default:
              throw new ParseException("Grouping: Internal error.", t.getStartPosition(), t.getEndPosition());
          }
        }

        seq1.removeFromParent();
        if (seq2 == null) {
          // There is no second sequence. 
          // The compound statement can only be a grouping.
          finalTypeMask &= GROUPING_MASK;
        } else {
          // There is a second sequence. Remove it from its parent, because we
          // will integrate it into the compound statement.
          seq2.removeFromParent();
          // The compound statement can not be a grouping.
          finalTypeMask &= -1 ^ GROUPING_MASK;
        }

        switch (finalTypeMask) {
          case GROUPING_MASK:
            if (seq2 != null) {
              throw new ParseException("Grouping: illegal Grouping.", startPos, t.getEndPosition());
            } else {
              grouping = new AST.GroupingNode(ntn.getLayerCount(), startPos, t.getEndPosition());
              for (let i = seq1.getChildCount() - 1; i >= 0; i--) {
                grouping.add(seq1.getChildAt(0));
              }
              if (!seq1.getChildCount() == 0)
                throw new Error("moving children failed");
              module.log('parseCompoundStatement: grouping');
            }
            break;
          case INVERSION_MASK:
            if (seq2 != null) {
              throw new ParseException("Inversion: illegal Inversion.", startPos, t.getEndPosition());
            } else {
              grouping = new AST.InversionNode(ntn.getLayerCount(), startPos, t.getEndPosition());
              for (let i = seq1.getChildCount() - 1; i >= 0; i--) {
                grouping.add(seq1.getChildAt(0));
              }
              if (!seq1.getChildCount() == 0)
                throw new Error("moving children failed");
            }
            break;
          case REFLECTION_MASK:
            if (seq2 != null) {
              throw new ParseException("Reflection: illegal Reflection.", startPos, t.getEndPosition());
            } else {
              grouping = new AST.ReflectionNode(ntn.getLayerCount(), startPos, t.getEndPosition());
              for (let i = seq1.getChildCount() - 1; i >= 0; i--) {
                grouping.add(seq1.getChildAt(0));
              }
              if (!seq1.getChildCount() == 0)
                throw new Error("moving children failed");
            }
            break;
          case CONJUGATION_MASK:
            if (seq2 == null) {
              throw new ParseException("Conjugation: Conjugate missing.", startPos, t.getEndPosition());
            } else {
              grouping = new AST.ConjugationNode(ntn.getLayerCount(), seq1, seq2, startPos, t.getEndPosition());
            }
            break;
          case COMMUTATION_MASK:
            if (seq2 == null) {
              if (seq1.getChildCount() == 2 && seq1.getSymbol() == Sym.SEQUENCE) {
                grouping = new AST.CommutationNode(ntn.getLayerCount(), seq1.getChildAt(0), seq1.getChildAt(1), startPos, t.getEndPosition());
              } else {
                throw new ParseException(
                  "Commutation: Commutee missing.", startPos, t.getEndPosition());
              }
            } else {
              grouping = new AST.CommutationNode(ntn.getLayerCount(), seq1, seq2, startPos, t.getEndPosition());
            }
            break;
          case ROTATION_MASK:
            if (seq2 == null) {
              throw new ParseException(
                "Rotation: Rotatee missing.", startPos, t.getEndPosition());
            } else {
              grouping = new AST.RotationNode(ntn.getLayerCount(), seq1, seq2, startPos, t.getEndPosition());
            }
            break;
          default:
            let ambiguous = '';
            if ((finalTypeMask & GROUPING_MASK) != 0) {
              ambiguous += ("Grouping");
            }
            if ((finalTypeMask & INVERSION_MASK) != 0) {
              if (ambiguous.length != 0) {
                ambiguous += (" or ");
              }
              ambiguous += ("Inversion");
            }
            if ((finalTypeMask & REFLECTION_MASK) != 0) {
              if (ambiguous.length != 0) {
                ambiguous += (" or ");
              }
              ambiguous += ("Reflection");
            }
            if ((finalTypeMask & CONJUGATION_MASK) != 0) {
              if (ambiguous.length != 0) {
                ambiguous += (" or ");
              }
              ambiguous.append("Conjugation");
            }
            if ((finalTypeMask & COMMUTATION_MASK) != 0) {
              if (ambiguous.length() != 0) {
                ambiguous += (" or ");
              }
              ambiguous += ("Commutation");
            }
            if ((finalTypeMask & ROTATION_MASK) != 0) {
              if (ambiguous.length() != 0) {
                ambiguous += (" or ");
              }
              ambiguous += ("Rotation");
            }
            throw new ParseException("Compound Statement: Ambiguous compound statement, possibilities are " + ambiguous + ".", startPos, t.getEndPosition());
        }

        parent.add(grouping);
        return grouping;
      }
      /** Parses an expression. 
       * 
       * @param {
       Tokenizer} t
       * @param {Node} parent
       * @returns {unresolved} the parsed macro
       * @throws parse exception
       */
      parseExpression(t, parent) {
        let ntn = this.notation;
        let Sym = Notation.Symbol;
        let Stx = Notation.Syntax;
        let expression = this.parseConstruct(t, parent);
        let ttype = t.nextToken();
        if (ttype == Tokenizer.TT_KEYWORD) {
          let symbols = t.getSymbolValue();
          if (ntn.isSyntax(Sym.COMMUTATION, Stx.PREINFIX)
            && this.containsType(symbols, Sym.COMMUTATION_DELIMITER)) {
            let exp2 = this.parseExpression(t, parent);
            expression = new AST.CommutationNode(ntn.getLayerCount(), expression, exp2, expression.getStartPosition(), exp2.getEndPosition());
          } else if (ntn.isSyntax(Sym.CONJUGATION, Stx.PREINFIX)
            && this.containsType(symbols, Sym.CONJUGATION_DELIMITER)) {
            let exp2 = this.parseExpression(t, parent);
            expression = new AST.ConjugationNode(ntn.getLayerCount(), expression, exp2, expression.getStartPosition(), exp2.getEndPosition());
          } else if (ntn.isSyntax(Sym.ROTATION, Stx.PREINFIX)
            && this.containsType(symbols, Sym.ROTATION_DELIMITER)) {
            let exp2 = parseExpression(t, parent);
            expression = new AST.RotationNode(ntn.getLayerCount(), expression, exp2, expression.getStartPosition(), exp2.getEndPosition());
          } else if (ntn.isSyntax(Sym.COMMUTATION, Stx.POSTINFIX)
            && this.containsType(symbols, Sym.COMMUTATION_DELIMITER)) {
            let exp2 = parseExpression(t, parent);
            expression = new AST.CommutationNode(ntn.getLayerCount(), exp2, expression, expression.getStartPosition(), exp2.getEndPosition());
          } else if (ntn.isSyntax(Sym.CONJUGATION, Stx.POSTINFIX)
            && this.containsType(symbols, Sym.CONJUGATION_DELIMITER)) {
            let exp2 = parseExpression(t, parent);
            expression = new AST.ConjugationNode(ntn.getLayerCount(), exp2, expression, expression.getStartPosition(), exp2.getEndPosition());
          } else if (ntn.isSyntax(Sym.ROTATION, Stx.POSTINFIX)
            && this.containsType(symbols, Sym.ROTATION_DELIMITER)) {
            let exp2 = parseExpression(t, parent);
            expression = new RotationNode(ntn.getLayerCount(), exp2, expression, expression.getStartPosition(), exp2.getEndPosition());
          } else {
            t.pushBack();
          }
        } else {
          t.pushBack();
        }

        parent.add(expression);
        return expression;
      }
      /** Parses a construct 
       * 
       * @param {
       Tokenizer} t
       * @param {Node} parent
       * @returns {unresolved} the parsed macro
       * @throws parse exception
       */
      parseConstruct(t, parent) {
        let ntn = this.notation;
        let Sym = Notation.Symbol;
        let Stx = Notation.Syntax;
        let statement = null;
        let ttype = t.nextToken();
        let symbols = t.getSymbolValue();
        if (ttype == Tokenizer.TT_KEYWORD
          && this.containsType(symbols, Sym.DELIMITER)) {
          // Evaluate: StmtDelimiter
          // -----------------------

          // We discard StmtDelimiter's
          statement = null;
        } else {
          statement = new AST.StatementNode(ntn.getLayerCount());
          parent.add(statement);
          statement.setStartPosition(t.getStartPosition());
          t.pushBack();
          // Evaluate: {Prefix}
          let prefix = statement;
          let lastPrefix = statement;
          let guard = t.getInputLength();
          while ((prefix = this.parsePrefix(t, prefix)) != null) {

            guard = guard - 1;
            if (guard < 0) {
              throw new Error("too many iterations");
            }
            lastPrefix = prefix;
          }

// Evaluate: Statement
          let innerStatement = this.parseStatement(t, lastPrefix);
          statement.setEndPosition(innerStatement.getEndPosition());
// Evaluate: Suffix
          let child = statement.getChildAt(0);
          let suffix = statement;
          guard = t.getInputLength();
          while ((suffix = this.parseSuffix(t, statement)) != null) {
            guard = guard - 1;
            if (guard < 0) {
              throw new Error("too many iterations");
            }
            suffix.add(child);
            child = suffix;
            statement.setEndPosition(suffix.getEndPosition());
          }
        }
        return statement;
      }
      /** Parses a prefix. 
       * 
       * @param {
       Tokenizer} t
       * @param {Node} parent
       * @returns {unresolved} the parsed macro
       * @throws parse exception
       */
      parsePrefix(t, parent) {
        let ntn = this.notation;
        let Sym = Notation.Symbol;
        let Stx = Notation.Syntax;
        let ttype = t.nextToken();
        if (ttype == Tokenizer.TT_EOF) {
          return null;
        }
        let numericToken = null;
        if (ttype == Tokenizer.TT_NUMBER) {
          t.pushBack();
          // If the token is numeric, we have encountered
          // a repetition prefix.
          if (ntn.isSyntax(Sym.REPETITION, Stx.PREFIX)) {
            return this.parseRepetitor(t, parent);
          } else {
            return null;
          }
        }
// the prefix must be a keyword, or it is not a prefix at all  
        if (ttype != Tokenizer.TT_KEYWORD) {
          t.pushBack();
          return null;
        }
        let symbols = t.getSymbolValue();
// We push back, because we do just decisions in this production
        t.pushBack();
// Is it a commutator?
        if (ntn.isSyntax(Sym.COMMUTATION, Stx.PREFIX)
          && this.containsType(symbols, Sym.COMMUTATION_BEGIN)) {
          return this.parseExpressionAffix(t, parent);
        }

// Is it a conjugator?
        if (ntn.isSyntax(Sym.CONJUGATION, Stx.PREFIX)
          && this.containsType(symbols, Sym.CONJUGATION_BEGIN)) {
          return this.parseExpressionAffix(t, parent);
        }

// Is it a rotator?
        if (ntn.isSyntax(Sym.ROTATION, Stx.PREFIX)
          && this.containsType(symbols, Sym.ROTATION_BEGIN)) {
          return this.parseExpressionAffix(t, parent);
        }

// Is it an Inversion?
        if (ntn.isSyntax(Sym.INVERSION, Stx.PREFIX)
          && this.containsType(symbols, Sym.INVERTOR)) {
          return this.parseInvertor(t, parent);
        }

// Is it a repetition?
        if (ntn.isSyntax(Sym.REPETITION, Stx.PREFIX)
          && this.containsType(symbols, Sym.REPETITION_BEGIN)) {
          return this.parseRepetitor(t, parent);
        }

// Is it a reflection?
        if (ntn.isSyntax(Sym.REFLECTION, Stx.PREFIX)
          && this.containsType(symbols, Sym, Sym.REFLECTOR)) {
          return this.parseReflector(t, parent);
        }

// Or is it no prefix at all?
        return null;
      }
      /** Parses a suffix. 
       * 
       * @param {
       Tokenizer} t
       * @param {Node} parent
       * @returns {unresolved} the parsed macro
       * @throws parse exception
       */
      parseSuffix(t, parent) {
        let ntn = this.notation;
        let Sym = Notation.Symbol;
        let Stx = Notation.Syntax;
        let ttype = t.nextToken();
        if (ttype == Tokenizer.TT_EOF) {
          return null;
        }
        let numericToken = null;
        if (ttype == Tokenizer.TT_NUMBER) {
          t.pushBack();
          // If the token is numeric, we have encountered
          // a repetition prefix.
          if (ntn.isSyntax(Sym.REPETITION, Stx.SUFFIX)) {
            return this.parseRepetitor(t, parent);
          } else {
            return null;
          }
        }
// the prefix must be a keyword, or it is not a prefix at all  
        if (ttype != Tokenizer.TT_KEYWORD) {
          t.pushBack();
          return null;
        }
        let symbols = t.getSymbolValue();
// We push back, because we do just decisions in this production
        t.pushBack();
// Is it a commutator?
        if (ntn.isSyntax(Sym.COMMUTATION, Stx.SUFFIX)
          && this.containsType(symbols, Sym.COMMUTATION_BEGIN)) {
          return this.parseExpressionAffix(t, parent);
        }

// Is it a conjugator?
        if (ntn.isSyntax(Sym.CONJUGATION, Stx.SUFFIX)
          && this.containsType(symbols, Sym.CONJUGATION_BEGIN)) {
          return this.parseExpressionAffix(t, parent);
        }

// Is it a rotator?
        if (ntn.isSyntax(Sym.ROTATION, Stx.SUFFIX)
          && this.containsType(symbols, Sym.ROTATION_BEGIN)) {
          return this.parseExpressionAffix(t, parent);
        }

// Is it an Inversion?
        if (ntn.isSyntax(Sym.INVERSION, Stx.SUFFIX)
          && this.containsType(symbols, Sym.INVERTOR)) {
          return this.parseInvertor(t, parent);
        }

// Is it a repetition?
        if (ntn.isSyntax(Sym.REPETITION, Stx.SUFFIX)
          && this.containsType(symbols, Sym.REPETITION_BEGIN)) {
          return this.parseRepetitor(t, parent);
        }

// Is it a reflection?
        if (ntn.isSyntax(Sym.REFLECTION, Stx.SUFFIX)
          && this.containsType(symbols, Sym.REFLECTOR)) {
          return this.parseReflector(t, parent);
        }

// Or is it no suffix at all?
        return null;
      }
      /** Parses a macro. 
       * 
       * @param {
       Tokenizer} t
       * @param {Node} parent
       * @returns {unresolved} the parsed macro
       * @throws parse exception
       */
      parseMacro(t, parent) {
        throw new ParseException("Macro: Not implemented " + t.sval, t.getStartPosition(), t.getEndPosition());
      }
      /** Parses a repetitor 
       * 
       * @param {Tokenizer} t
       * @param {Node} parent
       * @returns {unresolved} the parsed repetitor
       * @throws parse exception
       */
      parseRepetitor(t, parent) {
        const ntn = this.notation;
        const Sym = Notation.Symbol;
        // Only parse if supported
        if (!ntn.isSupported(Sym.REPETITION)) {
          return null;
        }

        let repetition = new AST.RepetitionNode(ntn.getLayerCount());
        parent.add(repetition);
        repetition.setStartPosition(t.getStartPosition());
// Evaluate [RptrBegin] token.
// ---------------------------
// Only word tokens are legit.
// Fetch the next token.
        if (t.nextToken() != Tokenizer.TT_KEYWORD
          && t.getTokenType() != Tokenizer.TT_NUMBER) {
          throw new ParseException("Repetitor: illegal begin.", t.getStartPosition(), t.getEndPosition());
        }

// Is it a [RptrBegin] token? Consume it.
        let symbols = t.getSymbolValue();
        if (symbols != null && this.isType(symbols, Sym.REPETITION_BEGIN)) {
          //consume
        } else {
          t.pushBack();
        }
// The [RptrBegin] token is now done.

// Evaluate Integer token.
// ---------------------------
// Only number tokens are legit.
        if (t.nextToken() != Tokenizer.TT_NUMBER) {
          throw new ParseException("Repetitor: Repeat count missing.", t.getStartPosition(), t.getEndPosition());
        }
        let intValue = t.getNumericValue();
        if (intValue < 1) {
          throw new ParseException("Repetitor: illegal repeat count " + intValue, t.getStartPosition(), t.getEndPosition());
        }
        repetition.setRepeatCount(intValue);
        repetition.setEndPosition(t.getEndPosition());
        module.log("parseRepetitor count: " + intValue);
// The Integer token is now done.

// Evaluate [RptrEnd] token.
// ---------------------------
// Only keyword tokens are of interest.
        if (t.nextToken() != Tokenizer.TT_KEYWORD) {
          t.pushBack();
          return repetition;
        }

// Is it a [RptrEnd] token? Consume it.
        symbols = t.getSymbolValue();
        if (this.isType(symbols, Sym.REPETITION_END)) {
          //consume
        } else {
          t.pushBack();
        }
        return repetition;
      }

      /** Parses an invertor 
       * 
       * @param {
       Tokenizer} t
       * @param {Node} parent
       * @returns {unresolved} the parsed node
       * @throws parse exception
       */
      parseInvertor(t, parent) {
        const ntn = this.notation;
        const Sym = Notation.Symbol;
        const inversion = new AST.InversionNode(ntn.getLayerCount());
        parent.add(inversion);
        inversion.setStartPosition(t.getStartPosition());
        // Fetch the next token.
        if (t.nextToken() != Tokenizer.TT_KEYWORD) {
          throw new ParseException("Invertor: illegal begin.", t.getStartPosition(), t.getEndPosition());
        }
        let symbols = t.getSymbolValue();
        if (this.containsType(symbols, Sym.INVERTOR)) {
          module.log('parseInvertor: ' + t.getStringValue() + ' ' + t.getStartPosition() + '..' + t.getEndPosition());
          inversion.setEndPosition(t.getEndPosition());
          return inversion;
        }

// Or else?
        throw new ParseException("Invertor: illegal invertor " + t.sval, t.getStartPosition(), t.getEndPosition());
      }

      /** Parses a reflector 
       * 
       * @param {
       Tokenizer} t
       * @param {Node} parent
       * @returns {unresolved} the parsed node
       * @throws parse exception
       */
      parseReflector(t, parent) {
        const ntn = this.notation;
        const Sym = Notation.Symbol;
        const reflection = new AST.ReflectionNode(ntn.getLayerCount());
        parent.add(reflection);
        reflection.setStartPosition(t.getStartPosition());
        // Fetch the next token.
        if (t.nextToken() != Tokenizer.TT_KEYWORD) {
          throw new ParseException("Reflector: illegal begin.", t.getStartPosition(), t.getEndPosition());
        }
        let symbols = t.getSymbolValue();
        if (this.containsType(symbols, Sym.REFLECTOR)) {
          module.log('parseReflector: ' + t.getStringValue() + ' ' + t.getStartPosition() + '..' + t.getEndPosition());
          reflection.setEndPosition(t.getEndPosition());
          return reflection;
        }

// Or else?
        throw new ParseException("Reflector: illegal reflection " + t.sval, t.getStartPosition(), t.getEndPosition());
      }

      /**
       * Parses an affix which consists of an expression surrounded by a begin
       * token and an end token. Either the begin or the end token is mandatory.
       */
      parseExpressionAffix(t, parent) {
        const ntn = this.notation;
        const Sym = Notation.Symbol;
        const Stx = Notation.Syntax;

        const startPosition = t.getStartPosition();

        // Fetch the next token.
        if (t.nextToken() != Tokenizer.TT_KEYWORD) {
          throw new ParseException("Affix: Invalid begin.", t.getStartPosition(), t.getEndPosition());
        }
        let symbols = t.getSymbolValue();

        // Parse the BEGIN token and collect all potential end nodes
        const endSymbols = [];
        if (this.containsType(symbols, Sym.CONJUGATION_BEGIN)
          && (ntn.isSyntax(Sym.CONJUGATION, Stx.PREFIX)
            || ntn.isSyntax(Sym.CONJUGATION, Stx.SUFFIX))) {
          endSymbols.push(Sym.CONJUGATION_END);
        }
        if (this.containsType(symbols, Sym.COMMUTATION_BEGIN)
          && (ntn.isSyntax(Sym.COMMUTATION, Stx.PREFIX)
            || ntn.isSyntax(Sym.COMMUTATION, Stx.SUFFIX))) {
          endSymbols.push(Sym.COMMUTATION_END);
        }
        if (this.containsType(symbols, Sym.ROTATION_BEGIN)
          && (ntn.isSyntax(Sym.ROTATION, Stx.PREFIX)
            || ntn.isSyntax(Sym.ROTATION, Stx.SUFFIX))) {
          endSymbols.push(Sym.ROTATION_END);
        }
        if (endSymbols.length == 0) {
          // Or else?
          throw new ParseException("Affix: Invalid begin " + t.sval, t.getStartPosition(), t.getEndPosition());
        }

        // Is it a CngrBegin Statement {Statement} CngrEnd thingy?
        let operator = new AST.SequenceNode(ntn.getLayerCount());
        let endSymbol = null;
        Loop:
          do {
            this.parseExpression(t, operator);
            if (t.nextToken() != Tokenizer.TT_KEYWORD) {
              throw new ParseException("Affix: Statement missing.", t.getStartPosition(), t.getEndPosition());
            }
            symbols = t.getSymbolValue();
            for (let i = 0; i < endSymbols.length; i++) {
              endSymbol = endSymbols[i];
              if (this.containsType(symbols, endSymbol)) {
                break Loop;
              }
            }
            t.pushBack();
          } while (token != null);
        //t.nextToken();

        let affix = null;
        if (endSymbol == Sym.CONJUGATION_END) {
          let cNode = new AST.ConjugationNode(ntn.getLayerCount());
          cNode.setConjugator(operator);
          affix = cNode;
        } else if (endSymbol == Sym.COMMUTATION_END) {
          let cNode = new AST.CommutationNode(ntn.getLayerCount());
          cNode.setCommutator(operator);
          affix = cNode;
        } else if (endSymbol == Sym.ROTATION_END) {
          let cNode = new AST.RotationNode(ntn.getLayerCount());
          cNode.setRotator(operator);
          affix = cNode;
        } else {
          throw new ParseException("Affix: Invalid end symbol " + t.sval, t.getStartPosition(), t.getEndPosition());
        }
        affix.setStartPosition(startPosition);
        affix.setEndPosition(t.getEndPosition());
        parent.add(affix);
        return affix;
      }

      /** Parses a NOP. 
       * 
       * @param {
       Tokenizer} t
       * @param {Node} parent
       * @returns {unresolved} the parsed NOP
       * @throws parse exception
       */
      parseNOP(t, parent) {
        const ntn = this.notation;
        const Sym = Notation.Symbol;
        if (t.nextToken() != Tokenizer.TT_KEYWORD) {
          throw new ParseException("NOP: \"" + t.getStringValue() + "\" is a " + t.getTokenType() + " but not a keyword.", t.getStartPosition(), t.getEndPosition());
        }
        let symbols = t.getSymbolValue();
        if (!this.containsType(symbols, Sym.NOP)) {
          throw new ParseException("Move: \"" + t.getStringValue() + "\" is not a NOP", t.getStartPosition(), t.getEndPosition());
        }

        module.log('parseNOP: "' + t.getStringValue() + '".');
        let nop = new AST.NOPNode(ntn.getLayerCount(), t.getStartPosition(), t.getEndPosition());
        parent.add(nop);
        return nop;
      }

      /**
       * Parses a move.
       * 
       * @param {
       Tokenizer} t
       * @param {Node} parent
       * @returns {unresolved} the parsed move
       * @throws parse exception
       */
      parseMove(t, parent) {
        const ntn = this.notation;
        let move = new AST.MoveNode(ntn.getLayerCount());
        parent.add(move);
        if (t.nextToken() != Tokenizer.TT_KEYWORD) {
          throw new ParseException("Move: \"" + t.getStringValue() + "\" is a " + t.getTokenType() + " but not a keyword.", t.getStartPosition(), t.getEndPosition());
        }
        let symbols = t.getSymbolValue();
        let symbol = null;
        for (let i = 0; i < symbols.length; i++) {
          if (symbols[i].getType() == Notation.Symbol.MOVE) {
            symbol = symbols[i];
            break;
          }
        }
        if (symbol == null) {
          throw new ParseException("Move: \"" + t.getStringValue() + "\" is not a Move", t.getStartPosition(), t.getEndPosition());
        }

        module.log('parseMove: "%s".', t.getStringValue());
        move.setStartPosition(t.getStartPosition());
        move.setEndPosition(t.getEndPosition());
        move.setAxis(symbol.getAxis());
        move.setAngle(symbol.getAngle());
        move.setLayerMask(symbol.getLayerMask());
        return move;
      }

    }

    /** Returns an array of script nodes. */
    let createRandomScript = function (layerCount, scrambleCount, scrambleMinCount) {
      if (scrambleCount == null)
        scrambleCount = 21;
      if (scrambleMinCount == null)
        scrambleMinCount = 6;
      var scrambler = new Array(Math.floor(Math.random() * scrambleCount - scrambleMinCount) + scrambleMinCount);
      // Keep track of previous axis, to avoid two subsequent moves on
      // the same axis.
      var prevAxis = -1;
      var axis, layerMask, angle;
      for (var i = 0; i < scrambleCount; i++) {
        while ((axis = Math.floor(Math.random() * 3)) == prevAxis) {
        }
        prevAxis = axis;
//    while ((layerMask = Math.floor(Math.random()*(1 << this.layerCount))) == 0) {        }
        layerMask = 1 << Math.floor(Math.random() * layerCount);
        while ((angle = Math.floor(Math.random() * 5) - 2) == 0) {
        }
        scrambler[i] = new AST.MoveNode(layerCount, axis, layerMask, angle);
      }

      return scrambler;
    }

// ------------------
// MODULE API    
// ------------------
    return {
      ParseException: ParseException,
      ScriptParser: ScriptParser,
      createRandomScript: createRandomScript,
      newTwistNode: (axis, layerMask, angle) => new AST.MoveNode(3, axis, layerMask, angle)
    };
  });
