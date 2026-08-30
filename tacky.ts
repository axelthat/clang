import type {
    BinaryOperator,
    Block,
    BlockItem,
    Declaration,
    Expression,
    FunctionDeclaration,
    Parameter,
    Program,
    Statement,
    UnaryOperator,
} from "./ast.ts"

type TackyUnaryOperator = UnaryOperator
type TackyBinaryOperator = Exclude<BinaryOperator, "and" | "or">

type TackyConstant = {
    type: "constant"
    value: number
}

type TackyVariable = {
    type: "variable"
    name: string
}

export type TackyValue = TackyConstant | TackyVariable

export type TackyInstruction =
    | {
          type: "unary"
          operator: TackyUnaryOperator
          source: TackyValue
          destination: TackyVariable
      }
    | {
          type: "binary"
          operator: TackyBinaryOperator
          source1: TackyValue
          source2: TackyValue
          destination: TackyVariable
      }
    | {
          type: "copy"
          source: TackyValue
          destination: TackyVariable
      }
    | {
          type: "jump"
          target: string
      }
    | {
          type: "jump_if_zero"
          condition: TackyValue
          target: string
      }
    | {
          type: "jump_if_not_zero"
          condition: TackyValue
          target: string
      }
    | {
          type: "label"
          name: string
      }
    | {
          type: "return"
          value: TackyValue
      }
    | {
          type: "functionCall"
          name: string
          args: TackyValue[]
          destination: TackyVariable
      }

export type TackyProgram = {
    type: "program"
    definitions: TackyFunctionDefinition[]
}

export type TackyFunctionDefinition = {
    type: "function"
    name: string
    parameters: Parameter[]
    instructions: TackyInstruction[]
}

export class Tacky {
    #program: Program
    #tmpVarCounter = 0
    #tmpLabelCounter = 0

    constructor(program: Program) {
        this.#program = program
    }

    #getTmpVar = () => {
        const p = this.#tmpVarCounter
        this.#tmpVarCounter++
        return `tmp.${p}`
    }

    #getLabel = (name?: string) => {
        const p = this.#tmpLabelCounter
        this.#tmpLabelCounter++
        return `.L${name ?? "label"}_${p}`
    }

    #tackleProgram = (program: Program): TackyProgram => {
        return {
            type: "program",
            definitions: program.declarations
                // temporary
                .filter(
                    (declaration) => declaration.type !== "variableDeclaration",
                )
                .filter((declaration) => declaration.body != null)
                .map((declaration) => this.#tackleFunction(declaration)),
        }
    }

    #tackleFunction = (
        function_: FunctionDeclaration,
    ): TackyFunctionDefinition => {
        const instructions = this.#tackleBlock(function_.body!)

        // Falling off the end of main returns 0.
        instructions.push({
            type: "return",
            value: {
                type: "constant",
                value: 0,
            },
        })

        return {
            type: "function",
            name: function_.name,
            parameters: function_.parameters,
            instructions,
        }
    }

    #tackleBlock = (block: Block): TackyInstruction[] => {
        const instructions: TackyInstruction[] = []
        for (const blockItem of block.items) {
            instructions.push(...this.#tackleBlockItem(blockItem))
        }
        return instructions
    }

    #tackleBlockItem = (blockItem: BlockItem): TackyInstruction[] => {
        if (blockItem.type === "declaration") {
            return this.#tackleDeclaration(blockItem.declaration)
        }

        return this.#tackleStatement(blockItem.statement)
    }

    #tackleDeclaration = (declaration: Declaration): TackyInstruction[] => {
        const instructions: TackyInstruction[] = []

        if (declaration.type === "functionDeclaration") {
            return instructions
        }

        if (declaration.init !== null) {
            const source = this.#tackleExpression(
                declaration.init,
                instructions,
            )

            instructions.push({
                type: "copy",
                source,
                destination: {
                    type: "variable",
                    name: declaration.name,
                },
            })
        }

        return instructions
    }

    #tackleStatement = (statement: Statement): TackyInstruction[] => {
        const instructions: TackyInstruction[] = []

        if (statement.type === "return") {
            instructions.push({
                type: "return",
                value: this.#tackleExpression(
                    statement.expression,
                    instructions,
                ),
            })

            return instructions
        }

        if (statement.type === "expression") {
            this.#tackleExpression(statement.expression, instructions)
            return instructions
        }

        if (statement.type === "if") {
            const condition = this.#tackleExpression(
                statement.condition,
                instructions,
            )

            if (statement.else === null) {
                const endLabel = this.#getLabel("end_if")

                instructions.push({
                    type: "jump_if_zero",
                    condition,
                    target: endLabel,
                })

                instructions.push(...this.#tackleStatement(statement.then))
                instructions.push({
                    type: "label",
                    name: endLabel,
                })

                return instructions
            }

            const elseLabel = this.#getLabel("else")
            const endLabel = this.#getLabel("end_if")

            instructions.push({
                type: "jump_if_zero",
                condition,
                target: elseLabel,
            })

            instructions.push(
                ...this.#tackleStatement(statement.then),
                {
                    type: "jump",
                    target: endLabel,
                },
                {
                    type: "label",
                    name: elseLabel,
                },
                ...this.#tackleStatement(statement.else),
                {
                    type: "label",
                    name: endLabel,
                },
            )

            return instructions
        }

        if (statement.type === "compound") {
            return this.#tackleBlock(statement.block)
        }

        if (statement.type === "while") {
            const continueLabel = `continue_${statement.label}`
            const breakLabel = `break_${statement.label}`

            instructions.push({
                type: "label",
                name: continueLabel,
            })

            const condition = this.#tackleExpression(
                statement.condition,
                instructions,
            )

            instructions.push(
                {
                    type: "jump_if_zero",
                    condition,
                    target: breakLabel,
                },
                ...this.#tackleStatement(statement.body),
                {
                    type: "jump",
                    target: continueLabel,
                },
                {
                    type: "label",
                    name: breakLabel,
                },
            )
            return instructions
        }

        if (statement.type === "doWhile") {
            const startLabel = `start_${statement.label!}`
            const continueLabel = `continue_${statement.label!}`
            const breakLabel = `break_${statement.label!}`

            instructions.push({
                type: "label",
                name: startLabel,
            })

            instructions.push(...this.#tackleStatement(statement.body))

            instructions.push({
                type: "label",
                name: continueLabel,
            })

            const condition = this.#tackleExpression(
                statement.condition,
                instructions,
            )

            instructions.push(
                {
                    type: "jump_if_zero",
                    condition,
                    target: breakLabel,
                },
                {
                    type: "jump",
                    target: startLabel,
                },
                {
                    type: "label",
                    name: breakLabel,
                },
            )

            return instructions
        }

        if (statement.type === "for") {
            const startLabel = `start_${statement.label!}`
            const continueLabel = `continue_${statement.label!}`
            const breakLabel = `break_${statement.label!}`

            if (statement.init !== null) {
                if (statement.init.type === "declaration") {
                    instructions.push(
                        ...this.#tackleDeclaration(statement.init.declaration),
                    )
                } else if (statement.init.expression !== null) {
                    this.#tackleExpression(
                        statement.init.expression,
                        instructions,
                    )
                }
            }

            instructions.push({
                type: "label",
                name: startLabel,
            })

            if (statement.condition !== null) {
                const condition = this.#tackleExpression(
                    statement.condition,
                    instructions,
                )

                instructions.push({
                    type: "jump_if_zero",
                    condition,
                    target: breakLabel,
                })
            }

            instructions.push(...this.#tackleStatement(statement.body))

            instructions.push({
                type: "label",
                name: continueLabel,
            })

            if (statement.post !== null) {
                this.#tackleExpression(statement.post, instructions)
            }

            instructions.push(
                {
                    type: "jump",
                    target: startLabel,
                },
                {
                    type: "label",
                    name: breakLabel,
                },
            )

            return instructions
        }

        if (statement.type === "break" || statement.type === "continue") {
            instructions.push({
                type: "jump",
                target: `${statement.type}_${statement.label}`,
            })
            return instructions
        }

        if (statement.type === "null") {
            return instructions
        }

        throw new Error("Malformed statement")
    }

    #tackleExpression = (
        expression: Expression,
        instructions: TackyInstruction[],
    ): TackyValue => {
        if (expression.type === "constant") {
            return {
                type: "constant",
                value: expression.value,
            }
        }

        if (expression.type === "variable") {
            return {
                type: "variable",
                name: expression.name,
            }
        }

        if (expression.type === "assignment") {
            if (expression.left.type !== "variable") {
                throw new Error("Invalid assignment target")
            }

            const source = this.#tackleExpression(
                expression.right,
                instructions,
            )

            const destination: TackyVariable = {
                type: "variable",
                name: expression.left.name,
            }

            instructions.push({
                type: "copy",
                source,
                destination,
            })

            return destination
        }

        if (expression.type === "unary") {
            const source = this.#tackleExpression(
                expression.expression,
                instructions,
            )

            const destination: TackyVariable = {
                type: "variable",
                name: this.#getTmpVar(),
            }

            instructions.push({
                type: "unary",
                operator: expression.operator,
                source,
                destination,
            })

            return destination
        }

        if (expression.type === "conditional") {
            const destination: TackyVariable = {
                type: "variable",
                name: this.#getTmpVar(),
            }
            const elseLabel = this.#getLabel("conditional_else")
            const endLabel = this.#getLabel("conditional_end")
            const condition = this.#tackleExpression(
                expression.condition,
                instructions,
            )

            instructions.push({
                type: "jump_if_zero",
                condition,
                target: elseLabel,
            })

            const thenValue = this.#tackleExpression(
                expression.then,
                instructions,
            )

            instructions.push(
                {
                    type: "copy",
                    source: thenValue,
                    destination,
                },
                {
                    type: "jump",
                    target: endLabel,
                },
                {
                    type: "label",
                    name: elseLabel,
                },
            )

            const elseValue = this.#tackleExpression(
                expression.else,
                instructions,
            )

            instructions.push(
                {
                    type: "copy",
                    source: elseValue,
                    destination,
                },
                {
                    type: "label",
                    name: endLabel,
                },
            )

            return destination
        }

        if (expression.type === "binary") {
            const destination: TackyVariable = {
                type: "variable",
                name: this.#getTmpVar(),
            }

            if (expression.operator === "and") {
                const falseLabel = this.#getLabel("false")
                const endLabel = this.#getLabel()

                const left = this.#tackleExpression(
                    expression.left,
                    instructions,
                )

                instructions.push({
                    type: "jump_if_zero",
                    condition: left,
                    target: falseLabel,
                })

                const right = this.#tackleExpression(
                    expression.right,
                    instructions,
                )

                instructions.push(
                    {
                        type: "jump_if_zero",
                        condition: right,
                        target: falseLabel,
                    },
                    {
                        type: "copy",
                        source: {
                            type: "constant",
                            value: 1,
                        },
                        destination,
                    },
                    {
                        type: "jump",
                        target: endLabel,
                    },
                    {
                        type: "label",
                        name: falseLabel,
                    },
                    {
                        type: "copy",
                        source: {
                            type: "constant",
                            value: 0,
                        },
                        destination,
                    },
                    {
                        type: "label",
                        name: endLabel,
                    },
                )
            } else if (expression.operator === "or") {
                const trueLabel = this.#getLabel("true")
                const endLabel = this.#getLabel()

                const left = this.#tackleExpression(
                    expression.left,
                    instructions,
                )

                instructions.push({
                    type: "jump_if_not_zero",
                    condition: left,
                    target: trueLabel,
                })

                const right = this.#tackleExpression(
                    expression.right,
                    instructions,
                )

                instructions.push(
                    {
                        type: "jump_if_not_zero",
                        condition: right,
                        target: trueLabel,
                    },
                    {
                        type: "copy",
                        source: {
                            type: "constant",
                            value: 0,
                        },
                        destination,
                    },
                    {
                        type: "jump",
                        target: endLabel,
                    },
                    {
                        type: "label",
                        name: trueLabel,
                    },
                    {
                        type: "copy",
                        source: {
                            type: "constant",
                            value: 1,
                        },
                        destination,
                    },
                    {
                        type: "label",
                        name: endLabel,
                    },
                )
            } else {
                const left = this.#tackleExpression(
                    expression.left,
                    instructions,
                )

                const right = this.#tackleExpression(
                    expression.right,
                    instructions,
                )

                instructions.push({
                    type: "binary",
                    operator: expression.operator,
                    source1: left,
                    source2: right,
                    destination,
                })
            }

            return destination
        }

        if (expression.type === "functionCall") {
            const args = expression.args.map((argument) =>
                this.#tackleExpression(argument, instructions),
            )

            const destination: TackyVariable = {
                type: "variable",
                name: this.#getTmpVar(),
            }

            instructions.push({
                type: "functionCall",
                name: expression.name,
                args,
                destination,
            })

            return destination
        }

        throw new Error("Malformed expression")
    }

    tackle = (): TackyProgram => {
        this.#tmpVarCounter = 0
        this.#tmpLabelCounter = 0

        return this.#tackleProgram(this.#program)
    }
}
