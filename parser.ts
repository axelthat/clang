import type {
    BinaryOperator,
    Expression,
    FunctionDefinition,
    Program,
    Statement,
    UnaryOperator,
} from "./ast.ts"
import type { Keyword, Lexer } from "./lexer.ts"
import type { Token, TokenType } from "./token.ts"

const BINARY_PRECEDENCE = {
    add: 45,
    negate: 45,
    multiply: 50,
    divide: 50,
    remainder: 50,
} as const

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
    #getPrecedence = (type: TokenType) =>
        type in BINARY_PRECEDENCE
            ? BINARY_PRECEDENCE[type as keyof typeof BINARY_PRECEDENCE]
            : -1

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

        const expression = this.#parseExpression(0)

        this.#expect("semi")

        return {
            type: "return",
            expression,
        }
    }

    #parseExpression = (minPrecedence: number): Expression => {
        let left = this.#parseFactor()

        while (this.#getPrecedence(this.#peek().type) >= minPrecedence) {
            const operator = this.#advance()
            const right = this.#parseExpression(
                this.#getPrecedence(operator.type) + 1,
            )
            left = {
                type: "binary",
                operator: operator.type as BinaryOperator,
                left,
                right,
            }
        }

        return left
    }

    #parseFactor = (): Expression => {
        const current = this.#advance()

        if (current.type === "number") {
            return {
                type: "constant",
                value: Number(current.value),
            }
        }

        if (current.type === "complement" || current.type === "negate") {
            return {
                type: "unary",
                operator: current.type as UnaryOperator,
                expression: this.#parseFactor(),
            }
        }

        if (current.type === "lparen") {
            const expr = this.#parseExpression(0)
            this.#expect("rparen")
            return expr
        }

        throw new Error("Malformed expression")
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
