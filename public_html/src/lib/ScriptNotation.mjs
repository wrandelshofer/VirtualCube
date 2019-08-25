/* @(#)ScriptNotation.mjs
 * Copyright (c) 2019 Werner Randelshofer, Switzerland. MIT License.
 */


let Syntax = {
    /**
     * Binary prefix syntax: The affix is placed between begin and end before
     * the root.
     * <pre>
     * Binary Prefix ::= Begin , Affix , End , Root ;
     * </pre>
     *
     * Unary prefix syntax: The affix is placed before the root.
     * <pre>
     * Unary Prefix ::= Affix , Root ;
     * </pre>
     */
    PREFIX: "prefix",
    /**
     * Binary suffix syntax: The affix is placed between begin and end after
     * the root.
     * <pre>
     * Binary Suffix ::= Root , Begin , Affix , End ;
     * </pre>
     *
     * Unary suffix syntax: The affix is placed after the root.
     * <pre>
     * Suffix ::= Root, Affix ;
     * </pre>
     */
    SUFFIX: "suffix",
    /**
     * Circumfix syntax: The root is placed between begin and end.
     * <pre>
     * Circumfix ::= Begin , Root , End ;
     * </pre>
     */
    CIRCUMFIX: "circumfix",
    /**
     * Pre-Circumfix syntax: The affix is placed before the root.
     * Begin, delimiter and end tokens are placed around them.
     * <pre>
     * Precircumfix ::= Begin , Affix , Delimiter , Root , End ;
     * </pre>
     */
    PRECIRCUMFIX: "precircumfix",
    /**
     * Post-Circumfix syntax: The affix is placed after the root.
     * Begin, delimiter and end tokens are placed around them.
     * <pre>
     * Postcircumfix ::= Begin , Root , Delimiter , Affix , End ;
     * </pre>
     */
    POSTCIRCUMFIX: "postcircumfix",
    /**
     * Binary Pre-Infix syntax: The affix is placed between pre-root and post-root.
     * <pre>
     * Infix ::= Pre-Root , Affix, Post-Root;
     * </pre>
     */
    PREINFIX: "preinfix",
    /**
     * Binary Post-Infix syntax: The affix is placed between post-root and pre-root.
     * <pre>
     * Infix ::= Post-Root , Affix , Pre-Root;
     * </pre>
     */
    POSTINFIX: "postinfix"


};

class Symbol {
    constructor(name) {
        this.name = name;
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
Symbol.FACE_R = new TerminalSymbol("r");
Symbol.FACE_U = new TerminalSymbol("u");
Symbol.FACE_F = new TerminalSymbol("f");
Symbol.FACE_L = new TerminalSymbol("l");
Symbol.FACE_D = new TerminalSymbol("d");
Symbol.FACE_B = new TerminalSymbol("b");
Symbol.PERMUTATION_PLUS = new TerminalSymbol("permPlus");
Symbol.PERMUTATION_MINUS = new TerminalSymbol("permMinus");
Symbol.PERMUTATION_PLUSPLUS = new TerminalSymbol("permPlusPlus");
Symbol.PERMUTATION_BEGIN = new TerminalSymbol("permBegin", "permutationBegin");
Symbol.PERMUTATION_END = new TerminalSymbol("permEnd", "permutationEnd");
Symbol.PERMUTATION_DELIMITER = new TerminalSymbol("permDelim", "permutationDelimiter");
Symbol.DELIMITER = new TerminalSymbol("delimiter", "statementDelimiter");
Symbol.INVERSION_BEGIN = new TerminalSymbol("inversionBegin");
Symbol.INVERSION_END = new TerminalSymbol("inversionEnd");
Symbol.INVERSION_DELIMITER = new TerminalSymbol("inversionDelim");
Symbol.INVERTOR = new TerminalSymbol("invertor");
Symbol.REFLECTION_BEGIN = new TerminalSymbol("reflectionBegin");
Symbol.REFLECTION_END = new TerminalSymbol("reflectionEnd");
Symbol.REFLECTION_DELIMITER = new TerminalSymbol("reflectionDelim");
Symbol.REFLECTOR = new TerminalSymbol("reflector");
Symbol.GROUPING_BEGIN = new TerminalSymbol("groupingBegin", "sequenceBegin");
Symbol.GROUPING_END = new TerminalSymbol("groupingEnd", "sequenceEnd");
Symbol.REPETITION_BEGIN = new TerminalSymbol("repetitionBegin", "repetitorBegin");
Symbol.REPETITION_END = new TerminalSymbol("repetitionEnd", "repetitorEnd");
Symbol.REPETITION_DELIMITER = new TerminalSymbol("repetitionDelim", "repetitorDelimiter");
Symbol.COMMUTATION_BEGIN = new TerminalSymbol("commutationBegin", "commutatorBegin");
Symbol.COMMUTATION_END = new TerminalSymbol("commutationEnd", "commutatorEnd");
Symbol.COMMUTATION_DELIMITER = new TerminalSymbol("commutationDelim", "commutatorDelimiter");
Symbol.CONJUGATION_BEGIN = new TerminalSymbol("conjugationBegin", "conjugatorBegin");
Symbol.CONJUGATION_END = new TerminalSymbol("conjugationEnd", "conjugatorEnd");
Symbol.CONJUGATION_DELIMITER = new TerminalSymbol("conjugationDelim", "conjugatorDelimiter");
Symbol.ROTATION_BEGIN = new TerminalSymbol("rotationBegin", "rotatorBegin");
Symbol.ROTATION_END = new TerminalSymbol("rotationEnd", "rotatorEnd");
Symbol.ROTATION_DELIMITER = new TerminalSymbol("rotationDelim", "rotatorDelimiter");
Symbol.MACRO = new TerminalSymbol("macro");
Symbol.MULTILINE_COMMENT_BEGIN = new TerminalSymbol("commentMultiLineBegin", "slashStarCommentBegin");
Symbol.MULTILINE_COMMENT_END = new TerminalSymbol("commentMultiLineEnd", "slashStarCommentEnd");
Symbol.SINGLELINE_COMMENT_BEGIN = new TerminalSymbol("commentSingleLineBegin", "slashSlashComment");

Symbol.COMMUTATION = new CompositeSymbol("commutation", [
    Symbol.COMMUTATION_BEGIN,
    Symbol.COMMUTATION_END,
    Symbol.COMMUTATION_DELIMITER
]);
Symbol.CONJUGATION = new CompositeSymbol("conjugation", [
    Symbol.CONJUGATION_BEGIN,
    Symbol.CONJUGATION_END,
    Symbol.CONJUGATION_DELIMITER
]);
Symbol.GROUPING = new CompositeSymbol("grouping", [
    Symbol.GROUPING_BEGIN,
    Symbol.GROUPING_END
]);
Symbol.INVERSION = new CompositeSymbol("inversion", [
    Symbol.INVERSION_BEGIN,
    Symbol.INVERSION_END,
    Symbol.INVERSION_DELIMITER,
    Symbol.INVERTOR
]);
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
Symbol.FACE = new CompositeSymbol("face", [
    Symbol.FACE_R,
    Symbol.FACE_U,
    Symbol.FACE_F,
    Symbol.FACE_L,
    Symbol.FACE_D,
    Symbol.FACE_B
]);
Symbol.REFLECTION = new CompositeSymbol("reflection", [
    Symbol.REFLECTION_BEGIN,
    Symbol.REFLECTION_END,
    Symbol.REFLECTION_DELIMITER,
    Symbol.REFLECTOR
]);
Symbol.REPETITION = new CompositeSymbol("repetition", [
    Symbol.REPETITION_BEGIN,
    Symbol.REPETITION_END,
    Symbol.REPETITION_DELIMITER
]);
Symbol.ROTATION = new CompositeSymbol("rotation", [
    Symbol.ROTATION_BEGIN,
    Symbol.ROTATION_END,
    Symbol.ROTATION_DELIMITER
]);
Symbol.COMMENT = new CompositeSymbol("comment", [
    Symbol.MULTILINE_COMMENT_BEGIN,
    Symbol.MULTILINE_COMMENT_END,
    Symbol.SINGLELINE_COMMENT_BEGIN
]);
Symbol.STATEMENT = new CompositeSymbol("statement", [
    Symbol.NOP,
    Symbol.MOVE,
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

Symbol.isBegin = new function(s) {
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
Symbol.isOperator = new function(s) {
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

Symbol.isDelimiter=function(s) {
        switch (s) {
            case Symbol.ROTATION_DELIMITER:
            case Symbol.CONJUGATION_DELIMITER:
            case Symbol.COMMUTATION_DELIMITER:
                return true;
            default:
                return false;
        }
    }

Symbol.isEnd=function(s) {
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

Symbol.isFaceSymbol=function(s) {
        switch (s) {
            case Symbol.PERMUTATION_FACE_R:
            case Symbol.PERMUTATION_FACE_U:
            case Symbol.PERMUTATION_FACE_F:
            case Symbol.PEMRUTATION_FACE_L:
            case Symbol.PERMUTATION_FACE_D:
            case Symbol.PERMUTATION_FACE_B:
                return true;
            default:
                return false;
        }
    };
    
Symbol.isPermutationSign=function(s) {
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
    constructor(layerCount,axis,layerMask,angle) {
        this.layerCount=layerCount;
        this.axis=axis;
        this.layerMask=layerMask;
        this.angle=angle;
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
        this.macros = [];
        this.keywords = [];
        this.specials = [];

        this.layerCount = 3;
        this.symbolToTokensMap = {};// Map<Symbol,List<String>>
        this.tokenToSymbolsMap = {};// Map<String,List<Symbol>>
        this.moveToTokensMap = {};// Map<Move,List<String>>
        this.tokenToMoveMap = {};// Map<String,Move>
        this.symbolToSyntaxMap = {};//Map<Symbol,Syntax>
        this.faceToTokensMap = {};// Map<Face,List<String>>
        this.tokenToFaceMap = {};// Map<String,Face>
    }

    /**
     * Returns the macros defined by this notation.
     * @returns {Array<MacroNode>} macros;
     */
    getMacros() {
        return this.macros;
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
    addToken(symbol, token) {
        // Add to symbolToTokensMap
        let tokens = this.symbolToTokensMap[symbol];
        if (tokens == null) {
            tokens = [];
            this.symbolToTokensMap[symbol] = tokens;
        }
        tokens.push(token);

        // Add to tokenToSymbolsMap
        let symbols = this.tokenToSymbolsMap[token];
        if (symbols == null) {
            symbols = [];
            this.tokenToSymbolsMap[token] = symbols;
        }
        symbols.push(symbol);
    }
    addMoveToken(layerCount,axis,layerMask,angle,token) {
        let move=new Move(layerCount,axis,layerMask,angle);
        
        // Add to tokenToSymbolsMap and symbolToTokensMap
        this.addToken(Symbol.MOVE,token);
        
        // Add to moveToTokensMap
        let tokens = this.moveToTokensMap[move];
        if (tokens == null) {
            tokens = [];
            this.moveToTokensMap[move] = tokens;
        }
        tokens.push(token);
        
        // Add to tokenToMoveMap
       this.tokenToMoveMap[token] = move;
    }
    getMove(token) {
        return this.tokenToMoveMap[token];
    }
    addFaceToken(face,token) {
        let faceObj=new Face(face);
        
        // Add to tokenToSymbolsMap and symbolToTokensMap
        addToken(Symbol.FACE,token);
        
        // Add to moveToTokensMap
        let tokens = this.faceToTokensMap[faceObj];
        if (tokens == null) {
            tokens = [];
            this.faceToTokensMap[face] = tokens;
        }
        tokens.push(token);
        
        // Add to tokenToMoveMap
       this.tokenToFaceMap[token] = faceObj;
    }

    getTokenToSymbolMap() {
        return this.tokenToSymbolsMap;
    }
    /**
     * 
     * @param {String} token
     * @returns {Symbol[]} symbols
     */
    getSymbols(token) {
        let symbols =  this.tokenToSymbolsMap[token];
        return symbols == null ? [] : symbols;
    }
    isSyntax(symbol, syntax) {
        if (symbol == null || syntax == null) {
            throw  new Error("illegal arguments symbol:" + symbol + " syntax:" + syntax);
        }
        return this.symbolToSyntaxMap[symbol] == syntax;
    }
    getSyntax(symbol) {
        return this.symbolToSyntaxMap[symbol];
    }
    isSupported(symbol) {
        return this.symbolToSyntaxMap[symbol] != null || this.symbolToTokensMap[symbol] != null;
    }
}
/** Defines a default notation that works for 3x3 and 2x2 cubes. */
class DefaultNotation extends Notation {
    constructor(layerCount) {
        super();

        this.layerCount = layerCount == null ? 3 : layerCount;

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
        this.addToken(Symbol.INVERTOR, "'");
        this.addToken(Symbol.INVERTOR, "-");
        this.addToken(Symbol.INVERTOR, "'");
        //addToken(Symbol.REFLECTION_BEGIN ,"(");
        //addToken(Symbol.REFLECTION_END ,")");
        //addToken(Symbol.REFLECTION_DELIMITER ,"");
        this.addToken(Symbol.REFLECTOR, "*");
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

        this.symbolToSyntaxMap[Symbol.COMMUTATION] = Syntax.PRECIRCUMFIX;
        this.symbolToSyntaxMap[Symbol.CONJUGATION] = Syntax.PREFIX;
        this.symbolToSyntaxMap[Symbol.ROTATION] = Syntax.PREFIX;
        this.symbolToSyntaxMap[Symbol.GROUPING] = Syntax.CIRCUMFIX;
        this.symbolToSyntaxMap[Symbol.PERMUTATION] = Syntax.PRECIRCUMFIX;
        this.symbolToSyntaxMap[Symbol.REPETITION] = Syntax.SUFFIX;
        this.symbolToSyntaxMap[Symbol.REFLECTION] = Syntax.SUFFIX;
        this.symbolToSyntaxMap[Symbol.INVERSION] = Syntax.SUFFIX;

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
