import type {
    Block,
    BlockItem,
    Declaration,
    Expression,
    FunctionDefinition,
    Program,
    Statement,
} from "./ast.ts"

type VariableMap = Map<string, { newName: string; fromCurrentBlock: boolean }>

export class Validator {
    #program: Program
    #temporaryCounter = 0

    constructor(program: Program) {
        this.#program = program
    }

    #makeTemporary = (name: string) => {
        const uniqueName = `${name}.${this.#temporaryCounter}`
        this.#temporaryCounter++
        return uniqueName
    }

    #validateProgram = (
        program: Program,
        variableMap: VariableMap,
    ): Program => {
        return {
            type: "program",
            function: this.#validateFunction(program.function, variableMap),
        }
    }

    #validateFunction = (
        function_: FunctionDefinition,
        variableMap: VariableMap,
    ): FunctionDefinition => {
        return {
            type: "function",
            name: function_.name,
            body: this.#validateBlock(function_.body, variableMap),
        }
    }

    #validateBlock = (block: Block, variableMap: VariableMap): Block => {
        const items: BlockItem[] = []
        for (const blockItem of block.items) {
            items.push(this.#validateBlockItem(blockItem, variableMap))
        }
        return {
            type: "block",
            items,
        }
    }

    #validateBlockItem = (
        blockItem: BlockItem,
        variableMap: VariableMap,
    ): BlockItem => {
        if (blockItem.type === "declaration") {
            return {
                type: "declaration",
                declaration: this.#validateDeclaration(
                    blockItem.declaration,
                    variableMap,
                ),
            }
        }

        return {
            type: "statement",
            statement: this.#validateStatement(
                blockItem.statement,
                variableMap,
            ),
        }
    }

    #validateDeclaration = (
        declaration: Declaration,
        variableMap: VariableMap,
    ): Declaration => {
        if (
            variableMap.has(declaration.name) &&
            variableMap.get(declaration.name)?.fromCurrentBlock
        ) {
            throw new Error("Duplicate variable declaration")
        }
        const uniqueName = this.#makeTemporary(declaration.name)
        variableMap.set(declaration.name, {
            newName: uniqueName,
            fromCurrentBlock: true,
        })

        let init: Expression | null = null
        if (declaration.init != null) {
            init = this.#validateExpression(declaration.init, variableMap)
        }
        return {
            type: "declaration",
            name: uniqueName,
            init,
        }
    }

    #validateStatement = (
        statement: Statement,
        variableMap: VariableMap,
    ): Statement => {
        if (statement.type === "return") {
            return {
                type: "return",
                expression: this.#validateExpression(
                    statement.expression,
                    variableMap,
                ),
            }
        }

        if (statement.type === "expression") {
            return {
                type: "expression",
                expression: this.#validateExpression(
                    statement.expression,
                    variableMap,
                ),
            }
        }

        if (statement.type === "if") {
            return {
                type: "if",
                condition: this.#validateExpression(
                    statement.condition,
                    variableMap,
                ),
                then: this.#validateStatement(statement.then, variableMap),
                else: statement.else
                    ? this.#validateStatement(statement.else, variableMap)
                    : null,
            }
        }

        if (statement.type === "compound") {
            const newVariableMap: VariableMap = new Map(
                Array.from(variableMap).map(([key, value]) => [
                    key,
                    {
                        ...value,
                        fromCurrentBlock: false,
                    },
                ]),
            )
            return {
                type: "compound",
                block: this.#validateBlock(statement.block, newVariableMap),
            }
        }

        return {
            type: "null",
        }
    }

    #validateExpression = (
        expression: Expression,
        variableMap: VariableMap,
    ): Expression => {
        if (expression.type === "assignment") {
            if (expression.left.type !== "variable") {
                throw new Error("Invalid lvalue!")
            }
            return {
                type: "assignment",
                left: this.#validateExpression(expression.left, variableMap),
                right: this.#validateExpression(expression.right, variableMap),
            }
        }

        if (expression.type === "variable") {
            if (variableMap.has(expression.name)) {
                return {
                    type: "variable",
                    name: variableMap.get(expression.name)!.newName,
                }
            }
            throw new Error("Undeclared variable!")
        }

        if (expression.type === "binary") {
            return {
                type: "binary",
                operator: expression.operator,
                left: this.#validateExpression(expression.left, variableMap),
                right: this.#validateExpression(expression.right, variableMap),
            }
        }

        if (expression.type === "unary") {
            return {
                type: "unary",
                operator: expression.operator,
                expression: this.#validateExpression(
                    expression.expression,
                    variableMap,
                ),
            }
        }

        if (expression.type === "conditional") {
            return {
                type: "conditional",
                condition: this.#validateExpression(
                    expression.condition,
                    variableMap,
                ),
                then: this.#validateExpression(expression.then, variableMap),
                else: this.#validateExpression(expression.else, variableMap),
            }
        }

        return expression
    }

    validate = (): Program => {
        return this.#validateProgram(this.#program, new Map())
    }
}
