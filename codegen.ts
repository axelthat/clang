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
            switch (instruction.type) {
                case "unary":
                    allocate(instruction.source)
                    allocate(instruction.destination)
                    break

                case "binary":
                    allocate(instruction.source1)
                    allocate(instruction.source2)
                    allocate(instruction.destination)
                    break

                case "return":
                    allocate(instruction.value)
                    break
            }
        }

        return offsets
    }

    #getStackOffset = (name: string, offsets: Map<string, number>): number => {
        const offset = offsets.get(name)

        if (offset === undefined) {
            throw new Error(`No stack slot allocated for variable: ${name}`)
        }

        return offset
    }

    #getStackSize = (offsets: Map<string, number>): number => {
        return this.#alignTo16(offsets.size * 4)
    }

    #formatValue = (
        value: TackyValue,
        offsets: Map<string, number>,
    ): string => {
        if (value.type === "constant") {
            return `$${value.value}`
        }

        const offset = this.#getStackOffset(value.name, offsets)
        return `${offset}(%rbp)`
    }

    #copyValueToRegister = (
        source: TackyValue,
        register: string,
        offsets: Map<string, number>,
    ) => {
        const sourceOperand = this.#formatValue(source, offsets)
        this.#writer.write(`movl ${sourceOperand}, ${register}`)
    }

    #copyValueToStack = (
        source: TackyValue,
        destinationOffset: number,
        offsets: Map<string, number>,
    ) => {
        const destination = `${destinationOffset}(%rbp)`

        if (source.type === "constant") {
            this.#writer.write(`movl $${source.value}, ${destination}`)
            return
        }

        const sourceOffset = this.#getStackOffset(source.name, offsets)

        this.#writer.write(`movl ${sourceOffset}(%rbp), %r10d`)
        this.#writer.write(`movl %r10d, ${destination}`)
    }

    #genUnaryInstruction = (
        instruction: Extract<TackyInstruction, { type: "unary" }>,
        offsets: Map<string, number>,
    ) => {
        const destinationOffset = this.#getStackOffset(
            instruction.destination.name,
            offsets,
        )

        this.#copyValueToStack(instruction.source, destinationOffset, offsets)

        switch (instruction.operator) {
            case "negate":
                this.#writer.write(`negl ${destinationOffset}(%rbp)`)
                break

            case "complement":
                this.#writer.write(`notl ${destinationOffset}(%rbp)`)
                break

            default:
                throw new Error(
                    `Unknown unary operator: ${instruction.operator}`,
                )
        }
    }

    #genAddOrSubtract = (
        instruction: Extract<TackyInstruction, { type: "binary" }>,
        offsets: Map<string, number>,
    ) => {
        const destinationOffset = this.#getStackOffset(
            instruction.destination.name,
            offsets,
        )

        const destination = `${destinationOffset}(%rbp)`

        this.#copyValueToStack(instruction.source1, destinationOffset, offsets)

        const mnemonic = instruction.operator === "add" ? "addl" : "subl"

        if (instruction.source2.type === "constant") {
            this.#writer.write(
                `${mnemonic} $${instruction.source2.value}, ${destination}`,
            )

            return
        }

        const sourceOffset = this.#getStackOffset(
            instruction.source2.name,
            offsets,
        )

        this.#writer.write(`movl ${sourceOffset}(%rbp), %r10d`)
        this.#writer.write(`${mnemonic} %r10d, ${destination}`)
    }

    #genMultiply = (
        instruction: Extract<TackyInstruction, { type: "binary" }>,
        offsets: Map<string, number>,
    ) => {
        const destinationOffset = this.#getStackOffset(
            instruction.destination.name,
            offsets,
        )

        const destination = `${destinationOffset}(%rbp)`
        const source2 = this.#formatValue(instruction.source2, offsets)

        this.#copyValueToRegister(instruction.source1, "%r11d", offsets)

        this.#writer.write(`imull ${source2}, %r11d`)
        this.#writer.write(`movl %r11d, ${destination}`)
    }

    #genDivideOrRemainder = (
        instruction: Extract<TackyInstruction, { type: "binary" }>,
        offsets: Map<string, number>,
    ) => {
        const destinationOffset = this.#getStackOffset(
            instruction.destination.name,
            offsets,
        )

        this.#copyValueToRegister(instruction.source1, "%eax", offsets)

        this.#writer.write("cdq")

        if (instruction.source2.type === "constant") {
            this.#writer.write(`movl $${instruction.source2.value}, %r10d`)
            this.#writer.write("idivl %r10d")
        } else {
            const divisorOffset = this.#getStackOffset(
                instruction.source2.name,
                offsets,
            )

            this.#writer.write(`idivl ${divisorOffset}(%rbp)`)
        }

        const resultRegister =
            instruction.operator === "divide" ? "%eax" : "%edx"

        this.#writer.write(`movl ${resultRegister}, ${destinationOffset}(%rbp)`)
    }

    #genBinaryInstruction = (
        instruction: Extract<TackyInstruction, { type: "binary" }>,
        offsets: Map<string, number>,
    ) => {
        switch (instruction.operator) {
            case "add":
            case "negate":
                this.#genAddOrSubtract(instruction, offsets)
                break

            case "multiply":
                this.#genMultiply(instruction, offsets)
                break

            case "divide":
            case "remainder":
                this.#genDivideOrRemainder(instruction, offsets)
                break

            default:
                throw new Error(
                    `Unknown binary operator: ${instruction.operator}`,
                )
        }
    }

    #genReturnInstruction = (
        instruction: Extract<TackyInstruction, { type: "return" }>,
        offsets: Map<string, number>,
    ) => {
        this.#copyValueToRegister(instruction.value, "%eax", offsets)
    }

    #genInstruction = (
        instruction: TackyInstruction,
        offsets: Map<string, number>,
    ) => {
        switch (instruction.type) {
            case "unary":
                this.#genUnaryInstruction(instruction, offsets)
                break

            case "binary":
                this.#genBinaryInstruction(instruction, offsets)
                break

            case "return":
                this.#genReturnInstruction(instruction, offsets)
                break

            default:
                throw new Error("Malformed Tacky instruction")
        }

        this.#writer.newline()
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

    gen = (): string => {
        this.#genProgram(this.#program)
        return this.#writer.toString()
    }
}
