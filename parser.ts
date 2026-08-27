import type {
    BinaryOperator,
    Block,
    BlockItem,
    Declaration,
    Expression,
    ForInit,
    FunctionDefinition,
    Program,
    Statement,
    UnaryOperator,
} from "./ast.ts"
import type { Keyword, Lexer } from "./lexer.ts"
import type { Token, TokenType } from "./token.ts"

const BINARY_PRECEDENCE = {
    assign: 1,

    question: 3,

    or: 5,
    and: 10,

    bor: 15,
    xor: 20,
    band: 25,

    eq: 30,
    ne: 30,

    lt: 35,
    le: 35,
    gt: 35,
    ge: 35,

    lshift: 40,
    rshift: 40,

    add: 45,
    subtract: 45,

    multiply: 50,
    divide: 50,
    remainder: 50,
} as const

export class Parser {
    #lexer: Lexer
    #current: Token
    #loopLabelCounter = 0

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
    #getLoopLabel = () => {
        const label = `loop.${this.#loopLabelCounter}`
        this.#loopLabelCounter++
        return label
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

        const body = this.#parseBlock(null)

        this.#expect("rbrace")

        return {
            type: "function",
            name: name.value!,
            body,
        }
    }

    #parseBlock = (label: string | null): Block => {
        const items: BlockItem[] = []

        while (this.#peek().type !== "rbrace") {
            if (this.#peek().type === "eof") {
                throw new Error("Expected '}', before eof")
            }
            items.push(this.#parseBlockItem(label))
        }

        return {
            type: "block",
            items,
        }
    }

    #parseBlockItem = (label: string | null): BlockItem => {
        const token = this.#peek()
        if (token.type === "keyword" && token.value === "int") {
            return {
                type: "declaration",
                declaration: this.#parseDeclaration(),
            }
        }

        return {
            type: "statement",
            statement: this.#parseStatement(label),
        }
    }

    #parseDeclaration = (): Declaration => {
        this.#expect("keyword", "int")

        const name = this.#expect("identifier")

        let init: Expression | null = null

        if (this.#peek().value === "=") {
            this.#advance()
            init = this.#parseExpression(0)
        }

        this.#expect("semi")

        return {
            type: "declaration",
            name: name.value!,
            init,
        }
    }

    #parseStatement(label: string | null): Statement {
        const token = this.#peek()

        if (token.type === "keyword") {
            if (token.value === "return") {
                this.#advance()

                const expression = this.#parseExpression(0)
                this.#expect("semi")

                return {
                    type: "return",
                    expression,
                }
            }

            if (token.value === "if") {
                this.#advance()

                this.#expect("lparen")
                const condition = this.#parseExpression(0)
                this.#expect("rparen")

                const then = this.#parseStatement(label)
                let else_: Statement | null = null

                if (
                    this.#peek().type === "keyword" &&
                    this.#peek().value === "else"
                ) {
                    this.#advance()

                    else_ = this.#parseStatement(label)
                }

                return {
                    type: "if",
                    condition,
                    then,
                    else: else_,
                }
            }

            if (token.value === "while") {
                this.#advance()

                this.#expect("lparen")
                const condition = this.#parseExpression(0)
                this.#expect("rparen")

                const label = this.#getLoopLabel()
                const body = this.#parseStatement(label)

                return {
                    type: "while",
                    label,
                    condition,
                    body,
                }
            }

            if (token.value === "do") {
                this.#advance()

                const label = this.#getLoopLabel()
                const body = this.#parseStatement(label)

                this.#expect("keyword", "while")
                this.#expect("lparen")
                const condition = this.#parseExpression(0)
                this.#expect("rparen")
                this.#expect("semi")

                return {
                    type: "doWhile",
                    label,
                    body,
                    condition,
                }
            }

            if (token.value === "for") {
                this.#advance()
                this.#expect("lparen")

                const init: ForInit = (() => {
                    if (
                        this.#peek().type === "keyword" &&
                        this.#peek().value === "int"
                    ) {
                        return {
                            type: "declaration",
                            declaration: this.#parseDeclaration(),
                        }
                    }

                    if (this.#peek().type === "semi") {
                        this.#advance()

                        return {
                            type: "expression",
                            expression: null,
                        }
                    }

                    const expression = this.#parseExpression(0)
                    this.#expect("semi")

                    return {
                        type: "expression",
                        expression,
                    }
                })()

                const condition: Expression | null = (() => {
                    if (this.#peek().type === "semi") {
                        this.#advance()
                        return null
                    }

                    const expression = this.#parseExpression(0)
                    this.#expect("semi")
                    return expression
                })()

                const post: Expression | null = (() => {
                    if (this.#peek().type === "rparen") {
                        this.#advance()
                        return null
                    }

                    const expression = this.#parseExpression(0)
                    this.#expect("rparen")
                    return expression
                })()

                const label = this.#getLoopLabel()
                const body = this.#parseStatement(label)

                return {
                    type: "for",
                    label,
                    init,
                    condition,
                    post,
                    body,
                }
            }

            if (token.value === "break") {
                this.#advance()
                this.#expect("semi")

                return {
                    type: "break",
                    label,
                }
            }

            if (token.value === "continue") {
                this.#advance()
                this.#expect("semi")

                return {
                    type: "continue",
                    label,
                }
            }
        }

        if (token.type === "semi") {
            this.#advance()

            return {
                type: "null",
            }
        }

        if (token.type === "lbrace") {
            this.#advance()
            const block = this.#parseBlock(label)
            this.#expect("rbrace")

            return {
                type: "compound",
                block,
            }
        }

        const expression = this.#parseExpression(0)
        this.#expect("semi")

        return {
            type: "expression",
            expression,
        }
    }

    #parseExpression = (minPrecedence: number): Expression => {
        let left = this.#parseFactor()

        while (
            minPrecedence > -1 &&
            this.#getPrecedence(this.#peek().type) >= minPrecedence
        ) {
            if (this.#peek().type === "assign") {
                const current = this.#advance()
                const right = this.#parseExpression(
                    this.#getPrecedence(current.type),
                )
                left = {
                    type: "assignment",
                    left,
                    right,
                }
            } else if (this.#peek().type === "question") {
                const current = this.#advance()
                const middle = this.#parseExpression(0)
                this.#expect("colon")

                const right = this.#parseExpression(
                    this.#getPrecedence(current.type),
                )
                left = {
                    type: "conditional",
                    condition: left,
                    then: middle,
                    else: right,
                }
            } else {
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

        if (
            current.type === "complement" ||
            current.type === "subtract" ||
            current.type === "not"
        ) {
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

        if (current.type === "identifier") {
            return {
                type: "variable",
                name: current.value!,
            }
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
