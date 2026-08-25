int main(void)
{
    volatile int x = 2;
    return ~(-x);
}