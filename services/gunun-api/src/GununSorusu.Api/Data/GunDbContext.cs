using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GununSorusu.Api.Data;

public sealed class GunDbContext(DbContextOptions<GunDbContext> options) : DbContext(options)
{
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<Player> Players => Set<Player>();
    public DbSet<Play> Plays => Set<Play>();
    public DbSet<PollVote> PollVotes => Set<PollVote>();
    public DbSet<PlayerStats> PlayerStats => Set<PlayerStats>();
    public DbSet<QuestionCrowd> QuestionCrowd => Set<QuestionCrowd>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Question>(e =>
        {
            e.ToTable("questions");
            e.HasIndex(q => q.Day).IsUnique();
            e.HasIndex(q => q.No).IsUnique();
            e.Property(q => q.Format).HasConversion<int>();
            e.Property(q => q.Status).HasConversion<string>().HasMaxLength(16);
            e.Property(q => q.Prompt).HasMaxLength(500);
            e.Property(q => q.MediaUrl).HasMaxLength(500);
            e.Property(q => q.Unit).HasMaxLength(20);
            e.Property(q => q.AnswerNum).HasPrecision(18, 2);
            e.Property(q => q.TolerancePct).HasPrecision(5, 2);
            e.Property(q => q.FactText).HasMaxLength(1000);
            e.Property(q => q.SourceText).HasMaxLength(500);
            e.Property(q => q.SourceUrl).HasMaxLength(500);
            e.Property(q => q.VerifiedBy1).HasMaxLength(200);
            e.Property(q => q.VerifiedBy2).HasMaxLength(200);
            e.Property(q => q.Options).AsJson();
            e.Property(q => q.Rounds).AsJson();
            e.Property(q => q.PriceHistory).AsJson();
        });

        b.Entity<Player>(e =>
        {
            e.ToTable("players");
            e.Property(p => p.DeviceIdHash).HasColumnName("device_id").HasMaxLength(64);
            e.HasIndex(p => p.DeviceIdHash).IsUnique();
            e.Property(p => p.AuthProvider).HasMaxLength(16);
            e.Property(p => p.DisplayName).HasMaxLength(24);
            e.Property(p => p.City).HasMaxLength(40);
        });

        b.Entity<Play>(e =>
        {
            e.ToTable("plays");
            e.HasKey(p => new { p.PlayerId, p.QuestionId });
            e.HasIndex(p => p.QuestionId);
            e.HasOne<Player>().WithMany().HasForeignKey(p => p.PlayerId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(p => p.Question).WithMany().HasForeignKey(p => p.QuestionId).OnDelete(DeleteBehavior.Restrict);
            e.Property(p => p.Steps).HasColumnName("guesses").AsJson();
            e.Property(p => p.HintMin).HasPrecision(18, 2);
            e.Property(p => p.HintMax).HasPrecision(18, 2);
            e.Property(p => p.FirstDirection).HasConversion<string>().HasMaxLength(8);
            e.Property(p => p.Version).IsRowVersion();
            e.Ignore(p => p.IsFinished);
        });

        b.Entity<PollVote>(e =>
        {
            e.ToTable("poll_votes");
            e.HasKey(v => new { v.QuestionId, v.PlayerId });
            e.HasOne<Question>().WithMany().HasForeignKey(v => v.QuestionId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Player>().WithMany().HasForeignKey(v => v.PlayerId).OnDelete(DeleteBehavior.Cascade);
            e.Property(v => v.ActualPct).HasPrecision(5, 1);
        });

        b.Entity<PlayerStats>(e =>
        {
            e.ToTable("player_stats");
            e.HasKey(s => s.PlayerId);
            e.HasOne<Player>().WithOne().HasForeignKey<PlayerStats>(s => s.PlayerId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<QuestionCrowd>(e =>
        {
            e.ToTable("question_crowd");
            e.HasKey(c => c.QuestionId);
            e.HasOne<Question>().WithOne().HasForeignKey<QuestionCrowd>(c => c.QuestionId).OnDelete(DeleteBehavior.Cascade);
            e.Property(c => c.AvgScore).HasPrecision(5, 1);
            e.Property(c => c.SolvedPct).HasPrecision(5, 1);
            e.Property(c => c.UnderPct).HasPrecision(5, 1);
            e.Property(c => c.OverPct).HasPrecision(5, 1);
        });
    }
}

internal static class JsonColumn
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    /// <summary>Değeri jsonb sütununda saklar. Liste içi değişiklikler de algılanır (derin karşılaştırma).</summary>
    public static PropertyBuilder<T> AsJson<T>(this PropertyBuilder<T> builder) where T : class?
    {
        builder.HasConversion(
            v => Serialize(v),
            s => Deserialize<T>(s),
            new ValueComparer<T>(
                (a, c) => Serialize(a) == Serialize(c),
                v => Serialize(v).GetHashCode(),
                v => Deserialize<T>(Serialize(v))));
        builder.HasColumnType("jsonb");
        return builder;
    }

    private static string Serialize<T>(T value) => JsonSerializer.Serialize(value, Options);

    private static T Deserialize<T>(string json) => JsonSerializer.Deserialize<T>(json, Options)!;
}
