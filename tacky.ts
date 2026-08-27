import type {
    BinaryOperator,
    BlockItem,
    Declaration,
    Expression,
    FunctionDefinition,
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

export type TackyProgram = {
    type: "program"
    function: TackyFunctionDefinition
}

export type TackyFunctionDefinition = {
    type: "function"
    name: string
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
            function: this.#tackleFunction(program.function),
        }
    }

    #tackleFunction = (
        function_: FunctionDefinition,
    ): TackyFunctionDefinition => {
        const instructions = function_.body.map(this.#tackleBlockItem).flat()

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
            instructions,
        }
    }

    #tackleBlockItem = (blockItem: BlockItem): TackyInstruction[] => {
        if (blockItem.type === "declaration") {
            return this.#tackleDeclaration(blockItem.declaration)
        }

        return this.#tackleStatement(blockItem.statement)
    }

    #tackleDeclaration = (declaration: Declaration): TackyInstruction[] => {
        const instructions: TackyInstruction[] = []

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

        throw new Error("Malformed expression")
    }

    tackle = (): TackyProgram => {
        this.#tmpVarCounter = 0
        this.#tmpLabelCounter = 0

        return this.#tackleProgram(this.#program)
    }
}
