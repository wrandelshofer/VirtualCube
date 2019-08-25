/* @(#)Tokenizer.mjs
 * Copyright (c) 2019 Werner Randelshofer, Switzerland. MIT License.
 */

// ttypes of Tokenizer
// ----------------------
  let TT_WORD = -2;
  let TT_EOF = -1;

  // the following ttypes can be activated on demand
  let TT_KEYWORD = -4;
  let TT_NUMBER = -5;

    // the following ttypes are used internally
  let TT_DIGIT = -11;
  let TT_SPECIAL = -12;
  let TT_SKIP = -13;

  /**
   * A node of keyword tree.
   * 
   * Example tree structure, for the keywords "ab", and "abcd".
   * 
   * ''.KeywordTree(null)
   * ''.'a'.KeywordTree(null)
   * ''.'a'.'b'.KeywordTree("ab")
   * ''.'a'.'b'.'c'.KeywordTree(null)
   * ''.'a'.'b'.'c'.'d'.KeywordTree("abcd")
   */
  class KeywordTree {
    constructor() {
      this.keyword = null;
      this.commentEnd = null;
      this.children = [];// HashMap<Character,KeywordTree>.
    }
    
    getChild(ch) {
        return this.children[ch];
    }
    
    putChild(ch, child) {
        this.children[ch]=child;
    }

    setKeyword(value) {
         this.keyword=value;
    }

    getKeyword() {
        return this.keyword;
    }

    setCommentEnd(value) {
        this.commentEnd = value;
    }

    getCommentEnd() {
        return this.commentEnd;
    }    
  }


  /**
   * A greedy tokenizer.
   * 
   * By default this tokenizer parses the entire input sequence as a single word.
   * You can activate skipping of whitespaces by invoking addWhitespaceTokens().
   * You can activate tokenizaton of comments, by invoking addMultilineTokens(begin,end)
   * or addSingleline.
   * You can activate tokenization of positive integer numbers, by invoking addDigitTokens().
   * You can activate tokenization of keywords, by adding keyword specials.
   */
  class Tokenizer {
    constructor() {
      this.specials = new Map(); // Map<Character,Object> maps char to  ttype
      this.digits = new Map(); // Map<Character,Object> maps char to  ttype
      this.input = "";
      this.pos = 0;
      this.pushedBack = false;
      this.ttype = TT_EOF;
      this.tstart = 0;
      this.tend = 0;
      this.sval = null;
      this.nval = null;
      this.keywordTree = new KeywordTree(null);
      this.lookup = new Map();//Map<Character, Integer>
    }

    /**
     * Adds a digit token. (Also use this for adding signs, and decimal point tokens!).
     * 
     * @param {Character} token
     * @param {Object} ttype
     * @returns nothing
     */
    addDigit(token, ttype) {
      if (token.length != 1)
        throw new "token must be 1 character!, token:" + token;
      this.digits[token] = ttype;
    }
    
    /**
     * Defines a comment begin and end token.
     */
    addComment(start, end) {
        let node = this.addKeywordRecursively(start);
        node.setKeyword(start);
        node.setCommentEnd(end);
    }

    /**
     * Adds a digit character.
     */
    addDigit(ch) {
        this.lookup[ch] = TT_DIGIT;
    }
    

    /**
     * Defines a keyword token.
     *
     * @param token the keyword token
     */
    addKeyword(token) {
        let node = this.addKeywordRecursively(token);
        node.setKeyword(token);
    }
    
    addKeywordRecursively(token) {
        let node = this.keywordTree;
        for (var i = 0; i < token.length; i++) {
            let ch = token.charAt(i);
            let child = node.getChild(ch);
            if (child == null) {
                child = new KeywordTree();
                node.putChild(ch, child);
            }
            node = child;
        }
        return node;
    }    
    
    /**
     * Defines the tokens needed for parsing non-negative integers.
     */
    addNumbers() {
        this.addDigit('0');
        this.addDigit('1');
        this.addDigit('2');
        this.addDigit('3');
        this.addDigit('4');
        this.addDigit('5');
        this.addDigit('6');
        this.addDigit('7');
        this.addDigit('8');
        this.addDigit('9');
    }
    
    /**
     * Adds a skip character.
     */
    addSkip(ch) {
        this.lookup[ch] = TT_SKIP;
    }
    /**
     * Adds a special character.
     */
    addSpecial(ch) {
        this.lookup[ch] = TT_SPECIAL;
    }

    /**
     * Returns the end position of the current token.
     */
    getEndPosition() {
      return this.tend;
    }

    getInputLength() {
      return this.input.length;
    }

    /** Returns the current token numeric value. 
     * 
     * @returns [Number] value or null
     */
    getNumericValue() {
      return this.nval;
    }

    /**
     * Returns the start position of the current token.
     */
    getStartPosition() {
      return this.tstart;
    }
    
    /**
     * Returns the current token string value.
     * 
     * @returns [String] value or null
     */
    getStringValue() {
      return this.sval;
    }

    /** Returns the current token type. 
     * 
     * @returns [Object] token type
     */
    getTokenType() {
      return this.ttype;
    }
    
    getOrDefault(map,key,defaultValue) {
        let value = map[key];
        return value == null ? defaultValue : value;
    } 

    /** Parses the next token. 
     * @return [Object] ttype
     */
    nextToken() {
        loop:
        while (true) {
            if (this.pushedBack) {
                this.pushedBack = false;
                return this.ttype;
            }

            let start = this.pos;
            let ch = this.read();

            // try to skip characters
            while (ch != TT_EOF && this.getOrDefault(this.lookup, ch, TT_WORD) == TT_SKIP) {
                ch = this.read();
                start += 1;
            }

            // try to tokenize a keyword or a comment
            let node = this.keywordTree;
            let foundNode = null;
            let end = start;
            while (ch != TT_EOF && node.getChild(ch) != null) {
                node = node.getChild(ch);
                if (node.getKeyword() != null) {
                    foundNode = node;
                    end = this.pos;
                }
                ch = this.read();
            }
            if (foundNode != null) {
                let commentEnd = foundNode.getCommentEnd();
                if (commentEnd != null) {
                    seekTo(commentEnd);
                    continue loop;
                }

                this.setPosition(end);
                this.ttype = TT_KEYWORD;
                this.tstart = start;
                this.tend = end;
                this.sval = foundNode.getKeyword();
                return this.ttype;
            }
            this.setPosition(start);
            ch = this.read();

            // try to tokenize a number
            if (ch != TT_EOF && this.getOrDefault(this.lookup,ch, TT_WORD) == TT_DIGIT) {
                while (ch != TT_EOF && this.getOrDefault(this.lookup, ch, TT_WORD) == TT_DIGIT) {
                    ch = this.read();
                }
                if (ch != TT_EOF) {
                    this.unread();
                }
                this.ttype = TT_NUMBER;
                this.tstart = start;
                this.tend = this.pos;
                this.sval = this.input.subSequence(start, this.pos).toString();
                this.nval = Integer.parseInt(this.sval);
                return this.ttype;
            }

            // try to tokenize a word
            if (ch != TT_EOF && this.getOrDefault(this.lookup,ch, TT_WORD) == TT_WORD) {
                while (ch != TT_EOF && this.getOrDefault(this.lookup, ch, TT_WORD) == TT_WORD) {
                    ch = this.read();
                }
                if (ch != TT_EOF) {
                    this.unread();
                }
                this.ttype = TT_WORD;
                this.tstart = start;
                this.tend = this.pos;
                this.sval = this.input.subSequence(start, this.pos).toString();
                return this.ttype;
            }

            this.ttype = ch; // special character
            this.sval = ch == TT_EOF ? "<EOF>" : ch;
            return this.ttype;
        }
    }

    pushBack() {
      this.pushedBack=true;
    }
    
    /**
     * Reads the next character from input.
     * 
     * @return the next character or null in case of EOF
     */
    read() {
      if (this.pos < this.input.length) {
        let ch = this.input.charAt(this.pos);
        this.pos = this.pos + 1;
        return ch;
      } else {
        this.pos = this.input.length;
        return TT_EOF;
      }
    }
    
    seekTo(str) {
        let i = this.input.indexOf(str, this.pos);
        pos = (i == -1) ? this.input.length() : i + str.length();
    }


    /** Sets the input for the tokenizer. 
     * 
     * @param [String] input;
     */
    setInput(input) {
      this.input = input;
      this.pos = 0;
      this.pushedBack = false;
      this.ttype = null;
      this.tstart = null;
      this.tend = null;
      this.sval = null;
    }
    
     /**
     * Sets the input position.
     */
    setPosition(newValue) {
      this.pos = newValue;
    }
    
    /**
     * Sets this tokenizer to the state of that tokenizer
     * <p>
     * This should only be used for backtracking.
     * <p>
     * Note that both tokenizer share the same tokenizer
     * settings (e.g. added keywords, added comments, ...)
     * after this call.
     *
     * @param that another tokenizer
     */
    setTo(that) {
        this.input = that.input;
        this.pos = that.pos;
        this.pushedBack = that.pushedBack;
        this.lookup = that.lookup;
        this.ttype = that.ttype;
        this.tstart = that.tstart;
        this.tend = that.tend;
        this.sval = that.sval;
        this.nval = that.nval;
        this.keywordTree = that.keywordTree;
    }

    /**
     * Defines the specials needed for skipping whitespace.
     */
    skipWhitespace() {
      this.addSpecial(" ", TT_SKIP);
      this.addSpecial("\f", TT_SKIP);
      this.addSpecial("\n", TT_SKIP);
      this.addSpecial("\r", TT_SKIP);
      this.addSpecial("\t", TT_SKIP);
      this.addSpecial("\v", TT_SKIP);
      this.addSpecial("\u00a0", TT_SKIP);
      this.addSpecial("\u2028", TT_SKIP);
      this.addSpecial("\u2029", TT_SKIP);
    }

    /**
     * Unreads the last character from input.
     */
    unread() {
      if (this.pos > 0) {
        this.pos = this.pos - 1;
      }
    }
}

/** A simple push back reader. */
class PushBackReader {
  constructor(str) {
    this.str=str;
    this.pos=0;
    this.ch=null;
    this.pushedBack=false;
  }
  read() {
    if (this.pushedBack) {
      this.pushedBack=false;
      return this.ch;
    }
    if (this.pos<this.str.length) {
      this.ch= this.str.charAt(this.pos++);
    }else{
      this.ch=null;
    }
    return this.ch;
  }
  pushBack() {
    this.pushedBack=true;
  }
  skipWhitespace() {
    let c = this.read();
    while (c==' '||c=='\n'||c=='\t') {
      c=this.read();
    }
    this.pushBack();
  }
  getChar() {
    return this.ch;
  }
  getPosition() {
    return this.pos;
  }
}

// ------------------
// MODULE API    
// ------------------
export default {
    TT_WORD: TT_WORD,
    TT_KEYWORD: TT_KEYWORD,
    TT_EOF: TT_EOF,
    TT_NUMBER: TT_NUMBER,
    TT_NUMBER: TT_SPECIAL,
    Tokenizer: Tokenizer,
    PushBackReader:PushBackReader
  };

