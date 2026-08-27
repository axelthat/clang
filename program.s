.globl main
main:
    pushq %rbp
    movq %rsp, %rbp
    subq $16, %rsp

    movl $1, -4(%rbp)
    movl $2, -8(%rbp)
    movl -8(%rbp), %r10d
    cmpl $1, %r10d
    setg %r11b
    movzbl %r11b, %r11d
    movl %r11d, -12(%rbp)
    cmpl $0, -12(%rbp)
    je .Lend_if_0
    movl $3, -8(%rbp)
    movl $4, -16(%rbp)
.Lend_if_0:
    movl -8(%rbp), %eax
    jmp .Lreturn_main
    movl -4(%rbp), %eax
    jmp .Lreturn_main
    movl $0, %eax
    jmp .Lreturn_main

.Lreturn_main:
    movq %rbp, %rsp
    popq %rbp
    ret

.section .note.GNU-stack,"",@progbits
