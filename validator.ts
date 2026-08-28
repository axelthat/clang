import type {
    Block,
    BlockItem,
    Declaration,
    Expression,
    ForInit,
    FunctionDefinition,
    Program,
    Statement,
} from "./ast.ts"

type VariableMap = Map<string, { newName: string; fromCurrentBlock: boolean }>

export class Validator {
    #program: Program
    #temporaryCounter = 0
    #labelCounter = 0

    constructor(program: Program) {
        this.#program = program
    }

    #makeTemporary = (name: string) => {
        const uniqueName = `${name}.${this.#temporaryCounter}`
        this.#temporaryCounter++
        return uniqueName
    }

    #makeLabel = (name: string) => {
        const label = `${name}.${this.#labelCounter}`
        this.#labelCounter++
        return label
    }

    #copyVariableMap = (variableMap: VariableMap): VariableMap =>
        new Map(
            Array.from(variableMap).map(([key, value]) => [
                key,
                {
                    ...value,
                    fromCurrentBlock: false,
                },
            ]),
        )

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
            body: this.#validateBlock(function_.body, variableMap, null),
        }
    }

    #validateBlock = (
        block: Block,
        variableMap: VariableMap,
        label: string | null,
    ): Block => {
        const items: BlockItem[] = []
        for (const blockItem of block.items) {
            items.push(this.#validateBlockItem(blockItem, variableMap, label))
        }
        return {
            type: "block",
            items,
        }
    }

    #validateBlockItem = (
        blockItem: BlockItem,
        variableMap: VariableMap,
        label: string | null,
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
                label,
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
        label: string | null,
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
                then: this.#validateStatement(
                    statement.then,
                    variableMap,
                    label,
                ),
                else: statement.else
                    ? this.#validateStatement(
                          statement.else,
                          variableMap,
                          label,
                      )
                    : null,
            }
        }

        if (statement.type === "compound") {
            const newVariableMap = this.#copyVariableMap(variableMap)
            return {
                type: "compound",
                block: this.#validateBlock(
                    statement.block,
                    newVariableMap,
                    label,
                ),
            }
        }

        if (statement.type === "while") {
            const label = this.#makeLabel("loop")
            const newVariableMap = this.#copyVariableMap(variableMap)
            const condition = this.#validateExpression(
                statement.condition,
                newVariableMap,
            )
            return {
                type: "while",
                label,
                condition,
                body: this.#validateStatement(
                    statement.body,
                    newVariableMap,
                    label,
                ),
            }
        }

        if (statement.type === "doWhile") {
            const label = this.#makeLabel("loop")
            const newVariableMap = this.#copyVariableMap(variableMap)
            const condition = this.#validateExpression(
                statement.condition,
                newVariableMap,
            )
            return {
                type: "doWhile",
                label,
                condition,
                body: this.#validateStatement(
                    statement.body,
                    newVariableMap,
                    label,
                ),
            }
        }

        if (statement.type === "for") {
            const label = this.#makeLabel("loop")
            const newVariableMap = this.#copyVariableMap(variableMap)
            const init = this.#validateForInit(statement.init, newVariableMap)
            const condition = statement.condition
                ? this.#validateExpression(statement.condition, newVariableMap)
                : null
            const post = statement.post
                ? this.#validateExpression(statement.post, newVariableMap)
                : null
            return {
                type: "for",
                label,
                init,
                condition,
                post,
                body: this.#validateStatement(
                    statement.body,
                    newVariableMap,
                    label,
                ),
            }
        }

        if (statement.type === "break" || statement.type === "continue") {
            if (label == null) {
                throw new Error(`${statement.type} outside loop`)
            }

            return {
                ...statement,
                label,
            }
        }

        return {
            type: "null",
        }
    }

    #validateForInit = (init: ForInit, variableMap: VariableMap): ForInit => {
        if (init.type === "declaration") {
            return {
                type: "declaration",
                declaration: this.#validateDeclaration(
                    init.declaration,
                    variableMap,
                ),
            }
        }
        return {
            type: "expression",
            expression: init.expression
                ? this.#validateExpression(init.expression, variableMap)
                : null,
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
