using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GununSorusu.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class GoogleSignIn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "email",
                table: "players",
                type: "character varying(254)",
                maxLength: 254,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "google_sub",
                table: "players",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_players_google_sub",
                table: "players",
                column: "google_sub",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_players_google_sub",
                table: "players");

            migrationBuilder.DropColumn(
                name: "email",
                table: "players");

            migrationBuilder.DropColumn(
                name: "google_sub",
                table: "players");
        }
    }
}
