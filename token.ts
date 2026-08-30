import type { BinaryOperator } from "./ast.ts"

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
    | "decrement"
    | "assign"
    | "not"
    | BinaryOperator
    | "question"
    | "colon"
    | "comma"
    | "eof"

export class Token {
    readonly type: TokenType
    readonly value: string | null

    constructor(type: TokenType, value: string | null) {
        this.type = type
        this.value = value
    }
}
