import type {
    Block,
    Declaration,
    Expression,
    FunctionDeclaration,
    Program,
    Statement,
    VariableDeclaration,
} from "./ast.ts"

type SemanticType =
    | {
          type: "int"
      }
    | {
          type: "function"
          parameterCount: number
      }

export type SymbolMap = Map<
    string,
    {
        semanticType: SemanticType
        defined: boolean
    }
>

export class TypeChecker {
    #checkProgram = (program: Program, symbols: SymbolMap) => {
        program.declarations.map((declaration) =>
            this.#checkDeclaration(declaration, symbols),
        )
    }

    #checkDeclaration = (declaration: Declaration, symbols: SymbolMap) => {
        if (declaration.type === "functionDeclaration") {
            return this.#checkFunctionDeclaration(declaration, symbols)
        }

        return this.#checkVariableDeclaration(declaration, symbols)
    }

    #checkVariableDeclaration = (
        declaration: VariableDeclaration,
        symbols: SymbolMap,
    ) => {
        symbols.set(declaration.name, {
            semanticType: {
                type: "int",
            },
            defined: false,
        })
        if (declaration.init != null) {
            this.#checkExpression(declaration.init, symbols)
        }
    }

    #checkFunctionDeclaration = (
        declaration: FunctionDeclaration,
        symbols: SymbolMap,
    ) => {
        const fnType: SemanticType = {
            type: "function",
            parameterCount: declaration.parameters.length,
        }

        const body = declaration.body
        const hasBody = body != null
        let alreadyDefined = false

        const oldDeclaration = symbols.get(declaration.name)

        if (oldDeclaration !== undefined) {
            const oldType = oldDeclaration.semanticType

            if (
                oldType.type !== "function" ||
                oldType.parameterCount !== fnType.parameterCount
            ) {
                throw new Error("Incompatible function declaration")
            }

            alreadyDefined = oldDeclaration.defined

            if (alreadyDefined && hasBody) {
                throw new Error("Function is defined more than once")
            }
        }

        symbols.set(declaration.name, {
            semanticType: fnType,
            defined: alreadyDefined || hasBody,
        })

        if (body != null) {
            for (const parameter of declaration.parameters) {
                symbols.set(parameter, {
                    semanticType: {
                        type: "int",
                    },
                    defined: false,
                })
            }

            this.#checkBlock(body, symbols)
        }
    }

    #checkExpression = (expression: Expression, symbols: SymbolMap): void => {
        switch (expression.type) {
            case "constant":
                return

            case "variable": {
                const symbol = symbols.get(expression.name)

                if (symbol === undefined) {
                    throw new Error(
                        `Undeclared identifier '${expression.name}'`,
                    )
                }

                if (symbol.semanticType.type !== "int") {
                    throw new Error("Function name used as variable")
                }

                return
            }

            case "functionCall": {
                const symbol = symbols.get(expression.name)

                if (symbol === undefined) {
                    throw new Error(`Undeclared function '${expression.name}'`)
                }

                if (symbol.semanticType.type !== "function") {
                    throw new Error("Variable used as function name")
                }

                if (
                    symbol.semanticType.parameterCount !==
                    expression.args.length
                ) {
                    throw new Error(
                        "Function called with wrong number of arguments",
                    )
                }

                for (const argument of expression.args) {
                    this.#checkExpression(argument, symbols)
                }

                return
            }

            case "unary":
                this.#checkExpression(expression.expression, symbols)
                return

            case "binary":
                this.#checkExpression(expression.left, symbols)
                this.#checkExpression(expression.right, symbols)
                return

            case "assignment":
                this.#checkExpression(expression.left, symbols)
                this.#checkExpression(expression.right, symbols)
                return

            case "conditional":
                this.#checkExpression(expression.condition, symbols)
                this.#checkExpression(expression.then, symbols)
                this.#checkExpression(expression.else, symbols)
                return
        }
    }

    #checkBlock = (block: Block, symbols: SymbolMap): void => {
        for (const item of block.items) {
            if (item.type === "statement") {
                this.#checkStatement(item.statement, symbols)
                continue
            }

            const declaration = item.declaration

            if (declaration.type === "functionDeclaration") {
                if (declaration.body !== null) {
                    throw new Error(
                        "Nested function definitions are not permitted",
                    )
                }

                this.#checkFunctionDeclaration(declaration, symbols)
            } else {
                this.#checkVariableDeclaration(declaration, symbols)
            }
        }
    }

    #checkStatement = (statement: Statement, symbols: SymbolMap): void => {
        switch (statement.type) {
            case "return":
                this.#checkExpression(statement.expression, symbols)
                return

            case "expression":
                this.#checkExpression(statement.expression, symbols)
                return

            case "if":
                this.#checkExpression(statement.condition, symbols)
                this.#checkStatement(statement.then, symbols)

                if (statement.else !== null) {
                    this.#checkStatement(statement.else, symbols)
                }

                return

            case "compound":
                this.#checkBlock(statement.block, symbols)
                return

            case "while":
                this.#checkExpression(statement.condition, symbols)
                this.#checkStatement(statement.body, symbols)
                return

            case "doWhile":
                this.#checkStatement(statement.body, symbols)
                this.#checkExpression(statement.condition, symbols)
                return

            case "for":
                if (statement.init.type === "declaration") {
                    this.#checkVariableDeclaration(
                        statement.init.declaration,
                        symbols,
                    )
                } else if (statement.init.expression !== null) {
                    this.#checkExpression(statement.init.expression, symbols)
                }

                if (statement.condition !== null) {
                    this.#checkExpression(statement.condition, symbols)
                }

                if (statement.post !== null) {
                    this.#checkExpression(statement.post, symbols)
                }

                this.#checkStatement(statement.body, symbols)
                return

            case "break":
            case "continue":
            case "null":
                return
        }
    }

    check = (program: Program): SymbolMap => {
        const symbols: SymbolMap = new Map()
        this.#checkProgram(program, symbols)
        return symbols
    }
}
