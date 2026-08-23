import type {
    Expression,
    FunctionDefinition,
    Program,
    Statement,
} from "./ast.ts"
import { Writer } from "./writer.ts"

export class Codegen {
    #program: Program
    #writer: Writer

    constructor(program: Program) {
        this.#program = program
        this.#writer = new Writer()
    }

    #genProgram = () => {
        this.#genFunction(this.#program.function)

        this.#writer.nest("-")
        this.#writer.newline()
        this.#writer.write('.section .note.GNU-stack,"",@progbits')

        return this.#writer.toString()
    }

    #genFunction = (function_: FunctionDefinition) => {
        this.#writer.write(`.globl ${function_.name}`)
        this.#writer.write(`${function_.name}:`)
        this.#genStatement(function_.body)
    }

    #genStatement = (statement: Statement) => {
        this.#writer.nest("++")
        this.#writer.write(
            `movl ${this.#genExpression(statement.expression)}, %eax`,
        )
        this.#writer.write("ret")
        this.#writer.nest("--")
    }

    #genExpression = (expression: Expression) => {
        return "$" + expression.value
    }

    gen = () => {
        return this.#genProgram()
    }
}
