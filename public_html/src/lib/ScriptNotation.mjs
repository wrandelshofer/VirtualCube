/* @(#)ScriptNotation.mjs
 * Copyright (c) 2019 Werner Randelshofer, Switzerland. MIT License.
 */


let Syntax = Object.freeze({
    /**
     * A primary expression: A single literal or name that stands for itself
     * or can be used as a building block of other expressions.
     */
    PRIMARY : "primary",
    /**
     * Unary prefix expression. The operator consists
     * of a single token that is placed before the operand.
     * <pre>
     * Prefix ::= Operator, Operand ;
     * </pre>
     *
     */
    PREFIX: "prefix",
    /**
     * Unary suffix expression.  The operator consists
     * of a single token that is placed after the operand.
     * <pre>
     * Suffix ::= Operand, Operator  ;
     * </pre>
     */
    SUFFIX: "suffix",
    /**
     * Unary circumfix expression: The operator consists
     * of two tokens (begin, end) that are placed
     * around the operand.
     * <pre>
     * Unary Circumfix ::= Begin , Operand1 , End ;
     * </pre>
     */
    CIRCUMFIX: "circumfix",
    /**
     * Binary Pre-Circumfix expression:  The operator consists
     * of three tokens (begin, delimiter, end) that are placed
     * around operand 2 and operand 1.
     * <pre>
     * Binary Precircumfix ::= Begin , Operand2 , Delimiter , Operand1 , End ;
     * </pre>
     */
    PRECIRCUMFIX: "precircumfix",
    /**
     * Binary Post-Circumfix expression:  The operator consists
     * of three tokens (begin, delimiter, end) that are placed
     * around the operands 1 and 2.
     * <pre>
     * Binary Postcircumfix ::= Begin , Operand1 , Delimiter , Operand2 , End ;
     * </pre>
     */
    POSTCIRCUMFIX: "postcircumfix",
    /**
     * Binary Pre-Infix expression: The operator consists of a single token
     * that is placed between operand 2 and 1.
     * <pre>
     * Preinfix ::= Operand2 , Operator, Operand1;
     * </pre>
     */
    PREINFIX: "preinfix",
    /**
     * Binary Post-Infix expression: The operator consists of a single token
     * that is placed between operand 1 and 2.
     * <pre>
     * Postinfix ::= Operand1 , Operator, Operand2;
     * </pre>
     */
    POSTINFIX: "postinfix"


});

/** Declares the composite symbol map, so that we can reference it from class Symbol.
 *  This map is filled near the end of this module. 
 * @type Map<Symbol,Symbol>
 */
let COMPOSITE_SYMBOL_MAP = new Map();


let symbolOrdinal = 0; // this ordinal is used for sorting symbols
class Symbol {
    constructor(name) {
        this.name = name;
        this.ordinal = symbolOrdinal++;
    }
    getCompositeSymbol() {
        return COMPOSITE_SYMBOL_MAP.get(this);
    }
    getType() {
        return this;
    }
    getSubSymbols() {
        return [];
    }
    isTerminalSymbol() {
        return true;
    }
    isSubSymbol(s) {
        return false;
    }
    toString() {
        return this.name;
    }
    getName() {
        return this.name;
    }
    getOrdinal() {
        return this.ordinal;
    }
    compareTo(that) {
        return this.ordinal - that.ordinal;
    }
}

/** Defines a terminal symbol. */
class TerminalSymbol extends Symbol {
    /**
     * 
     * @param {String} name
     * @param {String} alternativeName
     */
    constructor(name, alternativeName) {
       super(name);
        this.alternativeName = alternativeName;
    }

    getAlternativeName() {
        return this.alternativeName;
    }

    toString() {
        return "TerminalSymbol{"+this.name+","+this.alternativeName+"}";
    }
}
/** Defines a compound symbol. */
class CompositeSymbol extends Symbol {
    /**
     * 
     * @param {String} name
     * @param {String} alternativeName
     * @param {Array<Symbol>} subSymbols
     */
    constructor(name, subSymbols) {
       super(name);
        this.subSymbols = subSymbols;
    }
    getSubSymbols() {
        return this.subSymbols;// XXX should return a clone
    }
    isTerminalSymbol() {
        return false;
    }
    isSubSymbol(s) {
        if (this.subSymbols != null) {
            for (let i = 0; i < this.subSymbols.length; i++) {
                if (s == this.subSymbols[i])
                    return true;
            }
            return false;
        } else {
            return s == this;
        }
    }
}

/**
 * Terminal symbols.
 */
Symbol.NOP = new TerminalSymbol("NOP");
Symbol.MOVE = new TerminalSymbol("move", "twist");

// Note: THe ordering of the permutation face symbols is significant in ScriptASt.mjs PermutationNode.
Symbol.FACE_R = new TerminalSymbol("permR");
Symbol.FACE_U = new TerminalSymbol("permU");
Symbol.FACE_F = new TerminalSymbol("permF");
Symbol.FACE_L = new TerminalSymbol("permL");
Symbol.FACE_D = new TerminalSymbol("permD");
Symbol.FACE_B = new TerminalSymbol("permB");

Symbol.PERMUTATION_PLUS = new TerminalSymbol("permPlus");
Symbol.PERMUTATION_MINUS = new TerminalSymbol("permMinus");
Symbol.PERMUTATION_PLUSPLUS = new TerminalSymbol("permPlusPlus");
Symbol.PERMUTATION_BEGIN = new TerminalSymbol("permBegin", "permutationBegin");
Symbol.PERMUTATION_END = new TerminalSymbol("permEnd", "permutationEnd");
Symbol.PERMUTATION_DELIMITER = new TerminalSymbol("permDelim", "permutationDelimiter");
Symbol.DELIMITER = new TerminalSymbol("delimiter", "statementDelimiter");
Symbol.INVERSION_BEGIN = new TerminalSymbol("inversionBegin");
Symbol.INVERSION_END = new TerminalSymbol("inversionEnd");
Symbol.INVERSION_OPERATOR = new TerminalSymbol("invertor");
Symbol.REFLECTION_BEGIN = new TerminalSymbol("reflectionBegin");
Symbol.REFLECTION_END = new TerminalSymbol("reflectionEnd");
Symbol.REFLECTION_OPERATOR = new TerminalSymbol("reflector");
Symbol.GROUPING_BEGIN = new TerminalSymbol("groupingBegin", "sequenceBegin");
Symbol.GROUPING_END = new TerminalSymbol("groupingEnd", "sequenceEnd");
Symbol.REPETITION_BEGIN = new TerminalSymbol("repetitionBegin", "repetitorBegin");
Symbol.REPETITION_END = new TerminalSymbol("repetitionEnd", "repetitorEnd");
Symbol.REPETITION_DELIMITER = new TerminalSymbol("repetitionDelim", "repetitorDelimiter");
Symbol.REPETITION_OPERATOR = new TerminalSymbol("repetitionOperator");
Symbol.COMMUTATION_BEGIN = new TerminalSymbol("commutationBegin", "commutatorBegin");
Symbol.COMMUTATION_END = new TerminalSymbol("commutationEnd", "commutatorEnd");
Symbol.COMMUTATION_DELIMITER = new TerminalSymbol("commutationDelim", "commutatorDelimiter");
Symbol.COMMUTATION_OPERATOR = new TerminalSymbol("commutationOperator");
Symbol.CONJUGATION_BEGIN = new TerminalSymbol("conjugationBegin", "conjugatorBegin");
Symbol.CONJUGATION_END = new TerminalSymbol("conjugationEnd", "conjugatorEnd");
Symbol.CONJUGATION_DELIMITER = new TerminalSymbol("conjugationDelim", "conjugatorDelimiter");
Symbol.CONJUGATION_OPERATOR = new TerminalSymbol("conjugationOperator");
Symbol.ROTATION_BEGIN = new TerminalSymbol("rotationBegin", "rotatorBegin");
Symbol.ROTATION_END = new TerminalSymbol("rotationEnd", "rotatorEnd");
Symbol.ROTATION_DELIMITER = new TerminalSymbol("rotationDelim", "rotatorDelimiter");
Symbol.ROTATION_OPERATOR = new TerminalSymbol("rotationPOperator");
Symbol.MACRO = new TerminalSymbol("macro");
Symbol.MULTILINE_COMMENT_BEGIN = new TerminalSymbol("commentMultiLineBegin", "slashStarCommentBegin");
Symbol.MULTILINE_COMMENT_END = new TerminalSymbol("commentMultiLineEnd", "slashStarCommentEnd");
Symbol.SINGLELINE_COMMENT_BEGIN = new TerminalSymbol("commentSingleLineBegin", "slashSlashComment");

Symbol.COMMUTATION = new CompositeSymbol("commutation", [
    Symbol.COMMUTATION_BEGIN,
    Symbol.COMMUTATION_END,
    Symbol.COMMUTATION_DELIMITER,
    Symbol.COMMUTATION_OPERATOR
]);
Symbol.CONJUGATION = new CompositeSymbol("conjugation", [
    Symbol.CONJUGATION_BEGIN,
    Symbol.CONJUGATION_END,
    Symbol.CONJUGATION_DELIMITER,
    Symbol.CONJUGATION_OPERATOR
]);
Symbol.GROUPING = new CompositeSymbol("grouping", [
    Symbol.GROUPING_BEGIN,
    Symbol.GROUPING_END
]);
Symbol.INVERSION = new CompositeSymbol("inversion", [
    Symbol.INVERSION_BEGIN,
    Symbol.INVERSION_END,
    Symbol.INVERSION_OPERATOR
]);

Symbol.PERMUTATION_ITEM = new TerminalSymbol("permutationItem");
Symbol.PERMUTATION = new CompositeSymbol("permutation", [
    Symbol.FACE_R,
    Symbol.FACE_U,
    Symbol.FACE_F,
    Symbol.FACE_L,
    Symbol.FACE_D,
    Symbol.FACE_B,
    Symbol.PERMUTATION_PLUS,
    Symbol.PERMUTATION_MINUS,
    Symbol.PERMUTATION_PLUSPLUS,
    Symbol.PERMUTATION_BEGIN,
    Symbol.PERMUTATION_END,
    Symbol.PERMUTATION_DELIMITER
]);
Symbol.REFLECTION = new CompositeSymbol("reflection", [
    Symbol.REFLECTION_BEGIN,
    Symbol.REFLECTION_END,
    Symbol.REFLECTION_OPERATOR
]);
Symbol.REPETITION = new CompositeSymbol("repetition", [
    Symbol.REPETITION_BEGIN,
    Symbol.REPETITION_END,
    Symbol.REPETITION_DELIMITER,
    Symbol.REPETITION_OPERATOR
]);
Symbol.ROTATION = new CompositeSymbol("rotation", [
    Symbol.ROTATION_BEGIN,
    Symbol.ROTATION_END,
    Symbol.ROTATION_DELIMITER,
    Symbol.ROTATION_OPERATOR
]);
Symbol.COMMENT = new CompositeSymbol("comment", [
    Symbol.MULTILINE_COMMENT_BEGIN,
    Symbol.MULTILINE_COMMENT_END,
    Symbol.SINGLELINE_COMMENT_BEGIN
]);
Symbol.PRIMARY = new CompositeSymbol("statement", [
    Symbol.NOP,
    Symbol.MOVE,
    Symbol.MACRO
]);
Symbol.STATEMENT = new CompositeSymbol("statement", [
    Symbol.PRIMARY,
    Symbol.GROUPING,
    Symbol.INVERSION,
    Symbol.REFLECTION,
    Symbol.CONJUGATION,
    Symbol.COMMUTATION,
    Symbol.ROTATION,
    Symbol.PERMUTATION,
    Symbol.DELIMITER,
    Symbol.REPETITION
]);
Symbol.SEQUENCE = new CompositeSymbol("sequence", [
    Symbol.STATEMENT,
    Symbol.COMMENT
]);

Symbol.isBegin = new function (s) {
    switch (s) {
        case Symbol.CONJUGATION_BEGIN:
        case Symbol.COMMUTATION_BEGIN:
        case Symbol.ROTATION_BEGIN:
        case Symbol.PERMUTATION_BEGIN:
        case Symbol.INVERSION_BEGIN:
        case Symbol.REFLECTION_BEGIN:
        case Symbol.GROUPING_BEGIN:
        case Symbol.MULTILINE_COMMENT_BEGIN:
        case Symbol.SINGLELINE_COMMENT_BEGIN:
            return true;
        default:
            return false;
    }
};
Symbol.isOperator = new function (s) {
    switch (s) {
        case Symbol.CONJUGATION_OPERATOR:
        case Symbol.COMMUTATION_OPERATOR:
        case Symbol.ROTATION_OPERATOR:
        case Symbol.INVERSION_OPERATOR:
        case Symbol.REFLECTION_OPERATOR:
        case Symbol.REPETITION_OPERATOR:
            return true;
        default:
            return false;
    }
};

Symbol.isDelimiter = function (s) {
    switch (s) {
        case Symbol.ROTATION_DELIMITER:
        case Symbol.CONJUGATION_DELIMITER:
        case Symbol.COMMUTATION_DELIMITER:
            return true;
        default:
            return false;
    }
};
Symbol.isBegin = function(s) {
        switch (s) {
            case Symbol.CONJUGATION_BEGIN:
            case Symbol.COMMUTATION_BEGIN:
            case Symbol.ROTATION_BEGIN:
            case Symbol.PERMUTATION_BEGIN:
            case Symbol.INVERSION_BEGIN:
            case Symbol.REFLECTION_BEGIN:
            case Symbol.GROUPING_BEGIN:
            case Symbol.MULTILINE_COMMENT_BEGIN:
            case Symbol.SINGLELINE_COMMENT_BEGIN:
                return true;
            default:
                return false;
        }
    };
Symbol.isEnd = function (s) {
    switch (s) {
        case Symbol.CONJUGATION_END:
        case Symbol.COMMUTATION_END:
        case Symbol.PERMUTATION_END:
        case Symbol.ROTATION_END:
        case Symbol.INVERSION_END:
        case Symbol.REFLECTION_END:
        case Symbol.GROUPING_END:
        case Symbol.MULTILINE_COMMENT_END:
            return true;
        default:
            return false;
    }
};

Symbol.isOperator = function(s) {
        switch (s) {
            case Symbol.CONJUGATION_OPERATOR:
            case Symbol.COMMUTATION_OPERATOR:
            case Symbol.ROTATION_OPERATOR:
            case Symbol.INVERSION_OPERATOR:
            case Symbol.REFLECTION_OPERATOR:
            case Symbol.REPETITION_OPERATOR:
                return true;
            default:
                return false;
        }
    };


Symbol.isFaceSymbol = function (s) {
    switch (s) {
        case Symbol.FACE_R:
        case Symbol.FACE_U:
        case Symbol.FACE_F:
        case Symbol.FACE_L:
        case Symbol.FACE_D:
        case Symbol.FACE_B:
            return true;
        default:
            return false;
    }
};

Symbol.isPermutationSign = function (s) {
    switch (s) {
        case Symbol.PERMUTATION_PLUS:
        case Symbol.PERMUTATION_PLUSPLUS:
        case Symbol.PERMUTATION_MINUS:
            return true;
        default:
            return false;
    }
};

/** Describes properties of a specific move symbol.  */
class Move {
    constructor(layerCount, axis, layerMask, angle) {
        this.layerCount = layerCount;
        this.axis = axis;
        this.layerMask = layerMask;
        this.angle = angle;
    }
    getLayerCount() {
        return this.layerCount;
    }
    getAxis() {
        return this.axis;
    }
    getLayerMask() {
        return this.layerMask;
    }
    getAngle() {
        return this.angle;
    }
}

/** Defines a notation. */
class Notation {
    constructor() {
        this.macros = new Map();//Map<String,String>
        this.keywords = [];
        this.specials = [];

        this.layerCount = 3;
        this.symbolToTokensMap = new Map();// Map<Symbol,List<String>>
        this.tokenToSymbolsMap = new Map();// Map<String,List<Symbol>>
        this.moveToTokensMap = new Map();// Map<Move,List<String>>
        this.tokenToMoveMap = new Map();// Map<String,Move>
        this.symbolToSyntaxMap = new Map();//Map<Symbol,Syntax>
        this.faceToTokensMap = new Map();// Map<Face,List<String>>
        this.tokenToFaceMap = new Map();// Map<String,Face>
    }

    /**
     * Returns the macros defined by this notation.
     * @returns {Map<String,String>} macros;
     */
    getMacros() {
        return this.macros;
    }
    addMacro(identifier, code) {
        this.macros.set(identifier, code);
    }
    getKeywords() {
        return this.keywords;
    }
    getSpecials() {
        return this.specials;
    }
    getLayerCount() {
        return this.layerCount;
    }
    setLayerCount(newValue) {
        this.layerCount=newValue;
    }
    addToken(symbol, token) {
        // Add to symbolToTokensMap
        let tokens = this.symbolToTokensMap.get(symbol);
        if (tokens == null) {
            tokens = [];
            this.symbolToTokensMap.set(symbol, tokens);
        }
        tokens.push(token);

        // Add to tokenToSymbolsMap
        let symbols = this.tokenToSymbolsMap.get(token);
        if (symbols == null) {
            symbols = [];
            this.tokenToSymbolsMap.set(token, symbols);
        }
        symbols.push(symbol);
    }
    addMoveToken(layerCount, axis, layerMask, angle, token) {
        let move = new Move(layerCount, axis, layerMask, angle);

        // Add to tokenToSymbolsMap and symbolToTokensMap
        this.addToken(Symbol.MOVE, token);

        // Add to moveToTokensMap
        let tokens = this.moveToTokensMap.get(move);
        if (tokens == null) {
            tokens = [];
            this.moveToTokensMap.set(move, tokens);
        }
        tokens.push(token);

        // Add to tokenToMoveMap
        this.tokenToMoveMap.set(token, move);
    }
    getMoveFromToken(token) {
        return this.tokenToMoveMap.get(token);
    }
    addFaceToken(face, token) {
        let faceObj = new Face(face);

        // Add to tokenToSymbolsMap and symbolToTokensMap
       this.addToken(Symbol.FACE, token);

        // Add to moveToTokensMap
        let tokens = this.faceToTokensMap.get(faceObj);
        if (tokens == null) {
            tokens = [];
            this.faceToTokensMap.set(face, tokens);
        }
        tokens.push(token);

        // Add to tokenToMoveMap
        this.tokenToFaceMap.set(token, faceObj);
    }

    getTokenToSymbolMap() {
        return this.tokenToSymbolsMap;
    }
    /**
     * Given a (potentially ambiguous) token and a composite symbol
     * that parser is currently parsing, returns the symbol for
     * that token.
     * 
     * @param token:String a token
     * @param compositeSymbol:Symbol the composite symbol being parsed
     * @return :Symbol the symbol for the token in this composite symbol
     */
    getSymbolInCompositeSymbol(token, compositeSymbol) {
        for (let s of this.getSymbols(token)) {
            if (compositeSymbol.isSubSymbol(s)) {
                return s;
            }
        }
        return null;
    }

    /**
     * Given a (potentially ambiguous) token returns all symbols for
     * that token.
     *
     * @param token a token
     * @return the symbols for the token or an empty list
     */
    getSymbols(token) {
        let symbols = this.tokenToSymbolsMap.get(token);
        return symbols == null ? [] : symbols;
    }
    
    getTokens() {
        return this.tokenToSymbolsMap.keys();
    }
    getToken(symbol) {
        let tokens = this.symbolToTokensMap.get(symbol);
        return tokens == null || tokens.length == 0 ? null : tokens[0];
    }
    isSyntax(symbol, syntax) {
        if (symbol == null || syntax == null) {
            throw  new Error("illegal arguments symbol:" + symbol + " syntax:" + syntax);
        }
        return this.symbolToSyntaxMap.get(symbol) == syntax;
    }
    getSyntax(symbol) {
        let syntax = this.symbolToSyntaxMap.get(symbol.getCompositeSymbol());
        return syntax != null ? syntax : Syntax.PRIMARY;
    }
    isSupported(symbol) {
        return this.symbolToSyntaxMap.get(symbol) != null || this.symbolToTokensMap.get(symbol) != null;
    }
}

/** Defines a default notation that works for 3x3 and 2x2 cubes. */
class DefaultNotation extends Notation {
    constructor(layerCount) {
       super();

        this.layerCount = layerCount == null ? 3 : layerCount;
        if (this.layerCount<2||this.layerCount>7) {
            throw "Cannot create a DefaultNotation with layerCount="+layerCount;
        }

        this.addToken(Symbol.NOP, "·");
        this.addToken(Symbol.NOP, ".");
        this.addToken(Symbol.FACE_R, "r");
        this.addToken(Symbol.FACE_U, "u");
        this.addToken(Symbol.FACE_F, "f");
        this.addToken(Symbol.FACE_L, "l");
        this.addToken(Symbol.FACE_D, "d");
        this.addToken(Symbol.FACE_B, "b");
        this.addToken(Symbol.PERMUTATION_PLUS, "+");
        this.addToken(Symbol.PERMUTATION_MINUS, "-");
        this.addToken(Symbol.PERMUTATION_PLUSPLUS, "++");
        this.addToken(Symbol.PERMUTATION_BEGIN, "(");
        this.addToken(Symbol.PERMUTATION_END, ")");
        this.addToken(Symbol.PERMUTATION_DELIMITER, ",");
        //addToken(Symbol.DELIMITER ,"");
        //addToken(Symbol.INVERSION_BEGIN ,"(");
        //addToken(Symbol.INVERSION_END ,")");
        //addToken(Symbol.INVERSION_DELIMITER ,"");
        this.addToken(Symbol.INVERSION_OPERATOR, "'");
        this.addToken(Symbol.INVERSION_OPERATOR, "-");
        //addToken(Symbol.REFLECTION_BEGIN ,"(");
        //addToken(Symbol.REFLECTION_END ,")");
        //addToken(Symbol.REFLECTION_DELIMITER ,"");
        this.addToken(Symbol.REFLECTION_OPERATOR, "*");
        this.addToken(Symbol.GROUPING_BEGIN, "(");
        this.addToken(Symbol.GROUPING_END, ")");
        //addToken(Symbol.REPETITION_BEGIN ,"");
        //addToken(Symbol.REPETITION_END ,"");
        //addToken(Symbol.REPETITION_DELIMITER ,"");
        this.addToken(Symbol.COMMUTATION_BEGIN, "[");
        this.addToken(Symbol.COMMUTATION_END, "]");
        this.addToken(Symbol.COMMUTATION_DELIMITER, ",");
        this.addToken(Symbol.CONJUGATION_BEGIN, "<");
        this.addToken(Symbol.CONJUGATION_END, ">");
        //addToken(Symbol.CONJUGATION_DELIMITER ,":");
        this.addToken(Symbol.ROTATION_BEGIN, "<");
        this.addToken(Symbol.ROTATION_END, ">'");
        //addToken(Symbol.ROTATION_DELIMITER ,"::");
        // addToken(Symbol.MACRO ,"");
        this.addToken(Symbol.MULTILINE_COMMENT_BEGIN, "/*");
        this.addToken(Symbol.MULTILINE_COMMENT_END, "*/");
        this.addToken(Symbol.SINGLELINE_COMMENT_BEGIN, "//");

        // Layer masks
        let inner = 1;
        let middle = 1 << (this.layerCount / 2);
        let outer = 1 << (this.layerCount - 1);
        let all = inner | middle | outer;

        for (let i = 1; i <= 2; i++) {
            let suffix = i == 1 ? "" : "2";
            this.addMoveToken(3, 0, outer, 1 * i, "R" + suffix);
            this.addMoveToken(3, 1, outer, 1 * i, "U" + suffix);
            this.addMoveToken(3, 2, outer, 1 * i, "F" + suffix);
            this.addMoveToken(3, 0, inner, -1 * i, "L" + suffix);
            this.addMoveToken(3, 1, inner, -1 * i, "D" + suffix);
            this.addMoveToken(3, 2, inner, -1 * i, "B" + suffix);

            this.addMoveToken(3, 0, outer | inner, 1 * i, "SR" + suffix);
            this.addMoveToken(3, 1, outer | inner, 1 * i, "SU" + suffix);
            this.addMoveToken(3, 2, outer | inner, 1 * i, "SF" + suffix);
            this.addMoveToken(3, 0, outer | inner, -1 * i, "SL" + suffix);
            this.addMoveToken(3, 1, outer | inner, -1 * i, "SD" + suffix);
            this.addMoveToken(3, 2, outer | inner, -1 * i, "SB" + suffix);

            this.addMoveToken(3, 0, middle | outer, 1 * i, "TR" + suffix);
            this.addMoveToken(3, 1, middle | outer, 1 * i, "TU" + suffix);
            this.addMoveToken(3, 2, middle | outer, 1 * i, "TF" + suffix);
            this.addMoveToken(3, 0, middle | inner, -1 * i, "TL" + suffix);
            this.addMoveToken(3, 1, middle | inner, -1 * i, "TD" + suffix);
            this.addMoveToken(3, 2, middle | inner, -1 * i, "TB" + suffix);

            this.addMoveToken(3, 0, middle, 1 * i, "MR" + suffix);
            this.addMoveToken(3, 1, middle, 1 * i, "MU" + suffix);
            this.addMoveToken(3, 2, middle, 1 * i, "MF" + suffix);
            this.addMoveToken(3, 0, middle, -1 * i, "ML" + suffix);
            this.addMoveToken(3, 1, middle, -1 * i, "MD" + suffix);
            this.addMoveToken(3, 2, middle, -1 * i, "MB" + suffix);

            this.addMoveToken(3, 0, all, 1 * i, "CR" + suffix);
            this.addMoveToken(3, 1, all, 1 * i, "CU" + suffix);
            this.addMoveToken(3, 2, all, 1 * i, "CF" + suffix);
            this.addMoveToken(3, 0, all, -1 * i, "CL" + suffix);
            this.addMoveToken(3, 1, all, -1 * i, "CD" + suffix);
            this.addMoveToken(3, 2, all, -1 * i, "CB" + suffix);
        }

        this.symbolToSyntaxMap.set(Symbol.COMMUTATION, Syntax.PRECIRCUMFIX);
        this.symbolToSyntaxMap.set(Symbol.CONJUGATION, Syntax.PREFIX);
        this.symbolToSyntaxMap.set(Symbol.ROTATION, Syntax.PREFIX);
        this.symbolToSyntaxMap.set(Symbol.GROUPING, Syntax.CIRCUMFIX);
        this.symbolToSyntaxMap.set(Symbol.PERMUTATION, Syntax.PRECIRCUMFIX);
        this.symbolToSyntaxMap.set(Symbol.REPETITION, Syntax.SUFFIX);
        this.symbolToSyntaxMap.set(Symbol.REFLECTION, Syntax.SUFFIX);
        this.symbolToSyntaxMap.set(Symbol.INVERSION, Syntax.SUFFIX);

    }

}

/* Initializes the composite symbol map that we have declared further above. */
{
    for (let s of Object.values(Symbol)) {
        if (s instanceof Symbol) {
            COMPOSITE_SYMBOL_MAP.set(s, s);
        }
    }
    for (let s of COMPOSITE_SYMBOL_MAP.keys()) {
        for (let subSymbol of s.getSubSymbols()) {
            if (subSymbol.getSubSymbols().length == 0) {
                COMPOSITE_SYMBOL_MAP.set(subSymbol, s);
            }
         }   
    }
}


// ------------------
// MODULE API    
// ------------------
export default {
    Notation: Notation,
    DefaultNotation: DefaultNotation,
    Symbol: Symbol,
    Syntax: Syntax,
};
