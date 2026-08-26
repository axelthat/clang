.globl main
main:
    pushq %rbp
    movq %rsp, %rbp
    subq $16, %rsp

    movl $14, -4(%rbp)
    cmpl $0, -4(%rbp)
    sete %r11b
    movzbl %r11b, %r11d
    movl %r11d, -4(%rbp)
    movl -4(%rbp), %eax
    movq %rbp, %rsp
    popq %rbp
    ret

.section .note.GNU-stack,"",@progbits
