import { Token, type TokenType } from "./token.ts"

export type Keyword = "int" | "void" | "return"

export class Lexer {
    #start: number
    #current: number
    #end: number
    #source: string
    #keywords: ReadonlyMap<Keyword, true> = new Map([
        ["int", true],
        ["void", true],
        ["return", true],
    ])

    constructor(source: string) {
        this.#start = 0
        this.#current = 0
        this.#end = source.length
        this.#source = source
    }

    #isAlpha = (c: string) => /^[A-Za-z]$/.test(c)
    #isNumber = (c: string) => /^[0-9]$/.test(c)
    #isAlphaNumeric = (c: string) => /^[A-Za-z0-9]$/.test(c)
    #isWhitespace = (c: string) => /^[ \t\n\r\v\f]$/.test(c)

    isEOF = () => this.#current >= this.#end
    #peek = () => this.#source[this.#current] ?? ""
    #peekNext = () => this.#source[this.#current + 1] ?? null
    #advance = () => {
        this.#current++
        return this.#source[this.#current - 1] ?? null
    }
    #word = () => this.#source.substring(this.#start, this.#current)

    #makeToken = (type: TokenType) => new Token(type, this.#word())

    #skipWhitespace = () => {
        while (!this.isEOF()) {
            if (this.#isWhitespace(this.#peek())) {
                this.#advance()
                continue
            }

            if (this.#peek() == "/" && this.#peekNext() == "/") {
                while (!this.isEOF() && this.#peek() !== "\n") {
                    this.#advance()
                }
                continue
            }

            if (this.#peek() == "/" && this.#peekNext() == "*") {
                this.#advance()
                this.#advance()
                while (
                    !this.isEOF() &&
                    this.#peek() !== "*" &&
                    this.#peekNext() !== "/"
                ) {
                    this.#advance()
                }
                this.#advance()
                this.#advance()

                continue
            }

            break
        }
    }

    #keyword = () => {
        while (!this.isEOF() && /^[A-Za-z0-9_]$/.test(this.#peek())) {
            this.#advance()
        }

        if (!this.#keywords.has(this.#word() as Keyword)) {
            return this.#makeToken("identifier")
        }

        return this.#makeToken("keyword")
    }

    #number() {
        while (!this.isEOF() && this.#isNumber(this.#peek())) {
            this.#advance()
        }

        if (!this.isEOF() && /[A-Za-z0-9_]/.test(this.#peek())) {
            this.#keyword()
            throw new Error(`Unknown token: "${this.#word()}"`)
        }

        return this.#makeToken("number")
    }

    #string() {
        this.#advance()

        while (!this.isEOF() && this.#peek() !== '"') {
            this.#advance()
        }

        this.#advance()

        return this.#makeToken("string")
    }

    next = (): Token => {
        this.#skipWhitespace()
        this.#start = this.#current

        if (this.isEOF()) {
            return this.#makeToken("eof")
        }

        if (this.#peek() === '"') {
            return this.#string()
        }
        if (this.#isNumber(this.#peek())) {
            return this.#number()
        }
        if (/^[A-Za-z_]$/.test(this.#peek())) {
            return this.#keyword()
        }

        const c = this.#advance()
        switch (c) {
            case "{":
                return this.#makeToken("lbrace")
            case "}":
                return this.#makeToken("rbrace")
            case "(":
                return this.#makeToken("lparen")
            case ")":
                return this.#makeToken("rparen")
            case ";":
                return this.#makeToken("semi")
            case "~":
                return this.#makeToken("complement")
            case "-":
                return this.#makeToken(
                    this.#peek() === "-" ? "decrement" : "negate",
                )
            default:
                throw new Error(`Unknown token: "${this.#word()}"`)
        }
    }
}
