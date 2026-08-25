export type TokenType =
    | "keyword"
    | "identifier"
    | "lparen"
    | "rparen"
    | "lbrace"
    | "rbrace"
    | "number"
    | "string"
    | "semi"
    | "complement"
    | "negate"
    | "decrement"
    | "eof"

export class Token {
    readonly type: TokenType
    readonly value: string | null

    constructor(type: TokenType, value: string | null) {
        this.type = type
        this.value = value
    }
}
