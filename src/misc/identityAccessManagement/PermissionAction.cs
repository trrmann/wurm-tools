using System.Linq;
using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;

namespace Common.IAM
{
    /// <summary>
    /// Represents atomic access actions allowed on system resources.
    /// </summary>
    public enum PermissionAction
    {
        Create,
        Read,
        Update,
        Delete,
        Execute
    }
}
