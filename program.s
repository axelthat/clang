.globl main
main:
    pushq %rbp
    movq %rsp, %rbp
    subq $16, %rsp

    movl $10, -4(%rbp)
start_loop.0:
    movl -4(%rbp), %r10d
    cmpl $0, %r10d
    setg %r11b
    movzbl %r11b, %r11d
    movl %r11d, -8(%rbp)
    cmpl $0, -8(%rbp)
    je break_loop.0
    movl -4(%rbp), %r10d
    cmpl $9, %r10d
    setle %r11b
    movzbl %r11b, %r11d
    movl %r11d, -12(%rbp)
    cmpl $0, -12(%rbp)
    je .Lend_if_0
    jmp break_loop.0
.Lend_if_0:
continue_loop.0:
    movl -4(%rbp), %r10d
    movl %r10d, -16(%rbp)
    subl $1, -16(%rbp)
    movl -16(%rbp), %r10d
    movl %r10d, -4(%rbp)
    jmp start_loop.0
break_loop.0:
    movl -4(%rbp), %eax
    jmp .Lreturn_main
    movl $0, %eax
    jmp .Lreturn_main

.Lreturn_main:
    movq %rbp, %rsp
    popq %rbp
    ret

.section .note.GNU-stack,"",@progbits
