import type {
    Block,
    BlockItem,
    Declaration,
    Expression,
    ForInit,
    FunctionDeclaration,
    Parameter,
    Program,
    Statement,
    VariableDeclaration,
} from "./ast.ts"
import { TypeChecker, type SymbolMap } from "./typeChecker.ts"

type IdentifierMap = Map<
    string,
    { newName: string; fromCurrentScope: boolean; hasLinkage: boolean }
>

export type ValidateReturnType = {
    symbols: SymbolMap
    program: Program
}

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

    #copyIdentifierMap = (identifierMap: IdentifierMap): IdentifierMap =>
        new Map(
            Array.from(identifierMap).map(([key, value]) => [
                key,
                {
                    ...value,
                    fromCurrentScope: false,
                },
            ]),
        )

    #validateProgram = (
        program: Program,
        identifierMap: IdentifierMap,
    ): Program => {
        return {
            type: program.type,
            declarations: program.declarations.map((declaration) =>
                this.#validateDeclaration(declaration, identifierMap),
            ),
        }
    }

    #validateDeclaration = (
        declaration: Declaration,
        identifierMap: IdentifierMap,
    ): Declaration => {
        if (declaration.type === "functionDeclaration") {
            return this.#validateFunctionDeclaration(declaration, identifierMap)
        }

        return this.#validateVariableDeclaration(declaration, identifierMap)
    }

    #validateFunctionDeclaration = (
        declaration: FunctionDeclaration,
        identifierMap: IdentifierMap,
    ): FunctionDeclaration => {
        if (identifierMap.has(declaration.name)) {
            const prevEntry = identifierMap.get(declaration.name)
            if (prevEntry?.fromCurrentScope && !prevEntry.hasLinkage) {
                throw new Error("Duplicate declaration")
            }
        }

        identifierMap.set(declaration.name, {
            newName: declaration.name,
            fromCurrentScope: true,
            hasLinkage: true,
        })

        const innerMap = this.#copyIdentifierMap(identifierMap)

        const newParams = declaration.parameters.map((parameter) =>
            this.#validateParameter(parameter, innerMap),
        )
        const newBody =
            declaration.body != null
                ? this.#validateBlock(declaration.body, innerMap, null)
                : null

        return {
            type: declaration.type,
            name: declaration.name,
            parameters: newParams,
            body: newBody,
        }
    }

    #validateParameter = (
        parameter: Parameter,
        identifierMap: IdentifierMap,
    ): Parameter => {
        if (
            identifierMap.has(parameter) &&
            identifierMap.get(parameter)?.fromCurrentScope
        ) {
            throw new Error("Duplicate variable declaration")
        }

        const uniqueName = this.#makeTemporary(parameter)
        identifierMap.set(parameter, {
            newName: uniqueName,
            fromCurrentScope: true,
            hasLinkage: false,
        })

        return uniqueName
    }

    #validateVariableDeclaration = (
        declaration: VariableDeclaration,
        identifierMap: IdentifierMap,
    ): VariableDeclaration => {
        if (
            identifierMap.has(declaration.name) &&
            identifierMap.get(declaration.name)?.fromCurrentScope
        ) {
            throw new Error("Duplicate variable declaration")
        }
        const uniqueName = this.#makeTemporary(declaration.name)
        identifierMap.set(declaration.name, {
            newName: uniqueName,
            fromCurrentScope: true,
            hasLinkage: false,
        })

        let init: Expression | null = null
        if (declaration.init != null) {
            init = this.#validateExpression(declaration.init, identifierMap)
        }
        return {
            type: declaration.type,
            name: uniqueName,
            init,
        }
    }

    #validateBlock = (
        block: Block,
        identifierMap: IdentifierMap,
        label: string | null,
    ): Block => {
        const items: BlockItem[] = []
        for (const blockItem of block.items) {
            items.push(this.#validateBlockItem(blockItem, identifierMap, label))
        }
        return {
            type: block.type,
            items,
        }
    }

    #validateBlockItem = (
        blockItem: BlockItem,
        identifierMap: IdentifierMap,
        label: string | null,
    ): BlockItem => {
        if (blockItem.type === "declaration") {
            return {
                type: blockItem.type,
                declaration: this.#validateDeclaration(
                    blockItem.declaration,
                    identifierMap,
                ),
            }
        }

        return {
            type: blockItem.type,
            statement: this.#validateStatement(
                blockItem.statement,
                identifierMap,
                label,
            ),
        }
    }

    #validateStatement = (
        statement: Statement,
        identifierMap: IdentifierMap,
        label: string | null,
    ): Statement => {
        if (statement.type === "return") {
            return {
                type: statement.type,
                expression: this.#validateExpression(
                    statement.expression,
                    identifierMap,
                ),
            }
        }

        if (statement.type === "expression") {
            return {
                type: statement.type,
                expression: this.#validateExpression(
                    statement.expression,
                    identifierMap,
                ),
            }
        }

        if (statement.type === "if") {
            return {
                type: statement.type,
                condition: this.#validateExpression(
                    statement.condition,
                    identifierMap,
                ),
                then: this.#validateStatement(
                    statement.then,
                    identifierMap,
                    label,
                ),
                else: statement.else
                    ? this.#validateStatement(
                          statement.else,
                          identifierMap,
                          label,
                      )
                    : null,
            }
        }

        if (statement.type === "compound") {
            const newIdentifierMap = this.#copyIdentifierMap(identifierMap)
            return {
                type: statement.type,
                block: this.#validateBlock(
                    statement.block,
                    newIdentifierMap,
                    label,
                ),
            }
        }

        if (statement.type === "while") {
            const label = this.#makeLabel("loop")
            const condition = this.#validateExpression(
                statement.condition,
                identifierMap,
            )
            return {
                type: statement.type,
                label,
                condition,
                body: this.#validateStatement(
                    statement.body,
                    identifierMap,
                    label,
                ),
            }
        }

        if (statement.type === "doWhile") {
            const label = this.#makeLabel("loop")
            const condition = this.#validateExpression(
                statement.condition,
                identifierMap,
            )
            return {
                type: statement.type,
                label,
                condition,
                body: this.#validateStatement(
                    statement.body,
                    identifierMap,
                    label,
                ),
            }
        }

        if (statement.type === "for") {
            const label = this.#makeLabel("loop")
            const newIdentifierMap = this.#copyIdentifierMap(identifierMap)
            const init = this.#validateForInit(statement.init, newIdentifierMap)
            const condition = statement.condition
                ? this.#validateExpression(
                      statement.condition,
                      newIdentifierMap,
                  )
                : null
            const post = statement.post
                ? this.#validateExpression(statement.post, newIdentifierMap)
                : null
            return {
                type: statement.type,
                label,
                init,
                condition,
                post,
                body: this.#validateStatement(
                    statement.body,
                    newIdentifierMap,
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
            type: statement.type,
        }
    }

    #validateForInit = (
        init: ForInit,
        identifierMap: IdentifierMap,
    ): ForInit => {
        if (init.type === "declaration") {
            return {
                type: init.type,
                declaration: this.#validateVariableDeclaration(
                    init.declaration,
                    identifierMap,
                ),
            }
        }
        return {
            type: init.type,
            expression: init.expression
                ? this.#validateExpression(init.expression, identifierMap)
                : null,
        }
    }

    #validateExpression = (
        expression: Expression,
        identifierMap: IdentifierMap,
    ): Expression => {
        if (expression.type === "assignment") {
            if (expression.left.type !== "variable") {
                throw new Error("Invalid lvalue!")
            }
            return {
                type: expression.type,
                left: this.#validateExpression(expression.left, identifierMap),
                right: this.#validateExpression(
                    expression.right,
                    identifierMap,
                ),
            }
        }

        if (expression.type === "variable") {
            if (identifierMap.has(expression.name)) {
                return {
                    type: expression.type,
                    name: identifierMap.get(expression.name)!.newName,
                }
            }
            throw new Error("Undeclared variable!")
        }

        if (expression.type === "binary") {
            return {
                type: expression.type,
                operator: expression.operator,
                left: this.#validateExpression(expression.left, identifierMap),
                right: this.#validateExpression(
                    expression.right,
                    identifierMap,
                ),
            }
        }

        if (expression.type === "unary") {
            return {
                type: expression.type,
                operator: expression.operator,
                expression: this.#validateExpression(
                    expression.expression,
                    identifierMap,
                ),
            }
        }

        if (expression.type === "conditional") {
            return {
                type: expression.type,
                condition: this.#validateExpression(
                    expression.condition,
                    identifierMap,
                ),
                then: this.#validateExpression(expression.then, identifierMap),
                else: this.#validateExpression(expression.else, identifierMap),
            }
        }

        if (expression.type === "functionCall") {
            if (identifierMap.has(expression.name)) {
                const newName = identifierMap.get(expression.name)?.newName!
                const newArgs = expression.args.map((arg) =>
                    this.#validateExpression(arg, identifierMap),
                )
                return {
                    type: expression.type,
                    name: newName,
                    args: newArgs,
                }
            }
            throw new Error("Undeclared function!")
        }

        return expression
    }

    validate = (): ValidateReturnType => {
        const program = this.#validateProgram(this.#program, new Map())
        const symbols = new TypeChecker().check(program)
        return {
            program,
            symbols,
        }
    }
}
