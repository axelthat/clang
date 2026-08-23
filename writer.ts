const SPACE_COUNT = 4

export class Writer {
    #content = ""
    #nestCount = 0

    write = (text: string) => {
        this.#content +=
            new Array(this.#nestCount).fill(" ").join("") + text + "\n"
    }

    newline = () => (this.#content += "\n")

    nest = (type: "++" | "--" | "+" | "-") => {
        if (type === "++") {
            return (this.#nestCount += SPACE_COUNT)
        }
        if (type === "--") {
            return (this.#nestCount = Math.max(
                0,
                this.#nestCount - SPACE_COUNT,
            ))
        }
        if (type === "+") {
            return (this.#nestCount = SPACE_COUNT)
        }
        return (this.#nestCount = 0)
    }

    toString() {
        return this.#content
    }
}
