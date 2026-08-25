import type {
    TackyFunctionDefinition,
    TackyInstruction,
    TackyProgram,
    TackyValue,
} from "./tacky.ts"
import { Writer } from "./writer.ts"

export class Codegen {
    #program: TackyProgram
    #writer: Writer

    constructor(program: TackyProgram) {
        this.#program = program
        this.#writer = new Writer()
    }

    #alignTo16 = (bytes: number): number => {
        return Math.ceil(bytes / 16) * 16
    }

    #createStackLayout = (
        function_: TackyFunctionDefinition,
    ): Map<string, number> => {
        const offsets = new Map<string, number>()
        let bytes = 0

        const allocate = (value: TackyValue) => {
            if (value.type !== "variable") {
                return
            }

            if (offsets.has(value.name)) {
                return
            }

            bytes += 4
            offsets.set(value.name, -bytes)
        }

        for (const instruction of function_.instructions) {
            if (instruction.type === "unary") {
                allocate(instruction.source)
                allocate(instruction.destination)
            } else if (instruction.type === "return") {
                allocate(instruction.value)
            }
        }

        return offsets
    }

    #getStackOffset = (
        variableName: string,
        offsets: Map<string, number>,
    ): number => {
        const offset = offsets.get(variableName)

        if (offset === undefined) {
            throw new Error(
                `No stack slot allocated for variable: ${variableName}`,
            )
        }

        return offset
    }

    #getStackSize = (offsets: Map<string, number>): number => {
        return this.#alignTo16(offsets.size * 4)
    }

    #copyValueToStack = (
        source: TackyValue,
        destinationOffset: number,
        offsets: Map<string, number>,
    ) => {
        if (source.type === "constant") {
            this.#writer.write(
                `movl $${source.value}, ${destinationOffset}(%rbp)`,
            )
            return
        }

        if (source.type === "variable") {
            const sourceOffset = this.#getStackOffset(source.name, offsets)

            // x86 does not allow movl from memory directly to memory.
            this.#writer.write(`movl ${sourceOffset}(%rbp), %r10d`)
            this.#writer.write(`movl %r10d, ${destinationOffset}(%rbp)`)
            return
        }

        throw new Error("Malformed Tacky value")
    }

    #genInstruction = (
        instruction: TackyInstruction,
        offsets: Map<string, number>,
    ) => {
        if (instruction.type === "unary") {
            const destinationOffset = this.#getStackOffset(
                instruction.destination.name,
                offsets,
            )

            this.#copyValueToStack(
                instruction.source,
                destinationOffset,
                offsets,
            )

            if (instruction.operator === "negate") {
                this.#writer.write(`negl ${destinationOffset}(%rbp)`)
                return
            }

            if (instruction.operator === "complement") {
                this.#writer.write(`notl ${destinationOffset}(%rbp)`)
                return
            }

            throw new Error(`Unknown unary operator: ${instruction.operator}`)
        }

        if (instruction.type === "return") {
            const { value } = instruction

            if (value.type === "constant") {
                this.#writer.write(`movl $${value.value}, %eax`)
            } else if (value.type === "variable") {
                const offset = this.#getStackOffset(value.name, offsets)

                this.#writer.write(`movl ${offset}(%rbp), %eax`)
            } else {
                throw new Error("Malformed return value")
            }

            return
        }

        throw new Error("Malformed Tacky instruction")
    }

    #genFunction = (function_: TackyFunctionDefinition) => {
        const offsets = this.#createStackLayout(function_)
        const stackSize = this.#getStackSize(offsets)

        this.#writer.write(`.globl ${function_.name}`)
        this.#writer.write(`${function_.name}:`)
        this.#writer.nest("++")

        this.#writer.write("pushq %rbp")
        this.#writer.write("movq %rsp, %rbp")

        if (stackSize > 0) {
            this.#writer.write(`subq $${stackSize}, %rsp`)
        }

        this.#writer.newline()

        for (const instruction of function_.instructions) {
            this.#genInstruction(instruction, offsets)
        }

        this.#writer.newline()
        this.#writer.write("movq %rbp, %rsp")
        this.#writer.write("popq %rbp")
        this.#writer.write("ret")

        this.#writer.nest("-")
    }

    #genProgram = (program: TackyProgram) => {
        this.#genFunction(program.function)

        this.#writer.newline()
        this.#writer.write('.section .note.GNU-stack,"",@progbits')
    }

    gen = () => {
        this.#genProgram(this.#program)
        return this.#writer.toString()
    }
}
