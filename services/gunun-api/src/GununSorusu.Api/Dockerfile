# Derleme dışarıda yapılır (GitHub Actions → GHCR); sunucuda --build kullanılmaz.
# Bağlam: services/gunun-api
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Directory.Build.props ./
COPY src/GununSorusu.Domain/GununSorusu.Domain.csproj src/GununSorusu.Domain/
COPY src/GununSorusu.Api/GununSorusu.Api.csproj src/GununSorusu.Api/
RUN dotnet restore src/GununSorusu.Api/GununSorusu.Api.csproj
COPY src/ src/
RUN dotnet publish src/GununSorusu.Api/GununSorusu.Api.csproj -c Release -o /app --no-restore

# "extra": ICU + tzdata içerir (Europe/Istanbul saat dilimi ve Türkçe kültür için gerekli).
FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble-chiseled-extra
WORKDIR /app
COPY --from=build /app ./
ENV ASPNETCORE_HTTP_PORTS=8080 \
    DOTNET_GCHeapHardLimitPercent=0x4B
EXPOSE 8080
ENTRYPOINT ["dotnet", "GununSorusu.Api.dll"]
