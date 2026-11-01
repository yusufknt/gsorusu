using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace GununSorusu.Api.Infrastructure;

/// <summary>
/// Kullanıcıya gösterilebilecek hata. Mesaj Türkçedir ve doğrudan ekranda gösterilebilir;
/// <see cref="Code"/> istemcinin hataya göre davranması içindir.
/// </summary>
public sealed class ApiException(int status, string code, string message) : Exception(message)
{
    public int Status { get; } = status;
    public string Code { get; } = code;

    public static ApiException BadRequest(string code, string message) => new(StatusCodes.Status400BadRequest, code, message);
    public static ApiException Forbidden(string code, string message) => new(StatusCodes.Status403Forbidden, code, message);
    public static ApiException NotFound(string code, string message) => new(StatusCodes.Status404NotFound, code, message);
    public static ApiException Conflict(string code, string message) => new(StatusCodes.Status409Conflict, code, message);
}

/// <summary>Ham hata kullanıcıya hiçbir zaman gösterilmez; her şey ProblemDetails + Türkçe başlık olur.</summary>
public sealed class ApiExceptionHandler(IProblemDetailsService problems, ILogger<ApiExceptionHandler> log) : IExceptionHandler
{
    public const string GenericMessage = "Bir şeyler ters gitti. Lütfen biraz sonra tekrar dene.";

    public async ValueTask<bool> TryHandleAsync(HttpContext http, Exception exception, CancellationToken ct)
    {
        var (status, code, title) = exception switch
        {
            ApiException e => (e.Status, e.Code, e.Message),
            DbUpdateConcurrencyException => (409, "conflict_retry", "Aynı anda iki işlem geldi. Lütfen tekrar dene."),
            DbUpdateException { InnerException: PostgresException { SqlState: PostgresErrorCodes.UniqueViolation } } =>
                (409, "conflict_retry", "Aynı anda iki işlem geldi. Lütfen tekrar dene."),
            BadHttpRequestException e => (e.StatusCode, "bad_request", "İstek okunamadı. Uygulamayı güncellemeyi dene."),
            _ => (500, "server_error", GenericMessage),
        };

        if (status >= 500) log.LogError(exception, "İşlenmeyen hata: {Path}", http.Request.Path);

        http.Response.StatusCode = status;
        var context = new ProblemDetailsContext
        {
            HttpContext = http,
            Exception = exception,
            ProblemDetails = { Status = status, Title = title },
        };
        context.ProblemDetails.Extensions["code"] = code;
        return await problems.TryWriteAsync(context);
    }

    /// <summary>Gövdesiz durum kodlarına (401, 404, 429…) Türkçe başlık ve kod ekler; iç ayrıntıları siler.</summary>
    public static void Customize(ProblemDetailsContext context)
    {
        var pd = context.ProblemDetails;
        pd.Type = null;
        pd.Detail = null;
        if (pd.Extensions.ContainsKey("code")) return;

        (pd.Title, pd.Extensions["code"]) = pd.Status switch
        {
            400 => ("İstek okunamadı. Uygulamayı güncellemeyi dene.", "bad_request"),
            401 => ("Oturumun sona erdi. Uygulamayı yeniden aç.", "unauthorized"),
            403 => ("Bu işlem için yetkin yok.", "forbidden"),
            404 => ("Aradığın şey bulunamadı.", "not_found"),
            405 => ("Bu işlem desteklenmiyor.", "method_not_allowed"),
            429 => ("Çok hızlı gidiyorsun. Birkaç saniye bekleyip tekrar dene.", "rate_limited"),
            _ => (GenericMessage, "server_error"),
        };
    }
}
