using GununSorusu.Api.Infrastructure;
using GununSorusu.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace GununSorusu.Api.Data;

/// <summary>
/// Yalnızca geliştirme ortamı: veritabanı boşsa bugünün 7 gün öncesi ile 7 gün sonrası arasına
/// örnek sorular koyar (plandaki haftalık format takvimine göre). Bu sorular "[Örnek]" etiketlidir
/// ve kesinlikle yayına gitmez; değerler yaklaşıktır.
/// </summary>
public static class DevSeeder
{
    public static async Task SeedAsync(IServiceProvider services, CancellationToken ct = default)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GunDbContext>();
        if (await db.Questions.AnyAsync(ct)) return;

        var clock = scope.ServiceProvider.GetRequiredService<GameClock>();
        var launch = scope.ServiceProvider.GetRequiredService<IOptions<GameOptions>>().Value.LaunchDay;
        var today = clock.Today;
        var now = clock.UtcNow;
        var counters = new Dictionary<QuestionFormat, int>();

        for (var day = today.AddDays(-7); day <= today.AddDays(7); day = day.AddDays(1))
        {
            var no = day.DayNumber - launch.DayNumber + 1;
            if (no < 1) continue;

            var format = FormatFor(day.DayOfWeek);
            var i = counters[format] = counters.GetValueOrDefault(format) + 1;
            var q = Sample(format, i);
            q.Day = day;
            q.No = no;
            q.Status = day <= today ? QuestionStatus.Published : QuestionStatus.Scheduled;
            q.SourceText = "Geliştirme verisi (gerçek değil)";
            q.VerifiedBy1 = "dev-1";
            q.VerifiedBy2 = "dev-2";
            q.CreatedAt = q.UpdatedAt = now;
            db.Questions.Add(q);
        }

        await db.SaveChangesAsync(ct);
    }

    /// <summary>Plan A3, MVP haftası.</summary>
    public static QuestionFormat FormatFor(DayOfWeek d) => d switch
    {
        DayOfWeek.Monday => QuestionFormat.Price,
        DayOfWeek.Tuesday => QuestionFormat.Number,
        DayOfWeek.Wednesday => QuestionFormat.Poll,
        DayOfWeek.Thursday => QuestionFormat.Trivia,
        DayOfWeek.Friday => QuestionFormat.Price,
        DayOfWeek.Saturday => QuestionFormat.Compare,
        _ => QuestionFormat.Poll,
    };

    private static Question Sample(QuestionFormat format, int i) => format switch
    {
        QuestionFormat.Price => (i % 3) switch
        {
            1 => Numeric(format, "[Örnek] 1 L tam yağlı süt kaç TL?", 45m, "TL",
                "Örnek bilgi notu: süt fiyatları yıl içinde birkaç kez değişir.",
                [new(new DateOnly(2025, 11, 1), 34m), new(new DateOnly(2023, 11, 1), 18m)]),
            2 => Numeric(format, "[Örnek] İstanbul'da bir simit kaç TL?", 20m, "TL",
                "Örnek bilgi notu: simit fiyatını belediye ve esnaf odası birlikte belirler.",
                [new(new DateOnly(2025, 11, 1), 15m), new(new DateOnly(2023, 11, 1), 7.5m)]),
            _ => Numeric(format, "[Örnek] 6'lı ince belli çay bardağı seti kaç TL?", 180m, "TL",
                "Örnek bilgi notu: ince belli bardak 1950'lerden beri kullanılıyor.", null),
        },
        QuestionFormat.Number => (i % 3) switch
        {
            1 => Numeric(format, "[Örnek] Galata Kulesi kaç metre?", 63m, "m", "Örnek bilgi notu: kule 1348'de yapıldı.", null),
            2 => Numeric(format, "[Örnek] Boğaziçi Köprüsü'nün ana açıklığı kaç metre?", 1074m, "m",
                "Örnek bilgi notu: köprü 1973'te açıldı.", null),
            _ => Numeric(format, "[Örnek] Türkiye'de kaç il var?", 81m, "il", "Örnek bilgi notu: son iller 1990'larda kuruldu.", null),
        },
        QuestionFormat.Poll => (i % 2) switch
        {
            1 => new Question
            {
                Format = format,
                Prompt = "[Örnek] Kahvaltıda çay mı, kahve mi?",
                Options = ["Çay", "Kahve", "İkisi de", "Hiçbiri"],
            },
            _ => new Question
            {
                Format = format,
                Prompt = "[Örnek] Menemen soğanlı mı olur, soğansız mı?",
                Options = ["Soğanlı", "Soğansız"],
            },
        },
        QuestionFormat.Trivia => (i % 2) switch
        {
            1 => new Question
            {
                Format = format,
                Prompt = "[Örnek] Tamamı Türkiye sınırları içinde kalan en uzun nehir hangisi?",
                Options = ["Fırat", "Kızılırmak", "Sakarya", "Dicle"],
                CorrectOption = 1,
                FactText = "Örnek bilgi notu: Kızılırmak yaklaşık 1.355 km uzunluğundadır.",
            },
            _ => new Question
            {
                Format = format,
                Prompt = "[Örnek] Van Gölü hangi bölgededir?",
                Options = ["İç Anadolu", "Doğu Anadolu", "Karadeniz", "Güneydoğu Anadolu"],
                CorrectOption = 1,
                FactText = "Örnek bilgi notu: Van Gölü Türkiye'nin en büyük gölüdür.",
            },
        },
        _ => new Question
        {
            Format = QuestionFormat.Compare,
            Prompt = "[Örnek] Hangisi daha kalabalık?",
            Rounds =
            [
                new(null, "Norveç", "İzmir", 0, "~5,5 milyon", "~4,5 milyon"),
                new(null, "İstanbul", "Londra", 0, "~15,7 milyon", "~9 milyon"),
                new(null, "Estonya", "Bursa", 1, "~1,4 milyon", "~3,2 milyon"),
                new(null, "Konya", "Slovenya", 0, "~2,3 milyon", "~2,1 milyon"),
                new(null, "Kıbrıs adası", "Antalya", 1, "~1,3 milyon", "~2,7 milyon"),
            ],
            FactText = "Örnek bilgi notu: değerler yaklaşıktır.",
        },
    };

    private static Question Numeric(QuestionFormat f, string prompt, decimal answer, string unit, string fact, List<PricePoint>? history) =>
        new() { Format = f, Prompt = prompt, AnswerNum = answer, Unit = unit, FactText = fact, PriceHistory = history };
}
