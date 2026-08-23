import type {
    Expression,
    FunctionDefinition,
    Program,
    Statement,
} from "./ast.ts"
import type { Keyword, Lexer } from "./lexer.ts"
import type { Token, TokenType } from "./token.ts"

export class Parser {
    #lexer: Lexer
    #current: Token

    constructor(lexer: Lexer) {
        this.#lexer = lexer
        this.#current = this.#lexer.next()
    }

    #peek = () => this.#current
    #advance = () => {
        const previous = this.#current
        this.#current = this.#lexer.next()
        return previous
    }

    #parseProgram = (): Program => {
        return {
            type: "program",
            function: this.#parseFunction(),
        }
    }

    #parseFunction = (): FunctionDefinition => {
        this.#expect("keyword", "int")

        const name = this.#expect("identifier")

        this.#expect("lparen")
        this.#expect("keyword", "void")
        this.#expect("rparen")
        this.#expect("lbrace")

        const body = this.#parseStatement()

        this.#expect("rbrace")

        return {
            type: "function",
            name: name.value!,
            body,
        }
    }

    #parseStatement = (): Statement => {
        this.#expect("keyword", "return")

        const expression = this.#parseExpression()

        this.#expect("semi")

        return {
            type: "return",
            expression,
        }
    }

    #parseExpression = (): Expression => {
        return {
            type: "constant",
            value: Number(this.#expect("number").value),
        }
    }

    #expect = (type: TokenType, value?: Keyword) => {
        const current = this.#peek()

        if (type !== current.type) {
            throw new Error(`Expected type: ${type}, got ${current.type}`)
        }
        if (value != null && value !== current.value) {
            throw new Error(`Expected ${value}, got ${current.value}`)
        }

        return this.#advance()
    }

    parse = (): Program => {
        const program = this.#parseProgram()
        this.#expect("eof")
        return program
    }
}
