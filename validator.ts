import type {
    BlockItem,
    Declaration,
    Expression,
    FunctionDefinition,
    Program,
    Statement,
} from "./ast.ts"

export class Validator {
    #program: Program
    #variableMap = new Map<string, string>()
    #temporaryCounter = 0

    constructor(program: Program) {
        this.#program = program
    }

    #makeTemporary = (name: string) => {
        const uniqueName = `${name}.${this.#temporaryCounter}`
        this.#temporaryCounter++
        return uniqueName
    }

    #validateProgram = (program: Program): Program => {
        return {
            type: "program",
            function: this.#validateFunction(program.function),
        }
    }

    #validateFunction = (function_: FunctionDefinition): FunctionDefinition => {
        return {
            type: "function",
            name: function_.name,
            body: function_.body.map((blockItem) =>
                this.#validateBlockItem(blockItem),
            ),
        }
    }

    #validateBlockItem = (blockItem: BlockItem): BlockItem => {
        if (blockItem.type === "declaration") {
            return {
                type: "declaration",
                declaration: this.#validateDeclaration(blockItem.declaration),
            }
        }

        return {
            type: "statement",
            statement: this.#validateStatement(blockItem.statement),
        }
    }

    #validateDeclaration = (declaration: Declaration): Declaration => {
        if (this.#variableMap.has(declaration.name)) {
            throw new Error("Duplicate variable declaration")
        }
        const uniqueName = this.#makeTemporary(declaration.name)
        this.#variableMap.set(declaration.name, uniqueName)

        let init: Expression | null = null
        if (declaration.init != null) {
            init = this.#validateExpression(declaration.init)
        }
        return {
            type: "declaration",
            name: uniqueName,
            init,
        }
    }

    #validateStatement = (statement: Statement): Statement => {
        if (statement.type === "return") {
            return {
                type: "return",
                expression: this.#validateExpression(statement.expression),
            }
        }

        if (statement.type === "expression") {
            return {
                type: "expression",
                expression: this.#validateExpression(statement.expression),
            }
        }

        return {
            type: "null",
        }
    }

    #validateExpression = (expression: Expression): Expression => {
        if (expression.type === "assignment") {
            if (expression.left.type !== "variable") {
                throw new Error("Invalid lvalue!")
            }
            return {
                type: "assignment",
                left: this.#validateExpression(expression.left),
                right: this.#validateExpression(expression.right),
            }
        }

        if (expression.type === "variable") {
            if (this.#variableMap.has(expression.name)) {
                return {
                    type: "variable",
                    name: this.#variableMap.get(expression.name)!,
                }
            }
            throw new Error("Undeclared variable!")
        }

        if (expression.type === "binary") {
            return {
                type: "binary",
                operator: expression.operator,
                left: this.#validateExpression(expression.left),
                right: this.#validateExpression(expression.right),
            }
        }

        if (expression.type === "unary") {
            return {
                type: "unary",
                operator: expression.operator,
                expression: this.#validateExpression(expression.expression),
            }
        }

        return expression
    }

    validate = (): Program => {
        return this.#validateProgram(this.#program)
    }
}
