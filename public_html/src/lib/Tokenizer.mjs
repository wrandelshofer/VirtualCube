/* @(#)Tokenizer.mjs
 * Copyright (c) 2019 Werner Randelshofer, Switzerland. MIT License.
 */

// token types of Tokenizer
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
  * ''.KeywordNode{keyword=null}
  * ''.'a'.KeywordNode{keyword=null}
  * ''.'a'.'b'.KeywordNode{keyword=n"ab"}
  * ''.'a'.'b'.'c'.KeywordNode{keyword=null}
  * ''.'a'.'b'.'c'.'d'.KeywordNode{keyword="abcd"}
  */
  class KeywordNode {
    constructor() {
    /**
     * The keyword.
     * This value is non-null if the node represents a keyword.
     * The value is null if the node is an intermediate node in the tree.
     */
      this.keyword = null;
    /**
     * The character sequence that ends a comment.
     * This value is non-null if the node represents a keyword that starts
     * a comment.
     */
      this.commentEnd = null;
    /**
     * The children map. The key of the map is the character that leads
     * from this tree node down to the next.
     */
      this.children = new Map();// HashMap<Character,KeywordNode>.
    }
    
    getChild(ch) {
        return this.children.get(ch);
    }
    
    putChild(ch, child) {
        this.children.set(ch, child);
    }

    setKeyword(value) {
         this.keyword = value;
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
      this.input = "";
      this.pos = 0;
      this.pushedBack = false;
      this.ttype = TT_EOF;
      this.tstart = 0;
      this.tend = 0;
      this.sval = null;
      this.nval = null;
      this.keywordTree = new KeywordNode(null);
      this.lookup = new Map();//Map<Character, Integer>
    }

    /**
     * Adds a comment token.
     * <p>
     * To add a single line comment, use:
     * <pre>
     *     addComment("//","\n");
     * </pre>
     *
     * To add a multi line comment, use:
     * <pre>
     *     addComment("/*", "* /");
     * </pre>
     */
    addComment(start, end) {
        let node = this.addKeywordRecursively(start);
        node.setCommentEnd(end);
    }

    /**
     * Adds a digit character.
     */
    addDigit(ch) {
        this.lookup.set(ch, TT_DIGIT);
    }
    

    /**
     * Adds a keyword.
     *
     * @param keyword the keyword token
     */
    addKeyword(keyword) {
        this.addKeywordRecursively(keyword);
    }
    
    addKeywordRecursively(keyword) {
        let node = this.keywordTree;
        for (var i = 0; i < keyword.length; i++) {
            let ch = keyword.charAt(i);
            let child = node.getChild(ch);
            if (child == null) {
                child = new KeywordNode();
                node.putChild(ch, child);
            }
            node = child;
        }
        node.setKeyword(keyword);
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
     * Adds a character that the tokenizer should skip.
     */
    addSkip(ch) {
        this.lookup.set(ch, TT_SKIP);
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
        let value = map.get(key);
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
            if (ch != TT_EOF && this.getOrDefault(this.lookup, ch, TT_WORD) == TT_DIGIT) {
                while (ch != TT_EOF && this.getOrDefault(this.lookup, ch, TT_WORD) == TT_DIGIT) {
                    ch = this.read();
                }
                if (ch != TT_EOF) {
                    this.unread();
                }
                this.ttype = TT_NUMBER;
                this.tstart = start;
                this.tend = this.pos;
                this.sval = this.input.substring(start, this.pos).toString();
                this.nval = parseInt(this.sval);
                return this.ttype;
            }

            // try to tokenize a word
            if (ch != TT_EOF && this.getOrDefault(this.lookup, ch, TT_WORD) == TT_WORD) {
                while (ch != TT_EOF && this.getOrDefault(this.lookup, ch, TT_WORD) == TT_WORD) {
                    ch = this.read();
                }
                if (ch != TT_EOF) {
                    this.unread();
                }
                this.ttype = TT_WORD;
                this.tstart = start;
                this.tend = this.pos;
                this.sval = this.input.substring(start, this.pos).toString();
                return this.ttype;
            }

            this.ttype = ch; // special character
            this.sval = ch == TT_EOF ? "<EOF>" : ch;
            return this.ttype;
        }
    }

    /**
     * Causes the next call to the {@code nextToken} method of this
     * tokenizer to return the current value.
     */
    pushBack() {
        this.pushedBack = true;
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
      this.ttype = TT_EOF;
      this.tstart = 0;
      this.tend = 0;
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
     * Adds whitespace characters to the list of characters that the tokenizer
     * is supposed to skip.
     */
    skipWhitespace() {
        this.addSkip(' ');
        this.addSkip('\f');// FORM FEED
        this.addSkip('\n');// LINE FEED
        this.addSkip('\r');// CARRIAGE RETURN
        this.addSkip('\t');// CHARACTER TABULATION
        this.addSkip('\u000b');// LINE TABULATION
        this.addSkip('\u00a0');// NO-BREAK SPACE
        this.addSkip('\u2028');// LINE SEPARATOR
        this.addSkip('\u2029');// PARAGRAPH SEPARATOR
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
    TT_SPECIAL: TT_SPECIAL,
    Tokenizer: Tokenizer,
    PushBackReader:PushBackReader
  };

