namespace GununSorusu.Domain;

/// <summary>Soru formatları. Sayısal değerler veritabanında saklanır, değiştirilmez.</summary>
public enum QuestionFormat
{
    /// <summary>Fiyatı Ne? — daralan sayısal tahmin.</summary>
    Price = 1,

    /// <summary>Sayı tahmini — fiyatla aynı daralan mekanik.</summary>
    Number = 2,

    /// <summary>Türkiye ne diyor? — oy + "kaç kişi senin gibi dedi" tahmini.</summary>
    Poll = 3,

    /// <summary>Bilgi — 4 şık, 1 hak, süreli.</summary>
    Trivia = 4,

    /// <summary>Hangisi daha…? — 5 hızlı ikili tur.</summary>
    Compare = 5,
}

public static class QuestionFormatExtensions
{
    public static bool IsNumeric(this QuestionFormat format) =>
        format is QuestionFormat.Price or QuestionFormat.Number;
}
