using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HopeHaven.API.Migrations
{
    [Migration("20260409120000_AddDonationRecurringFrequency")]
    public class AddDonationRecurringFrequency : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "recurring_frequency",
                table: "donations",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "recurring_frequency",
                table: "donations");
        }
    }
}
