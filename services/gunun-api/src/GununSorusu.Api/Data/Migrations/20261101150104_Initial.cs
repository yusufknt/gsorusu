using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GununSorusu.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "players",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    device_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    auth_provider = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    display_name = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: true),
                    city = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    notify_hour = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_players", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "questions",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    no = table.Column<int>(type: "integer", nullable: false),
                    day = table.Column<DateOnly>(type: "date", nullable: false),
                    format = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    prompt = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    media_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    unit = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    answer_num = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    tolerance_pct = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    options = table.Column<string>(type: "jsonb", nullable: true),
                    correct_option = table.Column<int>(type: "integer", nullable: true),
                    rounds = table.Column<string>(type: "jsonb", nullable: true),
                    fact_text = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    price_history = table.Column<string>(type: "jsonb", nullable: true),
                    source_text = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    source_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    source_date = table.Column<DateOnly>(type: "date", nullable: true),
                    verified_by1 = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    verified_by2 = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    is_sponsored = table.Column<bool>(type: "boolean", nullable: false),
                    poll_closed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_questions", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "player_stats",
                columns: table => new
                {
                    player_id = table.Column<Guid>(type: "uuid", nullable: false),
                    current_streak = table.Column<int>(type: "integer", nullable: false),
                    max_streak = table.Column<int>(type: "integer", nullable: false),
                    last_played_day = table.Column<DateOnly>(type: "date", nullable: true),
                    last_repair_day = table.Column<DateOnly>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_player_stats", x => x.player_id);
                    table.ForeignKey(
                        name: "fk_player_stats_players_player_id",
                        column: x => x.player_id,
                        principalTable: "players",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "plays",
                columns: table => new
                {
                    player_id = table.Column<Guid>(type: "uuid", nullable: false),
                    question_id = table.Column<int>(type: "integer", nullable: false),
                    archive = table.Column<bool>(type: "boolean", nullable: false),
                    guesses = table.Column<string>(type: "jsonb", nullable: false),
                    hint_used = table.Column<bool>(type: "boolean", nullable: false),
                    hint_min = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    hint_max = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    first_direction = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: true),
                    chosen_option = table.Column<int>(type: "integer", nullable: true),
                    score = table.Column<int>(type: "integer", nullable: true),
                    solved = table.Column<bool>(type: "boolean", nullable: false),
                    started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    finished_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_plays", x => new { x.player_id, x.question_id });
                    table.ForeignKey(
                        name: "fk_plays_players_player_id",
                        column: x => x.player_id,
                        principalTable: "players",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_plays_questions_question_id",
                        column: x => x.question_id,
                        principalTable: "questions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "poll_votes",
                columns: table => new
                {
                    question_id = table.Column<int>(type: "integer", nullable: false),
                    player_id = table.Column<Guid>(type: "uuid", nullable: false),
                    option = table.Column<int>(type: "integer", nullable: false),
                    predicted_pct = table.Column<int>(type: "integer", nullable: false),
                    archive = table.Column<bool>(type: "boolean", nullable: false),
                    actual_pct = table.Column<decimal>(type: "numeric(5,1)", precision: 5, scale: 1, nullable: true),
                    score = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_poll_votes", x => new { x.question_id, x.player_id });
                    table.ForeignKey(
                        name: "fk_poll_votes_players_player_id",
                        column: x => x.player_id,
                        principalTable: "players",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_poll_votes_questions_question_id",
                        column: x => x.question_id,
                        principalTable: "questions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "question_crowd",
                columns: table => new
                {
                    question_id = table.Column<int>(type: "integer", nullable: false),
                    plays = table.Column<int>(type: "integer", nullable: false),
                    avg_score = table.Column<decimal>(type: "numeric(5,1)", precision: 5, scale: 1, nullable: true),
                    histogram = table.Column<int[]>(type: "integer[]", nullable: false),
                    solved_pct = table.Column<decimal>(type: "numeric(5,1)", precision: 5, scale: 1, nullable: true),
                    under_pct = table.Column<decimal>(type: "numeric(5,1)", precision: 5, scale: 1, nullable: true),
                    over_pct = table.Column<decimal>(type: "numeric(5,1)", precision: 5, scale: 1, nullable: true),
                    option_pcts = table.Column<List<decimal>>(type: "numeric[]", nullable: true),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_question_crowd", x => x.question_id);
                    table.ForeignKey(
                        name: "fk_question_crowd_questions_question_id",
                        column: x => x.question_id,
                        principalTable: "questions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_players_device_id",
                table: "players",
                column: "device_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_plays_question_id",
                table: "plays",
                column: "question_id");

            migrationBuilder.CreateIndex(
                name: "ix_poll_votes_player_id",
                table: "poll_votes",
                column: "player_id");

            migrationBuilder.CreateIndex(
                name: "ix_questions_day",
                table: "questions",
                column: "day",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_questions_no",
                table: "questions",
                column: "no",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "player_stats");

            migrationBuilder.DropTable(
                name: "plays");

            migrationBuilder.DropTable(
                name: "poll_votes");

            migrationBuilder.DropTable(
                name: "question_crowd");

            migrationBuilder.DropTable(
                name: "players");

            migrationBuilder.DropTable(
                name: "questions");
        }
    }
}
