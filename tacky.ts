import type {
    Expression,
    FunctionDefinition,
    Program,
    Statement,
} from "./ast.ts"

type TackyUnaryOperator = "negate" | "complement"
type TackyBinaryOperator =
    | "add"
    | "negate"
    | "multiply"
    | "divide"
    | "remainder"

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

    constructor(program: Program) {
        this.#program = program
    }

    #getTmpVar = () => {
        const p = this.#tmpVarCounter
        this.#tmpVarCounter++
        return `tmp.${p}`
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
        return {
            type: "function",
            name: function_.name,
            instructions: this.#tackleStatement(function_.body),
        }
    }

    #tackleStatement = (statement: Statement): TackyInstruction[] => {
        const instructions: TackyInstruction[] = []
        instructions.push({
            type: "return",
            value: this.#tackleExpression(statement.expression, instructions),
        })
        return instructions
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
            const left = this.#tackleExpression(expression.left, instructions)
            const right = this.#tackleExpression(expression.right, instructions)

            const destination: TackyVariable = {
                type: "variable",
                name: this.#getTmpVar(),
            }

            instructions.push({
                type: "binary",
                operator: expression.operator,
                source1: left,
                source2: right,
                destination,
            })

            return destination
        }

        throw new Error("Malformed expression")
    }

    tackle = (): TackyProgram => {
        this.#tmpVarCounter = 0
        return this.#tackleProgram(this.#program)
    }
}
