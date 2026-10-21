namespace Common.Base
{
    public class TypeErrorException : Exception
    {
        public TypeErrorException(string message) : base(message) { }
    }
}