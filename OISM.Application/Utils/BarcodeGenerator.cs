public static class BarcodeGenerator
{
    public static string GenerateEAN13(string prefix = "893", string productCode = "000000000")
    {
        string baseCode = $"{prefix}{productCode}";
        if (baseCode.Length != 12) throw new ArgumentException("Base code must be 12 digits");

        int sum = 0;
        for (int i = 0; i < 12; i++)
        {
            int digit = int.Parse(baseCode[i].ToString());
            sum += (i % 2 == 0) ? digit : digit * 3;
        }

        int checksum = (10 - (sum % 10)) % 10;
        return $"{baseCode}{checksum}";
    }
}